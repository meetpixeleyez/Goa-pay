import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { PayoutService } from "@/server/services/payout.service";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const numericOrderId = parseInt(params.orderId, 10);
    if (isNaN(numericOrderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await PayoutService.confirmPayout(numericOrderId, body, session);

    return NextResponse.json({
      success: true,
      message: result.paidByAdmin
        ? "Payout completed directly by Admin and settled successfully."
        : "Payout verified and settled successfully.",
      order: result.order,
      fees: result.fees,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
