import { apiClient } from "./client";
import { BrokerItem, BrokerQueryParams, CreateBrokerInput } from "@/types/broker";
import { PaginationMeta } from "@/types/api";

export const brokersApi = {
  getBrokers: async (params: BrokerQueryParams = {}) => {
    return await apiClient.get<{
      success: boolean;
      users: BrokerItem[];
      pagination?: PaginationMeta;
    }>("/api/admin/users", { params: { ...params, role: "BROKER" } as any });
  },

  createBroker: async (data: CreateBrokerInput) => {
    return await apiClient.post<{ success: boolean; user: BrokerItem }>("/api/admin/users", {
      ...data,
      role: "BROKER",
    });
  },

  getBrokerMerchants: async (brokerId: string) => {
    return await apiClient.get<{ success: boolean; merchants: any[] }>(
      `/api/admin/users?role=MERCHANT&brokerId=${brokerId}`
    );
  },
};
