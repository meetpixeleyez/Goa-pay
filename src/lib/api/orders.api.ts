import { apiClient } from "./client";
import { CreateOrderInput, OrderItem, OrderQueryParams } from "@/types/order";
import { PaginationMeta } from "@/types/api";

export const ordersApi = {
  createOrder: async (input: CreateOrderInput) => {
    return await apiClient.post<{ success: boolean; order: OrderItem }>("/api/orders/create", input);
  },

  getOrderById: async (orderId: string | number) => {
    return await apiClient.get<{ success: boolean; order: OrderItem }>(`/api/orders/${orderId}`);
  },

  getOrders: async (params: OrderQueryParams = {}, portal: "admin" | "merchant" | "qr-provider" | "operator" = "merchant") => {
    const endpoint = `/api/${portal}/orders`;
    return await apiClient.get<{
      success: boolean;
      orders: OrderItem[];
      pagination?: PaginationMeta;
      availablePayoutCount?: number;
      assignedQrCount?: number;
      unacceptedPayoutCount?: number;
      timedOutPayoutCount?: number;
      adminAlertCount?: number;
    }>(endpoint, { params: params as any });
  },

  submitPayment: async (orderId: string | number, data: { customerUtr: string; customerScreenshot?: string }) => {
    return await apiClient.post<{ success: boolean; order: OrderItem }>(`/api/orders/${orderId}/submit`, data);
  },

  verifyPayment: async (orderId: string | number, data: { verifierUtr?: string; verifierScreenshot?: string }) => {
    return await apiClient.post<{ success: boolean; message: string; order: OrderItem }>(
      `/api/orders/${orderId}/verify`,
      data
    );
  },

  cancelOrder: async (orderId: string | number) => {
    return await apiClient.post<{ success: boolean; order: OrderItem }>(`/api/orders/${orderId}/cancel`, {});
  },
};
