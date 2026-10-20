import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import {
  validateUserData,
  normalizePhone,
  isValidPhone,
  validateUsernameOrName,
  normalizeTelegramId,
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
        wallet: {
          include: {
            entries: {
              include: {
                order: { select: { id: true, orderNumber: true, amount: true, status: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        qrCodes: {
          include: {
            operator: { select: { id: true, name: true, email: true } },
          },
        },
        operators: {
          select: {
            id: true,
            name: true,
            email: true,
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
        qrProvider: { select: { id: true, name: true, email: true, phone: true } },
        assignedQRCodes: {
          include: {
            provider: { select: { id: true, name: true } },
          },
        },
        broker: { select: { id: true, name: true, email: true, commissionPercent: true } },
        agent: { select: { id: true, name: true, email: true, commissionPercent: true } },
        brokeredMerchants: {
          select: {
            id: true,
            name: true,
            email: true,
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
            email: true,
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

    let totalCredit = 0;
    let totalDebit = 0;
    if (user.wallet?.id) {
      const [creditAgg, debitAgg] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { walletId: user.wallet.id, type: "CR" },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { walletId: user.wallet.id, type: "DR" },
          _sum: { amount: true },
        }),
      ]);
      totalCredit = Number((creditAgg._sum.amount || 0).toFixed(2));
      totalDebit = Number((debitAgg._sum.amount || 0).toFixed(2));
    }

    const calculatedAvailable = Number(((user.balance || 0) - (user.exposure || 0)).toFixed(2));

    let userCredit = 0;
    try {
      const creditRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT credit FROM User WHERE id = ?`,
        user.id
      );
      userCredit = Number((creditRows?.[0]?.credit ?? (user as any).credit ?? 0).toFixed(2));
    } catch {
      userCredit = Number(((user as any).credit || 0).toFixed(2));
    }

    const enhancedUser = {
      ...user,
      credit: userCredit,
      totalCredit,
      totalDebit,
      availableBalance: calculatedAvailable,
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
      address,
      telegramId,
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
    const cleanTelegram = telegramId !== undefined ? normalizeTelegramId(telegramId) : undefined;

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
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        telegramId: cleanTelegram,
        status: status !== undefined ? status : undefined,
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
        qrProviderFee: qrProviderFee !== undefined ? parseFloat(qrProviderFee) : (payinQrProviderFee !== undefined ? parseFloat(payinQrProviderFee) : undefined),
        upiId: upiId !== undefined ? (upiId ? upiId.trim() : null) : undefined,
        qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : undefined,
        brokerId: parseRelationId(brokerId),
        agentId: parseRelationId(agentId),
        qrProviderId: parseRelationId(data.qrProviderId),
      },
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
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
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let wallet = user.wallet;
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id, balance: user.balance || 0.0 },
      });
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
        const currentWallet = await tx.wallet.findUnique({
          where: { id: wallet.id },
        });
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        const currentBalance = currentUser?.balance ?? currentWallet?.balance ?? 0;
        const currentExposure = currentUser?.exposure ?? 0;

        const newBalance = Number((currentBalance + numAmount).toFixed(2));
        const newAvailableBalance = Number((newBalance - currentExposure).toFixed(2));

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: newBalance,
            availableBalance: newAvailableBalance,
          },
        });

        const entry = await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "CR",
            category: "DEPOSIT",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Deposit by Admin (${session.email})`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "MANUAL_CREDIT",
            entity: "Wallet",
            entityId: String(wallet.id),
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

        return { wallet: updatedWallet, user: updatedUser, entry };
      });

      const [creditAgg, debitAgg] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { walletId: wallet.id, type: "CR" },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { walletId: wallet.id, type: "DR" },
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
        const currentWallet = await tx.wallet.findUnique({
          where: { id: wallet.id },
        });
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        const currentBalance = currentUser?.balance ?? currentWallet?.balance ?? 0;
        const currentExposure = currentUser?.exposure ?? 0;

        // Admin can withdraw any amount, even exceeding balance. Negative balances allowed!
        const newBalance = Number((currentBalance - numAmount).toFixed(2));
        const newAvailableBalance = Number((newBalance - currentExposure).toFixed(2));

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: newBalance,
            availableBalance: newAvailableBalance,
          },
        });

        const entry = await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "DR",
            category: "WITHDRAWAL",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Withdrawal by Admin (${session.email})`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "MANUAL_DEBIT",
            entity: "Wallet",
            entityId: String(wallet.id),
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

        return { wallet: updatedWallet, user: updatedUser, entry, clearedAmount: numAmount };
      });

      const [creditAgg, debitAgg] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { walletId: wallet.id, type: "CR" },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { walletId: wallet.id, type: "DR" },
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
          : (body.creditType || "ADD").toUpperCase(); // "ADD" or "DEDUCT"

      let currentCredit = 0;
      try {
        const creditRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT credit FROM User WHERE id = ?`,
          user.id
        );
        currentCredit = Number((creditRows?.[0]?.credit ?? 0).toFixed(2));
      } catch {
        currentCredit = Number(((user as any).credit || 0).toFixed(2));
      }

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

      // Update user credit directly via SQLite - STRICTLY does NOT touch balance, availableBalance, or wallet!
      await prisma.$executeRawUnsafe(
        `UPDATE User SET credit = ? WHERE id = ?`,
        newCredit,
        user.id
      );

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

      // Also create a ledger entry so it appears in Liquidity Ledger & Statement
      if (wallet?.id) {
        await prisma.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: creditOperation === "ADD" ? "CR" : "DR",
            category: creditOperation === "ADD" ? "ADD_CREDIT" : "DEDUCT_CREDIT",
            amount: numAmount,
            balanceAfter: user.balance,
            description:
              description?.trim() ||
              `Credit ${creditOperation === "ADD" ? "Added (+₹" + numAmount.toFixed(2) + ")" : "Deducted (-₹" + numAmount.toFixed(2) + ")"} by Admin (${session.email})`,
          },
        });
      }

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

export async function DELETE(
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

    // Prevent deleting own admin session account
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "OPERATOR") {
      return NextResponse.json(
        { error: "Operators are managed exclusively by their parent QR Provider and cannot be deleted by Admin." },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink any assigned QR codes or relations
      await tx.qRCode.updateMany({
        where: { operatorId: userId },
        data: { operatorId: null },
      });

      await tx.user.updateMany({
        where: { brokerId: userId },
        data: { brokerId: null },
      });

      await tx.user.updateMany({
        where: { agentId: userId },
        data: { agentId: null },
      });

      await tx.user.updateMany({
        where: { qrProviderId: userId },
        data: { qrProviderId: null },
      });

      // 2. Delete wallet and ledger entries
      const userWallet = await tx.wallet.findUnique({ where: { userId } });
      if (userWallet) {
        await tx.ledgerEntry.deleteMany({ where: { walletId: userWallet.id } });
        await tx.wallet.delete({ where: { id: userWallet.id } });
      }

      // 3. Delete QR codes if provider
      await tx.qRCode.deleteMany({ where: { providerId: userId } });

      // 4. Delete API keys & webhook deliveries
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.webhookDelivery.deleteMany({ where: { merchantId: userId } });

      // 5. Delete user record
      await tx.user.delete({ where: { id: userId } });

      // 6. Record audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "DELETE_USER",
          entity: "User",
          entityId: String(userId),
          metadata: JSON.stringify({
            deletedUserId: userId,
            deletedUserName: user.name,
            deletedUserRole: user.role,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `User "${user.name}" has been permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
