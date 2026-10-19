import { PaginationMeta, PaginationParams } from "./api";

export interface BrokerItem {
  id: number | string;
  name: string;
  email: string;
  phone?: string | null;
  telegramId?: string | null;
  address?: string | null;
  status: "ACTIVE" | "INACTIVE";
  portalAccess: boolean;
  commissionPercent: number;
  merchantsCount?: number;
  merchants?: Array<{
    id: number | string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    payinMerchantFee?: number | null;
    payoutMerchantFee?: number | null;
  }>;
  walletBalance?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBrokerInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  telegramId?: string;
  address?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface UpdateBrokerInput {
  name?: string;
  phone?: string;
  telegramId?: string;
  address?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface BrokerQueryParams extends PaginationParams {
  search?: string;
  status?: string;
}
