import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notifyOrderUpdated } from "@/lib/socket-server";

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "MERCHANT" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const numericOrderId = parseInt(params.orderId, 10);
    if (isNaN(numericOrderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: numericOrderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Merchants can only update their own orders
    if (session.role === "MERCHANT" && order.merchantId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
    }

    if (order.status === "completed" || order.status === "rejected" || order.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot update customer QR for order with status '${order.status}'` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerQrImage,
      customerUpiId,
      beneficiaryDetails,
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      accountType,
    } = body;

    const dataToUpdate: any = {};
    if (customerQrImage !== undefined) {
      dataToUpdate.customerQrImage = customerQrImage ? customerQrImage.trim() : null;
    }
    if (customerUpiId !== undefined) {
      dataToUpdate.customerUpiId = customerUpiId ? customerUpiId.trim() : null;
    }

    if (accountNumber && ifscCode) {
      dataToUpdate.beneficiaryDetails = JSON.stringify({
        accountNumber: accountNumber.trim().replace(/[\s\-]/g, ""),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountHolderName: (accountHolderName || order.customerName).trim(),
        bankName: (bankName || "").trim() || undefined,
        accountType: (accountType || "SAVINGS").trim(),
      });
    } else if (beneficiaryDetails !== undefined) {
      dataToUpdate.beneficiaryDetails = beneficiaryDetails ? beneficiaryDetails.trim() : null;
    }

    const updated = await prisma.order.update({
      where: { id: numericOrderId },
      data: dataToUpdate,
      include: {
        merchant: { select: { id: true, name: true } },
        qrProvider: { select: { id: true, name: true } },
      },
    });

    notifyOrderUpdated(updated);

    return NextResponse.json({
      success: true,
      message: "Customer QR code image and UPI details updated successfully",
      order: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
