import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateUserData, normalizeIndianPhone, normalizeTelegramId } from "@/lib/validation";

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

    return NextResponse.json({ success: true, user });
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

    const cleanPhone = phone !== undefined ? (phone ? normalizeIndianPhone(phone) : null) : undefined;
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

    if (action === "ADD_BALANCE") {
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
            category: "MANUAL_CREDIT",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Credit by Admin (${session.email})`,
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
              description: description || "Manual Balance Credit",
            }),
          },
        });

        return { wallet: updatedWallet, user: updatedUser, entry };
      });

      return NextResponse.json({
        success: true,
        message: `₹${numAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} added successfully`,
        balance: result.user.balance,
        availableBalance: result.user.availableBalance,
      });
    }

    if (action === "CLEAR_BALANCE") {
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
            category: "MANUAL_DEBIT",
            amount: numAmount,
            balanceAfter: newBalance,
            description:
              description?.trim() ||
              `Manual Balance Deduction (Clear Balance) by Admin (${session.email})`,
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
              description: description || "Manual Balance Deduction (Clear Balance)",
            }),
          },
        });

        return { wallet: updatedWallet, user: updatedUser, entry, clearedAmount: numAmount };
      });

      return NextResponse.json({
        success: true,
        message: `₹${result.clearedAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} cleared successfully`,
        balance: result.user.balance,
        availableBalance: result.user.availableBalance,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: ADD_BALANCE, CLEAR_BALANCE" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
