import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/hawala
 * Fetch all eligible non-operator accounts and recent Hawala transfer history.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1. Fetch all accounts except OPERATOR and ADMIN
    const users = await prisma.user.findMany({
      where: {
        role: {
          notIn: ["OPERATOR", "ADMIN"],
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        balance: true,
        exposure: true,
        availableBalance: true,
        wallet: {
          select: {
            id: true,
            balance: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    // Format user response
    const formattedUsers = users.map((u) => {
      const balance = Number((u.balance ?? u.wallet?.balance ?? 0).toFixed(2));
      const exposure = Number((u.exposure ?? 0).toFixed(2));
      const availableBalance =
        u.role === "QR_PROVIDER"
          ? Number((balance - exposure).toFixed(2))
          : balance;

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        phone: u.phone,
        balance,
        exposure,
        availableBalance,
        walletId: u.wallet?.id,
      };
    });

    // 2. Fetch recent Hawala transfers from AuditLog
    const logs = await prisma.auditLog.findMany({
      where: {
        action: "HAWALA_TRANSFER",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const history = logs.map((log) => {
      let meta: any = {};
      try {
        meta = JSON.parse(log.metadata || "{}");
      } catch {
        meta = {};
      }
      return {
        id: log.id,
        createdAt: log.createdAt,
        hawalaRef: meta.hawalaRef || log.entityId || `HWL-${log.id}`,
        fromUserId: meta.fromUserId,
        fromUserName: meta.fromUserName || "Unknown",
        fromUserRole: meta.fromUserRole || "",
        toUserId: meta.toUserId,
        toUserName: meta.toUserName || "Unknown",
        toUserRole: meta.toUserRole || "",
        amount: Number(meta.amount || 0),
        remarks: meta.remarks || null,
        fromBalanceAfter: meta.fromBalanceAfter,
        toBalanceAfter: meta.toBalanceAfter,
        executedBy: meta.executedBy || "Admin",
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      history,
    });
  } catch (error: any) {
    console.error("GET /api/admin/hawala error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Hawala accounts and history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hawala
 * Execute an atomic inter-account Hawala balance transfer.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const fromUserId = parseInt(body.fromUserId, 10);
    const toUserId = parseInt(body.toUserId, 10);
    const amount = parseFloat(body.amount);
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";

    if (isNaN(fromUserId) || isNaN(toUserId)) {
      return NextResponse.json(
        { error: "Please select both a valid From account and To account" },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "Source and destination accounts cannot be the same" },
        { status: 400 }
      );
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Transfer amount must be greater than ₹0" },
        { status: 400 }
      );
    }

    // 1. Fetch both parties
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: fromUserId },
        include: { wallet: true },
      }),
      prisma.user.findUnique({
        where: { id: toUserId },
        include: { wallet: true },
      }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json(
        { error: "One or both selected accounts were not found" },
        { status: 404 }
      );
    }

    if (fromUser.role === "OPERATOR" || toUser.role === "OPERATOR") {
      return NextResponse.json(
        { error: "QR Operators are sub-users and cannot participate in Hawala balance transfers" },
        { status: 400 }
      );
    }

    // 2. Strict Balance Cap for Non-Merchant accounts
    const fromCurrentBalance = Number(
      (fromUser.balance ?? fromUser.wallet?.balance ?? 0).toFixed(2)
    );
    const fromExposure = Number((fromUser.exposure ?? 0).toFixed(2));
    const fromAvailable =
      fromUser.role === "QR_PROVIDER"
        ? fromCurrentBalance - fromExposure
        : fromCurrentBalance;

    if (fromUser.role !== "MERCHANT") {
      if (amount > fromAvailable || fromCurrentBalance - amount < 0) {
        return NextResponse.json(
          {
            error: `Insufficient balance for ${fromUser.name}. Available balance is ₹${Math.max(
              0,
              fromAvailable
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}. Negative balance is only permitted for Merchants.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Execute Atomic Transfer inside Transaction
    const hawalaRef = `HWL-${Date.now().toString().slice(-6)}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const result = await prisma.$transaction(async (tx) => {
      // Ensure Wallets exist for both
      let fromWallet = fromUser.wallet;
      if (!fromWallet) {
        fromWallet = await tx.wallet.create({
          data: { userId: fromUser.id, balance: fromCurrentBalance },
        });
      }

      let toWallet = toUser.wallet;
      const toCurrentBalance = Number(
        (toUser.balance ?? toUser.wallet?.balance ?? 0).toFixed(2)
      );
      const toExposure = Number((toUser.exposure ?? 0).toFixed(2));

      if (!toWallet) {
        toWallet = await tx.wallet.create({
          data: { userId: toUser.id, balance: toCurrentBalance },
        });
      }

      // Compute new balances
      const newFromBalance = Number((fromCurrentBalance - amount).toFixed(2));
      const newFromAvailable = Number((newFromBalance - fromExposure).toFixed(2));

      const newToBalance = Number((toCurrentBalance + amount).toFixed(2));
      const newToAvailable = Number((newToBalance - toExposure).toFixed(2));

      // Update From Party
      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: newFromBalance },
      });
      const updatedFromUser = await tx.user.update({
        where: { id: fromUser.id },
        data: {
          balance: newFromBalance,
          availableBalance: newFromAvailable,
        },
      });

      // Update To Party
      await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: newToBalance },
      });
      const updatedToUser = await tx.user.update({
        where: { id: toUser.id },
        data: {
          balance: newToBalance,
          availableBalance: newToAvailable,
        },
      });

      // Ledger Debit for From Party
      const fromDescription = `Hawala Transfer OUT to ${toUser.name} (${toUser.role})${
        remarks ? ` | Note: ${remarks}` : ""
      } [Ref: ${hawalaRef}]`;

      await tx.ledgerEntry.create({
        data: {
          walletId: fromWallet.id,
          type: "DR",
          category: "HAWALA",
          amount,
          balanceAfter: newFromBalance,
          description: fromDescription,
        },
      });

      // Ledger Credit for To Party
      const toDescription = `Hawala Transfer IN from ${fromUser.name} (${fromUser.role})${
        remarks ? ` | Note: ${remarks}` : ""
      } [Ref: ${hawalaRef}]`;

      await tx.ledgerEntry.create({
        data: {
          walletId: toWallet.id,
          type: "CR",
          category: "HAWALA",
          amount,
          balanceAfter: newToBalance,
          description: toDescription,
        },
      });

      // Audit Log Record
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "HAWALA_TRANSFER",
          entity: "Wallet",
          entityId: hawalaRef,
          metadata: JSON.stringify({
            hawalaRef,
            fromUserId: fromUser.id,
            fromUserName: fromUser.name,
            fromUserRole: fromUser.role,
            toUserId: toUser.id,
            toUserName: toUser.name,
            toUserRole: toUser.role,
            amount,
            remarks: remarks || null,
            fromBalanceBefore: fromCurrentBalance,
            fromBalanceAfter: newFromBalance,
            toBalanceBefore: toCurrentBalance,
            toBalanceAfter: newToBalance,
            executedBy: session.name || "Admin",
          }),
        },
      });

      return {
        hawalaRef,
        fromUserName: fromUser.name,
        toUserName: toUser.name,
        amount,
        newFromBalance,
        newToBalance,
      };
    });

    return NextResponse.json({
      success: true,
      message: `₹${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })} transferred successfully from ${fromUser.name} to ${toUser.name} via Hawala`,
      transfer: result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/hawala error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute Hawala balance transfer" },
      { status: 500 }
    );
  }
}
