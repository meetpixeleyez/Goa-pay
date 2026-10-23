import { PaginationMeta, PaginationParams } from "./api";

export interface BrokerItem {
  id: number | string;
  name: string;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  portalAccess: boolean;
  commissionPercent: number;
  merchantsCount?: number;
  merchants?: Array<{
    id: number | string;
    name: string;
    phone?: string | null;
    status: string;
    payinMerchantFee?: number | null;
    payoutMerchantFee?: number | null;
  }>;
  balance?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBrokerInput {
  name: string;
  password: string;
  phone?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface UpdateBrokerInput {
  name?: string;
  phone?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface BrokerQueryParams extends PaginationParams {
  search?: string;
  status?: string;
}
