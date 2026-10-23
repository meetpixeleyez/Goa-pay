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
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    // Format user response
    const formattedUsers = users.map((u) => {
      const balance = Number((u.balance ?? 0).toFixed(2));
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
      { error: error.message || "Failed to fetch Hawala transfer data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hawala
 * Execute an atomic Hawala balance transfer between any two accounts.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const fromUserId = Number(body.fromUserId);
    const toUserId = Number(body.toUserId);
    const amount = Number(body.amount);
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";

    // Validation
    if (!fromUserId || isNaN(fromUserId)) {
      return NextResponse.json(
        { error: "Sender account (From) is required" },
        { status: 400 }
      );
    }

    if (!toUserId || isNaN(toUserId)) {
      return NextResponse.json(
        { error: "Recipient account (To) is required" },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "Sender and recipient accounts cannot be the same" },
        { status: 400 }
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Transfer amount must be a positive number greater than 0" },
        { status: 400 }
      );
    }

    // 1. Fetch both parties
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: fromUserId },
      }),
      prisma.user.findUnique({
        where: { id: toUserId },
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
    const fromCurrentBalance = Number((fromUser.balance ?? 0).toFixed(2));
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
            })}.`,
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
      const toCurrentBalance = Number((toUser.balance ?? 0).toFixed(2));
      const toExposure = Number((toUser.exposure ?? 0).toFixed(2));

      // Compute new balances
      const newFromBalance = Number((fromCurrentBalance - amount).toFixed(2));
      const newFromAvailable = Number((newFromBalance - fromExposure).toFixed(2));

      const newToBalance = Number((toCurrentBalance + amount).toFixed(2));
      const newToAvailable = Number((newToBalance - toExposure).toFixed(2));

      // Update From Party
      const updatedFromUser = await tx.user.update({
        where: { id: fromUser.id },
        data: {
          balance: newFromBalance,
          availableBalance: newFromAvailable,
        },
      });

      // Update To Party
      const updatedToUser = await tx.user.update({
        where: { id: toUser.id },
        data: {
          balance: newToBalance,
          availableBalance: newToAvailable,
        },
      });

      // Transaction Debit for From Party
      const fromDescription = `Hawala Transfer OUT to ${toUser.name} (${toUser.role})${
        remarks ? ` | Note: ${remarks}` : ""
      } [Ref: ${hawalaRef}]`;

      await tx.transaction.create({
        data: {
          userId: fromUser.id,
          type: "WITHDRAWAL",
          category: "HAWALA_TRANSFER",
          amount,
          balanceAfter: newFromBalance,
          description: fromDescription,
        },
      });

      // Transaction Credit for To Party
      const toDescription = `Hawala Transfer IN from ${fromUser.name} (${fromUser.role})${
        remarks ? ` | Note: ${remarks}` : ""
      } [Ref: ${hawalaRef}]`;

      await tx.transaction.create({
        data: {
          userId: toUser.id,
          type: "DEPOSIT",
          category: "HAWALA_RECEIPT",
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
          entity: "User",
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
        reference: hawalaRef,
        fromUserName: fromUser.name,
        toUserName: toUser.name,
        from: {
          id: fromUser.id,
          name: fromUser.name,
          role: fromUser.role,
          newBalance: newFromBalance,
        },
        to: {
          id: toUser.id,
          name: toUser.name,
          role: toUser.role,
          newBalance: newToBalance,
        },
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
