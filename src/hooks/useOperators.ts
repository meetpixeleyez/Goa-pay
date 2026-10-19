import { useState, useEffect, useCallback } from "react";
import { qrProvidersApi } from "@/lib/api/qr-providers.api";
import { OperatorItem, CreateOperatorInput, UpdateOperatorInput } from "@/types/qr-provider";
import { PaginationMeta } from "@/types/api";

export function useOperators(providerId?: string) {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Debounce search (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qrProvidersApi.getOperators({
        providerId,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search.trim() ? search.trim() : undefined,
        page,
        limit,
      });

      setOperators(res.operators || []);
      if (res.pagination) setPagination(res.pagination);
      if (res.stats) setStats(res.stats);
    } catch (err: any) {
      setError(err.message || "Failed to fetch operators");
    } finally {
      setLoading(false);
    }
  }, [providerId, statusFilter, search, page, limit]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const createOperator = useCallback(
    async (input: CreateOperatorInput) => {
      const res = await qrProvidersApi.createOperator(input);
      await fetchOperators();
      return res.operator;
    },
    [fetchOperators]
  );

  const updateOperator = useCallback(
    async (id: string, input: UpdateOperatorInput) => {
      const res = await qrProvidersApi.updateOperator(id, input);
      await fetchOperators();
      return res.operator;
    },
    [fetchOperators]
  );

  const assignQRCodes = useCallback(
    async (operatorId: string, assignedQrIds: string[]) => {
      const res = await qrProvidersApi.assignQRCodesToOperator(operatorId, assignedQrIds);
      await fetchOperators();
      return res.assignedQRs;
    },
    [fetchOperators]
  );

  const resetPassword = useCallback(
    async (operatorId: string, newPass: string) => {
      return await qrProvidersApi.resetOperatorPassword(operatorId, newPass);
    },
    []
  );

  return {
    operators,
    stats,
    pagination,
    loading,
    error,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    limit,
    setLimit,
    refetch: fetchOperators,
    createOperator,
    updateOperator,
    assignQRCodes,
    resetPassword,
  };
}
