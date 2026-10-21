import prisma from "@/lib/prisma";
import { isValidUpiId } from "@/lib/validation";
import { ApiError } from "@/types/api";
import { CreateQRCodeInput, UpdateQRCodeInput, QRCodeItem } from "@/types/qr-provider";

export interface SessionUser {
  userId: number | string;
  role: string;
  email?: string;
  name?: string;
}

export class QRCodeService {
  /**
   * Retrieves QR Codes based on caller's role (Admin, QR Provider, or Operator).
   */
  static async getQRCodes(
    params: { providerId?: number | string | null; operatorId?: number | string | null; isActive?: boolean } = {},
    user: SessionUser
  ): Promise<QRCodeItem[]> {
    const where: any = {};
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    if (user.role === "ADMIN") {
      if (params.providerId) {
        where.providerId = typeof params.providerId === "number" ? params.providerId : parseInt(params.providerId, 10);
      }
      if (params.operatorId) {
        where.operatorId = typeof params.operatorId === "number" ? params.operatorId : parseInt(params.operatorId, 10);
      }
    } else if (user.role === "QR_PROVIDER") {
      where.providerId = numericSessionUserId;
      if (params.operatorId) {
        where.operatorId = typeof params.operatorId === "number" ? params.operatorId : parseInt(params.operatorId, 10);
      }
    } else if (user.role === "OPERATOR") {
      where.operatorId = numericSessionUserId;
    } else {
      throw new ApiError("Unauthorized", 403);
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const qrCodes = await prisma.qRCode.findMany({
      where,
      include: {
        operator: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return qrCodes as unknown as QRCodeItem[];
  }

  /**
   * Retrieves single QR Code with security ownership check.
   */
  static async getQRCodeById(id: number | string, user: SessionUser): Promise<QRCodeItem> {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);

    const qrCode = await prisma.qRCode.findUnique({
      where: { id: numericId },
      include: {
        operator: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });

    if (!qrCode) throw new ApiError("QR Code not found", 404);

    if (user.role === "QR_PROVIDER" && qrCode.providerId !== numericSessionUserId) {
      throw new ApiError("Unauthorized access to this QR Code", 403);
    }

    if (user.role === "OPERATOR" && qrCode.operatorId !== numericSessionUserId) {
      throw new ApiError("Unauthorized access to this QR Code", 403);
    }

    return qrCode as unknown as QRCodeItem;
  }

  /**
   * Creates a new QR Code with UPI format validation and optional operator assignment.
   */
  static async createQRCode(input: CreateQRCodeInput, user: SessionUser) {
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    let targetProviderId = numericSessionUserId;

    if (user.role === "ADMIN") {
      if (!input.providerId) {
        throw new ApiError("Target Provider ID is required when created by Admin", 400);
      }
      targetProviderId = typeof input.providerId === "number" ? input.providerId : parseInt(input.providerId, 10);
    } else if (user.role === "OPERATOR") {
      const op = await prisma.user.findUnique({
        where: { id: numericSessionUserId },
        select: { qrProviderId: true },
      });
      if (!op || !op.qrProviderId) {
        throw new ApiError("Operator is not linked to any QR Provider", 400);
      }
      targetProviderId = op.qrProviderId;
    } else if (user.role !== "QR_PROVIDER") {
      throw new ApiError("Only QR Providers, Operators, and Admins can create QR Codes", 403);
    }

    const cleanUpi = input.upiId?.trim() || "";
    if (!cleanUpi) {
      throw new ApiError("UPI ID (VPA) is required", 400);
    }

    if (!isValidUpiId(cleanUpi)) {
      throw new ApiError("Please enter a valid UPI ID (e.g. username@bank, name@okhdfcbank)", 400);
    }

    // Verify operator belongs to this QR Provider if assigned
    let assignedOperatorId: number | null = null;
    if (user.role === "OPERATOR") {
      assignedOperatorId = numericSessionUserId;
    } else if (input.operatorId) {
      const numOpId = typeof input.operatorId === "number" ? input.operatorId : parseInt(input.operatorId, 10);
      const op = await prisma.user.findFirst({
        where: { id: numOpId, role: "OPERATOR" },
      });
      if (op) {
        if (user.role === "ADMIN" || op.qrProviderId === targetProviderId) {
          assignedOperatorId = op.id;
        } else {
          throw new ApiError("Selected operator does not belong to this QR Provider", 400);
        }
      }
    }

    const finalImageUrl =
      input.imageUrl && input.imageUrl.trim()
        ? input.imageUrl.trim()
        : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(cleanUpi)}`;

    const activeBool = input.isActive !== undefined ? Boolean(input.isActive) : true;

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    // If assigned to an operator and active, deactivate all other QR codes for this operator
    if (assignedOperatorId && activeBool) {
      await prisma.qRCode.updateMany({
        where: { operatorId: assignedOperatorId },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    return await prisma.qRCode.create({
      data: {
        providerId: targetProviderId,
        operatorId: assignedOperatorId,
        upiId: cleanUpi,
        imageUrl: finalImageUrl,
        name: input.accountHolderName?.trim()
          ? `${input.accountHolderName.trim()} QR`
          : `${cleanUpi} QR`,
        accountHolderName: input.accountHolderName?.trim() || null,
        bankName: input.bankName?.trim() || null,
        status: activeBool ? "ACTIVE" : "INACTIVE",
        isActive: activeBool,
      },
      include: {
        operator: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Toggles QR Code activation status.
   * If activating a QR code belonging to an operator, automatically deactivates all other QR codes of that operator.
   */
  static async toggleQRCodeStatus(id: number | string, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const qrCode = await this.getQRCodeById(numericId, user);

    const newActiveState = !qrCode.isActive;

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    // If activating this QR code and it belongs to an operator, deactivate all other QR codes for this operator
    if (newActiveState && qrCode.operatorId) {
      const numOpId = typeof qrCode.operatorId === "number" ? qrCode.operatorId : parseInt(String(qrCode.operatorId), 10);
      await prisma.qRCode.updateMany({
        where: {
          operatorId: numOpId,
          id: { not: numericId },
        },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    return await prisma.qRCode.update({
      where: { id: numericId },
      data: {
        isActive: newActiveState,
        status: newActiveState ? "ACTIVE" : "INACTIVE",
      },
      include: {
        operator: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Updates an existing QR Code record.
   * If updating an operator QR code to active, automatically deactivates all other QR codes of that operator.
   */
  static async updateQRCode(id: number | string, input: UpdateQRCodeInput, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    const numericSessionUserId = typeof user.userId === "number" ? user.userId : parseInt(user.userId as any, 10);
    const qrCode = await this.getQRCodeById(numericId, user);

    const data: any = {};
    if (input.upiId !== undefined) {
      const cleanUpi = input.upiId.trim();
      if (!isValidUpiId(cleanUpi)) {
        throw new ApiError("Please enter a valid UPI ID", 400);
      }
      data.upiId = cleanUpi;
      if (!input.imageUrl) {
        data.imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(cleanUpi)}`;
      }
    }

    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl?.trim() || null;
    if (input.accountHolderName !== undefined) data.accountHolderName = input.accountHolderName?.trim() || null;
    if (input.bankName !== undefined) data.bankName = input.bankName?.trim() || null;
    if (input.isActive !== undefined) {
      data.isActive = Boolean(input.isActive);
      data.status = data.isActive ? "ACTIVE" : "INACTIVE";
    }

    if (input.operatorId !== undefined) {
      if (input.operatorId === null || input.operatorId === "" || input.operatorId === "NONE") {
        data.operatorId = null;
      } else {
        const numOpId = typeof input.operatorId === "number" ? input.operatorId : parseInt(input.operatorId, 10);
        const op = await prisma.user.findFirst({
          where: { id: numOpId, role: "OPERATOR" },
        });
        if (!op) throw new ApiError("Selected operator does not exist", 400);
        if (user.role === "QR_PROVIDER" && op.qrProviderId !== numericSessionUserId) {
          throw new ApiError("Cannot assign QR code to operator of another provider", 403);
        }
        data.operatorId = op.id;
      }
    }

    const targetOperatorId = data.operatorId !== undefined ? data.operatorId : qrCode.operatorId;
    const targetIsActive = data.isActive !== undefined ? data.isActive : qrCode.isActive;

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    // If setting active on an operator's QR code, deactivate all other QR codes for this operator
    if (targetOperatorId && targetIsActive) {
      const numTargetOpId = typeof targetOperatorId === "number" ? targetOperatorId : parseInt(String(targetOperatorId), 10);
      await prisma.qRCode.updateMany({
        where: {
          operatorId: numTargetOpId,
          id: { not: numericId },
        },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    return await prisma.qRCode.update({
      where: { id: numericId },
      data,
      include: {
        operator: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Deletes a QR Code if no completed orders depend on it.
   */
  static async deleteQRCode(id: number | string, user: SessionUser) {
    const numericId = typeof id === "number" ? id : parseInt(id, 10);
    await this.getQRCodeById(numericId, user);

    const assignedOrdersCount = await prisma.order.count({
      where: { qrCodeId: numericId },
    });

    if (assignedOrdersCount > 0) {
      throw new ApiError(
        `Cannot delete QR Code with ${assignedOrdersCount} historical order(s). Disable it instead.`,
        400
      );
    }

    return await prisma.qRCode.delete({
      where: { id: numericId },
    });
  }
}
