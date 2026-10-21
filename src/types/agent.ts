import { PaginationMeta, PaginationParams } from "./api";

export interface AgentItem {
  id: number | string;
  name: string;
  email?: string;
  phone?: string | null;
  telegramId?: string | null;
  address?: string | null;
  status: "ACTIVE" | "INACTIVE";
  portalAccess: boolean;
  commissionPercent: number;
  qrProvidersCount?: number;
  walletBalance?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAgentInput {
  name: string;
  email?: string;
  password: string;
  phone?: string;
  telegramId?: string;
  address?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface UpdateAgentInput {
  name?: string;
  phone?: string;
  telegramId?: string;
  address?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface AgentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
}
