import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";
import { getIO } from "@/lib/socket-server";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER", "OPERATOR"]);
    const body = await request.json().catch(() => ({}));
    const { verifierUtr, verifierScreenshot } = body;

    const orderId = parseInt(params.orderId, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const settlementResult = await OrderService.verifyOrderPayment({
      orderId,
      verifierUtr,
      verifierScreenshot,
      user: session,
    });

    const io = getIO();
    if (io) {
      io.emit("stats:update");
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully verified and balances settled!",
      order: settlementResult.order,
      fees: settlementResult.fees,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
