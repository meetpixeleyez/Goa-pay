"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  UserPlus,
  KeyRound,
  Eye,
  RefreshCw,
  Send,
  Search,
  Sliders,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { agentsApi } from "@/lib/api/agents.api";
import ModalPortal from "@/components/common/ModalPortal";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [commissionTierFilter, setCommissionTierFilter] = useState<"ALL" | "TIER_LOW" | "TIER_MID" | "TIER_HIGH">("ALL");
  const [sortBy, setSortBy] = useState<"BALANCE_DESC" | "COMMISSION_DESC" | "COMMISSION_ASC" | "POOLS_DESC" | "NAME_ASC" | "NEWEST">("BALANCE_DESC");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Password Reset Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Quick Commission Adjust Modal
  const [commissionUser, setCommissionUser] = useState<any>(null);
  const [newPayinAgentFee, setNewPayinAgentFee] = useState("");
  const [newPayoutAgentFee, setNewPayoutAgentFee] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [adjustingCommission, setAdjustingCommission] = useState(false);
  const [commissionError, setCommissionError] = useState("");
  const [commissionSuccess, setCommissionSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await agentsApi.getAgents();
      if (res.success) {
        setAgents(res.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Summary Metrics calculations
  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === "ACTIVE").length;
    const inactive = total - active;

    const totalPools = agents.reduce((acc, a) => {
      const count = a._count?.agentQrProviders ?? a.agentQrProviders?.length ?? 0;
      return acc + count;
    }, 0);

    const totalBalance = agents.reduce((acc, a) => {
      return acc + (Number(a.wallet?.balance) || 0);
    }, 0);

    const avgCommission =
      total > 0
        ? agents.reduce((acc, a) => acc + (Number(a.commissionPercent) || 0), 0) / total
        : 0;

    return {
      total,
      active,
      inactive,
      totalPools,
      totalBalance,
      avgCommission,
    };
  }, [agents]);

  // Filtered & Sorted agents
  const filteredAgents = useMemo(() => {
    return agents
      .filter((a) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (a.name || "").toLowerCase().includes(q);
          const matchEmail = (a.email || "").toLowerCase().includes(q);
          const matchTelegram = (a.telegramId || "").toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchTelegram) return false;
        }

        // Status filter
        if (statusFilter === "ACTIVE" && a.status !== "ACTIVE") return false;
        if (statusFilter === "INACTIVE" && a.status === "ACTIVE") return false;

        // Commission Tier filter
        const rate = Number(a.commissionPercent) || 0;
        if (commissionTierFilter === "TIER_LOW" && rate >= 1.0) return false;
        if (commissionTierFilter === "TIER_MID" && (rate < 1.0 || rate > 1.5)) return false;
        if (commissionTierFilter === "TIER_HIGH" && rate <= 1.5) return false;

        return true;
      })
      .sort((a, b) => {
        const aBal = Number(a.wallet?.balance) || 0;
        const bBal = Number(b.wallet?.balance) || 0;
        const aComm = Number(a.commissionPercent) || 0;
        const bComm = Number(b.commissionPercent) || 0;
        const aPools = a._count?.agentQrProviders ?? a.agentQrProviders?.length ?? 0;
        const bPools = b._count?.agentQrProviders ?? b.agentQrProviders?.length ?? 0;

        if (sortBy === "BALANCE_DESC") return bBal - aBal;
        if (sortBy === "COMMISSION_DESC") return bComm - aComm;
        if (sortBy === "COMMISSION_ASC") return aComm - bComm;
        if (sortBy === "POOLS_DESC") return bPools - aPools;
        if (sortBy === "NAME_ASC") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "NEWEST") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return 0;
      });
  }, [agents, searchQuery, statusFilter, commissionTierFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, commissionTierFilter, sortBy, pageSize]);

  // Pagination slice
  const totalPages = Math.ceil(filteredAgents.length / pageSize) || 1;
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetting(true);
    setResetError("");
    setResetSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setResetSuccess(data.message || "Password updated successfully!");
      setTimeout(() => {
        setResetUser(null);
        setNewPassword("");
        setResetSuccess("");
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // Handle commission adjustment
  const handleAdjustCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionUser) return;
    setAdjustingCommission(true);
    setCommissionError("");
    setCommissionSuccess("");

    const payinNum = parseFloat(newPayinAgentFee);
    const payoutNum = parseFloat(newPayoutAgentFee);
    if (isNaN(payinNum) || payinNum < 0 || payinNum > 100 || isNaN(payoutNum) || payoutNum < 0 || payoutNum > 100) {
      setCommissionError("Payin and Payout rates must be valid numbers between 0% and 100%.");
      setAdjustingCommission(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${commissionUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payinAgentFee: payinNum,
          payoutAgentFee: payoutNum,
          commissionPercent: payinNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update commission rate");

      setCommissionSuccess("Commission rates updated successfully!");
      fetchData();
      setTimeout(() => {
        setCommissionUser(null);
        setNewPayinAgentFee("");
        setNewPayoutAgentFee("");
        setCommissionNote("");
        setCommissionSuccess("");
      }, 1400);
    } catch (err: any) {
      setCommissionError(err.message || "Failed to update commission rate");
    } finally {
      setAdjustingCommission(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Master Agent & Partner Accounts"
      subtitle="Manage partner commissions, escrow splits, and liquidity quotas across high-velocity UPI corridors."
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/agents/create"
            className="btn-primary text-xs py-2 px-3.5 flex items-center justify-center space-x-1.5 shadow-sm rounded-lg font-bold w-full sm:w-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Provision New Agent</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Search & Filters Toolbar */}
        <div className="card-theme p-3.5 rounded-xl border border-base-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* Search bar (lg: 5 cols) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-5 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agent name, email, or Telegram..."
                className="w-full pl-8 pr-8 py-2 bg-white border border-base-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-base-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Commission Tier filter (lg: 2 cols) */}
            <div className="col-span-1 lg:col-span-2">
              <select
                value={commissionTierFilter}
                onChange={(e) => setCommissionTierFilter(e.target.value as any)}
                className="w-full bg-white border border-base-200 px-3 py-2 rounded-lg text-xs font-medium text-base-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Commission Tiers</option>
                <option value="TIER_LOW">Tier 1 (&lt; 1.00%)</option>
                <option value="TIER_MID">Tier 2 (1.00% - 1.50%)</option>
                <option value="TIER_HIGH">Tier 3 (&gt; 1.50%)</option>
              </select>
            </div>

            {/* Status filter (lg: 2 cols) */}
            <div className="col-span-1 lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-base-200 px-3 py-2 rounded-lg text-xs font-medium text-base-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">Status: All</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            {/* Sort order (lg: 2 cols) */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-base-200 px-3 py-2 rounded-lg text-xs font-medium text-base-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="BALANCE_DESC">Sort: Wallet Balance</option>
                <option value="COMMISSION_DESC">Sort: Commission (High)</option>
                <option value="COMMISSION_ASC">Sort: Commission (Low)</option>
                <option value="POOLS_DESC">Sort: Linked Pools</option>
                <option value="NAME_ASC">Sort: Name (A-Z)</option>
                <option value="NEWEST">Sort: Newest First</option>
              </select>
            </div>

            {/* Refresh button (lg: 1 col) */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-1 flex items-center justify-end sm:justify-start lg:justify-center">
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full p-2 bg-white border border-base-200 hover:bg-base-100/60 rounded-lg text-gray-700 transition flex items-center justify-center shrink-0 shadow-2xs"
                title="Refresh Agent List"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? "animate-spin text-primary" : ""}`} />
                <span className="sm:hidden ml-1.5 text-xs font-semibold">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Agent Accounts Data Table & Mobile View Container */}
        <div className="card-theme overflow-hidden rounded-xl border border-base-200 shadow-sm">
          {/* Table Header Summary Strip */}
          <div className="p-3 bg-base-100/40 border-b border-base-200 flex items-center justify-between text-xs text-base-700">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base-900">
                {filteredAgents.length} Master Agent{filteredAgents.length === 1 ? "" : "s"} Found
              </span>
              {filteredAgents.length > 0 && (
                <span className="hidden sm:inline text-slate-500 font-mono">
                  (Showing page {currentPage} of {totalPages})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="hidden md:inline">
                Active: <b className="text-[#2e7d32]">{stats.active}</b>
              </span>
              <span className="hidden sm:inline text-gray-400">|</span>
              <span className="hidden sm:inline">
                Pools: <b className="text-primary">{stats.totalPools}</b>
              </span>
              <span className="text-gray-400">|</span>
              <span>
                Escrow: <b className="text-primary">₹{stats.totalBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>
              </span>
            </div>
          </div>

          {/* Desktop Table View (Hidden on mobile/tablet) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-base-100/70 border-b border-base-200 text-base-900 font-semibold">
                  <th className="py-3 px-4 w-64 max-w-[260px]">AGENT NAME & CONTACT</th>
                  <th className="py-3 px-4 whitespace-nowrap">TELEGRAM HANDLE</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">LINKED QR POOLS</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">WALLET BALANCE</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0f2fe]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                      <span>Loading master agent directory...</span>
                    </td>
                  </tr>
                ) : paginatedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      {searchQuery || statusFilter !== "ALL" || commissionTierFilter !== "ALL"
                        ? "No agents match the specified search and filter criteria."
                        : "No master agents provisioned yet. Click \"Provision New Agent\" above to get started."}
                    </td>
                  </tr>
                ) : (
                  paginatedAgents.map((a) => {
                    const poolsCount = a._count?.agentQrProviders ?? a.agentQrProviders?.length ?? 0;
                    const walletBal = Number(a.wallet?.balance) || 0;
                    const initials = (a.name || "A")
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={a.id} className="hover:bg-[#ffffff] transition-colors">
                        {/* Agent Name & Contact */}
                        <td className="py-3 px-4 w-64 max-w-[260px]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-base-100 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-base-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-base-900 truncate" title={a.name}>
                                {a.name}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                {a.phone || "--"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Telegram Handle */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {a.telegramId ? (
                            <span className="inline-flex items-center space-x-1 text-[#1565c0] bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <Send className="w-3 h-3 text-[#1565c0]" />
                              <span>{a.telegramId}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>



                        {/* Linked QR Pools */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-base-100/60 text-base-900 border border-base-200">
                            {poolsCount} {poolsCount === 1 ? "Provider" : "Providers"}
                          </span>
                        </td>

                        {/* Wallet Balance */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-base-900 font-mono text-xs">
                            ₹{walletBal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Current Balance</span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.status === "ACTIVE"
                                ? "bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60"
                                : "bg-red-50 text-red-700 border border-red-200/60"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                a.status === "ACTIVE" ? "bg-[#2e7d32]" : "bg-red-600"
                              }`}
                            ></span>
                            <span>{a.status || "ACTIVE"}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Info */}
                            <Link
                              href={`/admin/agents/${a.id}`}
                              className="p-1.5 bg-white border border-base-200 hover:bg-base-100/60 text-gray-700 rounded-lg transition inline-flex items-center shadow-2xs"
                              title="View Full Profile & Info"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                            </Link>



                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetUser(a);
                                setNewPassword("");
                                setResetError("");
                                setResetSuccess("");
                              }}
                              className="p-1.5 bg-white border border-base-200 hover:bg-base-100/60 text-gray-700 rounded-lg transition inline-flex items-center shadow-2xs"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Visible on mobile/tablet) */}
          <div className="block lg:hidden divide-y divide-[#e0f2fe]">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                <span>Loading agents...</span>
              </div>
            ) : paginatedAgents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No master agents found matching criteria.
              </div>
            ) : (
              paginatedAgents.map((a) => {
                const poolsCount = a._count?.agentQrProviders ?? a.agentQrProviders?.length ?? 0;
                const walletBal = Number(a.wallet?.balance) || 0;
                const initials = (a.name || "A")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div key={a.id} className="p-4 space-y-3 hover:bg-[#ffffff] transition">
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-base-100 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-base-200">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-base-900 truncate">{a.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{a.phone || "--"}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          a.status === "ACTIVE"
                            ? "bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60"
                            : "bg-red-50 text-red-700 border border-red-200/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            a.status === "ACTIVE" ? "bg-[#2e7d32]" : "bg-red-600"
                          }`}
                        ></span>
                        <span>{a.status || "ACTIVE"}</span>
                      </span>
                    </div>

                    {/* Middle Metrics Badges */}
                    <div className="text-xs pt-1">
                      <div className="p-2 bg-base-100/40 rounded-lg border border-base-200 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">Wallet Balance</span>
                        <span className="font-bold text-base-900 font-mono">
                          ₹{walletBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="bg-base-100/80 px-2 py-0.5 rounded font-semibold text-base-900">
                          {poolsCount} Providers
                        </span>
                        {a.telegramId && (
                          <span className="inline-flex items-center space-x-1 text-[#1565c0] font-mono">
                            <Send className="w-2.5 h-2.5" />
                            <span>{a.telegramId}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <Link
                          href={`/admin/agents/${a.id}`}
                          className="px-2.5 py-1 text-xs border border-base-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1 shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-primary" />
                          <span>View</span>
                        </Link>
                        <button
                          onClick={() => {
                            setResetUser(a);
                            setNewPassword("");
                            setResetError("");
                            setResetSuccess("");
                          }}
                          className="px-2.5 py-1 text-xs border border-base-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1 shadow-2xs"
                        >
                          <KeyRound className="w-3 h-3 text-sky-600" />
                          <span>Pass</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Bar (Matching Stitch Design) */}
          <div className="px-4 py-3 bg-base-100/40 border-t border-base-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 text-gray-600">
              <span>
                Showing {filteredAgents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredAgents.length)} of {filteredAgents.length} master agents
              </span>

              {/* Page size dropdown */}
              <div className="flex items-center space-x-1">
                <span className="text-gray-400">|</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-base-200 rounded px-2 py-0.5 text-xs text-base-900 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 bg-white border border-base-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 5) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;

                    return (
                      <span key={page} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition ${
                            currentPage === page
                              ? "bg-primary text-white shadow-xs"
                              : "bg-white border border-base-200 text-gray-700 hover:bg-base-100/60"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 bg-white border border-base-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* PASSWORD RESET MODAL */}
      {resetUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="card-theme max-w-sm w-full p-6 rounded-2xl border border-base-200 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Reset Agent Password</h3>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-base-700">
                  Resetting password for: <b>{resetUser.name || `Agent #${resetUser.id}`}</b>
                </p>

                {resetError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resetSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>

                <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-[11px] text-red-700">
                  Warning: Updating this key will require the partner to re-authenticate with their new credentials.
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="flex-1 py-2 text-xs border border-base-200 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting || !newPassword || newPassword.trim().length < 6}
                    className="flex-1 btn-primary py-2 text-xs font-bold rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {resetting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </PortalLayout>
  );
}
