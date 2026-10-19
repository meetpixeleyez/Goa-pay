/**
 * Core Type Definitions for Mahadev Portal (Goa-Pay)
 * Standardized interfaces for users, orders, wallets, ledgers, and dashboard metrics.
 */

export type UserRole = "ADMIN" | "MERCHANT" | "AGENT" | "QR_PROVIDER" | "OPERATOR" | "BROKER";

export type AccountStatus = "ACTIVE" | "INACTIVE";

export type OrderStatus = "pending" | "processing" | "completed" | "rejected" | "expired" | "cancelled";

export type OrderType = "PAYIN" | "PAYOUT";

export type LedgerEntryType = "CR" | "DR";

export type LedgerCategory =
  | "ORDER_CREDIT"
  | "MERCHANT_FEE"
  | "QR_PROVIDER_FEE"
  | "AGENT_COMMISSION"
  | "BROKER_COMMISSION"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "ADMIN_ADJUSTMENT";

export interface UserSummary {
  id: number | string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status?: AccountStatus | string;
  wallet?: {
    id?: number | string;
    balance: number;
  } | null;
}

export interface OperatorSummary {
  id: number | string;
  name: string;
  email: string;
}

export interface QRCodeSummary {
  id: number | string;
  upiId: string;
  name?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  imageUrl?: string;
  isActive?: boolean;
  operatorId?: number | string | null;
  operator?: OperatorSummary | null;
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  merchantId: number | string;
  merchant?: {
    id: number | string;
    name: string;
    email?: string;
  } | null;
  qrProviderId?: number | string | null;
  qrProvider?: {
    id: number | string;
    name: string;
    phone?: string | null;
  } | null;
  qrCodeId?: number | string | null;
  qrCode?: QRCodeSummary | null;

  amount: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  remark?: string | null;

  status: OrderStatus | string;
  type: OrderType | string;

  customerUtr?: string | null;
  customerScreenshot?: string | null;

  beneficiaryDetails?: string | null;
  customerUpiId?: string | null;
  customerQrImage?: string | null;
  payoutBankName?: string | null;
  payoutProofUtr?: string | null;
  payoutProofImage?: string | null;
  payoutPaidBy?: string | null;

  verifierUtr?: string | null;
  verifierScreenshot?: string | null;
  verifiedById?: number | string | null;

  merchantFee?: number;
  qrProviderFee?: number;
  agentFee?: number;
  brokerFee?: number;
  platformFee?: number;
  totalFees?: number;

  expiresAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface LedgerEntryItem {
  id: number | string;
  walletId: number | string;
  orderId?: number | null;
  order?: {
    id: number;
    orderNumber: string;
    amount: number;
    status: string;
  } | null;
  wallet?: {
    user?: {
      id: number | string;
      name: string;
      email: string;
      role: string;
    } | null;
  } | null;
  type: LedgerEntryType | string;
  category?: LedgerCategory | string | null;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string | Date;
}

export interface AdminDashboardData {
  users: UserSummary[];
  orders: OrderItem[];
  ledger: LedgerEntryItem[];
  unacceptedPayoutCount: number;
  timedOutPayoutCount: number;
  adminAlertCount: number;
}
