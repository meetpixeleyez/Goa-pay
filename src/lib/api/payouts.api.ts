import { apiClient } from "./client";
import { OrderItem } from "@/types/order";
import {
  AcceptPayoutInput,
  SubmitPayoutProofInput,
  ConfirmPayoutInput,
  PayoutSettlementResult,
} from "@/types/payout";

export const payoutsApi = {
  broadcastPayout: async (orderId: string | number) => {
    return await apiClient.post<{ success: boolean; message: string; order: OrderItem }>(
      `/api/orders/${orderId}/payout/broadcast`,
      {}
    );
  },

  acceptPayout: async (orderId: string | number, data: AcceptPayoutInput = {}) => {
    return await apiClient.post<{ success: boolean; message: string; order: OrderItem }>(
      `/api/orders/${orderId}/payout/accept`,
      data
    );
  },

  submitPayoutProof: async (orderId: string | number, data: SubmitPayoutProofInput) => {
    return await apiClient.post<{
      success: boolean;
      message: string;
      order: OrderItem;
      fees: any;
    }>(`/api/orders/${orderId}/payout/submit`, data);
  },

  confirmPayout: async (orderId: string | number, data: ConfirmPayoutInput = {}) => {
    return await apiClient.post<{
      success: boolean;
      message: string;
      order: OrderItem;
      fees: any;
    }>(`/api/orders/${orderId}/payout/confirm`, data);
  },

  reassignPayout: async (orderId: string | number) => {
    return await apiClient.post<{ success: boolean; message: string; order: OrderItem }>(
      `/api/orders/${orderId}/payout/reassign`,
      {}
    );
  },

  releasePayout: async (orderId: string | number) => {
    return await apiClient.post<{ success: boolean; message: string; order: OrderItem }>(
      `/api/orders/${orderId}/payout/release`,
      {}
    );
  },
};
