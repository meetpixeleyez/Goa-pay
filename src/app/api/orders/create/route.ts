import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "MERCHANT"]);
    const data = await request.json();

    const order = await OrderService.createOrder(data, session);

    return NextResponse.json({
      success: true,
      message: `${order.type === "PAYIN" ? "Deposit" : "Withdrawal"} session initiated successfully`,
      order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
