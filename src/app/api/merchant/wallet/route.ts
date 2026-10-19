import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "MERCHANT" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        entries: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                amount: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      balance: wallet?.balance || 0.0,
      walletId: wallet?.id,
      entries: wallet?.entries || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
