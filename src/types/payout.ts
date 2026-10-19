import { OrderItem } from "./order";

export interface AcceptPayoutInput {
  qrCodeId?: string;
}

export interface SubmitPayoutProofInput {
  utr?: string;
  screenshotUrl?: string;
  payoutProofUtr?: string;
  payoutProofImage?: string;
  verifierUtr?: string;
  verifierScreenshot?: string;
}

export interface ConfirmPayoutInput {
  utr?: string;
  screenshotUrl?: string;
  proofUtr?: string;
  paidByAdmin?: boolean;
  paidBy?: "ADMIN" | "QR_PROVIDER";
}

export interface PayoutSettlementResult {
  order: OrderItem;
  fees: {
    merchantFee: number;
    agentFee: number;
    qrProviderFee: number;
    brokerFee: number;
    platformFee: number;
    totalFees: number;
  };
}
