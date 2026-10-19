import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["MERCHANT", "ADMIN"]);
    const { searchParams } = new URL(request.url);

    const result = await OrderService.getOrders(
      {
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}
