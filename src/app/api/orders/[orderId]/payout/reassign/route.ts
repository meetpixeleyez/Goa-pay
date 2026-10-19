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

    const updated = await PayoutService.reassignPayout(numericOrderId, session);

    return NextResponse.json({
      success: true,
      message: "Order reassigned and rebroadcasted to all QR providers",
      order: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
