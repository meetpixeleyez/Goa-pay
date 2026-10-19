import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "OPERATOR" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get assigned QR codes
    const assignedQrs = await prisma.qRCode.findMany({
      where: session.role === "OPERATOR" ? { operatorId: session.userId } : {},
      select: { id: true, upiId: true, name: true, isActive: true },
    });

    const qrIds = assignedQrs.map((q) => q.id);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      totalVolume,
      availablePayouts,
    ] = await Promise.all([
      prisma.order.count({
        where: { qrCodeId: { in: qrIds } },
      }),
      prisma.order.count({
        where: { qrCodeId: { in: qrIds }, status: "pending" },
      }),
      prisma.order.count({
        where: { qrCodeId: { in: qrIds }, status: "processing" },
      }),
      prisma.order.count({
        where: { qrCodeId: { in: qrIds }, status: "completed" },
      }),
      prisma.order.aggregate({
        where: { qrCodeId: { in: qrIds }, status: "completed" },
        _sum: { amount: true },
      }),
      prisma.order.count({
        where: {
          type: "PAYOUT",
          status: "pending",
          payoutBroadcast: true,
          qrProviderId: null,
        },
      }),
    ]);

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCompleted = await prisma.order.aggregate({
      where: {
        qrCodeId: { in: qrIds },
        status: "completed",
        updatedAt: { gte: todayStart },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        assignedQrCount: assignedQrs.length,
        activeQrCount: assignedQrs.filter((q) => q.isActive).length,
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        totalVolume: totalVolume._sum.amount || 0,
        availablePayouts,
        todayVolume: todayCompleted._sum.amount || 0,
        todayCount: todayCompleted._count.id || 0,
        assignedQRCodes: assignedQrs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
