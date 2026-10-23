/**
 * Core Type Definitions for Mahadev Portal (Goa-Pay)
 * Standardized interfaces for users, orders, transactions, and dashboard metrics.
 */

export type UserRole = "ADMIN" | "MERCHANT" | "AGENT" | "QR_PROVIDER" | "OPERATOR" | "BROKER";

export type AccountStatus = "ACTIVE" | "INACTIVE";

export type OrderStatus = "pending" | "processing" | "completed" | "rejected" | "expired" | "cancelled";

export type OrderType = "PAYIN" | "PAYOUT";

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "CR" | "DR";

export type TransactionCategory =
  | "ORDER_CREDIT"
  | "ORDER_DEBIT"
  | "MERCHANT_FEE"
  | "QR_PROVIDER_FEE"
  | "AGENT_COMMISSION"
  | "BROKER_COMMISSION"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "ADD_CREDIT"
  | "DEDUCT_CREDIT"
  | "HAWALA_TRANSFER"
  | "HAWALA_RECEIPT"
  | "INITIAL_BALANCE"
  | "ADMIN_ADJUSTMENT";

export type LedgerEntryType = TransactionType;
export type LedgerCategory = TransactionCategory;

export interface UserSummary {
  id: number;
  name: string;
  phone?: string | null;
  role: UserRole;
  status?: AccountStatus | string;
  balance: number;
  exposure?: number;
  availableBalance?: number;
  credit?: number;
}

export interface OperatorSummary {
  id: number | string;
  name: string;
  phone?: string | null;
}

export interface QRCodeSummary {
  id: number | string;
  upiId: string;
  name?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  imageUrl?: string;
  isActive?: boolean;
  status?: AccountStatus | string;
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

export interface TransactionItem {
  id: number | string;
  userId: number;
  orderId?: number | null;
  order?: {
    id: number;
    orderNumber: string;
    amount: number;
    status: string;
  } | null;
  user?: {
    id: number | string;
    name: string;
    role: string;
  } | null;
  type: TransactionType;
  category?: TransactionCategory | string | null;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string | Date;
}

export type LedgerEntryItem = TransactionItem;

export interface AdminDashboardData {
  users: UserSummary[];
  orders: OrderItem[];
  ledger: TransactionItem[];
  unacceptedPayoutCount: number;
  timedOutPayoutCount: number;
  adminAlertCount: number;
}
