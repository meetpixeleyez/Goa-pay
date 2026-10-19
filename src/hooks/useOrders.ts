"use client";

import { useState, useEffect, useCallback } from "react";
import { ordersApi } from "@/lib/api/orders.api";
import { OrderItem, OrderQueryParams } from "@/types/order";
import { PaginationMeta } from "@/types/api";

interface UseOrdersOptions {
  portal?: "admin" | "merchant" | "qr-provider" | "operator";
  params?: OrderQueryParams;
  autoFetch?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { portal = "merchant", params = {}, autoFetch = true } = options;

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [availablePayoutCount, setAvailablePayoutCount] = useState<number>(0);
  const [assignedQrCount, setAssignedQrCount] = useState<number>(0);
  const [adminAlertCount, setAdminAlertCount] = useState<number>(0);

  const fetchOrders = useCallback(async (customParams?: OrderQueryParams) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = { ...params, ...(customParams || {}) };
      const res = await ordersApi.getOrders(queryParams, portal);

      if (res.success) {
        setOrders(res.orders || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.availablePayoutCount !== undefined) setAvailablePayoutCount(res.availablePayoutCount);
        if (res.assignedQrCount !== undefined) setAssignedQrCount(res.assignedQrCount);
        if (res.adminAlertCount !== undefined) setAdminAlertCount(res.adminAlertCount);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [portal, JSON.stringify(params)]);

  useEffect(() => {
    if (autoFetch) {
      fetchOrders();
    }
  }, [fetchOrders, autoFetch]);

  const updateOrderInList = useCallback((updatedOrder: Partial<OrderItem> & { id: number }) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
  }, []);

  const addOrUpdateOrder = useCallback((order: OrderItem) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...order };
        return copy;
      }
      return [order, ...prev];
    });
  }, []);

  return {
    orders,
    setOrders,
    pagination,
    loading,
    error,
    availablePayoutCount,
    assignedQrCount,
    adminAlertCount,
    refetch: fetchOrders,
    updateOrderInList,
    addOrUpdateOrder,
  };
}
