import { PaginationMeta } from "./api";

export interface OrderItem {
  id: number;
  orderNumber: string;
  merchantId: number | string;
  merchant?: {
    id: number | string;
    name: string;
    email: string;
    phone?: string | null;
  };
  qrProviderId?: number | string | null;
  qrProvider?: {
    id: number | string;
    name: string;
    email: string;
  } | null;
  qrCodeId?: number | string | null;
  qrCode?: {
    id: number | string;
    upiId: string;
    name?: string | null;
    imageUrl?: string | null;
    accountHolderName?: string | null;
    bankName?: string | null;
  } | null;
  amount: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  remark?: string | null;
  status: "pending" | "processing" | "completed" | "rejected" | "expired" | "cancelled";
  type: "PAYIN" | "PAYOUT";
  customerUtr?: string | null;
  customerScreenshot?: string | null;
  verifierUtr?: string | null;
  verifierScreenshot?: string | null;
  verifiedById?: number | string | null;
  verifiedAt?: Date | string | null;
  beneficiaryDetails?: string | null;
  payoutPaidBy?: "ADMIN" | "QR_PROVIDER" | null;
  payoutBroadcast?: boolean;
  clientOrderId?: string | null;
  successUrl?: string | null;
  failureUrl?: string | null;
  webhookUrl?: string | null;
  checkoutState?: string | null;
  merchantFee: number;
  agentFee: number;
  qrProviderFee: number;
  brokerFee: number;
  platformFee: number;
  totalFees: number;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateOrderInput {
  merchantId?: number | string;
  amount: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  clientOrderId?: string | null;
  successUrl?: string | null;
  failureUrl?: string | null;
  webhookUrl?: string | null;
  remark?: string | null;
  type: "PAYIN" | "PAYOUT";
  // Payout bank details
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  accountType?: string;
  beneficiaryDetails?: string;
}

export interface VerifyOrderInput {
  verifierUtr?: string;
  verifierScreenshot?: string;
}

export interface OrderQueryParams {
  status?: string;
  type?: string;
  search?: string;
  merchantId?: number | string;
  providerId?: number | string;
  qrCodeId?: number | string;
  available?: boolean;
  includeAvailableCount?: boolean;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  rejectedOrders: number;
  totalVolume: number;
}
