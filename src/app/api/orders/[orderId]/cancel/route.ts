import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";
import { notifyPayoutCancelled } from "@/lib/socket-server";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = parseInt(params.orderId, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const session = await getSession();
    if (session && session.role !== "ADMIN" && session.portalAccess === false) {
      return NextResponse.json(
        { error: "Portal access is in read-only mode. Create, update, and delete operations are not allowed." },
        { status: 403 }
      );
    }
    const updatedOrder = await OrderService.cancelOrder(orderId, session || undefined);

    if (updatedOrder && updatedOrder.type === "PAYOUT") {
      notifyPayoutCancelled(orderId, updatedOrder.orderNumber);
    }

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully. Reserved exposure released.",
      order: updatedOrder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
