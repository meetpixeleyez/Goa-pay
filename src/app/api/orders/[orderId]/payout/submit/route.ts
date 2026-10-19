import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { PayoutService } from "@/server/services/payout.service";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await requireAuth(["QR_PROVIDER", "ADMIN", "OPERATOR"]);
    const numericOrderId = parseInt(params.orderId, 10);
    if (isNaN(numericOrderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await PayoutService.submitPayoutProof(numericOrderId, body, session);

    return NextResponse.json({
      success: true,
      message: "Withdrawal payment completed and confirmed immediately.",
      order: result.order,
      fees: result.fees,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
