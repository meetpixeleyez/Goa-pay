import { PaginationMeta } from "./api";

export interface MerchantBrokerInfo {
  id: number | string;
  name: string;
  email: string;
  commissionPercent?: number;
}

export interface MerchantWalletInfo {
  id?: number | string;
  balance: number;
}

export interface MerchantListItem {
  id: number | string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  telegramId?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  portalAccess: boolean;
  transactionAllowed: boolean;
  payinMerchantFee: number;
  payoutMerchantFee: number;
  payinBrokerFee?: number;
  payoutBrokerFee?: number;
  wallet?: MerchantWalletInfo | null;
  brokerId?: number | string | null;
  broker?: MerchantBrokerInfo | null;
  _count?: {
    merchantOrders: number;
  };
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface MerchantStats {
  totalMerchants: number;
  activeMerchants: number;
  inactiveMerchants: number;
  totalWalletBalance: number;
  avgPayinFee: number;
  avgPayoutFee: number;
  totalOrders: number;
}

export interface MerchantQueryParams {
  search?: string;
  status?: string;
  brokerId?: string;
  sortBy?: "createdAt" | "name" | "balance" | string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeStats?: boolean;
}

export interface CreateMerchantInput {
  name: string;
  email?: string;
  password?: string;
  phone?: string | null;
  address?: string | null;
  telegramId?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
  payinMerchantFee?: number | string;
  payoutMerchantFee?: number | string;
  payinBrokerFee?: number | string;
  payoutBrokerFee?: number | string;
  brokerId?: string | null;
  status?: string;
  portalAccess?: boolean;
  transactionAllowed?: boolean;
}

export interface UpdateMerchantInput {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  telegramId?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
  payinMerchantFee?: number | string;
  payoutMerchantFee?: number | string;
  payinBrokerFee?: number | string;
  payoutBrokerFee?: number | string;
  brokerId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | string;
  portalAccess?: boolean;
  transactionAllowed?: boolean;
  password?: string;
}

export interface MerchantSummaryStats {
  balance: number;
  completedCount: number;
  totalOrdersCount: number;
  totalVolume: number;
}
