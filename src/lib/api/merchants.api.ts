import { apiClient } from "./client";
import {
  MerchantListItem,
  MerchantStats,
  MerchantQueryParams,
  CreateMerchantInput,
  UpdateMerchantInput,
  MerchantSummaryStats,
} from "@/types/merchant";
import { PaginationMeta } from "@/types/api";

export interface GetMerchantsResponse {
  success: boolean;
  users: MerchantListItem[];
  merchants?: MerchantListItem[];
  pagination: PaginationMeta;
  stats?: MerchantStats | null;
}

export interface GetMerchantDetailResponse {
  success: boolean;
  merchant?: any;
  summary?: MerchantSummaryStats;
  wallet?: any;
  orders?: any[];
}

export const merchantsApi = {
  /**
   * Fetch paginated list of merchants with search, status, and broker filters.
   */
  async getMerchants(params: MerchantQueryParams = {}): Promise<GetMerchantsResponse> {
    return apiClient.get<GetMerchantsResponse>("/api/admin/users", {
      params: {
        role: "MERCHANT",
        ...params,
      },
    });
  },

  /**
   * Fetch specific tab or full profile for a merchant.
   */
  async getMerchantById(id: string, tab?: "info" | "summary" | "wallet" | "orders"): Promise<GetMerchantDetailResponse> {
    return apiClient.get<GetMerchantDetailResponse>(`/api/admin/merchants/${id}`, {
      params: tab ? { tab } : undefined,
    });
  },

  /**
   * Create a new merchant account.
   */
  async createMerchant(data: CreateMerchantInput) {
    return apiClient.post("/api/admin/users", {
      role: "MERCHANT",
      ...data,
    });
  },

  /**
   * Update an existing merchant profile, fees, or permissions.
   */
  async updateMerchant(id: string, data: UpdateMerchantInput) {
    return apiClient.put(`/api/admin/users/${id}`, data);
  },

  /**
   * Toggle merchant active/inactive status.
   */
  async toggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return apiClient.put(`/api/admin/users/${id}`, { status: nextStatus });
  },

  /**
   * Fetch active merchants list for select dropdowns.
   */
  async getActiveList() {
    return apiClient.get<{ success: boolean; merchants: MerchantListItem[] }>("/api/merchants/list");
  },
};
