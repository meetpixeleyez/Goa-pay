import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["QR_PROVIDER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get("available") === "true";

    const result = await OrderService.getOrders(
      {
        available: availableOnly,
        includeAvailableCount: true,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
        status: searchParams.get("status") || undefined,
        type: (searchParams.get("type") as any) || undefined,
        search: searchParams.get("search") || undefined,
      },
      session
    );

    return NextResponse.json({
      success: true,
      orders: result.orders,
      pagination: result.pagination,
      availablePayoutCount: result.availablePayoutCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

