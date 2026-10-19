import { apiClient } from "./client";
import {
  QRProviderListItem,
  QRProviderStats,
  QRProviderQueryParams,
  CreateQRProviderInput,
  UpdateQRProviderInput,
  QRCodeItem,
  CreateQRCodeInput,
  UpdateQRCodeInput,
  OperatorItem,
  CreateOperatorInput,
  UpdateOperatorInput,
} from "@/types/qr-provider";
import { PaginationMeta } from "@/types/api";

export const qrProvidersApi = {
  // QR Providers (Admin)
  getQRProviders: async (params: QRProviderQueryParams = {}) => {
    return await apiClient.get<{
      success: boolean;
      providers: QRProviderListItem[];
      pagination: PaginationMeta;
      stats: QRProviderStats | null;
    }>("/api/admin/users", {
      params: {
        role: "QR_PROVIDER",
        ...params,
      },
    });
  },

  getQRProviderById: async (id: string) => {
    return await apiClient.get<{
      success: boolean;
      user: any;
    }>(`/api/admin/users/${id}`);
  },

  createQRProvider: async (input: CreateQRProviderInput) => {
    return await apiClient.post<{ success: boolean; user: any }>("/api/admin/users", {
      ...input,
      role: "QR_PROVIDER",
    });
  },

  updateQRProvider: async (id: string, input: UpdateQRProviderInput) => {
    return await apiClient.put<{ success: boolean; user: any }>(`/api/admin/users/${id}`, input);
  },

  getQRProviderStats: async () => {
    return await apiClient.get<any>("/api/qr-provider/stats");
  },

  // QR Codes
  getQRCodes: async (params: { providerId?: string } = {}) => {
    return await apiClient.get<{ success: boolean; qrCodes: QRCodeItem[] }>(
      "/api/qr-provider/qr-codes",
      { params }
    );
  },

  createQRCode: async (input: CreateQRCodeInput) => {
    return await apiClient.post<{ success: boolean; qrCode: QRCodeItem }>(
      "/api/qr-provider/qr-codes",
      input
    );
  },

  updateQRCode: async (id: string, input: UpdateQRCodeInput) => {
    return await apiClient.put<{ success: boolean; qrCode: QRCodeItem }>(
      `/api/qr-provider/qr-codes/${id}`,
      input
    );
  },

  toggleQRCode: async (id: string) => {
    return await apiClient.post<{ success: boolean; qrCode: QRCodeItem }>(
      `/api/qr-provider/qr-codes/${id}/toggle`,
      {}
    );
  },

  deleteQRCode: async (id: string) => {
    return await apiClient.delete<{ success: boolean }>(`/api/qr-provider/qr-codes/${id}`);
  },

  // Operators
  getOperators: async (params: { providerId?: string; status?: string; search?: string; page?: number; limit?: number } = {}) => {
    return await apiClient.get<{
      success: boolean;
      operators: OperatorItem[];
      pagination: PaginationMeta;
      stats: any;
    }>("/api/qr-provider/operators", { params });
  },

  getOperatorById: async (id: string) => {
    return await apiClient.get<{ success: boolean; operator: OperatorItem }>(
      `/api/qr-provider/operators/${id}`
    );
  },

  createOperator: async (input: CreateOperatorInput) => {
    return await apiClient.post<{ success: boolean; operator: OperatorItem }>(
      "/api/qr-provider/operators",
      input
    );
  },

  updateOperator: async (id: string, input: UpdateOperatorInput) => {
    return await apiClient.put<{ success: boolean; operator: OperatorItem }>(
      `/api/qr-provider/operators/${id}`,
      input
    );
  },

  assignQRCodesToOperator: async (operatorId: string, assignedQrIds: string[]) => {
    return await apiClient.post<{ success: boolean; assignedQRs: any[] }>(
      `/api/qr-provider/operators/${operatorId}/assign-qrs`,
      { assignedQrIds }
    );
  },

  resetOperatorPassword: async (operatorId: string, newPassword: string) => {
    return await apiClient.post<{ success: boolean; message: string }>(
      `/api/qr-provider/operators/${operatorId}/reset-password`,
      { newPassword }
    );
  },
};
