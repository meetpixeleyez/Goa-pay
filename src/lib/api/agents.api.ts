import { apiClient } from "./client";
import { AgentItem, AgentQueryParams, CreateAgentInput } from "@/types/agent";
import { PaginationMeta } from "@/types/api";

export const agentsApi = {
  getAgents: async (params: AgentQueryParams = {}) => {
    return await apiClient.get<{
      success: boolean;
      users: AgentItem[];
      pagination?: PaginationMeta;
    }>("/api/admin/users", { params: { ...params, role: "AGENT" } as any });
  },

  createAgent: async (data: CreateAgentInput) => {
    return await apiClient.post<{ success: boolean; user: AgentItem }>("/api/admin/users", {
      ...data,
      role: "AGENT",
    });
  },

  getAgentProviders: async () => {
    return await apiClient.get<{ success: boolean; providers: any[] }>("/api/agent/qr-providers");
  },

  getAgentWallet: async () => {
    return await apiClient.get<{
      success: boolean;
      balance: number;
      commissionPercent: number;
      entries: any[];
    }>("/api/agent/wallet");
  },
};
