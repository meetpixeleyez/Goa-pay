import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/server/common/auth-guard";
import { OrderService } from "@/server/services/order.service";

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getSession();
    const order = await OrderService.getOrderById(params.orderId, session || undefined);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        amount: order.amount,
        status: order.status,
        merchantFeeRate: order.merchantFeeRate,
        merchantFee: order.merchantFee,
        customerName: order.customerName,
        customerMobile: order.customerMobile,
        customerEmail: order.customerEmail,
        remark: order.remark,
        beneficiaryDetails: order.beneficiaryDetails,
        customerUpiId: order.customerUpiId,
        customerQrImage: order.customerQrImage,
        payoutBroadcast: order.payoutBroadcast,
        payoutProofUtr: order.payoutProofUtr,
        payoutProofImage: order.payoutProofImage,
        payoutPaidBy: order.payoutPaidBy,
        qrProviderId: order.qrProviderId,
        qrProvider: order.qrProvider,
        merchantName: order.merchant?.name,
        qrCode: order.qrCode
          ? {
              upiId: order.qrCode.upiId,
              imageUrl: order.qrCode.imageUrl,
              accountHolderName: order.qrCode.accountHolderName,
              bankName: order.qrCode.bankName,
              operator: (order.qrCode as any).operator,
            }
          : null,
        customerUtr: order.customerUtr,
        customerScreenshot: order.customerScreenshot,
        verifierUtr: order.verifierUtr,
        verifierScreenshot: order.verifierScreenshot,
        clientOrderId: order.clientOrderId,
        successUrl: order.successUrl,
        failureUrl: order.failureUrl,
        checkoutState: order.checkoutState,
        remainingSeconds: (order as any).remainingSeconds,
        isTimedOut: (order as any).isTimedOut,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
