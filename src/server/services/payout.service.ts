import prisma from "@/lib/prisma";
import { settleCompletedPayoutOrder } from "@/lib/ledger-engine";
import {
  notifyPayoutAvailable,
  notifyPayoutClaimed,
  notifyPayoutCompleted,
  notifyPayoutReleased,
} from "@/lib/socket-server";
import { ApiError } from "@/types/api";
import { SessionUser } from "./qr-code.service";
import {
  AcceptPayoutInput,
  SubmitPayoutProofInput,
  ConfirmPayoutInput,
} from "@/types/payout";

export class PayoutService {
  /**
   * Broadcasts a pending withdrawal order to eligible QR providers.
   */
  static async broadcastPayout(orderId: number, user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new ApiError("Admin authorization required", 403);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.type !== "PAYOUT") {
      throw new ApiError("Only withdrawal/payout orders can be broadcasted", 400);
    }
    if (order.status !== "pending") {
      throw new ApiError(`Cannot broadcast order with status '${order.status}'`, 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        payoutBroadcast: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    try {
      notifyPayoutAvailable(updated);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return updated;
  }

  /**
   * Accepts/claims a broadcasted payout order from the pool.
   */
  static async acceptPayout(orderId: number, input: AcceptPayoutInput, user: SessionUser) {
    if (user.role !== "QR_PROVIDER" && user.role !== "ADMIN" && user.role !== "OPERATOR") {
      throw new ApiError("Authorization required", 403);
    }

    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    let effectiveProviderId = numericSessionUserId;
    let effectiveQrCodeId: number | null = input.qrCodeId
      ? (typeof input.qrCodeId === "number" ? input.qrCodeId : parseInt(input.qrCodeId, 10))
      : null;

    if (user.role === "OPERATOR") {
      const operator = await prisma.user.findUnique({
        where: { id: numericSessionUserId },
        include: {
          qrProvider: true,
          assignedQRCodes: { where: { isActive: true } },
        },
      });

      if (!operator || operator.status !== "ACTIVE" || operator.transactionAllowed === false) {
        throw new ApiError("Your operator account is not permitted to accept payout orders.", 403);
      }

      if (
        !operator.qrProvider ||
        operator.qrProvider.status !== "ACTIVE" ||
        operator.qrProvider.transactionAllowed === false
      ) {
        throw new ApiError("Parent QR Provider account is inactive or disabled for transactions.", 403);
      }

      if (operator.assignedQRCodes.length === 0) {
        throw new ApiError("You must have at least one active assigned QR code to accept payout orders.", 400);
      }

      if (effectiveQrCodeId) {
        const found = operator.assignedQRCodes.find((q) => q.id === effectiveQrCodeId);
        if (!found) {
          throw new ApiError("Selected QR code is not assigned to your account or is inactive.", 400);
        }
      } else {
        effectiveQrCodeId = operator.assignedQRCodes[0].id;
      }

      effectiveProviderId = operator.qrProviderId!;
    } else if (user.role === "QR_PROVIDER") {
      const provider = await prisma.user.findUnique({
        where: { id: numericSessionUserId },
        include: { qrCodes: { where: { isActive: true } } },
      });

      if (!provider || provider.status !== "ACTIVE" || provider.transactionAllowed === false) {
        throw new ApiError("Your account is not permitted to accept payout orders.", 403);
      }

      if (effectiveQrCodeId) {
        const found = provider.qrCodes.find((q) => q.id === effectiveQrCodeId);
        if (!found) {
          throw new ApiError("Selected QR code does not belong to your account.", 400);
        }
      } else if (provider.qrCodes.length > 0) {
        effectiveQrCodeId = provider.qrCodes[0].id;
      }
    }

    // Atomic claim within database transaction
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new ApiError("Order not found", 404);
      if (order.type !== "PAYOUT") throw new ApiError("Order is not a payout order", 400);
      if (order.qrProviderId !== null || order.status !== "pending") {
        throw new ApiError("This withdrawal order has already been accepted by another QR provider.", 409);
      }

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const providerUser = await tx.user.findUnique({
        where: { id: effectiveProviderId },
        select: { payoutQrProviderFee: true, qrProviderFee: true },
      });
      const providerPayoutRate =
        providerUser?.payoutQrProviderFee !== undefined && providerUser?.payoutQrProviderFee !== null
          ? providerUser.payoutQrProviderFee
          : (providerUser?.qrProviderFee ?? 0);
      const calculatedQrFee = (order.amount * providerPayoutRate) / 100;

      const updateResult = await tx.order.updateMany({
        where: {
          id: orderId,
          type: "PAYOUT",
          status: "pending",
          qrProviderId: null,
        },
        data: {
          qrProviderId: effectiveProviderId,
          qrCodeId: effectiveQrCodeId,
          qrProviderFeeRate: providerPayoutRate,
          qrProviderFee: calculatedQrFee,
          status: "processing",
          expiresAt,
        },
      });

      if (updateResult.count === 0) {
        throw new ApiError("This withdrawal order has already been accepted by another QR provider.", 409);
      }

      return await tx.order.findUnique({
        where: { id: orderId },
        include: {
          merchant: { select: { id: true, name: true, phone: true } },
          qrProvider: { select: { id: true, name: true, phone: true } },
          qrCode: true,
        },
      });
    });

    try {
      notifyPayoutClaimed(orderId, String(numericSessionUserId), user.name || "User");
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return result;
  }

  /**
   * Submits proof of payment by assigned Provider, Operator, or Admin.
   * Immediately auto-settles via multi-party ledger engine.
   */
  static async submitPayoutProof(orderId: number, input: SubmitPayoutProofInput, user: SessionUser) {
    if (user.role !== "QR_PROVIDER" && user.role !== "ADMIN" && user.role !== "OPERATOR") {
      throw new ApiError("Unauthorized", 401);
    }

    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    const finalUtr = (
      input.utr ||
      input.payoutProofUtr ||
      input.verifierUtr ||
      ""
    )?.trim();
    const finalScreenshot =
      input.screenshotUrl ||
      input.payoutProofImage ||
      input.verifierScreenshot ||
      null;

    if (!finalUtr) {
      throw new ApiError("Payment UTR reference is required", 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.type !== "PAYOUT") throw new ApiError("Order is not a payout order", 400);

    // Role check
    if (user.role === "OPERATOR") {
      if (!order.qrCodeId) {
        throw new ApiError("This order is not associated with an assigned QR code", 403);
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: { id: order.qrCodeId },
        select: { id: true, operatorId: true, providerId: true },
      });

      if (!qrCode || qrCode.operatorId !== numericSessionUserId || qrCode.providerId !== order.qrProviderId) {
        throw new ApiError("You are not authorized to submit payout proof for this order", 403);
      }
    } else if (user.role === "QR_PROVIDER" && order.qrProviderId !== numericSessionUserId) {
      throw new ApiError("You are not the assigned QR provider for this order", 403);
    }

    if (order.status === "completed") {
      throw new ApiError("Order is already completed", 400);
    }

    if (order.status !== "processing" && order.status !== "pending" && order.status !== "submitted") {
      throw new ApiError(`Cannot complete payment for order with status '${order.status}'`, 400);
    }

    const isAdminDirectPay = user.role === "ADMIN" && !order.qrProviderId;

    const settlementResult = await settleCompletedPayoutOrder({
      orderId,
      verifiedById: numericSessionUserId,
      adminUserId: numericSessionUserId,
      verifierUtr: finalUtr,
      verifierScreenshotUrl: finalScreenshot || undefined,
      paidByAdmin: isAdminDirectPay,
    });

    try {
      notifyPayoutCompleted(settlementResult.order);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return settlementResult;
  }

  /**
   * Confirms a payout order by Admin, settling or paying directly.
   */
  static async confirmPayout(orderId: number, input: ConfirmPayoutInput, user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new ApiError("Admin authorization required", 403);
    }

    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { qrProvider: true, merchant: true },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.type !== "PAYOUT") throw new ApiError("Order is not a payout order", 400);
    if (order.status === "completed") {
      throw new ApiError("Order is already completed", 400);
    }

    const finalUtr =
      input.utr?.trim() ||
      input.proofUtr?.trim() ||
      order.payoutProofUtr ||
      order.customerUtr ||
      `ADMIN-PAYOUT-${Date.now()}`;
    const finalScreenshot = input.screenshotUrl || order.payoutProofImage || order.customerScreenshot;
    const isAdminDirectPay = Boolean(input.paidByAdmin || input.paidBy === "ADMIN" || !order.qrProviderId);

    const settlementResult = await settleCompletedPayoutOrder({
      orderId,
      adminUserId: numericSessionUserId,
      verifierUtr: finalUtr,
      verifierScreenshotUrl: finalScreenshot || undefined,
      paidByAdmin: isAdminDirectPay,
    });

    try {
      notifyPayoutCompleted(settlementResult.order);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return {
      order: settlementResult.order,
      fees: settlementResult.fees,
      paidByAdmin: isAdminDirectPay,
    };
  }

  /**
   * Reassigns and rebroadcasts a payout order by Admin.
   */
  static async reassignPayout(orderId: number, user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new ApiError("Admin authorization required", 403);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.type !== "PAYOUT") throw new ApiError("Order is not a payout order", 400);
    if (order.status === "completed" || order.status === "rejected") {
      throw new ApiError(`Cannot reassign order with status '${order.status}'`, 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        qrProviderId: null,
        status: "pending",
        payoutBroadcast: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        payoutProofUtr: null,
        payoutProofImage: null,
        customerUtr: null,
        customerScreenshot: null,
      },
    });

    try {
      notifyPayoutAvailable(updated);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return updated;
  }

  /**
   * Releases an accepted payout order back to pool.
   */
  static async releasePayout(orderId: number, user: SessionUser) {
    if (user.role !== "QR_PROVIDER" && user.role !== "ADMIN" && user.role !== "OPERATOR") {
      throw new ApiError("Unauthorized", 401);
    }

    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.type !== "PAYOUT") throw new ApiError("Order is not a payout order", 400);
    if (order.status !== "processing") {
      throw new ApiError(`Cannot cancel assignment for order with status '${order.status}'`, 400);
    }

    // Role check
    if (user.role === "OPERATOR") {
      if (!order.qrCodeId) {
        throw new ApiError("Order does not have an assigned QR code", 403);
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: { id: order.qrCodeId },
        select: { id: true, operatorId: true, providerId: true },
      });

      if (!qrCode || qrCode.operatorId !== numericSessionUserId || qrCode.providerId !== order.qrProviderId) {
        throw new ApiError("You are not authorized to release this order", 403);
      }
    } else if (user.role === "QR_PROVIDER" && order.qrProviderId !== numericSessionUserId) {
      throw new ApiError("You are not the assigned QR provider for this order", 403);
    }

    let providerName = user.role === "QR_PROVIDER" ? (user.name || "Provider") : undefined;
    if (order.qrProviderId) {
      const providerUser = await prisma.user.findUnique({
        where: { id: order.qrProviderId },
        select: { name: true },
      });
      if (providerUser) providerName = providerUser.name;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        qrProviderId: null,
        qrCodeId: null,
        status: "pending",
        payoutBroadcast: false,
        expiresAt: null,
        payoutProofUtr: null,
        payoutProofImage: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: numericSessionUserId,
        action: "PAYOUT_RELEASED_BY_PROVIDER",
        entity: "Order",
        entityId: String(order.id),
        metadata: JSON.stringify({
          orderNumber: order.orderNumber,
          amount: order.amount,
          providerName: providerName || String(numericSessionUserId),
        }),
      },
    });

    try {
      notifyPayoutReleased(updatedOrder, providerName);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return updatedOrder;
  }
}
