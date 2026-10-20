import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeIndianPhone, normalizeTelegramId } from "@/lib/validation";
import { ApiError } from "@/types/api";
import {
  MerchantListItem,
  MerchantStats,
  MerchantQueryParams,
  CreateMerchantInput,
  UpdateMerchantInput,
  MerchantSummaryStats,
} from "@/types/merchant";

export class MerchantService {
  /**
   * Retrieves paginated merchants with filtering, sorting, and aggregate statistics.
   */
  static async getMerchants(params: MerchantQueryParams = {}) {
    const {
      search,
      status,
      brokerId,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
      includeStats = true,
    } = params;

    const where: any = { role: "MERCHANT" };

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (brokerId) {
      if (brokerId === "NONE" || brokerId === "null") {
        where.brokerId = null;
      } else if (brokerId !== "ALL") {
        const numBrokerId = typeof brokerId === "number" ? brokerId : parseInt(brokerId, 10);
        where.brokerId = isNaN(numBrokerId) ? brokerId : numBrokerId;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      const orConditions: any[] = [
        { name: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
        { telegramId: { contains: s } },
      ];
      const numericId = parseInt(s, 10);
      if (!isNaN(numericId)) {
        orConditions.push({ id: numericId });
      }
      where.OR = orConditions;
    }

    // Determine sorting
    let orderBy: any = { createdAt: sortOrder };
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else if (sortBy === "balance") {
      orderBy = { wallet: { balance: sortOrder } };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          wallet: true,
          broker: { select: { id: true, name: true, email: true, commissionPercent: true } },
          _count: {
            select: {
              merchantOrders: true,
            },
          },
        },
        orderBy,
        skip,
        take: safeLimit,
      }),
    ]);

    let stats: MerchantStats | null = null;
    if (includeStats) {
      const [totalMerchants, activeMerchants, inactiveMerchants, walletAgg, feeAgg, totalOrders] =
        await Promise.all([
          prisma.user.count({ where: { role: "MERCHANT" } }),
          prisma.user.count({ where: { role: "MERCHANT", status: "ACTIVE" } }),
          prisma.user.count({ where: { role: "MERCHANT", status: "INACTIVE" } }),
          prisma.wallet.aggregate({
            _sum: { balance: true },
            where: { user: { role: "MERCHANT" } },
          }),
          prisma.user.aggregate({
            _avg: { payinMerchantFee: true, payoutMerchantFee: true },
            where: { role: "MERCHANT" },
          }),
          prisma.order.count({ where: { merchant: { role: "MERCHANT" } } }),
        ]);

      stats = {
        totalMerchants,
        activeMerchants,
        inactiveMerchants,
        totalWalletBalance: walletAgg._sum.balance || 0,
        avgPayinFee: Number((feeAgg._avg.payinMerchantFee || 0).toFixed(2)),
        avgPayoutFee: Number((feeAgg._avg.payoutMerchantFee || 0).toFixed(2)),
        totalOrders,
      };
    }

    return {
      merchants: users as unknown as MerchantListItem[],
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
      stats,
    };
  }

  /**
   * Retrieves tabbed or full information for a single merchant.
   */
  static async getMerchantById(id: number | string, tab?: string | null) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    if (tab === "info") {
      const merchant = await prisma.user.findUnique({
        where: { id: numericId, role: "MERCHANT" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          telegramId: true,
          upiId: true,
          qrCodeUrl: true,
          status: true,
          portalAccess: true,
          transactionAllowed: true,
          payinMerchantFee: true,
          payinQrProviderFee: true,
          payinAgentFee: true,
          payinBrokerFee: true,
          payoutMerchantFee: true,
          payoutQrProviderFee: true,
          payoutAgentFee: true,
          payoutBrokerFee: true,
          brokerId: true,
          broker: {
            select: { id: true, name: true, email: true, commissionPercent: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!merchant) throw new ApiError("Merchant not found", 404);
      return { merchant };
    }

    if (tab === "summary") {
      const [wallet, completedOrders, totalOrdersCount] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId: numericId }, select: { balance: true } }),
        prisma.order.findMany({
          where: { merchantId: numericId, status: "completed" },
          select: { amount: true },
        }),
        prisma.order.count({ where: { merchantId: numericId } }),
      ]);

      const totalVolume = completedOrders.reduce((sum, o) => sum + o.amount, 0);

      const summary: MerchantSummaryStats = {
        balance: wallet?.balance || 0.0,
        completedCount: completedOrders.length,
        totalOrdersCount,
        totalVolume,
      };

      return { summary };
    }

    if (tab === "wallet") {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: numericId },
        include: {
          entries: {
            include: {
              order: {
                select: { id: true, orderNumber: true, amount: true, status: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return { wallet: wallet || { balance: 0.0, entries: [] } };
    }

    if (tab === "orders") {
      const orders = await prisma.order.findMany({
        where: { merchantId: numericId },
        include: {
          qrProvider: { select: { id: true, name: true } },
          qrCode: { select: { upiId: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { orders };
    }

    // Default full query
    const merchant = await prisma.user.findUnique({
      where: { id: numericId, role: "MERCHANT" },
      include: {
        wallet: {
          include: {
            entries: {
              take: 50,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        broker: {
          select: { id: true, name: true, email: true, commissionPercent: true },
        },
        merchantOrders: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!merchant) throw new ApiError("Merchant not found", 404);
    return { merchant };
  }

  /**
   * Provisions a new merchant account with wallet and audit logging in an atomic transaction.
   */
  static async createMerchant(input: CreateMerchantInput, adminUserId: number | string) {
    const {
      name,
      email,
      password = "merchant@12345",
      phone,
      address,
      telegramId,
      upiId,
      qrCodeUrl,
      payinMerchantFee = 0.0,
      payoutMerchantFee = 0.0,
      payinBrokerFee = 0.0,
      payoutBrokerFee = 0.0,
      brokerId,
      status = "ACTIVE",
      portalAccess = true,
      transactionAllowed = true,
    } = input;

    if (!name || !name.trim()) throw new ApiError("Merchant name is required", 400);
    if (!email || !email.trim()) throw new ApiError("Email address is required", 400);

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ApiError(`User with email "${normalizedEmail}" already exists.`, 400);
    }

    const numBrokerId = brokerId ? (typeof brokerId === "number" ? brokerId : parseInt(brokerId, 10)) : null;
    if (numBrokerId) {
      const broker = await prisma.user.findFirst({
        where: { id: numBrokerId, role: "BROKER" },
      });
      if (!broker) {
        throw new ApiError("Selected broker not found or invalid", 400);
      }
    }

    const passwordHash = await hashPassword(password);
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;
    const cleanTelegram = telegramId ? normalizeTelegramId(telegramId) : null;
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId, 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "MERCHANT",
          phone: cleanPhone,
          address: address?.trim() || null,
          telegramId: cleanTelegram,
          upiId: upiId?.trim() || null,
          qrCodeUrl: qrCodeUrl?.trim() || null,
          status: status.toUpperCase(),
          portalAccess: Boolean(portalAccess),
          transactionAllowed: Boolean(transactionAllowed),
          payinMerchantFee: parseFloat(String(payinMerchantFee)) || 0.0,
          payoutMerchantFee: parseFloat(String(payoutMerchantFee)) || 0.0,
          payinBrokerFee: numBrokerId ? (parseFloat(String(payinBrokerFee)) || 0.0) : 0.0,
          payoutBrokerFee: numBrokerId ? (parseFloat(String(payoutBrokerFee)) || 0.0) : 0.0,
          brokerId: numBrokerId || null,
        },
      });

      // Initialize Merchant Wallet with 0 balance
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0.0,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: "CREATE_MERCHANT",
          entity: "User",
          entityId: String(user.id),
          metadata: JSON.stringify({
            merchantName: user.name,
            merchantEmail: user.email,
            walletId: wallet.id,
            brokerId: user.brokerId,
            fees: {
              payin: user.payinMerchantFee,
              payout: user.payoutMerchantFee,
            },
          }),
        },
      });

      return user;
    });
  }

  /**
   * Updates merchant profile, permissions, commission fees, or broker assignment.
   */
  static async updateMerchant(id: number | string, input: UpdateMerchantInput, adminUserId: number | string) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId, 10);

    const existing = await prisma.user.findUnique({
      where: { id: numericId, role: "MERCHANT" },
    });
    if (!existing) {
      throw new ApiError("Merchant not found", 404);
    }

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone ? normalizeIndianPhone(input.phone) : null;
    if (input.address !== undefined) data.address = input.address?.trim() || null;
    if (input.telegramId !== undefined) data.telegramId = input.telegramId ? normalizeTelegramId(input.telegramId) : null;
    if (input.upiId !== undefined) data.upiId = input.upiId?.trim() || null;
    if (input.qrCodeUrl !== undefined) data.qrCodeUrl = input.qrCodeUrl?.trim() || null;
    if (input.status !== undefined) data.status = input.status.toUpperCase();
    if (input.portalAccess !== undefined) data.portalAccess = Boolean(input.portalAccess);
    if (input.transactionAllowed !== undefined) data.transactionAllowed = Boolean(input.transactionAllowed);
    if (input.payinMerchantFee !== undefined) data.payinMerchantFee = parseFloat(String(input.payinMerchantFee)) || 0.0;
    if (input.payoutMerchantFee !== undefined) data.payoutMerchantFee = parseFloat(String(input.payoutMerchantFee)) || 0.0;
    if (input.payinBrokerFee !== undefined) data.payinBrokerFee = parseFloat(String(input.payinBrokerFee)) || 0.0;
    if (input.payoutBrokerFee !== undefined) data.payoutBrokerFee = parseFloat(String(input.payoutBrokerFee)) || 0.0;

    if (input.brokerId !== undefined) {
      if (input.brokerId === null || input.brokerId === "" || input.brokerId === "NONE") {
        data.brokerId = null;
      } else {
        const numBrokerId = typeof input.brokerId === "number" ? input.brokerId : parseInt(input.brokerId, 10);
        const broker = await prisma.user.findFirst({
          where: { id: numBrokerId, role: "BROKER" },
        });
        if (!broker) throw new ApiError("Assigned broker does not exist", 400);
        data.brokerId = broker.id;
      }
    }

    if (input.password && input.password.trim()) {
      data.passwordHash = await hashPassword(input.password);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: numericId },
        data,
        include: {
          wallet: true,
          broker: { select: { id: true, name: true, email: true, commissionPercent: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: "UPDATE_MERCHANT",
          entity: "User",
          entityId: String(user.id),
          metadata: JSON.stringify({
            updatedFields: Object.keys(data),
            merchantName: user.name,
          }),
        },
      });

      return user;
    });

    return updated;
  }

  /**
   * Fast dropdown listing of active merchants.
   */
  static async getActiveMerchantsList() {
    return await prisma.user.findMany({
      where: { role: "MERCHANT", status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        payinMerchantFee: true,
        payoutMerchantFee: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Adjusts merchant wallet balance manually (Credit / Debit) with atomic ledger and audit logging.
   */
  static async adjustWalletBalance({
    merchantId,
    action,
    amount,
    description,
    adminUserId,
    adminEmail,
  }: {
    merchantId: number | string;
    action: "ADD_BALANCE" | "DEDUCT_BALANCE" | "CLEAR_BALANCE";
    amount: number;
    description?: string;
    adminUserId: number | string;
    adminEmail: string;
  }) {
    const numericMerchantId = typeof merchantId === "number" ? merchantId : parseInt(merchantId, 10);
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId, 10);

    const merchant = await prisma.user.findUnique({
      where: { id: numericMerchantId, role: "MERCHANT" },
      include: { wallet: true },
    });
    if (!merchant) throw new ApiError("Merchant not found", 404);

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new ApiError("Amount must be a positive number greater than 0", 400);
    }

    let wallet = merchant.wallet;
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: merchant.id, balance: 0.0 },
      });
    }

    return await prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const currentBalance = currentWallet?.balance || 0;

      let newBalance: number;
      let entryType: "CR" | "DR";
      let category: string;
      let defaultDesc: string;

      if (action === "ADD_BALANCE") {
        newBalance = Number((currentBalance + numAmount).toFixed(2));
        entryType = "CR";
        category = "MANUAL_CREDIT";
        defaultDesc = `Manual Balance Credit by Admin (${adminEmail})`;
      } else if (action === "DEDUCT_BALANCE" || action === "CLEAR_BALANCE") {
        newBalance = Number((currentBalance - numAmount).toFixed(2));
        entryType = "DR";
        category = "MANUAL_DEBIT";
        defaultDesc =
          action === "CLEAR_BALANCE"
            ? `Manual Balance Deduction (Clear Balance) by Admin (${adminEmail})`
            : `Manual Balance Debit by Admin (${adminEmail})`;
      } else {
        throw new ApiError(`Invalid action: ${action}`, 400);
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      await tx.user.update({
        where: { id: merchant.id },
        data: {
          balance: newBalance,
          availableBalance: Number((newBalance - (merchant.exposure || 0)).toFixed(2)),
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: entryType,
          category,
          amount: numAmount,
          balanceAfter: newBalance,
          description: description?.trim() || defaultDesc,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: action === "CLEAR_BALANCE" ? "MANUAL_DEBIT" : action,
          entity: "Wallet",
          entityId: String(wallet.id),
          metadata: JSON.stringify({
            merchantId: merchant.id,
            merchantName: merchant.name,
            amount: numAmount,
            previousBalance: currentBalance,
            newBalance,
            description: description || defaultDesc,
          }),
        },
      });

      return {
        wallet: updatedWallet,
        entry,
        previousBalance: currentBalance,
        newBalance,
      };
    });
  }
}
