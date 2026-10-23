import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/validation";
import { ApiError } from "@/types/api";
import { SessionUser } from "./qr-code.service";
import {
  AgentItem,
  AgentQueryParams,
  CreateAgentInput,
  UpdateAgentInput,
} from "@/types/agent";

export class AgentService {
  /**
   * Retrieves agents with optional search, status filtering, and pagination.
   */
  static async getAgents(params: AgentQueryParams = {}, user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new ApiError("Admin authorization required", 403);
    }

    const { status, search, page, limit, sortBy = "createdAt", sortOrder = "desc" } = params;
    const where: any = { role: "AGENT" };

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
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

    const isPaginated = page !== undefined || limit !== undefined;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = isPaginated ? (safePage - 1) * safeLimit : undefined;
    const take = isPaginated ? safeLimit : undefined;

    const [total, agents] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          _count: { select: { agentQrProviders: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
      }),
    ]);

    const formattedAgents: AgentItem[] = agents.map((a) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      status: a.status as "ACTIVE" | "INACTIVE",
      portalAccess: a.portalAccess,
      commissionPercent: a.commissionPercent || 0,
      qrProvidersCount: a._count?.agentQrProviders || 0,
      balance: a.balance || 0,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return {
      agents: formattedAgents,
      pagination: {
        total,
        page: safePage,
        limit: isPaginated ? safeLimit : total,
        totalPages: isPaginated ? Math.ceil(total / safeLimit) || 1 : 1,
      },
    };
  }

  /**
   * Retrieves single agent by ID.
   */
  static async getAgentById(agentId: number | string, user: SessionUser) {
    const numericAgentId = typeof agentId === "number" ? agentId : parseInt(agentId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role !== "ADMIN" && (user.role !== "AGENT" || numericSessionUserId !== numericAgentId)) {
      throw new ApiError("Unauthorized", 403);
    }

    const agent = await prisma.user.findFirst({
      where: { id: numericAgentId, role: "AGENT" },
      include: {
        agentQrProviders: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            balance: true,
            availableBalance: true,
          },
        },
      },
    });

    if (!agent) throw new ApiError("Agent not found", 404);

    return {
      ...agent,
      balance: agent.balance || 0,
    };
  }

  /**
   * Creates a new Agent.
   */
  static async createAgent(input: CreateAgentInput, adminUserId: number | string) {
    const { name, password, phone, commissionPercent, status, portalAccess } = input;

    if (!name?.trim() || !password?.trim()) {
      throw new ApiError("Name and Password are required", 400);
    }

    const existingUsers = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
    const duplicate = existingUsers.find((u) => u.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      if (duplicate.role === "AGENT") {
        throw new ApiError(`An Agent with username "${name.trim()}" already exists. Please choose a different username.`, 400);
      } else {
        throw new ApiError(`A user with username "${name.trim()}" already exists as a ${duplicate.role}. Please choose a different username.`, 400);
      }
    }

    const passwordHash = await hashPassword(password);
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;
    const commRate = parseFloat(String(commissionPercent ?? 0.0)) || 0.0;
    const numericAdminId = typeof adminUserId === "number" ? adminUserId : parseInt(adminUserId as any, 10);

    try {
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            role: "AGENT",
            name: name.trim(),
            passwordHash,
            phone: cleanPhone,
            commissionPercent: commRate,
            status: (status as any) || "ACTIVE",
            portalAccess: portalAccess !== undefined ? Boolean(portalAccess) : true,
            transactionAllowed: true,
            balance: 0.0,
            availableBalance: 0.0,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: numericAdminId,
            action: "AGENT_CREATED",
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
    } catch (error: any) {
      if (error?.code === "P2002" || error?.message?.includes("Unique constraint failed")) {
        throw new ApiError(`An Agent with username "${name.trim()}" already exists. Please choose a different username.`, 400);
      }
      throw error;
    }
  }

  /**
   * Retrieves QR providers linked to an Agent.
   */
  static async getAgentProviders(agentId: number | string, user: SessionUser) {
    const numericAgentId = typeof agentId === "number" ? agentId : parseInt(agentId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role !== "ADMIN" && (user.role !== "AGENT" || numericSessionUserId !== numericAgentId)) {
      throw new ApiError("Unauthorized", 403);
    }

    const providers = await prisma.user.findMany({
      where: {
        role: "QR_PROVIDER",
        agentId: numericAgentId,
      },
      include: {
        qrCodes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return providers;
  }

  /**
   * Retrieves transactions and balance for an Agent.
   */
  static async getAgentWallet(agentId: number | string, user: SessionUser) {
    const numericAgentId = typeof agentId === "number" ? agentId : parseInt(agentId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role !== "ADMIN" && (user.role !== "AGENT" || numericSessionUserId !== numericAgentId)) {
      throw new ApiError("Unauthorized", 403);
    }

    const agentUser = await prisma.user.findUnique({
      where: { id: numericAgentId },
      select: { balance: true, commissionPercent: true, payinAgentFee: true, payoutAgentFee: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: numericAgentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            amount: true,
            status: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      balance: agentUser?.balance || 0.0,
      commissionPercent: agentUser?.commissionPercent || 1.0,
      payinAgentFee: agentUser?.payinAgentFee ?? agentUser?.commissionPercent ?? 0.0,
      payoutAgentFee: agentUser?.payoutAgentFee ?? 0.0,
      entries: transactions,
    };
  }
}
