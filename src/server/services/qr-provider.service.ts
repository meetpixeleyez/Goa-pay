import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeIndianPhone, isValidUpiId } from "@/lib/validation";
import { ApiError } from "@/types/api";
import {
  QRProviderListItem,
  QRProviderStats,
  QRProviderQueryParams,
  CreateQRProviderInput,
  UpdateQRProviderInput,
} from "@/types/qr-provider";

export class QRProviderService {
  /**
   * Retrieves paginated QR providers with filtering, search, and aggregate stats.
   */
  static async getQRProviders(params: QRProviderQueryParams = {}) {
    const {
      search,
      status,
      agentId,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
      includeStats = true,
    } = params;

    const where: any = { role: "QR_PROVIDER" };

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (agentId) {
      if (agentId === "NONE" || agentId === "null") {
        where.agentId = null;
      } else if (agentId !== "ALL") {
        const numAgentId = typeof agentId === "number" ? agentId : parseInt(agentId, 10);
        where.agentId = isNaN(numAgentId) ? agentId : numAgentId;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      const orConditions: any[] = [
        { name: { contains: s } },
        { phone: { contains: s } },
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
      orderBy = { balance: sortOrder };
    } else if (sortBy === "exposure") {
      orderBy = { exposure: sortOrder };
    } else if (sortBy === "availableBalance") {
      orderBy = { availableBalance: sortOrder };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    const [total, providers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, commissionPercent: true } },
          qrCodes: {
            include: {
              operator: { select: { id: true, name: true } },
            },
          },
          operators: { select: { id: true, name: true, status: true } },
          _count: {
            select: {
              providerOrders: true,
              qrCodes: true,
              operators: true,
            },
          },
        },
        orderBy,
        skip,
        take: safeLimit,
      }),
    ]);

    let stats: QRProviderStats | null = null;
    if (includeStats) {
      const [
        totalProviders,
        activeProviders,
        balanceAgg,
        qrAgg,
        activeQrCount,
      ] = await Promise.all([
        prisma.user.count({ where: { role: "QR_PROVIDER" } }),
        prisma.user.count({ where: { role: "QR_PROVIDER", status: "ACTIVE" } }),
        prisma.user.aggregate({
          where: { role: "QR_PROVIDER" },
          _sum: {
            balance: true,
            exposure: true,
            availableBalance: true,
          },
        }),
        prisma.qRCode.count(),
        prisma.qRCode.count({ where: { isActive: true } }),
      ]);

      stats = {
        totalProviders,
        activeProviders,
        totalBalance: balanceAgg._sum.balance || 0,
        totalExposure: balanceAgg._sum.exposure || 0,
        totalAvailable: balanceAgg._sum.availableBalance || 0,
        totalQRCodes: qrAgg,
        activeQRCodes: activeQrCount,
      };
    }

    return {
      providers: providers as unknown as QRProviderListItem[],
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
   * Retrieves full profile, transactions, QR codes, and operators for a single QR Provider.
   */
  static async getQRProviderById(id: number | string) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const provider = await prisma.user.findUnique({
      where: { id: numericId, role: "QR_PROVIDER" },
      include: {
        transactions: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            order: { select: { id: true, orderNumber: true, amount: true, status: true, type: true } },
          },
        },
        agent: { select: { id: true, name: true } },
        qrCodes: {
          include: {
            operator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        operators: {
          include: {
            assignedQRCodes: true,
          },
          orderBy: { createdAt: "desc" },
        },
        providerOrders: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            merchant: { select: { id: true, name: true } },
            qrCode: { select: { id: true, upiId: true } },
          },
        },
      },
    });

    if (!provider) {
      throw new ApiError("QR Provider not found", 404);
    }

    const [creditAgg, debitAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: provider.id, type: "DEPOSIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: provider.id, type: "WITHDRAWAL" },
        _sum: { amount: true },
      }),
    ]);
    const totalCredit = Number((creditAgg._sum.amount || 0).toFixed(2));
    const totalDebit = Number((debitAgg._sum.amount || 0).toFixed(2));

    const calculatedAvailable = Number(((provider.balance || 0) - (provider.exposure || 0)).toFixed(2));

    return {
      ...provider,
      totalCredit,
      totalDebit,
      availableBalance: calculatedAvailable,
    };
  }

  /**
   * Provisions a new QR Provider with liquidity balances, optional opening transaction, and optional initial QR code.
   */
  static async createQRProvider(input: CreateQRProviderInput, adminUserId: number | string) {
    const {
      name,
      password,
      phone,
      initialBalance = 0,
      agentId,
      payinQrProviderFee,
      payoutQrProviderFee,
      payinAgentFee,
      payoutAgentFee,
      initialUpiId,
      initialQrImageUrl,
      accountHolderName,
      bankName,
    } = input;

    if (!password || password.length < 6) throw new ApiError("Password must be at least 6 characters", 400);

    const existingUsers = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
    const duplicate = existingUsers.find((u) => u.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      if (duplicate.role === "QR_PROVIDER") {
        throw new ApiError(`A QR Provider with username "${name.trim()}" already exists. Please choose a different username.`, 400);
      } else {
        throw new ApiError(`A user with username "${name.trim()}" already exists as a ${duplicate.role}. Please choose a different username.`, 400);
      }
    }

    const numAgentId = agentId ? (typeof agentId === "number" ? agentId : parseInt(agentId, 10)) : null;
    if (numAgentId) {
      const agent = await prisma.user.findFirst({
        where: { id: numAgentId, role: "AGENT" },
      });
      if (!agent) throw new ApiError("Assigned agent does not exist", 400);
    }

    if (initialUpiId && !isValidUpiId(initialUpiId.trim())) {
      throw new ApiError("Invalid initial UPI ID format", 400);
    }

    const passwordHash = await hashPassword(password);
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;
    const parsedBalance = Math.max(0, Number(initialBalance) || 0);
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId as any, 10);

    try {
      return await prisma.$transaction(async (tx) => {
        const provider = await tx.user.create({
          data: {
            role: "QR_PROVIDER",
            name: name.trim(),
            passwordHash,
            phone: cleanPhone,
            balance: parsedBalance,
            exposure: 0.0,
            availableBalance: parsedBalance,
            agentId: numAgentId || null,
            payinQrProviderFee: payinQrProviderFee !== undefined ? parseFloat(String(payinQrProviderFee)) : 2.0,
            payoutQrProviderFee: payoutQrProviderFee !== undefined ? parseFloat(String(payoutQrProviderFee)) : 1.0,
            payinAgentFee: numAgentId ? (payinAgentFee !== undefined ? parseFloat(String(payinAgentFee)) : 0.0) : 0.0,
            payoutAgentFee: numAgentId ? (payoutAgentFee !== undefined ? parseFloat(String(payoutAgentFee)) : 0.0) : 0.0,
            qrProviderFee: payinQrProviderFee !== undefined ? parseFloat(String(payinQrProviderFee)) : 2.0,
            status: "ACTIVE",
            portalAccess: true,
            transactionAllowed: true,
          },
        });

        // Record initial liquidity deposit transaction if opening balance > 0
        if (parsedBalance > 0) {
          await tx.transaction.create({
            data: {
              userId: provider.id,
              type: "DEPOSIT",
              category: "INITIAL_BALANCE",
              amount: parsedBalance,
              balanceAfter: parsedBalance,
              description: `Initial liquidity allocation for QR Provider (${provider.name})`,
            },
          });
        }

        // Optional initial QR Code
        if (initialUpiId && initialUpiId.trim()) {
          const upi = initialUpiId.trim();
          const qrImage =
            initialQrImageUrl && initialQrImageUrl.trim()
              ? initialQrImageUrl.trim()
              : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

          await tx.qRCode.create({
            data: {
              providerId: provider.id,
              upiId: upi,
              imageUrl: qrImage,
              name: `${provider.name} Primary QR`,
              accountHolderName: accountHolderName?.trim() || null,
              bankName: bankName?.trim() || null,
              status: "ACTIVE",
              isActive: true,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: numericAdminId,
            action: "CREATE_QR_PROVIDER",
            entity: "User",
            entityId: String(provider.id),
            metadata: JSON.stringify({
              name: provider.name,
              initialBalance: parsedBalance,
              agentId: provider.agentId,
            }),
          },
        });

        return provider;
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      if (error?.code === "P2002" || error?.message?.includes("Unique constraint failed")) {
        throw new ApiError(`A QR Provider with username "${name.trim()}" already exists. Please choose a different username.`, 400);
      }
      throw error;
    }
  }

  /**
   * Updates provider fee rates, contact, or agent association.
   */
  static async updateQRProvider(id: number | string, input: UpdateQRProviderInput, adminUserId: number | string) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId, 10);

    const existing = await prisma.user.findUnique({
      where: { id: numericId, role: "QR_PROVIDER" },
    });
    if (!existing) throw new ApiError("QR Provider not found", 404);

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone ? normalizeIndianPhone(input.phone) : null;
    if (input.status !== undefined) data.status = input.status.toUpperCase();
    if (input.portalAccess !== undefined) data.portalAccess = Boolean(input.portalAccess);
    if (input.transactionAllowed !== undefined) data.transactionAllowed = Boolean(input.transactionAllowed);
    if (input.payinQrProviderFee !== undefined) data.payinQrProviderFee = parseFloat(String(input.payinQrProviderFee)) || 0.0;
    if (input.payoutQrProviderFee !== undefined) data.payoutQrProviderFee = parseFloat(String(input.payoutQrProviderFee)) || 0.0;
    if (input.payinAgentFee !== undefined) data.payinAgentFee = parseFloat(String(input.payinAgentFee)) || 0.0;
    if (input.payoutAgentFee !== undefined) data.payoutAgentFee = parseFloat(String(input.payoutAgentFee)) || 0.0;

    if (input.agentId !== undefined) {
      if (input.agentId === null || input.agentId === "" || input.agentId === "NONE") {
        data.agentId = null;
      } else {
        const numAgentId = typeof input.agentId === "number" ? input.agentId : parseInt(input.agentId, 10);
        const agent = await prisma.user.findFirst({
          where: { id: numAgentId, role: "AGENT" },
        });
        if (!agent) throw new ApiError("Assigned agent does not exist", 400);
        data.agentId = agent.id;
      }
    }

    if (input.password && input.password.trim()) {
      data.passwordHash = await hashPassword(input.password);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: numericId },
        data,
      });

      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: "UPDATE_QR_PROVIDER",
          entity: "User",
          entityId: String(updated.id),
          metadata: JSON.stringify({
            updatedFields: Object.keys(data),
            providerName: updated.name,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Fast dropdown listing of active QR providers with active QR codes.
   */
  static async getActiveProvidersWithQRs() {
    return await prisma.user.findMany({
      where: {
        role: "QR_PROVIDER",
        status: "ACTIVE",
        qrCodes: { some: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        availableBalance: true,
        qrCodes: {
          where: { isActive: true },
          select: { id: true, upiId: true, imageUrl: true, name: true },
        },
      },
      orderBy: { availableBalance: "desc" },
    });
  }

  /**
   * QR Provider Dashboard KPI stats.
   */
  static async getQRProviderStats(userId: number | string) {
    const numericId = typeof userId === "number" ? userId : parseInt(userId, 10);

    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        qrCodes: {
          include: {
            operator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) throw new ApiError("QR Provider not found", 404);

    const [creditAgg, debitAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "DEPOSIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "WITHDRAWAL" },
        _sum: { amount: true },
      }),
    ]);
    const totalCredit = Number((creditAgg._sum.amount || 0).toFixed(2));
    const totalDebit = Number((debitAgg._sum.amount || 0).toFixed(2));

    const calculatedAvailable = Number(((user.balance || 0) - (user.exposure || 0)).toFixed(2));

    return {
      status: user.status,
      portalAccess: user.portalAccess,
      transactionAllowed: user.transactionAllowed,
      balance: user.balance,
      exposure: user.exposure,
      availableBalance: calculatedAvailable,
      totalCredit,
      totalDebit,
      feePercent: user.payinQrProviderFee ?? user.qrProviderFee ?? 0.0,
      payinFeePercent: user.payinQrProviderFee ?? user.qrProviderFee ?? 0.0,
      payoutFeePercent: user.payoutQrProviderFee ?? user.qrProviderFee ?? 0.0,
      walletBalance: user.balance,
      qrCodes: user.qrCodes,
      entries: user.transactions,
    };
  }

  /**
   * Adjusts provider liquidity balance with atomic available balance recalculation.
   */
  static async adjustLiquidityBalance({
    providerId,
    action,
    amount,
    description,
    adminUserId,
    adminEmail,
  }: {
    providerId: number | string;
    action: "ADD_BALANCE" | "DEDUCT_BALANCE";
    amount: number;
    description?: string;
    adminUserId: number | string;
    adminEmail: string;
  }) {
    const numericProviderId = typeof providerId === "number" ? providerId : parseInt(providerId, 10);
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId, 10);

    const provider = await prisma.user.findUnique({
      where: { id: numericProviderId, role: "QR_PROVIDER" },
    });
    if (!provider) throw new ApiError("QR Provider not found", 404);

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new ApiError("Amount must be greater than 0", 400);
    }

    return await prisma.$transaction(async (tx) => {
      let newBalance: number;
      let entryType: "DEPOSIT" | "WITHDRAWAL";
      let category: any;

      if (action === "ADD_BALANCE") {
        newBalance = Number((provider.balance + numAmount).toFixed(2));
        entryType = "DEPOSIT";
        category = "DEPOSIT";
      } else {
        if (provider.availableBalance < numAmount) {
          throw new ApiError(
            `Cannot deduct ₹${numAmount}. Available balance is only ₹${provider.availableBalance} (Exposure: ₹${provider.exposure})`,
            400
          );
        }
        newBalance = Number((provider.balance - numAmount).toFixed(2));
        entryType = "WITHDRAWAL";
        category = "WITHDRAWAL";
      }

      const newAvailable = Number((newBalance - provider.exposure).toFixed(2));

      const updatedUser = await tx.user.update({
        where: { id: numericProviderId },
        data: {
          balance: newBalance,
          availableBalance: newAvailable,
        },
      });

      await tx.transaction.create({
        data: {
          userId: provider.id,
          type: entryType,
          category,
          amount: numAmount,
          balanceAfter: newBalance,
          description: description?.trim() || `Manual Liquidity Adjustment by Admin (${adminEmail})`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: `PROVIDER_${action}`,
          entity: "User",
          entityId: String(provider.id),
          metadata: JSON.stringify({
            previousBalance: provider.balance,
            newBalance,
            exposure: provider.exposure,
            availableBalance: newAvailable,
            amount: numAmount,
          }),
        },
      });

      return updatedUser;
    });
  }
}
