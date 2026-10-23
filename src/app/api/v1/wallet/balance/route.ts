import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMerchantRequest, createSignedResponse } from "@/lib/merchant-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateMerchantRequest(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const { merchant, decryptedSecret } = authResult;

    // Compute volume statistics
    const [completedPayins, completedPayouts, pendingPayins, pendingPayouts] = await Promise.all([
      prisma.order.aggregate({
        where: { merchantId: merchant.id, type: "PAYIN", status: "completed" },
        _sum: { amount: true, merchantFee: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { merchantId: merchant.id, type: "PAYOUT", status: "completed" },
        _sum: { amount: true, merchantFee: true },
        _count: { id: true },
      }),
      prisma.order.count({
        where: { merchantId: merchant.id, type: "PAYIN", status: { in: ["pending", "processing"] } },
      }),
      prisma.order.count({
        where: { merchantId: merchant.id, type: "PAYOUT", status: { in: ["pending", "processing"] } },
      }),
    ]);

    const totalPayinVolume = completedPayins._sum.amount || 0;
    const totalPayinFees = completedPayins._sum.merchantFee || 0;
    const totalPayoutVolume = completedPayouts._sum.amount || 0;
    const totalPayoutFees = completedPayouts._sum.merchantFee || 0;

    const responsePayload = {
      success: true,
      merchantId: merchant.id,
      merchantName: merchant.name,
      walletBalance: merchant.balance || 0,
      balance: merchant.balance || 0,
      currency: "INR",
      statistics: {
        totalPayinVolume,
        totalPayinFees,
        completedPayinCount: completedPayins._count.id || 0,
        pendingPayinCount: pendingPayins,
        totalPayoutVolume,
        totalPayoutFees,
        completedPayoutCount: completedPayouts._count.id || 0,
        pendingPayoutCount: pendingPayouts,
      },
    };

    return createSignedResponse(responsePayload, decryptedSecret, 200);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
