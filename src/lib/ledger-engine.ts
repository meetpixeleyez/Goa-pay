import prisma from "./prisma";
import { triggerOrderWebhook } from "./webhook-engine";

export type OrderFeeType = "PAYIN" | "PAYOUT";

export interface FeeCalculation {
  amount: number;
  merchantFee: number;
  agentFee: number;
  qrProviderFee: number;
  brokerFee: number;
  platformFee: number;
  totalFees: number;
}

export interface MerchantFeeConfiguration {
  merchantFee?: number | null;
  qrProviderFee?: number | null;
  agentFee?: number | null;
  brokerFee?: number | null;
}

export interface CalculatedOrderFees {
  amount: number;
  feeType: OrderFeeType;
  // Rates (%)
  merchantFeeRate: number;
  qrProviderFeeRate: number;
  agentFeeRate: number;
  brokerFeeRate: number;
  platformFeeRate: number;
  // Amounts (Currency)
  merchantFee: number;
  qrProviderFee: number;
  agentFee: number;
  brokerFee: number;
  platformFee: number;
  totalFees: number;
}

/**
 * Reusable unified order fee calculation engine supporting both PAYIN and PAYOUT.
 * Formula: Platform Fee = Merchant Fee - (QR Provider Fee + Agent Fee + Broker Fee)
 * The Merchant Fee is the total fee amount deducted.
 */
export function calculateOrderFee({
  amount,
  feeType = "PAYIN",
  merchantFeeConfiguration,
}: {
  amount: number;
  feeType?: OrderFeeType;
  merchantFeeConfiguration?: MerchantFeeConfiguration | null;
}): CalculatedOrderFees {
  const merchantFeeRate = Number(merchantFeeConfiguration?.merchantFee) || 0;
  const qrProviderFeeRate = Number(merchantFeeConfiguration?.qrProviderFee) || 0;
  const agentFeeRate = Number(merchantFeeConfiguration?.agentFee) || 0;
  const brokerFeeRate = Number(merchantFeeConfiguration?.brokerFee) || 0;

  // Platform fee rate is the remaining percentage from the merchant fee
  const platformFeeRate = merchantFeeRate - (qrProviderFeeRate + agentFeeRate + brokerFeeRate);

  const merchantFee = (amount * merchantFeeRate) / 100;
  const qrProviderFee = (amount * qrProviderFeeRate) / 100;
  const agentFee = (amount * agentFeeRate) / 100;
  const brokerFee = (amount * brokerFeeRate) / 100;
  const platformFee = merchantFee - (qrProviderFee + agentFee + brokerFee);

  // Merchant fee is the total fee amount
  const totalFees = merchantFee;

  return {
    amount,
    feeType,
    merchantFeeRate,
    qrProviderFeeRate,
    agentFeeRate,
    brokerFeeRate,
    platformFeeRate,
    merchantFee,
    qrProviderFee,
    agentFee,
    brokerFee,
    platformFee,
    totalFees,
  };
}

/**
 * Backwards-compatible wrapper function
 */
export function calculateOrderFees(
  amount: number,
  merchantFeePercent: number = 0,
  qrProviderFeePercent: number = 0,
  agentCommissionPercent: number = 0,
  brokerCommissionPercent: number = 0
): FeeCalculation {
  const result = calculateOrderFee({
    amount,
    feeType: "PAYIN",
    merchantFeeConfiguration: {
      merchantFee: merchantFeePercent,
      qrProviderFee: qrProviderFeePercent,
      agentFee: agentCommissionPercent,
      brokerFee: brokerCommissionPercent,
    },
  });

  return {
    amount: result.amount,
    merchantFee: result.merchantFee,
    agentFee: result.agentFee,
    qrProviderFee: result.qrProviderFee,
    brokerFee: result.brokerFee,
    platformFee: result.platformFee,
    totalFees: result.totalFees,
  };
}

/**
 * Executes multi-party atomic settlement upon UTR verification match.
 * Uses order fee snapshot if recorded at creation, or evaluates merchant fee configuration.
 */
export async function settleCompletedOrder(
  orderId: number | string,
  verifierUserId: number | string,
  verifierUtr: string,
  verifierScreenshotUrl?: string
) {
  const numericOrderId = typeof orderId === "number" ? orderId : parseInt(orderId, 10);
  const numericVerifierId = typeof verifierUserId === "number" ? verifierUserId : parseInt(verifierUserId, 10);
  if (isNaN(numericOrderId)) {
    throw new Error("Invalid order ID");
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: numericOrderId },
      include: {
        merchant: {
          include: {
            wallet: true,
            broker: {
              include: { wallet: true },
            },
          },
        },
        qrProvider: {
          include: {
            wallet: true,
            agent: {
              include: { wallet: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "completed") {
      throw new Error("Order is already completed");
    }

    if (!order.qrProviderId || !order.qrProvider) {
      throw new Error("Order does not have an assigned QR provider");
    }

    // Determine fees: use order snapshot if available, otherwise compute from merchant config
    let fees: FeeCalculation;
    if (order.merchantFeeRate > 0 || order.merchantFee > 0 || order.totalFees > 0) {
      fees = {
        amount: order.amount,
        merchantFee: order.merchantFee,
        agentFee: order.agentFee,
        qrProviderFee: order.qrProviderFee,
        brokerFee: order.brokerFee,
        platformFee: order.platformFee,
        totalFees: order.totalFees || order.merchantFee,
      };
    } else {
      const isPayout = order.type === "PAYOUT";
      const merchantFeeRate =
        isPayout ? (order.merchant.payoutMerchantFee ?? 0) : (order.merchant.payinMerchantFee ?? 0);
      const brokerFeeRate = order.merchant.brokerId
        ? (isPayout
            ? (order.merchant.payoutBrokerFee !== undefined && order.merchant.payoutBrokerFee !== null ? order.merchant.payoutBrokerFee : (order.merchant.broker?.commissionPercent ?? 0))
            : (order.merchant.payinBrokerFee !== undefined && order.merchant.payinBrokerFee !== null ? order.merchant.payinBrokerFee : (order.merchant.broker?.commissionPercent ?? 0)))
        : 0;
      const qrProviderFeeRate = isPayout
        ? (order.qrProvider.payoutQrProviderFee ?? order.qrProvider.qrProviderFee ?? 0)
        : (order.qrProvider.payinQrProviderFee ?? order.qrProvider.qrProviderFee ?? 0);
      const agentFeeRate = order.qrProvider.agentId
        ? (isPayout
            ? (order.qrProvider.payoutAgentFee !== undefined && order.qrProvider.payoutAgentFee !== null ? order.qrProvider.payoutAgentFee : (order.qrProvider.agent?.commissionPercent ?? 0))
            : (order.qrProvider.payinAgentFee !== undefined && order.qrProvider.payinAgentFee !== null ? order.qrProvider.payinAgentFee : (order.qrProvider.agent?.commissionPercent ?? 0)))
        : 0;

      const config: MerchantFeeConfiguration = {
        merchantFee: merchantFeeRate,
        qrProviderFee: qrProviderFeeRate,
        agentFee: agentFeeRate,
        brokerFee: brokerFeeRate,
      };

      const calculated = calculateOrderFee({
        amount: order.amount,
        feeType: isPayout ? "PAYOUT" : "PAYIN",
        merchantFeeConfiguration: config,
      });

      fees = {
        amount: calculated.amount,
        merchantFee: calculated.merchantFee,
        agentFee: calculated.agentFee,
        qrProviderFee: calculated.qrProviderFee,
        brokerFee: calculated.brokerFee,
        platformFee: calculated.platformFee,
        totalFees: calculated.totalFees,
      };
    }

    // 1. Ensure wallets exist for all parties
    const getOrCreateWallet = async (userId: number) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0.0 } });
      }
      return wallet;
    };

    const merchantWallet = await getOrCreateWallet(order.merchantId);
    const providerWallet = await getOrCreateWallet(order.qrProviderId);

    // 2. Merchant Wallet: Credit order amount, Debit total fees
    const now = new Date();
    const merchantBalanceAfterCredit = merchantWallet.balance + fees.amount;
    await tx.ledgerEntry.create({
      data: {
        walletId: merchantWallet.id,
        orderId: order.id,
        type: "CR",
        category: "ORDER_CREDIT",
        amount: fees.amount,
        balanceAfter: merchantBalanceAfterCredit,
        description: `Deposit credit for order #${order.orderNumber}`,
        createdAt: now,
      },
    });

    const merchantBalanceAfterDebit = merchantBalanceAfterCredit - fees.totalFees;
    await tx.ledgerEntry.create({
      data: {
        walletId: merchantWallet.id,
        orderId: order.id,
        type: "DR",
        category: "MERCHANT_FEE",
        amount: fees.totalFees,
        balanceAfter: merchantBalanceAfterDebit,
        description: `Fee deduction for order #${order.orderNumber} (Merchant Gateway Fee)`,
        createdAt: new Date(now.getTime() + 100),
      },
    });

    await tx.wallet.update({
      where: { id: merchantWallet.id },
      data: { balance: merchantBalanceAfterDebit },
    });

    await tx.user.update({
      where: { id: order.merchantId },
      data: {
        balance: merchantBalanceAfterDebit,
        availableBalance: merchantBalanceAfterDebit,
      },
    });

    // 3. QR Provider balance and exposure adjustment
    // Opening balance decreases by order amount, exposure clears, fee gets credited
    const newExposure = Math.max(0, order.qrProvider.exposure - order.amount);
    const balanceAfterOrderDeduction = order.qrProvider.balance - order.amount;
    const finalProviderBalance = balanceAfterOrderDeduction + fees.qrProviderFee;
    const finalAvailableBalance = finalProviderBalance - newExposure;

    await tx.user.update({
      where: { id: order.qrProviderId },
      data: {
        balance: finalProviderBalance,
        exposure: newExposure,
        availableBalance: finalAvailableBalance,
      },
    });

    // QR Provider wallet ledger entries
    const providerBalanceAfterDebit = providerWallet.balance - order.amount;
    await tx.ledgerEntry.create({
      data: {
        walletId: providerWallet.id,
        orderId: order.id,
        type: "DR",
        category: "ORDER_DEBIT",
        amount: order.amount,
        balanceAfter: providerBalanceAfterDebit,
        description: `Deposit payment fulfilled for order #${order.orderNumber}`,
        createdAt: new Date(now.getTime() + 200),
      },
    });

    const providerBalanceAfterFee = providerBalanceAfterDebit + fees.qrProviderFee;
    await tx.ledgerEntry.create({
      data: {
        walletId: providerWallet.id,
        orderId: order.id,
        type: "CR",
        category: "QR_PROVIDER_FEE",
        amount: fees.qrProviderFee,
        balanceAfter: providerBalanceAfterFee,
        description: `QR Provider fee credit for order #${order.orderNumber}`,
        createdAt: new Date(now.getTime() + 300),
      },
    });

    await tx.wallet.update({
      where: { id: providerWallet.id },
      data: { balance: providerBalanceAfterFee },
    });

    // 4. Agent commission if assigned
    if (order.qrProvider.agentId && fees.agentFee > 0) {
      const agentWallet = await getOrCreateWallet(order.qrProvider.agentId);
      const agentNewBal = agentWallet.balance + fees.agentFee;
      await tx.ledgerEntry.create({
        data: {
          walletId: agentWallet.id,
          orderId: order.id,
          type: "CR",
          category: "AGENT_COMMISSION",
          amount: fees.agentFee,
          balanceAfter: agentNewBal,
          description: `Agent commission for order #${order.orderNumber}`,
          createdAt: new Date(now.getTime() + 400),
        },
      });
      await tx.wallet.update({
        where: { id: agentWallet.id },
        data: { balance: agentNewBal },
      });
      await tx.user.update({
        where: { id: order.qrProvider.agentId },
        data: {
          balance: agentNewBal,
          availableBalance: agentNewBal,
        },
      });
    }

    // 5. Broker commission if assigned to merchant
    if (order.merchant.brokerId && fees.brokerFee > 0) {
      const brokerWallet = await getOrCreateWallet(order.merchant.brokerId);
      const brokerNewBal = brokerWallet.balance + fees.brokerFee;
      await tx.ledgerEntry.create({
        data: {
          walletId: brokerWallet.id,
          orderId: order.id,
          type: "CR",
          category: "BROKER_COMMISSION",
          amount: fees.brokerFee,
          balanceAfter: brokerNewBal,
          description: `Broker commission for order #${order.orderNumber}`,
          createdAt: new Date(now.getTime() + 500),
        },
      });
      await tx.wallet.update({
        where: { id: brokerWallet.id },
        data: { balance: brokerNewBal },
      });
      await tx.user.update({
        where: { id: order.merchant.brokerId },
        data: {
          balance: brokerNewBal,
          availableBalance: brokerNewBal,
        },
      });
    }

    // 6. Update order status and fee snapshots
    const updatedOrder = await tx.order.update({
      where: { id: numericOrderId },
      data: {
        status: "completed",
        checkoutState: "COMPLETED",
        verifierUtr,
        verifierScreenshot: verifierScreenshotUrl || null,
        verifiedById: numericVerifierId,
        merchantFee: fees.merchantFee,
        agentFee: fees.agentFee,
        qrProviderFee: fees.qrProviderFee,
        brokerFee: fees.brokerFee,
        platformFee: fees.platformFee,
        totalFees: fees.totalFees,
      },
    });

    return {
      success: true,
      order: updatedOrder,
      fees,
    };
  });

  // Asynchronously trigger webhook for payin order completion
  if (result.success && result.order) {
    triggerOrderWebhook(result.order.id, "order.payin.completed").catch(() => {});
  }

  return result;
}

/**
 * Executes multi-party atomic settlement specifically for PAYOUT (withdrawal) orders.
 * Follows Option A rules specified in docs/withdrawal-feature.md:
 * - Merchant Wallet: deduct order amount (1000) + merchant fee (50) with 2 ledger entries.
 * - If QR provider fulfilled: QR provider wallet gets credited (1000 + 10 = 1010), agent gets 20, broker gets 10, platform gets 10.
 * - If Admin fulfilled directly: Platform gets 50 (or 50 minus broker fee if broker is attached).
 */
export async function settleCompletedPayoutOrder({
  orderId,
  adminUserId,
  verifiedById,
  verifierUtr,
  verifierScreenshotUrl,
  paidByAdmin = false,
}: {
  orderId: number | string;
  adminUserId?: number | string;
  verifiedById?: number | string;
  verifierUtr: string;
  verifierScreenshotUrl?: string;
  paidByAdmin?: boolean;
}) {
  const numericOrderId = typeof orderId === "number" ? orderId : parseInt(orderId, 10);
  if (isNaN(numericOrderId)) {
    throw new Error("Invalid order ID");
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: numericOrderId },
      include: {
        merchant: {
          include: {
            wallet: true,
            broker: { include: { wallet: true } },
          },
        },
        qrProvider: {
          include: {
            wallet: true,
            agent: { include: { wallet: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "completed") {
      throw new Error("Order is already completed");
    }

    if (order.type !== "PAYOUT") {
      throw new Error("Order is not a payout order");
    }

    if (!paidByAdmin && !order.qrProviderId) {
      throw new Error("No QR provider assigned to fulfill this payout");
    }

    // Determine fees
    const merchantFeeRate = order.merchantFeeRate || (order.merchant.payoutMerchantFee ?? 0);
    const brokerFeeRate = order.merchant.brokerId
      ? (order.brokerFeeRate || (order.merchant.payoutBrokerFee !== undefined && order.merchant.payoutBrokerFee !== null ? order.merchant.payoutBrokerFee : (order.merchant.broker?.commissionPercent ?? 0)))
      : 0;
    const qrProviderFeeRate = paidByAdmin
      ? 0
      : (order.qrProviderFeeRate !== null && order.qrProviderFeeRate !== undefined && order.qrProviderFeeRate > 0
          ? order.qrProviderFeeRate
          : (order.qrProvider?.payoutQrProviderFee || order.qrProvider?.qrProviderFee || 0));
    const agentFeeRate = paidByAdmin || !order.qrProvider?.agentId
      ? 0
      : (order.agentFeeRate || (order.qrProvider?.payoutAgentFee !== undefined && order.qrProvider?.payoutAgentFee !== null ? order.qrProvider.payoutAgentFee : (order.qrProvider?.agent?.commissionPercent ?? 0)));

    const merchantFee = (order.amount * merchantFeeRate) / 100;
    const qrProviderFee = paidByAdmin ? 0 : (order.amount * qrProviderFeeRate) / 100;
    const agentFee = paidByAdmin || !order.qrProvider?.agentId ? 0 : (order.amount * agentFeeRate) / 100;
    const brokerFee = order.merchant.brokerId ? (order.amount * brokerFeeRate) / 100 : 0;
    const platformFee = Math.max(0, merchantFee - (qrProviderFee + agentFee + brokerFee));
    const totalFees = merchantFee;

    const getOrCreateWallet = async (userId: number) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0.0 } });
      }
      return wallet;
    };

    const merchantWallet = await getOrCreateWallet(order.merchantId);
    const now = new Date();

    // 1. Merchant Wallet: 2 debit entries for Principal and Fee
    const merchantBalAfterWithdrawal = merchantWallet.balance - order.amount;
    await tx.ledgerEntry.create({
      data: {
        walletId: merchantWallet.id,
        orderId: order.id,
        type: "DR",
        category: "ORDER_DEBIT",
        amount: order.amount,
        balanceAfter: merchantBalAfterWithdrawal,
        description: `Customer withdrawal disbursement for order #${order.orderNumber}`,
        createdAt: now,
      },
    });

    const merchantFinalBal = merchantBalAfterWithdrawal - totalFees;
    await tx.ledgerEntry.create({
      data: {
        walletId: merchantWallet.id,
        orderId: order.id,
        type: "DR",
        category: "MERCHANT_FEE",
        amount: totalFees,
        balanceAfter: merchantFinalBal,
        description: `Payout fee deduction for order #${order.orderNumber} (Merchant Gateway Fee)`,
        createdAt: new Date(now.getTime() + 100),
      },
    });

    await tx.wallet.update({
      where: { id: merchantWallet.id },
      data: { balance: merchantFinalBal },
    });

    await tx.user.update({
      where: { id: order.merchantId },
      data: {
        balance: merchantFinalBal,
        availableBalance: merchantFinalBal,
      },
    });

    // 2. If QR Provider fulfilled: Credit reimbursement + fee to QR Provider
    if (!paidByAdmin && order.qrProviderId && order.qrProvider) {
      const providerWallet = await getOrCreateWallet(order.qrProviderId);

      const providerBalAfterReimbursement = providerWallet.balance + order.amount;
      await tx.ledgerEntry.create({
        data: {
          walletId: providerWallet.id,
          orderId: order.id,
          type: "CR",
          category: "ORDER_CREDIT",
          amount: order.amount,
          balanceAfter: providerBalAfterReimbursement,
          description: `Payout reimbursement for customer disbursement on order #${order.orderNumber}`,
          createdAt: new Date(now.getTime() + 200),
        },
      });

      const providerFinalWalletBal = providerBalAfterReimbursement + qrProviderFee;
      await tx.ledgerEntry.create({
        data: {
          walletId: providerWallet.id,
          orderId: order.id,
          type: "CR",
          category: "QR_PROVIDER_FEE",
          amount: qrProviderFee,
          balanceAfter: providerFinalWalletBal,
          description: `QR Provider payout fee credit for order #${order.orderNumber}`,
          createdAt: new Date(now.getTime() + 300),
        },
      });

      await tx.wallet.update({
        where: { id: providerWallet.id },
        data: { balance: providerFinalWalletBal },
      });

      // Update QR Provider User balances: increase balance and availableBalance by order.amount + qrProviderFee
      const providerNewExposure = order.qrProvider.exposure;
      const providerNewBalance = order.qrProvider.balance + order.amount + qrProviderFee;
      const providerNewAvailable = providerNewBalance - providerNewExposure;

      await tx.user.update({
        where: { id: order.qrProviderId },
        data: {
          balance: providerNewBalance,
          exposure: providerNewExposure,
          availableBalance: providerNewAvailable,
        },
      });

      // 3. Agent Commission
      if (order.qrProvider.agentId && agentFee > 0) {
        const agentWallet = await getOrCreateWallet(order.qrProvider.agentId);
        const agentNewBal = agentWallet.balance + agentFee;
        await tx.ledgerEntry.create({
          data: {
            walletId: agentWallet.id,
            orderId: order.id,
            type: "CR",
            category: "AGENT_COMMISSION",
            amount: agentFee,
            balanceAfter: agentNewBal,
            description: `Agent commission for payout order #${order.orderNumber}`,
            createdAt: new Date(now.getTime() + 400),
          },
        });
        await tx.wallet.update({
          where: { id: agentWallet.id },
          data: { balance: agentNewBal },
        });
        await tx.user.update({
          where: { id: order.qrProvider.agentId },
          data: {
            balance: agentNewBal,
            availableBalance: agentNewBal,
          },
        });
      }
    }

    // 4. Broker Commission
    if (order.merchant.brokerId && brokerFee > 0) {
      const brokerWallet = await getOrCreateWallet(order.merchant.brokerId);
      const brokerNewBal = brokerWallet.balance + brokerFee;
      await tx.ledgerEntry.create({
        data: {
          walletId: brokerWallet.id,
          orderId: order.id,
          type: "CR",
          category: "BROKER_COMMISSION",
          amount: brokerFee,
          balanceAfter: brokerNewBal,
          description: `Broker commission for payout order #${order.orderNumber}`,
          createdAt: new Date(now.getTime() + 500),
        },
      });
      await tx.wallet.update({
        where: { id: brokerWallet.id },
        data: { balance: brokerNewBal },
      });
      await tx.user.update({
        where: { id: order.merchant.brokerId },
        data: {
          balance: brokerNewBal,
          availableBalance: brokerNewBal,
        },
      });
    }

    // 5. Update Order status
    const rawVerifier = verifiedById ?? adminUserId;
    const effectiveVerifiedById = rawVerifier !== undefined && rawVerifier !== null
      ? (typeof rawVerifier === "number" ? rawVerifier : parseInt(String(rawVerifier), 10))
      : null;
    const finalProofUtr = verifierUtr || order.payoutProofUtr;
    const finalProofImage = verifierScreenshotUrl || order.payoutProofImage || null;

    const updatedOrder = await tx.order.update({
      where: { id: numericOrderId },
      data: {
        status: "completed",
        checkoutState: "COMPLETED",
        payoutPaidBy: paidByAdmin ? "ADMIN" : "QR_PROVIDER",
        payoutProofUtr: finalProofUtr,
        payoutProofImage: finalProofImage,
        customerUtr: order.customerUtr || finalProofUtr,
        customerScreenshot: order.customerScreenshot || finalProofImage,
        verifierUtr,
        verifierScreenshot: verifierScreenshotUrl || null,
        verifiedById: effectiveVerifiedById,
        merchantFee,
        qrProviderFee,
        agentFee,
        brokerFee,
        platformFee,
        totalFees,
      },
    });

    return {
      success: true,
      order: updatedOrder,
      fees: {
        amount: order.amount,
        merchantFee,
        qrProviderFee,
        agentFee,
        brokerFee,
        platformFee,
        totalFees,
      },
    };
  });

  // Asynchronously trigger webhook for payout order completion
  if (result.success && result.order) {
    triggerOrderWebhook(result.order.id, "order.payout.completed").catch(() => {});
  }

  return result;
}
