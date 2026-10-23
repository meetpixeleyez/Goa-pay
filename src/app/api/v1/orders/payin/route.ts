import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMerchantRequest, createSignedResponse } from "@/lib/merchant-api-auth";
import { assignEligibleQRProvider } from "@/lib/balance-engine";
import { calculateOrderFee } from "@/lib/ledger-engine";
import { validateWebhookUrl } from "@/lib/webhook-engine";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateMerchantRequest(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const { merchant, decryptedSecret } = authResult;
    const body = await request.json().catch(() => ({}));
    const {
      clientOrderId,
      amount,
      remark,
      successUrl,
      failureUrl,
      webhookUrl,
    } = body;

    // Validate Required Fields
    if (!amount) {
      return createSignedResponse(
        { error: "Missing required field: 'amount' is required." },
        decryptedSecret,
        400
      );
    }

    const orderAmount = parseFloat(amount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      return createSignedResponse(
        { error: "Invalid amount. Must be a positive numeric value greater than 0." },
        decryptedSecret,
        400
      );
    }

    // Validate URL schemes if provided
    if (successUrl) {
      const check = validateWebhookUrl(successUrl);
      if (!check.valid) {
        return createSignedResponse({ error: `Invalid successUrl: ${check.error}` }, decryptedSecret, 400);
      }
    }
    if (failureUrl) {
      const check = validateWebhookUrl(failureUrl);
      if (!check.valid) {
        return createSignedResponse({ error: `Invalid failureUrl: ${check.error}` }, decryptedSecret, 400);
      }
    }
    if (webhookUrl) {
      const check = validateWebhookUrl(webhookUrl);
      if (!check.valid) {
        return createSignedResponse({ error: `Invalid webhookUrl: ${check.error}` }, decryptedSecret, 400);
      }
    }

    // Idempotency check via clientOrderId
    if (clientOrderId && typeof clientOrderId === "string" && clientOrderId.trim()) {
      const cleanClientOrderId = clientOrderId.trim();
      const existingOrder = await prisma.order.findFirst({
        where: {
          merchantId: merchant.id,
          clientOrderId: cleanClientOrderId,
        },
        include: {
          qrCode: {
            select: {
              upiId: true,
              accountHolderName: true,
              bankName: true,
              imageUrl: true,
            },
          },
        },
      });

      if (existingOrder) {
        return createSignedResponse(
          {
            success: true,
            message: "Order already exists for this clientOrderId (Idempotent response).",
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            clientOrderId: existingOrder.clientOrderId,
            orderType: existingOrder.type,
            amount: existingOrder.amount,
            status: existingOrder.status,
            checkoutUrl: `/checkout/${existingOrder.id}`,
            expiresAt: existingOrder.expiresAt,
            qrCode: existingOrder.qrCode,
            createdAt: existingOrder.createdAt,
          },
          decryptedSecret,
          200
        );
      }
    }

    // Assign eligible QR Provider and lock exposure atomically
    const qrAssign = await assignEligibleQRProvider(orderAmount);
    if (!qrAssign.success || !qrAssign.qrProviderId || !qrAssign.qrCodeId) {
      return createSignedResponse(
        {
          error:
            qrAssign.error ||
            "No QR provider is currently available with sufficient balance for this amount. Please try a lower amount or try again later.",
        },
        decryptedSecret,
        422
      );
    }

    const assignedProvider = await prisma.user.findUnique({
      where: { id: qrAssign.qrProviderId },
      include: { agent: true },
    });

    // Calculate fee snapshot
    const merchantFeeRate = merchant.payinMerchantFee ?? 0;
    const brokerFeeRate = merchant.brokerId ? (merchant.payinBrokerFee ?? merchant.broker?.commissionPercent ?? 0) : 0;
    const qrProviderFeeRate = assignedProvider?.payinQrProviderFee ?? assignedProvider?.qrProviderFee ?? 0;
    const agentFeeRate = assignedProvider?.agentId ? (assignedProvider.payinAgentFee ?? assignedProvider.agent?.commissionPercent ?? 0) : 0;

    const feeConfig = {
      merchantFee: merchantFeeRate,
      qrProviderFee: qrProviderFeeRate,
      agentFee: agentFeeRate,
      brokerFee: brokerFeeRate,
    };

    const feeSnapshot = calculateOrderFee({
      amount: orderAmount,
      feeType: "PAYIN",
      merchantFeeConfiguration: feeConfig,
    });

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute checkout window

    const effectiveSuccessUrl = successUrl?.trim() || merchant.defaultSuccessUrl || null;
    const effectiveFailureUrl = failureUrl?.trim() || merchant.defaultFailureUrl || null;
    const effectiveWebhookUrl = webhookUrl?.trim() || merchant.webhookUrl || null;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        merchantId: merchant.id,
        qrProviderId: qrAssign.qrProviderId,
        qrCodeId: qrAssign.qrCodeId,
        amount: orderAmount,
        type: "PAYIN",
        remark: remark ? remark.trim() : null,
        clientOrderId: clientOrderId?.trim() || null,
        successUrl: effectiveSuccessUrl,
        failureUrl: effectiveFailureUrl,
        webhookUrl: effectiveWebhookUrl,
        status: "pending",
        checkoutState: "ACTIVE",
        expiresAt,
        merchantFeeRate: feeSnapshot.merchantFeeRate,
        qrProviderFeeRate: feeSnapshot.qrProviderFeeRate,
        agentFeeRate: feeSnapshot.agentFeeRate,
        brokerFeeRate: feeSnapshot.brokerFeeRate,
        platformFeeRate: feeSnapshot.platformFeeRate,
        merchantFee: feeSnapshot.merchantFee,
        qrProviderFee: feeSnapshot.qrProviderFee,
        agentFee: feeSnapshot.agentFee,
        brokerFee: feeSnapshot.brokerFee,
        platformFee: feeSnapshot.platformFee,
        totalFees: feeSnapshot.totalFees,
      },
      include: {
        qrCode: {
          select: {
            upiId: true,
            accountHolderName: true,
            bankName: true,
            imageUrl: true,
          },
        },
      },
    });

    const responsePayload = {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientOrderId: order.clientOrderId,
      orderType: order.type,
      amount: order.amount,
      status: order.status,
      checkoutUrl: `/checkout/${order.id}`,
      expiresAt: order.expiresAt,
      qrCode: order.qrCode,
      createdAt: order.createdAt,
    };

    return createSignedResponse(responsePayload, decryptedSecret, 201);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
