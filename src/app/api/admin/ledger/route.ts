import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const entries = await prisma.ledgerEntry.findMany({
      include: {
        wallet: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        order: {
          select: { id: true, orderNumber: true, amount: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
