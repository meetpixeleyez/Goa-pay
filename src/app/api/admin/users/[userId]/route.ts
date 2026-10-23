import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import {
  validateUserData,
  normalizePhone,
  validateUsernameOrName,
} from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          include: {
            order: { select: { id: true, orderNumber: true, amount: true, status: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        qrCodes: {
          include: {
            operator: { select: { id: true, name: true } },
          },
        },
        operators: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            portalAccess: true,
            transactionAllowed: true,
            createdAt: true,
            assignedQRCodes: {
              select: { id: true, upiId: true, name: true, bankName: true, isActive: true },
            },
          },
        },
        qrProvider: { select: { id: true, name: true, phone: true } },
        assignedQRCodes: {
          include: {
            provider: { select: { id: true, name: true } },
          },
        },
        broker: { select: { id: true, name: true, commissionPercent: true } },
        agent: { select: { id: true, name: true, commissionPercent: true } },
        brokeredMerchants: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            payinMerchantFee: true,
            payinQrProviderFee: true,
            payinAgentFee: true,
            payinBrokerFee: true,
            payoutMerchantFee: true,
            payoutQrProviderFee: true,
            payoutAgentFee: true,
            payoutBrokerFee: true,
            createdAt: true,
            _count: { select: { merchantOrders: true } },
          },
        },
        agentQrProviders: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            balance: true,
            exposure: true,
            availableBalance: true,
            qrProviderFee: true,
            createdAt: true,
            _count: { select: { qrCodes: true, providerOrders: true } },
          },
        },
        providerOrders: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            merchant: { select: { id: true, name: true } },
            qrCode: { select: { id: true, upiId: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    const enhancedUser = {
      ...user,
      totalCredit,
      totalDebit,
      calculatedAvailable,
      walletBalance: user.balance,
      // Provide backwards-compatible wallet object for UI
      wallet: {
        id: user.id,
        balance: user.balance,
        entries: user.transactions,
      },
    };

    return NextResponse.json({ success: true, user: enhancedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    const {
      name,
      phone,
      status,
      portalAccess,
      transactionAllowed,
      commissionPercent,
      payinMerchantFee,
      payinQrProviderFee,
      payinAgentFee,
      payinBrokerFee,
      payoutMerchantFee,
      payoutQrProviderFee,
      payoutAgentFee,
      payoutBrokerFee,
      qrProviderFee,
      upiId,
      qrCodeUrl,
      brokerId,
      agentId,
    } = data;

    // Validate update fields
    const validation = validateUserData(data, { isCreate: false });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (existingUser.role === "OPERATOR") {
      return NextResponse.json(
        { error: "Operators are managed exclusively by their parent QR Provider and cannot be modified by Admin." },
        { status: 403 }
      );
    }

    if (name !== undefined && name.trim()) {
      const nameCheck = validateUsernameOrName(name, "Full Name / Username");
      if (!nameCheck.valid) {
        return NextResponse.json({ error: nameCheck.error }, { status: 400 });
      }
    }

    let passwordHash: string | undefined = undefined;
    if (data.password && data.password.trim()) {
      if (data.password.trim().length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(data.password.trim());
    }

    const cleanPhone = phone !== undefined ? (phone ? normalizePhone(phone) : null) : undefined;

    const parseRelationId = (val: any) => {
      if (val === undefined) return undefined;
      if (!val || val === "NONE" || val === "null") return null;
      const num = typeof val === "number" ? val : parseInt(val, 10);
      return isNaN(num) ? null : num;
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        passwordHash: passwordHash !== undefined ? passwordHash : undefined,
        phone: cleanPhone,
        status: status !== undefined ? (status as any) : undefined,
        portalAccess: portalAccess !== undefined ? Boolean(portalAccess) : undefined,
        transactionAllowed: transactionAllowed !== undefined ? Boolean(transactionAllowed) : undefined,
        commissionPercent: commissionPercent !== undefined ? parseFloat(commissionPercent) : undefined,
        payinMerchantFee: payinMerchantFee !== undefined ? parseFloat(payinMerchantFee) : undefined,
        payinQrProviderFee: payinQrProviderFee !== undefined ? parseFloat(payinQrProviderFee) : undefined,
        payinAgentFee: payinAgentFee !== undefined ? parseFloat(payinAgentFee) : undefined,
        payinBrokerFee: payinBrokerFee !== undefined ? parseFloat(payinBrokerFee) : undefined,
        payoutMerchantFee: payoutMerchantFee !== undefined ? parseFloat(payoutMerchantFee) : undefined,
        payoutQrProviderFee: payoutQrProviderFee !== undefined ? parseFloat(payoutQrProviderFee) : undefined,
        payoutAgentFee: payoutAgentFee !== undefined ? parseFloat(payoutAgentFee) : undefined,
        payoutBrokerFee: payoutBrokerFee !== undefined ? parseFloat(payoutBrokerFee) : undefined,
        qrProviderFee: qrProviderFee !== undefined ? parseFloat(qrProviderFee) : undefined,
        upiId: upiId !== undefined ? (upiId ? upiId.trim() : null) : undefined,
        qrCodeUrl: qrCodeUrl !== undefined ? (qrCodeUrl ? qrCodeUrl.trim() : null) : undefined,
        brokerId: parseRelationId(brokerId),
        agentId: parseRelationId(agentId),
      },
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username already taken. Please choose another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, amount, description } = body;

    if (action === "ADD_BALANCE" || action === "DEPOSIT") {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number greater than 0" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        const currentBalance = currentUser?.balance ?? 0;
        const currentExposure = currentUser?.exposure ?? 0;

        const newBalance = Number((currentBalance + numAmount).toFixed(2));
        const newAvailableBalance = Number((newBalance - currentExposure).toFixed(2));

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: newBalance,
            availableBalance: newAvailableBalance,
          },
        });

        const entry = await tx.transaction.create({
          data: {
            userId: user.id,
            type: "DEPOSIT",
            category: "DEPOSIT",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Deposit by Admin (${session.name || "Admin"})`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "MANUAL_CREDIT",
            entity: "User",
            entityId: String(user.id),
            metadata: JSON.stringify({
              targetUserId: user.id,
              targetUserName: user.name,
              targetUserRole: user.role,
              amount: numAmount,
              previousBalance: currentBalance,
              newBalance,
              description: description || "Manual Balance Deposit",
            }),
          },
        });

        return { user: updatedUser, entry };
      });

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

      return NextResponse.json({
        success: true,
        message: `₹${numAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} credited successfully`,
        balance: result.user.balance,
        availableBalance: result.user.availableBalance,
        totalCredit: Number((creditAgg._sum.amount || 0).toFixed(2)),
        totalDebit: Number((debitAgg._sum.amount || 0).toFixed(2)),
      });
    }

    if (action === "CLEAR_BALANCE" || action === "WITHDRAWAL" || action === "DEDUCT_BALANCE") {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number greater than 0" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        const currentBalance = currentUser?.balance ?? 0;
        const currentExposure = currentUser?.exposure ?? 0;
        const availableCap = user.role === "QR_PROVIDER" ? (currentBalance - currentExposure) : currentBalance;

        // Negative balance is strictly forbidden for all roles EXCEPT MERCHANT
        if (user.role !== "MERCHANT") {
          if (numAmount > availableCap || (currentBalance - numAmount) < 0) {
            throw new Error(
              `Insufficient balance. Maximum available for withdrawal is ₹${Math.max(0, availableCap).toLocaleString("en-IN")}. Negative balances are only permitted for Merchants.`
            );
          }
        }

        const newBalance = Number((currentBalance - numAmount).toFixed(2));
        const newAvailableBalance = Number((newBalance - currentExposure).toFixed(2));

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: newBalance,
            availableBalance: newAvailableBalance,
          },
        });

        const entry = await tx.transaction.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            category: "WITHDRAWAL",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Withdrawal by Admin (${session.name || "Admin"})`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "MANUAL_DEBIT",
            entity: "User",
            entityId: String(user.id),
            metadata: JSON.stringify({
              targetUserId: user.id,
              targetUserName: user.name,
              targetUserRole: user.role,
              amount: numAmount,
              previousBalance: currentBalance,
              newBalance,
              description: description || "Manual Balance Withdrawal",
            }),
          },
        });

        return { user: updatedUser, entry, clearedAmount: numAmount };
      });

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

      return NextResponse.json({
        success: true,
        message: `₹${result.clearedAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} debited successfully`,
        balance: result.user.balance,
        availableBalance: result.user.availableBalance,
        totalCredit: Number((creditAgg._sum.amount || 0).toFixed(2)),
        totalDebit: Number((debitAgg._sum.amount || 0).toFixed(2)),
      });
    }

    if (
      action === "MANAGE_CREDIT" ||
      action === "ADD_CREDIT" ||
      action === "DEDUCT_CREDIT"
    ) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number greater than 0" },
          { status: 400 }
        );
      }

      const creditOperation =
        action === "ADD_CREDIT"
          ? "ADD"
          : action === "DEDUCT_CREDIT"
          ? "DEDUCT"
          : (body.creditType || "ADD").toUpperCase();

      const currentCredit = Number((user.credit || 0).toFixed(2));

      if (creditOperation === "DEDUCT" && numAmount > currentCredit) {
        return NextResponse.json(
          { error: `Cannot deduct ₹${numAmount}. Current credit is only ₹${currentCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { status: 400 }
        );
      }

      const newCredit =
        creditOperation === "ADD"
          ? Number((currentCredit + numAmount).toFixed(2))
          : Math.max(0, Number((currentCredit - numAmount).toFixed(2)));

      await prisma.user.update({
        where: { id: user.id },
        data: { credit: newCredit },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: creditOperation === "ADD" ? "MANUAL_ADD_CREDIT" : "MANUAL_DEDUCT_CREDIT",
          entity: "User",
          entityId: String(user.id),
          metadata: JSON.stringify({
            targetUserId: user.id,
            targetUserName: user.name,
            targetUserRole: user.role,
            creditOperation,
            amount: numAmount,
            previousCredit: currentCredit,
            newCredit,
            description: description || `Credit ${creditOperation === "ADD" ? "Added" : "Deducted"} by Admin`,
          }),
        },
      });

      // Create a transaction so it appears in passbook/statement
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: creditOperation === "ADD" ? "DEPOSIT" : "WITHDRAWAL",
          category: creditOperation === "ADD" ? "ADD_CREDIT" : "DEDUCT_CREDIT",
          amount: numAmount,
          balanceAfter: user.balance,
          description:
            description?.trim() ||
            `Credit ${creditOperation === "ADD" ? "Added (+₹" + numAmount.toFixed(2) + ")" : "Deducted (-₹" + numAmount.toFixed(2) + ")"} by Admin (${session.name || "Admin"})`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `₹${numAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} credit ${creditOperation === "ADD" ? "added" : "deducted"} successfully`,
        credit: newCredit,
        balance: user.balance,
        availableBalance: user.availableBalance,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: ADD_BALANCE, DEPOSIT, CLEAR_BALANCE, WITHDRAWAL, DEDUCT_BALANCE, MANAGE_CREDIT" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
