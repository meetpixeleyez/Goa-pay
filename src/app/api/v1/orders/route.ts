import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMerchantRequest, createSignedResponse } from "@/lib/merchant-api-auth";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateMerchantRequest(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const { merchant, decryptedSecret } = authResult;
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const status = searchParams.get("status")?.trim();
    const type = searchParams.get("type")?.trim()?.toUpperCase();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    // Multi-tenant filter
    const where: any = {
      merchantId: merchant.id,
    };

    if (status) {
      where.status = status;
    }
    if (type && (type === "PAYIN" || type === "PAYOUT")) {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          clientOrderId: true,
          type: true,
          amount: true,
          status: true,
          checkoutState: true,
          customerUtr: true,
          verifierUtr: true,
          merchantFee: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const formattedOrders = orders.map((o) => ({
      ...o,
      netSettledAmount: o.type === "PAYIN" ? o.amount - o.merchantFee : o.amount,
      checkoutUrl: o.type === "PAYIN" ? `/checkout/${o.id}` : null,
    }));

    const responsePayload = {
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      orders: formattedOrders,
    };

    return createSignedResponse(responsePayload, decryptedSecret, 200);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
