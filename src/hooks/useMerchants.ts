import { useState, useEffect, useCallback } from "react";
import { merchantsApi } from "@/lib/api/merchants.api";
import {
  MerchantListItem,
  MerchantStats,
  MerchantQueryParams,
  CreateMerchantInput,
  UpdateMerchantInput,
} from "@/types/merchant";
import { PaginationMeta } from "@/types/api";

export interface UseMerchantsOptions {
  initialLimit?: number;
  initialSort?: string;
  autoFetch?: boolean;
}

export function useMerchants(options: UseMerchantsOptions = {}) {
  const { initialLimit = 10, initialSort = "volume:desc", autoFetch = true } = options;

  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [brokerFilter, setBrokerFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string>(initialSort);
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

  // Parse sortKey into sortBy and sortOrder
  const parseSort = (key: string): { sortBy: "name" | "balance" | "createdAt"; sortOrder: "asc" | "desc" } => {
    if (key === "volume:desc" || key === "balance:desc") {
      return { sortBy: "balance", sortOrder: "desc" };
    }
    if (key === "balance:asc") {
      return { sortBy: "balance", sortOrder: "asc" };
    }
    if (key === "name:asc") {
      return { sortBy: "name", sortOrder: "asc" };
    }
    return { sortBy: "createdAt", sortOrder: "desc" };
  };

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sortBy, sortOrder } = parseSort(sortKey);

      const queryParams: MerchantQueryParams = {
        page,
        limit,
        sortBy,
        sortOrder,
        includeStats: true,
      };

      if (search.trim()) queryParams.search = search.trim();
      if (statusFilter !== "ALL") queryParams.status = statusFilter;
      if (brokerFilter !== "ALL") queryParams.brokerId = brokerFilter;

      const res = await merchantsApi.getMerchants(queryParams);

      const list = res.merchants || (res as any).users || [];
      setMerchants(list);
      if (res.pagination) {
        setPagination(res.pagination);
      }
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch merchants");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, brokerFilter, sortKey]);

  useEffect(() => {
    if (autoFetch) {
      fetchMerchants();
    }
  }, [fetchMerchants, autoFetch]);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setBrokerFilter("ALL");
    setSortKey("volume:desc");
    setPage(1);
  }, []);

  const isFiltered =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    brokerFilter !== "ALL" ||
    sortKey !== "volume:desc";

  const createMerchant = useCallback(
    async (input: CreateMerchantInput) => {
      const result = await merchantsApi.createMerchant(input);
      await fetchMerchants();
      return result;
    },
    [fetchMerchants]
  );

  const updateMerchant = useCallback(
    async (id: string, input: UpdateMerchantInput) => {
      const result = await merchantsApi.updateMerchant(id, input);
      await fetchMerchants();
      return result;
    },
    [fetchMerchants]
  );

  return {
    merchants,
    stats,
    pagination,
    loading,
    error,
    // Filter controls
    searchInput,
    setSearchInput,
    search,
    statusFilter,
    setStatusFilter,
    brokerFilter,
    setBrokerFilter,
    sortKey,
    setSortKey,
    page,
    setPage,
    limit,
    setLimit,
    isFiltered,
    resetFilters,
    // Operations
    refetch: fetchMerchants,
    createMerchant,
    updateMerchant,
  };
}
