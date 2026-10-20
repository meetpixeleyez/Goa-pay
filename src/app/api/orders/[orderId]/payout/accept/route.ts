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

    const body = await request.json().catch(() => ({}));
    const order = await PayoutService.acceptPayout(numericOrderId, body, session);

    return NextResponse.json({
      success: true,
      message: "Withdrawal order accepted! 5-minute fulfillment window started.",
      order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
