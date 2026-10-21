import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  normalizeIndianPhone,
  normalizeTelegramId,
  validateUserData,
} from "@/lib/validation";
import { ApiError } from "@/types/api";
import { SessionUser } from "./qr-code.service";
import {
  BrokerItem,
  BrokerQueryParams,
  CreateBrokerInput,
  UpdateBrokerInput,
} from "@/types/broker";

export class BrokerService {
  /**
   * Retrieves brokers with optional search, status filtering, and pagination.
   */
  static async getBrokers(params: BrokerQueryParams = {}, user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new ApiError("Admin authorization required", 403);
    }

    const { status, search, page, limit, sortBy = "createdAt", sortOrder = "desc" } = params;
    const where: any = { role: "BROKER" };

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const s = search.trim();
      const orConditions: any[] = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { telegramId: { contains: s } },
      ];
      const numericId = parseInt(s, 10);
      if (!isNaN(numericId)) {
        orConditions.push({ id: numericId });
      }
      where.OR = orConditions;
    }

    const isPaginated = page !== undefined || limit !== undefined;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = isPaginated ? (safePage - 1) * safeLimit : undefined;
    const take = isPaginated ? safeLimit : undefined;

    const [total, brokers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          wallet: { select: { balance: true } },
          _count: { select: { brokeredMerchants: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
      }),
    ]);

    const formattedBrokers: BrokerItem[] = brokers.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      telegramId: b.telegramId,
      address: b.address,
      status: b.status as "ACTIVE" | "INACTIVE",
      portalAccess: b.portalAccess,
      commissionPercent: b.commissionPercent || 0,
      merchantsCount: b._count?.brokeredMerchants || 0,
      walletBalance: b.wallet?.balance || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return {
      brokers: formattedBrokers,
      pagination: {
        total,
        page: safePage,
        limit: isPaginated ? safeLimit : total,
        totalPages: isPaginated ? Math.ceil(total / safeLimit) || 1 : 1,
      },
    };
  }

  /**
   * Retrieves single broker by ID with assigned merchants and wallet.
   */
  static async getBrokerById(brokerId: number | string, user: SessionUser) {
    const numericBrokerId = typeof brokerId === "number" ? brokerId : parseInt(brokerId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role !== "ADMIN" && (user.role !== "BROKER" || numericSessionUserId !== numericBrokerId)) {
      throw new ApiError("Unauthorized", 403);
    }

    const broker = await prisma.user.findFirst({
      where: { id: numericBrokerId, role: "BROKER" },
      include: {
        wallet: { select: { balance: true } },
        brokeredMerchants: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            payinMerchantFee: true,
            payoutMerchantFee: true,
          },
        },
      },
    });

    if (!broker) throw new ApiError("Broker not found", 404);

    return {
      ...broker,
      walletBalance: broker.wallet?.balance || 0,
    };
  }

  /**
   * Creates a new Broker.
   */
  static async createBroker(input: CreateBrokerInput, adminUserId: number | string) {
    const { name, email, password, phone, telegramId, address, commissionPercent, status, portalAccess } = input;

    if (!name?.trim() || !password?.trim()) {
      throw new ApiError("Name and Password are required", 400);
    }

    const validation = validateUserData(input, { isCreate: true, role: "BROKER" });
    if (!validation.valid) {
      throw new ApiError(validation.errors[0] || "Invalid broker data", 400);
    }

    const existingBroker = await prisma.user.findFirst({
      where: {
        role: "BROKER",
        name: name.trim(),
      },
    });
    if (existingBroker) {
      throw new ApiError(`A Broker with username "${name.trim()}" already exists.`, 400);
    }

    const passwordHash = await hashPassword(password);
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;
    const cleanTelegram = normalizeTelegramId(telegramId);
    const commRate = parseFloat(String(commissionPercent ?? 0.0)) || 0.0;
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId as any, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          role: "BROKER",
          name: name.trim(),
          passwordHash,
          phone: cleanPhone,
          telegramId: cleanTelegram,
          address: address ? address.trim() : null,
          commissionPercent: commRate,
          status: status || "ACTIVE",
          portalAccess: portalAccess !== undefined ? Boolean(portalAccess) : true,
          transactionAllowed: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          balance: 0.0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: numericAdminId,
          action: "BROKER_CREATED",
          entity: "User",
          entityId: String(newUser.id),
          metadata: JSON.stringify({
            name: newUser.name,
            commissionPercent: commRate,
          }),
        },
      });

      return newUser;
    });

    return user;
  }

  /**
   * Retrieves merchants linked to a Broker.
   */
  static async getBrokerMerchants(brokerId: number | string, user: SessionUser) {
    const numericBrokerId = typeof brokerId === "number" ? brokerId : parseInt(brokerId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role !== "ADMIN" && (user.role !== "BROKER" || numericSessionUserId !== numericBrokerId)) {
      throw new ApiError("Unauthorized", 403);
    }

    const merchants = await prisma.user.findMany({
      where: {
        role: "MERCHANT",
        brokerId: numericBrokerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        payinMerchantFee: true,
        payoutMerchantFee: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return merchants;
  }
}
