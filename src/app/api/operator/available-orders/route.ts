import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "OPERATOR" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availableOrders = await prisma.order.findMany({
      where: {
        type: "PAYOUT",
        status: "pending",
        payoutBroadcast: true,
        qrProviderId: null,
      },
      include: {
        merchant: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch operator's active assigned QR codes to display for accepting
    const assignedQrs = await prisma.qRCode.findMany({
      where: session.role === "OPERATOR" ? { operatorId: session.userId, isActive: true } : { isActive: true },
      select: {
        id: true,
        upiId: true,
        name: true,
        bankName: true,
        accountHolderName: true,
      },
    });

    return NextResponse.json({
      success: true,
      orders: availableOrders,
      assignedQRCodes: assignedQrs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
