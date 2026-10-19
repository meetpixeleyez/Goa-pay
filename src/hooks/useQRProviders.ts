import { useState, useEffect, useCallback } from "react";
import { qrProvidersApi } from "@/lib/api/qr-providers.api";
import {
  QRProviderListItem,
  QRProviderStats,
  QRProviderQueryParams,
  CreateQRProviderInput,
  UpdateQRProviderInput,
} from "@/types/qr-provider";
import { PaginationMeta } from "@/types/api";

export function useQRProviders(initialLimit = 10) {
  const [providers, setProviders] = useState<QRProviderListItem[]>([]);
  const [stats, setStats] = useState<QRProviderStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string>("volume:desc");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(initialLimit);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: initialLimit,
    totalPages: 1,
  });

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const parseSort = (key: string): { sortBy: "name" | "balance" | "exposure" | "availableBalance" | "createdAt"; sortOrder: "asc" | "desc" } => {
    if (key === "balance:desc") return { sortBy: "balance", sortOrder: "desc" };
    if (key === "balance:asc") return { sortBy: "balance", sortOrder: "asc" };
    if (key === "available:desc") return { sortBy: "availableBalance", sortOrder: "desc" };
    if (key === "name:asc") return { sortBy: "name", sortOrder: "asc" };
    return { sortBy: "createdAt", sortOrder: "desc" };
  };

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sortBy, sortOrder } = parseSort(sortKey);
      const queryParams: QRProviderQueryParams = {
        page,
        limit,
        sortBy,
        sortOrder,
        includeStats: true,
      };

      if (search.trim()) queryParams.search = search.trim();
      if (statusFilter !== "ALL") queryParams.status = statusFilter;
      if (agentFilter !== "ALL") queryParams.agentId = agentFilter;

      const res = await qrProvidersApi.getQRProviders(queryParams);

      const list = res.providers || (res as any).users || [];
      setProviders(list);
      if (res.pagination) setPagination(res.pagination);
      if (res.stats) setStats(res.stats);
    } catch (err: any) {
      setError(err.message || "Failed to fetch QR providers");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, agentFilter, sortKey]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setAgentFilter("ALL");
    setSortKey("volume:desc");
    setPage(1);
  }, []);

  const createProvider = useCallback(
    async (input: CreateQRProviderInput) => {
      const res = await qrProvidersApi.createQRProvider(input);
      await fetchProviders();
      return res.user;
    },
    [fetchProviders]
  );

  const updateProvider = useCallback(
    async (id: string, input: UpdateQRProviderInput) => {
      const res = await qrProvidersApi.updateQRProvider(id, input);
      await fetchProviders();
      return res.user;
    },
    [fetchProviders]
  );

  return {
    providers,
    stats,
    pagination,
    loading,
    error,
    searchInput,
    setSearchInput,
    search,
    statusFilter,
    setStatusFilter,
    agentFilter,
    setAgentFilter,
    sortKey,
    setSortKey,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
    refetch: fetchProviders,
    createProvider,
    updateProvider,
  };
}
