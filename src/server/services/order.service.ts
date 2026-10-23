import prisma from "@/lib/prisma";
import { assignEligibleQRProvider, releaseExposure, checkAndHandleExpiredPayoutOrders } from "@/lib/balance-engine";
import { calculateOrderFee, settleCompletedOrder, OrderFeeType } from "@/lib/ledger-engine";
import { notifyPayinAssigned, notifyPayoutAvailable, notifyOrderUpdated } from "@/lib/socket-server";
import { triggerOrderWebhook } from "@/lib/webhook-engine";
import {
  formatBeneficiaryDetails,
  parseBankDetails,
  validateBankAccountDetails,
} from "@/lib/validation";
import { ApiError } from "@/types/api";
import { SessionUser } from "./qr-code.service";
import { CreateOrderInput, OrderItem, OrderQueryParams } from "@/types/order";

export class OrderService {
  /**
   * Creates a deposit (PAYIN) or withdrawal (PAYOUT) order.
   */
  static async createOrder(input: CreateOrderInput, user?: SessionUser) {
    let merchantId = typeof input.merchantId === "string" ? parseInt(input.merchantId, 10) : input.merchantId;
    if (user?.role === "MERCHANT") {
      merchantId = typeof user.userId === "string" ? parseInt(user.userId, 10) : user.userId;
    }

    if (!merchantId) throw new ApiError("Merchant ID is required", 400);

    const orderAmount = parseFloat(String(input.amount));
    if (isNaN(orderAmount) || orderAmount <= 0) {
      throw new ApiError("Invalid order amount. Must be greater than 0", 400);
    }

    const customerName = input.customerName?.trim() || (input.type === "PAYOUT" ? (input.accountHolderName?.trim() || "Beneficiary") : "Customer");
    const customerMobile = input.customerMobile?.trim() || "";

    const orderType: OrderFeeType = input.type;
    if (orderType !== "PAYIN" && orderType !== "PAYOUT") {
      throw new ApiError("Invalid order type. Must be either 'PAYIN' or 'PAYOUT'", 400);
    }

    // Verify merchant status
    const merchant = await prisma.user.findUnique({
      where: { id: merchantId, role: "MERCHANT" },
      include: { broker: true },
    });

    if (!merchant) throw new ApiError("Selected merchant not found", 404);
    if (merchant.status === "INACTIVE") {
      throw new ApiError("This merchant account is currently inactive and cannot accept new orders.", 403);
    }
    if (merchant.transactionAllowed === false) {
      throw new ApiError("Transactions are disabled for this merchant account.", 403);
    }

    let beneficiaryDetails: string | null = null;
    let assignment: { qrProviderId: number | null; qrCodeId: number | null } = {
      qrProviderId: null,
      qrCodeId: null,
    };
    let feeSnapshot: any;

    if (orderType === "PAYOUT") {
      const accNo = input.accountNumber;
      const ifsc = input.ifscCode;
      const holderName = input.accountHolderName?.trim() || input.customerName?.trim() || "Beneficiary";
      const bankName = input.bankName;
      const accountType = input.accountType || "SAVINGS";

      if (accNo && ifsc) {
        const bankCheck = validateBankAccountDetails({
          accountNumber: accNo,
          confirmAccountNumber: input.confirmAccountNumber ?? accNo,
          ifscCode: ifsc,
          accountHolderName: holderName,
          bankName,
        });

        if (!bankCheck.valid) {
          throw new ApiError(bankCheck.errors[0] || "Invalid bank details", 400);
        }

        beneficiaryDetails = formatBeneficiaryDetails({
          accountNumber: accNo,
          ifscCode: ifsc,
          accountHolderName: holderName,
          bankName,
          accountType,
        });
      } else if (input.beneficiaryDetails && input.beneficiaryDetails.trim()) {
        const parsed = parseBankDetails(input.beneficiaryDetails);
        if (parsed && parsed.accountNumber && parsed.ifscCode) {
          beneficiaryDetails = formatBeneficiaryDetails(parsed);
        } else {
          beneficiaryDetails = input.beneficiaryDetails.trim();
        }
      }

      if (!beneficiaryDetails) {
        throw new ApiError(
          "Customer bank details (Account Number, IFSC code, and Bank Name) are required for withdrawal orders.",
          400
        );
      }

      // Fee snapshot for PAYOUT
      const feeConfig = {
        merchantFee: merchant.payoutMerchantFee ?? 0,
        qrProviderFee: merchant.payoutQrProviderFee || 1.0,
        agentFee: merchant.payoutAgentFee || 0,
        brokerFee: merchant.brokerId ? (merchant.payoutBrokerFee ?? merchant.broker?.commissionPercent ?? 0) : 0,
      };

      feeSnapshot = calculateOrderFee({
        amount: orderAmount,
        feeType: "PAYOUT",
        merchantFeeConfiguration: feeConfig,
      });

      // Verify Merchant Balance: balance >= amount + totalFees
      const requiredBalance = orderAmount + feeSnapshot.totalFees;
      if ((merchant.balance || 0) < requiredBalance) {
        throw new ApiError(
          `Insufficient merchant balance. Required: ₹${requiredBalance.toFixed(2)} (Amount: ₹${orderAmount.toFixed(2)} + Fees: ₹${feeSnapshot.totalFees.toFixed(2)}), Available: ₹${(merchant.balance || 0).toFixed(2)}`,
          422
        );
      }
    } else {
      // PAYIN: Match and reserve eligible QR provider exposure atomically
      const qrAssign = await assignEligibleQRProvider(orderAmount);
      if (!qrAssign.success || !qrAssign.qrProviderId || !qrAssign.qrCodeId) {
        throw new ApiError(
          qrAssign.error ||
            "No QR provider is currently available with sufficient balance for this amount. Please try a lower amount or try again later.",
          422
        );
      }

      assignment = {
        qrProviderId: qrAssign.qrProviderId,
        qrCodeId: qrAssign.qrCodeId,
      };

      const assignedProvider = await prisma.user.findUnique({
        where: { id: qrAssign.qrProviderId },
        include: { agent: true },
      });

      const feeConfig = {
        merchantFee: merchant.payinMerchantFee ?? 0,
        qrProviderFee: assignedProvider?.payinQrProviderFee ?? assignedProvider?.qrProviderFee ?? 0,
        agentFee: assignedProvider?.agentId ? (assignedProvider.payinAgentFee ?? assignedProvider.agent?.commissionPercent ?? 0) : 0,
        brokerFee: merchant.brokerId ? (merchant.payinBrokerFee ?? merchant.broker?.commissionPercent ?? 0) : 0,
      };

      feeSnapshot = calculateOrderFee({
        amount: orderAmount,
        feeType: "PAYIN",
        merchantFeeConfiguration: feeConfig,
      });
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    // 5 minutes timer for customer deposit checkout; null for payout pool (fulfillment timer starts upon acceptance)
    const expiresAt = orderType === "PAYIN" ? new Date(Date.now() + 5 * 60 * 1000) : null;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        merchantId,
        qrProviderId: assignment.qrProviderId,
        qrCodeId: assignment.qrCodeId,
        amount: orderAmount,
        customerName,
        customerMobile,
        customerEmail: input.customerEmail?.trim() || null,
        remark: input.remark?.trim() || null,
        type: orderType,
        status: "pending",
        payoutBroadcast: orderType === "PAYOUT" ? true : false,
        beneficiaryDetails,
        expiresAt,
        merchantFeeRate: feeSnapshot.merchantFeeRate,
        agentFeeRate: feeSnapshot.agentFeeRate,
        qrProviderFeeRate: feeSnapshot.qrProviderFeeRate,
        brokerFeeRate: feeSnapshot.brokerFeeRate,
        platformFeeRate: feeSnapshot.platformFeeRate,
        merchantFee: feeSnapshot.merchantFee,
        agentFee: feeSnapshot.agentFee,
        qrProviderFee: feeSnapshot.qrProviderFee,
        brokerFee: feeSnapshot.brokerFee,
        platformFee: feeSnapshot.platformFee,
        totalFees: feeSnapshot.totalFees,
      },
      include: {
        merchant: { select: { id: true, name: true } },
        qrProvider: { select: { id: true, name: true } },
        qrCode: {
          select: {
            id: true,
            upiId: true,
            name: true,
            imageUrl: true,
            accountHolderName: true,
            bankName: true,
            operatorId: true,
          },
        },
      },
    });

    // Real-time notifications
    try {
      if (orderType === "PAYIN" && assignment.qrProviderId) {
        notifyPayinAssigned(order);
      } else if (orderType === "PAYOUT") {
        notifyPayoutAvailable(order);
      }
    } catch (e) {
      console.warn("Failed to dispatch socket event:", e);
    }

    return order;
  }

  /**
   * Retrieves single order by ID or orderNumber with role-based access checks.
   */
  static async getOrderById(orderIdentifier: string | number, user?: SessionUser) {
    const isNumeric = !isNaN(Number(orderIdentifier));
    const where = isNumeric ? { id: Number(orderIdentifier) } : { orderNumber: String(orderIdentifier) };

    const order = await prisma.order.findFirst({
      where,
      include: {
        merchant: { select: { id: true, name: true, phone: true } },
        qrProvider: { select: { id: true, name: true, phone: true } },
        qrCode: {
          select: {
            id: true,
            upiId: true,
            name: true,
            imageUrl: true,
            accountHolderName: true,
            bankName: true,
            operatorId: true,
          },
        },
      },
    });

    if (!order) throw new ApiError("Order not found", 404);

    const now = new Date();

    // Check if 5-minute timeout expired while still pending
    if (order.status === "pending" && order.expiresAt && now > order.expiresAt) {
      await releaseExposure(order.id);
      order.status = "rejected";
    }

    const remainingSeconds = order.expiresAt
      ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now.getTime()) / 1000))
      : 0;

    const isTimedOut = Boolean(
      order.expiresAt && now > order.expiresAt && (order.status === "pending" || order.status === "processing")
    );

    // If session is present, verify role authorization
    if (user) {
      if (user.role === "MERCHANT" && order.merchantId !== user.userId) {
        throw new ApiError("Unauthorized", 403);
      }
      if (user.role === "QR_PROVIDER") {
        const isAssigned = order.qrProviderId === user.userId;
        const isAvailablePayout = order.type === "PAYOUT" && order.payoutBroadcast && (!order.qrProviderId || order.status === "pending");
        if (!isAssigned && !isAvailablePayout) {
          throw new ApiError("Unauthorized", 403);
        }
      }
      if (user.role === "OPERATOR") {
        const isAssigned = order.qrCode?.operatorId === user.userId;
        const isAvailablePayout = order.type === "PAYOUT" && order.payoutBroadcast && (!order.qrProviderId || order.status === "pending");
        if (!isAssigned && !isAvailablePayout) {
          throw new ApiError("Unauthorized", 403);
        }
      }
    }

    return {
      ...order,
      remainingSeconds,
      isTimedOut,
    };
  }

  /**
   * Retrieves paginated orders based on caller's role.
   */
  static async getOrders(params: OrderQueryParams = {}, user: SessionUser) {
    const { status, type, search, page, limit, sortBy = "createdAt", sortOrder = "desc", available, includeAvailableCount } = params;

    // Available Payouts Stream for QR Providers / Operators
    if (available) {
      let payoutFeeRate = 0;
      if (user.role === "QR_PROVIDER") {
        const prov = await prisma.user.findUnique({
          where: { id: typeof user.userId === "string" ? parseInt(user.userId, 10) : user.userId },
          select: { payoutQrProviderFee: true, qrProviderFee: true },
        });
        payoutFeeRate = prov?.payoutQrProviderFee ?? prov?.qrProviderFee ?? 0;
      }

      const availableOrders = await prisma.order.findMany({
        where: {
          type: "PAYOUT",
          status: "pending",
          payoutBroadcast: true,
          qrProviderId: null,
        },
        include: {
          merchant: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedOrders = availableOrders.map((o) => ({
        ...o,
        qrProviderFee: Number(((o.amount * payoutFeeRate) / 100).toFixed(2)),
        qrProviderFeeRate: payoutFeeRate,
      }));

      return {
        orders: formattedOrders as unknown as OrderItem[],
        pagination: {
          total: availableOrders.length,
          page: 1,
          limit: availableOrders.length || 10,
          totalPages: 1,
        },
      };
    }

    if (user.role === "ADMIN") {
      await checkAndHandleExpiredPayoutOrders();
    }

    const where: any = {};
    let qrIds: number[] = [];

    if (user.role === "MERCHANT") {
      where.merchantId = typeof user.userId === "string" ? parseInt(user.userId, 10) : user.userId;
    } else if (user.role === "QR_PROVIDER") {
      where.qrProviderId = typeof user.userId === "string" ? parseInt(user.userId, 10) : user.userId;
    } else if (user.role === "OPERATOR") {
      const opId = typeof user.userId === "string" ? parseInt(user.userId, 10) : user.userId;
      const assignedQrs = await prisma.qRCode.findMany({
        where: { operatorId: opId },
        select: { id: true },
      });
      qrIds = assignedQrs.map((q) => q.id);
      where.qrCodeId = { in: qrIds };
    } else if (user.role === "ADMIN") {
      if (params.merchantId) where.merchantId = typeof params.merchantId === "string" ? parseInt(params.merchantId, 10) : params.merchantId;
      if (params.providerId) where.qrProviderId = typeof params.providerId === "string" ? parseInt(params.providerId, 10) : params.providerId;
      if (params.qrCodeId) where.qrCodeId = typeof params.qrCodeId === "string" ? parseInt(params.qrCodeId, 10) : params.qrCodeId;
    }

    if (status && status !== "ALL") where.status = status;
    if (type && type !== "ALL") where.type = type;

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { orderNumber: { contains: s } },
        { customerName: { contains: s } },
        { customerMobile: { contains: s } },
        { customerUtr: { contains: s } },
        { verifierUtr: { contains: s } },
      ];
    }

    const isPaginated = page !== undefined || limit !== undefined;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = isPaginated ? (safePage - 1) * safeLimit : undefined;
    const take = isPaginated ? safeLimit : undefined;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true, phone: true } },
          qrProvider: { select: { id: true, name: true, phone: true } },
          qrCode: {
            include: {
              operator: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
      }),
    ]);

    let availablePayoutCount: number | undefined;
    if (includeAvailableCount || user.role === "QR_PROVIDER" || user.role === "OPERATOR") {
      availablePayoutCount = await prisma.order.count({
        where: {
          type: "PAYOUT",
          status: "pending",
          payoutBroadcast: true,
          qrProviderId: null,
        },
      });
    }

    let unacceptedPayoutCount: number | undefined;
    let timedOutPayoutCount: number | undefined;
    let adminAlertCount: number | undefined;

    if (user.role === "ADMIN") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const [unaccepted, timedOut] = await Promise.all([
        prisma.order.count({
          where: {
            type: "PAYOUT",
            status: "pending",
            createdAt: { lte: fiveMinutesAgo },
          },
        }),
        prisma.order.count({
          where: {
            type: "PAYOUT",
            status: "processing",
            expiresAt: { lte: new Date() },
          },
        }),
      ]);
      unacceptedPayoutCount = unaccepted;
      timedOutPayoutCount = timedOut;
      adminAlertCount = unaccepted + timedOut;
    }

    return {
      orders: orders as unknown as OrderItem[],
      pagination: {
        total,
        page: safePage,
        limit: isPaginated ? safeLimit : total,
        totalPages: isPaginated ? (Math.ceil(total / safeLimit) || 1) : 1,
      },
      availablePayoutCount,
      assignedQrCount: user.role === "OPERATOR" ? qrIds.length : undefined,
      unacceptedPayoutCount,
      timedOutPayoutCount,
      adminAlertCount,
    };
  }

  /**
   * Verifies an order payment via dual-UTR match or Admin override.
   */
  static async verifyOrderPayment({
    orderId,
    verifierUtr,
    verifierScreenshot,
    user,
  }: {
    orderId: number;
    verifierUtr?: string;
    verifierScreenshot?: string;
    user: SessionUser;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        qrCode: true,
      },
    });

    if (!order) throw new ApiError("Order not found", 404);

    // Operator checks
    if (user.role === "OPERATOR") {
      if (!order.qrCodeId || !order.qrCode || order.qrCode.operatorId !== user.userId) {
        throw new ApiError("You are not authorized to verify orders for this QR code.", 403);
      }

      const operator = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          status: true,
          transactionAllowed: true,
          qrProvider: { select: { status: true, transactionAllowed: true } },
        },
      });

      if (!operator || operator.status !== "ACTIVE" || operator.transactionAllowed === false) {
        throw new ApiError("Transaction actions are disabled for your operator account.", 403);
      }
      if (!operator.qrProvider || operator.qrProvider.status !== "ACTIVE" || operator.qrProvider.transactionAllowed === false) {
        throw new ApiError("Parent QR Provider account is inactive or disabled for transactions.", 403);
      }
    } else if (user.role === "QR_PROVIDER") {
      if (order.qrProviderId !== user.userId) {
        throw new ApiError("You are not authorized to verify this order", 403);
      }
      const provider = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { status: true, transactionAllowed: true },
      });
      if (provider?.transactionAllowed === false || provider?.status !== "ACTIVE") {
        throw new ApiError("Transaction actions are disabled for your account.", 403);
      }
    } else if (user.role !== "ADMIN") {
      throw new ApiError("Unauthorized", 403);
    }

    const customerUtr = (order.customerUtr || "").trim();
    const finalVerifierUtr =
      verifierUtr && verifierUtr.trim() ? verifierUtr.trim() : customerUtr;

    if (!finalVerifierUtr) {
      throw new ApiError("No UTR reference found for this order to verify.", 400);
    }

    // Dual-UTR Matching: If not ADMIN, verifierUtr must match customerUtr exactly
    if (user.role !== "ADMIN") {
      if (customerUtr && verifierUtr && verifierUtr.trim() !== customerUtr) {
        throw new ApiError("not valid UTR ID", 400);
      }
    }

    // Ensure customerUtr is saved on the order if not already set or changed
    if (!order.customerUtr || (user.role === "ADMIN" && order.customerUtr !== finalVerifierUtr)) {
      await prisma.order.update({
        where: { id: order.id },
        data: { customerUtr: finalVerifierUtr },
      });
    }

    // Atomically settle order and distribute fees
    const settlementResult = await settleCompletedOrder(
      order.id,
      user.userId,
      finalVerifierUtr,
      verifierScreenshot
    );

    try {
      notifyOrderUpdated(settlementResult.order);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return settlementResult;
  }

  /**
   * Submits customer payment receipt and UTR on public checkout page.
   */
  static async submitCustomerPayment(orderId: number, customerUtr: string, customerScreenshot?: string) {
    const cleanUtr = customerUtr?.trim();
    if (!cleanUtr) throw new ApiError("12-digit UPI UTR reference number is required", 400);
    if (!/^\d{12}$/.test(cleanUtr)) {
      throw new ApiError("Please enter a valid 12-digit numeric UPI UTR / Ref number.", 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new ApiError("Order not found", 404);

    if (order.status === "completed" || order.checkoutState === "COMPLETED") {
      throw new ApiError("This order has already been completed and settled.", 400);
    }
    if (order.status === "expired" || order.status === "cancelled" || order.status === "rejected" || order.checkoutState !== "ACTIVE") {
      throw new ApiError("This checkout session has expired or been terminated.", 400);
    }
    if (order.status !== "pending") {
      throw new ApiError("Payment proof has already been submitted for this order.", 400);
    }

    // Check duplicate UTR across other orders
    const duplicate = await prisma.order.findFirst({
      where: {
        customerUtr: cleanUtr,
        id: { not: order.id },
        status: { in: ["processing", "completed"] },
      },
    });
    if (duplicate) {
      throw new ApiError("This UTR has already been submitted for another order.", 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        customerUtr: cleanUtr,
        customerScreenshot: customerScreenshot?.trim() || null,
        status: "processing",
      },
      include: {
        merchant: { select: { id: true, name: true } },
        qrProvider: { select: { id: true, name: true } },
        qrCode: true,
      },
    });

    try {
      notifyOrderUpdated(updated);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return updated;
  }

  /**
   * Cancels order and atomically releases exposure if PAYIN.
   */
  static async cancelOrder(orderId: number, user?: SessionUser) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { qrProvider: true },
    });
    if (!order) throw new ApiError("Order not found", 404);

    if (order.status === "completed") {
      throw new ApiError("Cannot cancel an already completed order.", 400);
    }

    if (user) {
      const isAllowed =
        user.role === "ADMIN" ||
        user.userId === order.merchantId ||
        user.userId === order.qrProviderId;

      if (!isAllowed) {
        throw new ApiError("You are not authorized to cancel this order", 403);
      }
    }

    if (order.qrProviderId) {
      await releaseExposure(order.id);
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "rejected", checkoutState: "CANCELLED" },
      });
      triggerOrderWebhook(order.id, order.type === "PAYOUT" ? "order.payout.rejected" : "order.payin.rejected").catch(() => {});
    }

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
    });

    try {
      if (updated) notifyOrderUpdated(updated);
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    return updated;
  }
}
