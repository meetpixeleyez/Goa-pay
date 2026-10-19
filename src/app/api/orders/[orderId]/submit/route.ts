import { NextResponse } from "next/server";
import { handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { customerUtr, customerScreenshot } = await request.json();
    const orderId = parseInt(params.orderId, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await OrderService.submitCustomerPayment(
      orderId,
      customerUtr,
      customerScreenshot
    );

    return NextResponse.json({
      success: true,
      message: "Payment reference submitted successfully. Please wait while the transaction is verified.",
      order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
