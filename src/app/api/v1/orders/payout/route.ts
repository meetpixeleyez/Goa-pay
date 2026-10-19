import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateMerchantRequest, createSignedResponse } from "@/lib/merchant-api-auth";
import { calculateOrderFee } from "@/lib/ledger-engine";
import { formatBeneficiaryDetails, validateBankAccountDetails } from "@/lib/validation";
import { validateWebhookUrl } from "@/lib/webhook-engine";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateMerchantRequest(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const { merchant, decryptedSecret } = authResult;
    const body = await request.json().catch(() => ({}));
    const {
      clientOrderId,
      amount,
      customerName,
      customerMobile,
      customerEmail,
      remark,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      accountType,
      webhookUrl,
    } = body;

    if (!amount || !customerName || !customerMobile) {
      return createSignedResponse(
        { error: "Missing required fields: 'amount', 'customerName', and 'customerMobile' are required." },
        decryptedSecret,
        400
      );
    }

    const orderAmount = parseFloat(amount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      return createSignedResponse(
        { error: "Invalid amount. Must be a positive numeric value greater than 0." },
        decryptedSecret,
        400
      );
    }

    // Validate Bank Details for Payout
    const accNo = accountNumber || body.bankAccountNumber;
    const ifsc = ifscCode;
    const holder = accountHolderName || body.beneficiaryName || customerName;

    if (!accNo || !ifsc) {
      return createSignedResponse(
        { error: "Customer bank details ('accountNumber' and 'ifscCode') are required for withdrawal/payout orders." },
        decryptedSecret,
        400
      );
    }

    const bankCheck = validateBankAccountDetails({
      accountNumber: accNo,
      confirmAccountNumber: confirmAccountNumber || accNo,
      ifscCode: ifsc,
      accountHolderName: holder,
      bankName,
    });

    if (!bankCheck.valid) {
      return createSignedResponse(
        { error: bankCheck.errors[0] || "Invalid bank details provided." },
        decryptedSecret,
        400
      );
    }

    const beneficiaryDetails = formatBeneficiaryDetails({
      accountNumber: accNo,
      ifscCode: ifsc,
      accountHolderName: holder,
      bankName: bankName || "Bank Transfer",
      accountType: accountType || "SAVINGS",
    });

    // Idempotency check via clientOrderId
    if (clientOrderId && typeof clientOrderId === "string" && clientOrderId.trim()) {
      const cleanClientOrderId = clientOrderId.trim();
      const existingOrder = await prisma.order.findFirst({
        where: {
          merchantId: merchant.id,
          clientOrderId: cleanClientOrderId,
        },
      });

      if (existingOrder) {
        return createSignedResponse(
          {
            success: true,
            message: "Order already exists for this clientOrderId (Idempotent response).",
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            clientOrderId: existingOrder.clientOrderId,
            orderType: existingOrder.type,
            amount: existingOrder.amount,
            status: existingOrder.status,
            createdAt: existingOrder.createdAt,
          },
          decryptedSecret,
          200
        );
      }
    }

    // Fee rates calculation
    const merchantFeeRate = merchant.payoutMerchantFee ?? 0;
    const brokerFeeRate = merchant.brokerId ? (merchant.payoutBrokerFee ?? merchant.broker?.commissionPercent ?? 0) : 0;
    const qrProviderFeeRate = merchant.payoutQrProviderFee || 1.0;
    const agentFeeRate = merchant.payoutAgentFee || 0;

    const feeConfig = {
      merchantFee: merchantFeeRate,
      qrProviderFee: qrProviderFeeRate,
      agentFee: agentFeeRate,
      brokerFee: brokerFeeRate,
    };

    const feeSnapshot = calculateOrderFee({
      amount: orderAmount,
      feeType: "PAYOUT",
      merchantFeeConfiguration: feeConfig,
    });

    // Verify Merchant Wallet Balance: balance >= amount + totalFees
    const merchantWallet = await prisma.wallet.findUnique({
      where: { userId: merchant.id },
    });

    const currentBalance = merchantWallet?.balance ?? 0;
    const requiredBalance = orderAmount + feeSnapshot.totalFees;

    if (currentBalance < requiredBalance) {
      return createSignedResponse(
        {
          error: `Insufficient wallet balance. Available balance: ₹${currentBalance.toFixed(2)}, Required: ₹${requiredBalance.toFixed(2)} (Amount: ₹${orderAmount.toFixed(2)} + Fee: ₹${feeSnapshot.totalFees.toFixed(2)}).`,
        },
        decryptedSecret,
        422
      );
    }

    if (webhookUrl) {
      const check = validateWebhookUrl(webhookUrl);
      if (!check.valid) {
        return createSignedResponse({ error: `Invalid webhookUrl: ${check.error}` }, decryptedSecret, 400);
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveWebhookUrl = webhookUrl?.trim() || merchant.webhookUrl || null;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        merchantId: merchant.id,
        amount: orderAmount,
        type: "PAYOUT",
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail ? customerEmail.trim() : null,
        remark: remark ? remark.trim() : null,
        clientOrderId: clientOrderId?.trim() || null,
        webhookUrl: effectiveWebhookUrl,
        beneficiaryDetails,
        payoutBroadcast: false,
        status: "pending",
        checkoutState: "ACTIVE",
        merchantFeeRate: feeSnapshot.merchantFeeRate,
        qrProviderFeeRate: feeSnapshot.qrProviderFeeRate,
        agentFeeRate: feeSnapshot.agentFeeRate,
        brokerFeeRate: feeSnapshot.brokerFeeRate,
        platformFeeRate: feeSnapshot.platformFeeRate,
        merchantFee: feeSnapshot.merchantFee,
        qrProviderFee: feeSnapshot.qrProviderFee,
        agentFee: feeSnapshot.agentFee,
        brokerFee: feeSnapshot.brokerFee,
        platformFee: feeSnapshot.platformFee,
        totalFees: feeSnapshot.totalFees,
      },
    });

    const responsePayload = {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientOrderId: order.clientOrderId,
      orderType: order.type,
      amount: order.amount,
      status: order.status,
      beneficiaryDetails: order.beneficiaryDetails,
      fee: order.merchantFee,
      createdAt: order.createdAt,
    };

    return createSignedResponse(responsePayload, decryptedSecret, 201);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
