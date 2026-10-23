import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      qrCodes: true,
      assignedQRCodes: true,
      qrProvider: {
        select: {
          id: true,
          name: true,
          status: true,
          transactionAllowed: true,
          balance: true,
          exposure: true,
          availableBalance: true,
        },
      },
    },
  });

  if (!user || user.status === "INACTIVE") {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // If Operator, also check parent QR Provider status
  if (user.role === "OPERATOR" && user.qrProvider?.status === "INACTIVE") {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      status: user.status,
      portalAccess: user.portalAccess,
      transactionAllowed: user.transactionAllowed,
      balance: user.balance,
      exposure: user.exposure,
      availableBalance: user.availableBalance,
      walletBalance: user.balance,
      qrCodes: user.role === "OPERATOR" ? user.assignedQRCodes || [] : user.qrCodes || [],
      assignedQRCodes: user.assignedQRCodes || [],
      qrProviderId: user.qrProviderId,
      qrProvider: user.qrProvider,
    },
  });
}
