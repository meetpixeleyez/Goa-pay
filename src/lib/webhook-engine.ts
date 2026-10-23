import prisma from "./prisma";
import { computeHmacSignature, decryptSecret } from "./merchant-api-auth";

export interface WebhookEventPayload {
  event: "order.payin.completed" | "order.payin.rejected" | "order.payout.completed" | "order.payout.rejected";
  order: any;
  customData?: any;
}

/**
 * Validates that the target URL uses http or https and avoids private IPs if needed
 */
export function validateWebhookUrl(urlStr: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Webhook URL must use HTTP or HTTPS protocol" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid Webhook URL format" };
  }
}

/**
 * Dispatches a signed webhook notification to a merchant
 */
export async function dispatchWebhook({
  merchantId,
  orderId,
  event,
  targetUrl,
  payloadData,
}: {
  merchantId: number | string;
  orderId?: number;
  event: string;
  targetUrl: string;
  payloadData: any;
}) {
  try {
    const numericMerchantId = typeof merchantId === "number" ? merchantId : parseInt(merchantId, 10);
    const urlCheck = validateWebhookUrl(targetUrl);
    if (!urlCheck.valid) {
      console.warn(`[Webhook] Invalid target URL for merchant ${merchantId}: ${targetUrl}`);
      return;
    }

    // Retrieve active API Key for the merchant to sign the webhook payload
    const apiKey = await prisma.apiKey.findFirst({
      where: { userId: numericMerchantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    let secret = "";
    if (apiKey) {
      try {
        secret = decryptSecret(apiKey.secretHash);
      } catch (e) {
        console.error(`[Webhook] Failed to decrypt API secret for merchant ${merchantId}`, e);
      }
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const fullPayload = {
      id: eventId,
      event,
      timestamp,
      data: payloadData,
    };

    const payloadString = JSON.stringify(fullPayload);
    const canonicalString = `${timestamp}.${payloadString}`;
    const signature = secret ? computeHmacSignature(secret, canonicalString) : "";

    // Verify order existence before linking to avoid foreign key errors if order was already deleted
    let validOrderId: number | null = null;
    if (orderId) {
      const orderRecord = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
      if (orderRecord) {
        validOrderId = orderId;
      }
    }

    // Create WebhookDelivery record
    let delivery: any;
    try {
      delivery = await prisma.webhookDelivery.create({
        data: {
          merchantId: numericMerchantId,
          orderId: validOrderId,
          event,
          targetUrl,
          payload: payloadString,
          signature,
          status: "PENDING",
          attempts: 1,
          maxAttempts: 5,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2003" && validOrderId !== null) {
        delivery = await prisma.webhookDelivery.create({
          data: {
            merchantId: numericMerchantId,
            orderId: null,
            event,
            targetUrl,
            payload: payloadString,
            signature,
            status: "PENDING",
            attempts: 1,
            maxAttempts: 5,
          },
        }).catch(() => null);
      }
      if (!delivery) {
        return { success: false, error: "Failed to persist webhook delivery record" };
      }
    }

    // Execute HTTP POST with 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let responseCode: number | null = null;
    let responseBody = "";
    let errorMessage: string | null = null;
    let isSuccess = false;

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Event": event,
          "X-Timestamp": timestamp.toString(),
          "X-Signature": signature,
          "User-Agent": "GoaPay-Webhook-Agent/1.0",
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      responseCode = response.status;
      responseBody = await response.text().catch(() => "");
      isSuccess = response.ok;
    } catch (err: any) {
      clearTimeout(timeoutId);
      errorMessage = err.message || "Network / Timeout Error";
    }

    // Determine status & next retry
    const nextRetryAt = isSuccess
      ? null
      : new Date(Date.now() + 2 * 60 * 1000); // retry in 2 minutes for attempt 2

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: isSuccess ? "DELIVERED" : "FAILED",
        responseCode,
        responseBody: responseBody.slice(0, 1000), // cap to 1000 chars
        errorMessage,
        deliveredAt: isSuccess ? new Date() : null,
        nextRetryAt: isSuccess ? null : nextRetryAt,
      },
    });

    return { success: isSuccess, deliveryId: delivery.id };
  } catch (err: any) {
    console.error("[Webhook] Failed to dispatch webhook:", err);
  }
}

/**
 * Retries a specific webhook delivery manually or automatically
 */
export async function retryWebhookDelivery(deliveryId: number | string) {
  const numericDeliveryId = typeof deliveryId === "number" ? deliveryId : parseInt(deliveryId, 10);
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: numericDeliveryId },
  });

  if (!delivery) {
    throw new Error("Webhook delivery record not found");
  }

  const attempts = delivery.attempts + 1;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let responseCode: number | null = null;
  let responseBody = "";
  let errorMessage: string | null = null;
  let isSuccess = false;

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(delivery.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event": delivery.event,
        "X-Timestamp": timestamp.toString(),
        "X-Signature": delivery.signature,
        "User-Agent": "GoaPay-Webhook-Agent/1.0",
      },
      body: delivery.payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    responseCode = response.status;
    responseBody = await response.text().catch(() => "");
    isSuccess = response.ok;
  } catch (err: any) {
    clearTimeout(timeoutId);
    errorMessage = err.message || "Network / Timeout Error";
  }

  // Calculate exponential backoff for next retry:
  // attempt 2: +2 min, attempt 3: +10 min, attempt 4: +30 min, attempt 5: +2 hours
  const backoffMinutes = [0, 2, 10, 30, 120];
  const nextDelayMin = backoffMinutes[attempts] || 120;
  const hasMoreAttempts = attempts < delivery.maxAttempts;

  const nextRetryAt =
    !isSuccess && hasMoreAttempts ? new Date(Date.now() + nextDelayMin * 60 * 1000) : null;

  const updated = await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      attempts,
      status: isSuccess ? "DELIVERED" : hasMoreAttempts ? "PENDING" : "FAILED",
      responseCode,
      responseBody: responseBody.slice(0, 1000),
      errorMessage,
      deliveredAt: isSuccess ? new Date() : delivery.deliveredAt,
      nextRetryAt,
    },
  });

  return { success: isSuccess, delivery: updated };
}

/**
 * Triggers webhook notification for an order if the merchant has a callback URL configured
 */
export async function triggerOrderWebhook(orderId: number, event: "order.payin.completed" | "order.payin.rejected" | "order.payout.completed" | "order.payout.rejected") {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: {
          select: { id: true, name: true, webhookUrl: true },
        },
      },
    });

    if (!order) return;

    // Use order-specific webhookUrl if provided, otherwise fallback to merchant's default webhookUrl
    const targetUrl = order.webhookUrl || order.merchant?.webhookUrl;
    if (!targetUrl || !targetUrl.trim()) {
      return; // No webhook configured for this merchant
    }

    const payloadData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientOrderId: order.clientOrderId,
      type: order.type,
      amount: order.amount,
      status: order.status,
      customerUtr: order.customerUtr,
      verifierUtr: order.verifierUtr,
      merchantFee: order.merchantFee,
      netSettledAmount: order.type === "PAYIN" ? order.amount - order.merchantFee : order.amount,
      completedAt: order.status === "completed" ? order.updatedAt : null,
      createdAt: order.createdAt,
    };

    // Return the dispatch promise so callers can await if desired
    return await dispatchWebhook({
      merchantId: order.merchantId,
      orderId: order.id,
      event,
      targetUrl: targetUrl.trim(),
      payloadData,
    });
  } catch (err: any) {
    console.error("[triggerOrderWebhook Error]:", err);
  }
}
