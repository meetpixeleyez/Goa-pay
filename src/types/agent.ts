import { PaginationMeta, PaginationParams } from "./api";

export interface AgentItem {
  id: number | string;
  name: string;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  portalAccess: boolean;
  commissionPercent: number;
  qrProvidersCount?: number;
  balance?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAgentInput {
  name: string;
  password: string;
  phone?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface UpdateAgentInput {
  name?: string;
  phone?: string;
  commissionPercent?: number;
  status?: "ACTIVE" | "INACTIVE";
  portalAccess?: boolean;
}

export interface AgentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
}
