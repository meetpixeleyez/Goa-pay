import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeIndianPhone, isValidUpiId } from "@/lib/validation";
import { ApiError } from "@/types/api";
import { SessionUser } from "./qr-code.service";
import { CreateOperatorInput, UpdateOperatorInput, OperatorItem } from "@/types/qr-provider";

export class OperatorService {
  /**
   * Retrieves paginated operators under a QR Provider or system-wide for Admin.
   */
  static async getOperators(
    params: {
      providerId?: number | string | null;
      status?: string | null;
      search?: string | null;
      page?: number;
      limit?: number;
    } = {},
    user: SessionUser
  ) {
    const { providerId, status, search, page = 1, limit = 10 } = params;

    const where: any = { role: "OPERATOR" };

    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role === "ADMIN") {
      if (providerId && providerId !== "ALL") {
        where.qrProviderId = typeof providerId === "number" ? providerId : parseInt(providerId, 10);
      }
    } else if (user.role === "QR_PROVIDER") {
      where.qrProviderId = numericSessionUserId;
    } else {
      throw new ApiError("Unauthorized", 403);
    }

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const s = search.trim();
      const orConditions: any[] = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { qrProvider: { name: { contains: s } } },
      ];
      const numericId = parseInt(s, 10);
      if (!isNaN(numericId)) {
        orConditions.push({ id: numericId });
      }
      where.OR = orConditions;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    const [total, operators] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          portalAccess: true,
          transactionAllowed: true,
          qrProviderId: true,
          qrProvider: {
            select: { id: true, name: true, phone: true },
          },
          createdAt: true,
          assignedQRCodes: {
            select: {
              id: true,
              upiId: true,
              name: true,
              bankName: true,
              accountHolderName: true,
              isActive: true,
              status: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
    ]);

    // Aggregate statistics
    const statsWhere: any = { role: "OPERATOR" };
    const qrStatsWhere: any = { operatorId: { not: null } };
    if (user.role === "ADMIN") {
      if (providerId && providerId !== "ALL") {
        const numPid = typeof providerId === "number" ? providerId : parseInt(providerId, 10);
        statsWhere.qrProviderId = numPid;
        qrStatsWhere.providerId = numPid;
      }
    } else {
      statsWhere.qrProviderId = numericSessionUserId;
      qrStatsWhere.providerId = numericSessionUserId;
    }

    const [totalOperators, activeOperators, inactiveOperators, totalAssignedQrs] =
      await Promise.all([
        prisma.user.count({ where: statsWhere }),
        prisma.user.count({ where: { ...statsWhere, status: "ACTIVE" } }),
        prisma.user.count({ where: { ...statsWhere, status: "INACTIVE" } }),
        prisma.qRCode.count({ where: qrStatsWhere }),
      ]);

    return {
      operators: operators as unknown as OperatorItem[],
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
      stats: {
        totalOperators,
        activeOperators,
        inactiveOperators,
        totalAssignedQrs,
      },
    };
  }

  /**
   * Retrieves single Operator with ownership check.
   */
  static async getOperatorById(id: number | string, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    const operator = await prisma.user.findUnique({
      where: { id: numericId, role: "OPERATOR" },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        portalAccess: true,
        transactionAllowed: true,
        qrProviderId: true,
        qrProvider: {
          select: { id: true, name: true, phone: true, balance: true, exposure: true, availableBalance: true },
        },
        createdAt: true,
        assignedQRCodes: {
          select: {
            id: true,
            upiId: true,
            name: true,
            bankName: true,
            accountHolderName: true,
            isActive: true,
            status: true,
            imageUrl: true,
            providerId: true,
          },
        },
        auditLogs: {
          where: { action: "OPERATOR_LOGIN" },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!operator) throw new ApiError("Operator not found", 404);

    if (user.role === "QR_PROVIDER" && operator.qrProviderId !== numericSessionUserId) {
      throw new ApiError("Unauthorized access to this Operator", 403);
    }

    return operator;
  }

  /**
   * Provisions a new sub-operator under a QR Provider.
   */
  static async createOperator(input: CreateOperatorInput, user: SessionUser) {
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    let targetProviderId = input.qrProviderId
      ? (typeof input.qrProviderId === "number" ? input.qrProviderId : parseInt(input.qrProviderId, 10))
      : null;

    if (user.role === "QR_PROVIDER") {
      targetProviderId = numericSessionUserId;
    } else if (user.role !== "ADMIN") {
      throw new ApiError("Unauthorized", 403);
    }

    if (!targetProviderId) {
      throw new ApiError("Parent QR Provider is required", 400);
    }

    const parentProvider = await prisma.user.findFirst({
      where: { id: targetProviderId, role: "QR_PROVIDER" },
    });
    if (!parentProvider) {
      throw new ApiError("Target QR Provider does not exist", 404);
    }

    const rawUsername = (input.username || input.name)?.trim();
    if (!rawUsername) throw new ApiError("Username is required", 400);

    if (rawUsername.includes("@")) {
      throw new ApiError("Username cannot contain '@'. Please enter a simple username (e.g. rahul_operator).", 400);
    }

    if (!input.password || input.password.length < 6) {
      throw new ApiError("Password must be at least 6 characters", 400);
    }

    if (input.confirmPassword && input.confirmPassword !== input.password) {
      throw new ApiError("Passwords do not match", 400);
    }

    // Check if operator with same username already exists
    const existing = await prisma.user.findFirst({
      where: {
        role: "OPERATOR",
        name: rawUsername,
      },
    });
    if (existing) {
      throw new ApiError("An operator with this username already exists. Please choose a different username.", 400);
    }

    const passwordHash = await hashPassword(input.password);
    const cleanPhone = input.phone ? normalizeIndianPhone(input.phone) : null;

    return await prisma.$transaction(async (tx) => {
      const newOperator = await tx.user.create({
        data: {
          role: "OPERATOR",
          name: rawUsername,
          passwordHash,
          phone: cleanPhone,
          status: "ACTIVE",
          portalAccess: true,
          transactionAllowed: true,
          qrProviderId: targetProviderId,
        },
      });

      // Assign specified existing QR codes to this operator
      if (Array.isArray(input.assignedQrIds) && input.assignedQrIds.length > 0) {
        const numQrIds = input.assignedQrIds.map((qid) => (typeof qid === "number" ? qid : parseInt(qid, 10)));
        await tx.qRCode.updateMany({
          where: {
            id: { in: numQrIds },
            providerId: targetProviderId,
          },
          data: { operatorId: newOperator.id },
        });
      }

      // If initial QR code is provided, create and assign it immediately
      if (input.initialUpiId && input.initialUpiId.trim()) {
        const upi = input.initialUpiId.trim();
        if (!isValidUpiId(upi)) {
          throw new ApiError("Invalid initial UPI ID format", 400);
        }

        const qrImage =
          input.initialQrImageUrl && input.initialQrImageUrl.trim()
            ? input.initialQrImageUrl.trim()
            : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

        await tx.qRCode.create({
          data: {
            providerId: targetProviderId,
            operatorId: newOperator.id,
            upiId: upi,
            imageUrl: qrImage,
            name: `${newOperator.name} QR`,
            accountHolderName: input.accountHolderName?.trim() || null,
            bankName: input.bankName?.trim() || null,
            status: "ACTIVE",
            isActive: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: numericSessionUserId,
          action: "CREATE_OPERATOR",
          entity: "User",
          entityId: String(newOperator.id),
          metadata: JSON.stringify({
            operatorName: newOperator.name,
            qrProviderId: targetProviderId,
          }),
        },
      });

      return newOperator;
    });
  }

  /**
   * Updates an Operator's profile, status, or assigned QR codes.
   */
  static async updateOperator(id: number | string, input: UpdateOperatorInput, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    const existing = await this.getOperatorById(numericId, user);

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone ? normalizeIndianPhone(input.phone) : null;
    if (input.status !== undefined) data.status = input.status.toUpperCase();
    if (input.portalAccess !== undefined) data.portalAccess = Boolean(input.portalAccess);
    if (input.transactionAllowed !== undefined) data.transactionAllowed = Boolean(input.transactionAllowed);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: numericId },
        data,
      });

      if (Array.isArray(input.assignedQrIds)) {
        // Reset old assignments
        await tx.qRCode.updateMany({
          where: { operatorId: numericId },
          data: { operatorId: null },
        });

        // Set new assignments for this provider
        if (input.assignedQrIds.length > 0) {
          const numQrIds = input.assignedQrIds.map((qid) => (typeof qid === "number" ? qid : parseInt(qid, 10)));
          await tx.qRCode.updateMany({
            where: {
              id: { in: numQrIds },
              providerId: existing.qrProviderId!,
            },
            data: { operatorId: numericId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: numericSessionUserId,
          action: "UPDATE_OPERATOR",
          entity: "User",
          entityId: String(numericId),
          metadata: JSON.stringify({
            updatedFields: Object.keys(data),
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Permanently removes an operator owned by the current QR Provider.
   * Any assigned QR codes become available for reassignment.
   */
  static async deleteOperator(id: number | string, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (isNaN(numericId)) throw new ApiError("Invalid operator ID", 400);

    const operator = await this.getOperatorById(numericId, user);

    await prisma.$transaction(async (tx) => {
      // Preserve QR codes and historical orders, while removing this operator's links.
      await tx.qRCode.updateMany({
        where: { operatorId: numericId },
        data: { operatorId: null },
      });
      await tx.order.updateMany({
        where: { verifiedById: numericId },
        data: { verifiedById: null },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId: numericId } });
      if (wallet) {
        await tx.ledgerEntry.deleteMany({ where: { walletId: wallet.id } });
        await tx.wallet.delete({ where: { id: wallet.id } });
      }

      await tx.auditLog.updateMany({
        where: { userId: numericId },
        data: { userId: null },
      });
      await tx.user.delete({ where: { id: numericId } });
      await tx.auditLog.create({
        data: {
          userId: numericSessionUserId,
          action: "DELETE_OPERATOR",
          entity: "User",
          entityId: String(numericId),
          metadata: JSON.stringify({
            deletedOperatorName: operator.name,
            qrProviderId: operator.qrProviderId,
          }),
        },
      });
    });

    return { success: true, name: operator.name };
  }

  /**
   * Assigns a specific array of QR codes to an operator.
   */
  static async assignQRCodes(operatorId: number | string, qrIds: (number | string)[], user: SessionUser) {
    const numericOpId = typeof operatorId === "number" ? operatorId : parseInt(operatorId, 10);
    const operator = await this.getOperatorById(numericOpId, user);

    const numQrIds = Array.isArray(qrIds) ? qrIds.map((qid) => (typeof qid === "number" ? qid : parseInt(qid, 10))) : [];

    return await prisma.$transaction(async (tx) => {
      // Unassign existing QR codes from this operator
      await tx.qRCode.updateMany({
        where: { operatorId: numericOpId },
        data: { operatorId: null },
      });

      // Assign requested QR codes
      if (numQrIds.length > 0) {
        await tx.qRCode.updateMany({
          where: {
            id: { in: numQrIds },
            providerId: operator.qrProviderId!,
          },
          data: { operatorId: numericOpId },
        });
      }

      return await tx.qRCode.findMany({
        where: { operatorId: numericOpId },
      });
    });
  }

  /**
   * Resets an operator's password.
   */
  static async resetPassword(operatorId: number | string, newPassword: string, user: SessionUser) {
    const numericOpId = typeof operatorId === "number" ? operatorId : parseInt(operatorId, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    await this.getOperatorById(numericOpId, user);

    if (!newPassword || newPassword.length < 6) {
      throw new ApiError("Password must be at least 6 characters", 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: numericOpId },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: numericSessionUserId,
        action: "RESET_OPERATOR_PASSWORD",
        entity: "User",
        entityId: String(numericOpId),
      },
    });

    return { success: true, message: "Password updated successfully" };
  }
}
