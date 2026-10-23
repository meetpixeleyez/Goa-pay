import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMerchantRequest, createSignedResponse } from "@/lib/merchant-api-auth";

export async function GET(
  request: Request,
  { params }: { params: { orderNumberOrId: string } }
) {
  try {
    const authResult = await authenticateMerchantRequest(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const { merchant, decryptedSecret } = authResult;
    const identifier = params.orderNumberOrId?.trim();

    if (!identifier) {
      return createSignedResponse({ error: "Order identifier is required." }, decryptedSecret, 400);
    }

    const numericId = parseInt(identifier, 10);

    // Strictly enforce multi-tenant isolation: order MUST belong to merchant.id
    const order = await prisma.order.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          { orderNumber: identifier },
          { clientOrderId: identifier },
          ...(isNaN(numericId) ? [] : [{ id: numericId }]),
        ],
      },
      include: {
        qrCode: {
          select: {
            upiId: true,
            accountHolderName: true,
            bankName: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!order) {
      return createSignedResponse(
        { error: "Order not found or does not belong to your merchant account." },
        decryptedSecret,
        404
      );
    }

    const netSettledAmount =
      order.type === "PAYIN" ? order.amount - order.merchantFee : order.amount;

    const responsePayload = {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        clientOrderId: order.clientOrderId,
        type: order.type,
        amount: order.amount,
        status: order.status,
        checkoutState: order.checkoutState,
        remark: order.remark,
        customerUtr: order.customerUtr,
        verifierUtr: order.verifierUtr,
        beneficiaryDetails: order.beneficiaryDetails,
        merchantFee: order.merchantFee,
        netSettledAmount,
        qrCode: order.qrCode,
        checkoutUrl: order.type === "PAYIN" ? `/checkout/${order.id}` : null,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };

    return createSignedResponse(responsePayload, decryptedSecret, 200);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
