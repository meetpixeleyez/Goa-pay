import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { PayoutService } from "@/server/services/payout.service";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await requireAuth(["QR_PROVIDER", "ADMIN", "OPERATOR"], { requireWrite: true });
    const numericOrderId = parseInt(params.orderId, 10);
    if (isNaN(numericOrderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const updatedOrder = await PayoutService.releasePayout(numericOrderId, session);

    return NextResponse.json({
      success: true,
      message: "Order assignment cancelled. Order is now pending in the pool for other providers.",
      order: updatedOrder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
