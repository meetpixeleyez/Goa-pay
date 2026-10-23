import prisma from "./prisma";
import { triggerOrderWebhook } from "./webhook-engine";

export interface QRAssignmentResult {
  success: boolean;
  qrProviderId?: number;
  qrCodeId?: number;
  error?: string;
}

/**
 * Assigns an eligible QR Provider for an order of `orderAmount`.
 * Validation: order amount <= available_balance.
 * Atomically reserves exposure: exposure += orderAmount, available_balance = balance - exposure.
 */
export async function assignEligibleQRProvider(orderAmount: number): Promise<QRAssignmentResult> {
  return await prisma.$transaction(async (tx) => {
    // Find active QR Provider with transaction allowed and availableBalance >= orderAmount
    const eligibleProviders = await tx.user.findMany({
      where: {
        role: "QR_PROVIDER",
        status: "ACTIVE",
        transactionAllowed: true,
        availableBalance: {
          gte: orderAmount,
        },
      },
      include: {
        qrCodes: {
          where: { isActive: true },
        },
      },
      orderBy: {
        availableBalance: "desc",
      },
    });

    const providerWithQR = eligibleProviders.find((p) => p.qrCodes.length > 0);

    if (!providerWithQR) {
      return {
        success: false,
        error: "No available QR provider with sufficient balance to accept this order.",
      };
    }

    const assignedQR = providerWithQR.qrCodes[0];
    const newExposure = providerWithQR.exposure + orderAmount;
    const newAvailableBalance = providerWithQR.balance - newExposure;

    await tx.user.update({
      where: { id: providerWithQR.id },
      data: {
        exposure: newExposure,
        availableBalance: newAvailableBalance,
      },
    });

    return {
      success: true,
      qrProviderId: providerWithQR.id,
      qrCodeId: assignedQR.id,
    };
  });
}

/**
 * Releases reserved exposure when an order expires (5-min timeout) or is rejected.
 */
export async function releaseExposure(orderId: number | string): Promise<boolean> {
  const numericOrderId = typeof orderId === "number" ? orderId : parseInt(orderId, 10);
  if (isNaN(numericOrderId)) {
    return false;
  }

  const res = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: numericOrderId },
      include: { qrProvider: true },
    });

    if (!order || !order.qrProviderId || !order.qrProvider) {
      return false;
    }

    // Only release if order was pending or processing and hasn't been completed yet
    if (order.status === "completed" || order.status === "rejected") {
      return false;
    }

    const newExposure = Math.max(0, order.qrProvider.exposure - order.amount);
    const newAvailable = order.qrProvider.balance - newExposure;

    await tx.user.update({
      where: { id: order.qrProviderId },
      data: {
        exposure: newExposure,
        availableBalance: newAvailable,
      },
    });

    await tx.order.update({
      where: { id: numericOrderId },
      data: {
        status: "rejected",
        checkoutState: "EXPIRED",
      },
    });

    return true;
  });

  // Asynchronously trigger webhook for payin order rejection / timeout
  triggerOrderWebhook(numericOrderId, "order.payin.rejected").catch(() => {});

  return res;
}

/**
 * Checks for expired payout orders:
 * 1. Processing payout orders where 5-min fulfillment timer expired without submission:
 *    -> Reverts order to 'pending', resets qrProviderId = null, payoutBroadcast = false, expiresAt = null
 *    -> Releases reserved exposure
 *    -> Emits socket notification to Admin & QR providers
 * 2. Pending broadcasted payout orders where 5-min broadcast timer expired without acceptance:
 *    -> Reverts payoutBroadcast = false, expiresAt = null, status = 'pending'
 *    -> Emits socket notification to Admin
 */
export async function checkAndHandleExpiredPayoutOrders() {
  try {
    const now = new Date();

    // 1. Processing payout orders where 5-min timer expired
    const expiredProcessing = await prisma.order.findMany({
      where: {
        type: "PAYOUT",
        status: "processing",
        expiresAt: { lte: now },
      },
      include: { qrProvider: { select: { id: true, name: true, exposure: true, balance: true } } },
    });

    for (const order of expiredProcessing) {
      await prisma.$transaction(async (tx) => {
        if (order.qrProvider) {
          const newExposure = Math.max(0, order.qrProvider.exposure - order.amount);
          const newAvailable = order.qrProvider.balance - newExposure;
          await tx.user.update({
            where: { id: order.qrProvider.id },
            data: { exposure: newExposure, availableBalance: newAvailable },
          });
        }

        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            status: "pending",
            qrProviderId: null,
            payoutBroadcast: true,
            expiresAt: null,
            payoutProofUtr: null,
            payoutProofImage: null,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: order.qrProviderId,
            action: "PAYOUT_TIMEOUT_RETURNED_TO_POOL",
            entity: "Order",
            entityId: String(order.id),
            metadata: JSON.stringify({
              orderNumber: order.orderNumber,
              amount: order.amount,
              reason: "Fulfillment window expired without payment proof; returned to pool",
            }),
          },
        });

        // Import dynamically to prevent circular dependencies
        const { notifyPayoutReleased } = await import("./socket-server");
        notifyPayoutReleased(
          updated,
          order.qrProvider?.name || "QR Provider"
        );
      });
    }
  } catch (error) {
    console.error("Error checking expired payout orders:", error);
  }
}

async function txAuditLog(order: any) {
  try {
    await prisma.auditLog.create({
      data: {
        action: "PAYOUT_BROADCAST_TIMED_OUT",
        entity: "Order",
        entityId: String(order.id),
        metadata: JSON.stringify({
          orderNumber: order.orderNumber,
          amount: order.amount,
          reason: "No QR provider accepted withdrawal order within 5 minutes",
        }),
      },
    });
  } catch (e) {
    console.error(e);
  }
}
