"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  UserPlus,
  KeyRound,
  Eye,
  RefreshCw,
  Send,
  ShieldCheck,
  Lock,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";

import { qrProvidersApi } from "@/lib/api/qr-providers.api";
import { apiClient } from "@/lib/api/client";
import ModalPortal from "@/components/common/ModalPortal";

export default function AdminQRProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"AVAIL_DESC" | "BALANCE_DESC" | "EXPOSURE_DESC" | "FEE_ASC" | "NAME_ASC" | "NEWEST">("AVAIL_DESC");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await qrProvidersApi.getQRProviders({ limit: 100, includeStats: true });
      const list = data.providers || (data as any).users || [];
      if (data.success && Array.isArray(list)) {
        setProviders(list);
      }
    } catch (e) {
      console.error("Failed to fetch QR providers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique agents for dropdown filter
  const uniqueAgents = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach((p) => {
      if (p.agent && p.agent.id && p.agent.name) {
        map.set(p.agent.id, p.agent.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [providers]);

  // Filtered & Sorted Providers
  const filteredProviders = useMemo(() => {
    return providers
      .filter((p) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (p.name || "").toLowerCase().includes(q);
          const tgMatch = (p.telegramId || "").toLowerCase().includes(q);
          const phoneMatch = (p.phone || "").toLowerCase().includes(q);
          if (!nameMatch && !tgMatch && !phoneMatch) return false;
        }

        // Agent filter
        if (agentFilter !== "ALL") {
          if (agentFilter === "DIRECT") {
            if (p.agentId || p.agent) return false;
          } else {
            if (p.agentId !== agentFilter && p.agent?.id !== agentFilter) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aTotal = Number(a.balance || 0);
        const bTotal = Number(b.balance || 0);
        const aAvail = Number(a.availableBalance || 0);
        const bAvail = Number(b.availableBalance || 0);
        const aExposure = Number(a.exposure || 0);
        const bExposure = Number(b.exposure || 0);
        const aFee = Number(a.payinQrProviderFee ?? a.qrProviderFee ?? 0);
        const bFee = Number(b.payinQrProviderFee ?? b.qrProviderFee ?? 0);

        if (sortBy === "AVAIL_DESC") return bAvail - aAvail;
        if (sortBy === "BALANCE_DESC") return bTotal - aTotal;
        if (sortBy === "EXPOSURE_DESC") return bExposure - aExposure;
        if (sortBy === "FEE_ASC") return aFee - bFee;
        if (sortBy === "NAME_ASC") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "NEWEST") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return 0;
      });
  }, [providers, searchQuery, agentFilter, sortBy]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, agentFilter, sortBy, pageSize]);

  // Pagination slicing
  const totalItems = filteredProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProviders.slice(start, start + pageSize);
  }, [filteredProviders, currentPage, pageSize]);

  // Status counters
  const counters = useMemo(() => {
    let highLiq = 0;
    let highExp = 0;
    let activeCount = 0;
    let pausedCount = 0;

    providers.forEach((p) => {
      const totalBal = Number(p.balance || 0);
      const exposure = Number(p.exposure || 0);
      const availBal = Number(p.availableBalance || 0);
      const exposureRatio = totalBal > 0 ? (exposure / totalBal) * 100 : 0;

      if (availBal >= 50000 || (totalBal > 0 && availBal / totalBal >= 0.5)) highLiq++;
      if (exposureRatio >= 30 || exposure > 0) highExp++;
      if (p.status === "ACTIVE") activeCount++;
      else pausedCount++;
    });

    return {
      all: providers.length,
      highLiq,
      highExp,
      active: activeCount,
      paused: pausedCount,
    };
  }, [providers]);

  // Password reset handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    try {
      const data = await apiClient.post<{ success: boolean; message: string }>(
        `/api/admin/users/${resetUser.id}/reset-password`,
        { newPassword }
      );

      setResetSuccess(data.message || "Password updated and credentials rotated successfully!");
      setTimeout(() => {
        setResetUser(null);
        setNewPassword("");
        setResetSuccess("");
      }, 1500);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PortalLayout
        portal="admin"
        title="QR Providers & Fleet Management"
        subtitle="Manage liquidity providers, balance allocations, atomic exposure reservations, sub-operators, and collection QR codes"
        actions={
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-white/70 border border-base-200 rounded-lg transition text-slate-700 hover:text-primary hover:bg-primary-100 hover:border-primary-200 shadow-2xs shrink-0"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
            <Link
              href="/admin/qr-providers/create"
              className="btn-primary text-xs py-2 px-3 sm:px-3.5 flex items-center justify-center space-x-1.5 shadow-sm font-semibold rounded-lg shrink-0 transition"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">+ Provision QR Provider</span>
              <span className="inline sm:hidden">+ Provision</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-4 sm:space-y-5 2xl:space-y-6">
          <div className="bg-white border border-base-200 rounded-xl p-3 sm:p-4 2xl:p-5 shadow-[0_4px_16px_-2px_rgba(45,52,54,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-4 xl:gap-5 2xl:gap-6">
            {/* Bottom row: Search input & Dropdowns */}
            <div className="relative w-full lg:flex-1 lg:max-w-md xl:max-w-lg 2xl:max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-700">
                <Search className="size-4 2xl:w-4.5 2xl:h-4.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search provider name, email, Telegram, or phone..."
                className="w-full pl-9 pr-8 py-2 sm:pl-10 text-sm 2xl:py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700"
                >
                  <X className="size-3.5 2xl:size-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 xl:gap-3 2xl:gap-3.5 w-full lg:w-auto shrink-0">
              <div className="relative col-span-1 sm:flex-1 lg:flex-none">
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs 2xl:text-sm py-2 2xl:py-2.5 pl-2.5 sm:pl-3 2xl:pl-3.5 pr-7 sm:pr-8 2xl:pr-9 rounded-lg focus:border-primary focus:outline-none cursor-pointer sm:min-w-[130px] lg:min-w-[150px] 2xl:min-w-[170px]"
                >
                  <option value="ALL">All Agents / Syndicates</option>
                  <option value="DIRECT">Direct Platform (No Agent)</option>
                  {uniqueAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
              </div>

              {/* Sort Dropdown (3 cols) */}
              <div className="relative col-span-1 sm:flex-1 lg:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs 2xl:text-sm py-2 2xl:py-2.5 pl-2.5 sm:pl-3 2xl:pl-3.5 pr-7 sm:pr-8 2xl:pr-9 rounded-lg focus:border-primary focus:outline-none cursor-pointer sm:min-w-[130px] lg:min-w-[150px] 2xl:min-w-[170px]"
                >
                  <option value="AVAIL_DESC">Sort: Available Float (High to Low)</option>
                  <option value="BALANCE_DESC">Sort: Total Balance (High to Low)</option>
                  <option value="EXPOSURE_DESC">Sort: Exposure Locked (High to Low)</option>
                  <option value="FEE_ASC">Sort: Fee % (Low to High)</option>
                  <option value="NAME_ASC">Sort: Name (A to Z)</option>
                  <option value="NEWEST">Sort: Newest First</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-base-700">
                  <ChevronDown className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
              </div>
            </div>
          </div>
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            {/* DESKTOP HIGH-DENSITY TABLE (Visible on lg and above) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider h-10 select-none border-b border-slate-200">
                  <tr>
                    <th className="p-3 whitespace-nowrap">Provider Identity</th>
                    <th className="p-3 whitespace-nowrap">Balance Metrics</th>
                    <th className="p-3 whitespace-nowrap">Fee % (In / Out)</th>
                    <th className="p-3 whitespace-nowrap">Fleet Assets</th>
                    <th className="p-3 whitespace-nowrap">Assigned Agent</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        <span className="text-xs font-semibold">Loading QR providers...</span>
                      </td>
                    </tr>
                  ) : paginatedProviders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        <div className="max-w-sm mx-auto space-y-2">
                          <AlertTriangle className="w-7 h-7 mx-auto text-primary" />
                          <p className="font-semibold text-slate-700">No QR providers match your filters</p>
                          <p className="text-xs text-slate-400">
                            Try adjusting your search query, status tabs, or clearing your selected filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProviders.map((p) => {
                      const totalBal = Number(p.balance || 0);
                      const exposure = Number(p.exposure || 0);
                      const availBal = Number(p.availableBalance || 0);
                      const exposurePercent = totalBal > 0 ? Math.min(100, Math.max(0, Math.round((exposure / totalBal) * 100))) : 0;
                      const initials = (p.name)
                        .split(" ")
                        .map((w: string) => w[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      const isActive = p.status === "ACTIVE";
                      const isHighExposure = exposurePercent >= 60 && totalBal > 0;

                      return (
                        <tr key={p.id} className={`transition-colors ${!isActive ? "bg-red-50" : "hover:bg-primary-50"}`}>
                          {/* Provider Identity */}
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`size-10 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 ${!isActive
                                  ? "bg-red-100 text-red-500"
                                  : "bg-primary-100 text-primary"
                                  }`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/admin/qr-providers/${p.id}?tab=info`}
                                  className="font-bold text-base-900 hover:text-primary truncate block transition"
                                  title="Click to view provider info"
                                >
                                  {p.name}
                                </Link>
                                <div className="text-[11px] text-slate-500 font-mono truncate">
                                  {p.phone || `--`}
                                </div>
                                {/*  <div className="mt-0.5">
                                  {p.telegramId ? (
                                    <a
                                      href={`https://t.me/${p.telegramId.replace("@", "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-[10px] font-mono"
                                    >
                                      <Send className="w-2.5 h-2.5" />
                                      <span>{p.telegramId.startsWith("@") ? p.telegramId : `@${p.telegramId}`}</span>
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No Telegram</span>
                                  )}
                                </div> */}
                              </div>
                            </div>
                          </td>

                          {/* Balance Metrics */}
                          <td className="p-3 font-mono whitespace-nowrap">
                            <div className="font-bold text-slate-700">
                              ₹{totalBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-primary font-medium">
                              Locked: ₹{exposure.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] font-semibold text-primary">
                              Avail: ₹{availBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Fee Structure */}
                          <td className="py-4 px-3 whitespace-nowrap">
                            <div className="inline-flex flex-col gap-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-900" title="Deposit (Payin) Fee">
                                Payin: <strong className="text-primary font-semibold">{p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-900" title="Withdrawal (Payout) Fee">
                                Payout: <strong className="text-slate-700 font-semibold">{p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%</strong>
                              </span>
                            </div>
                          </td>

                          {/* Fleet Assets (QRs & Operators Links) */}
                          <td className="p-3">
                            <div className="flex flex-col space-y-1">
                              <Link
                                href={`/admin/qr-providers/${p.id}?tab=qrcodes`}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-primary/15 text-gray-700 hover:text-primary text-[11px] font-semibold transition w-fit border border-gray-200/60"
                                title="Click to view assigned QR codes"
                              >
                                <QrCode className="w-3 h-3 text-primary" />
                                <span>{p.qrCodes?.length || 0} QRs</span>
                              </Link>
                              <Link
                                href={`/admin/qr-providers/${p.id}?tab=operators`}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-primary/15 text-gray-700 hover:text-primary text-[11px] font-semibold transition w-fit border border-gray-200/60 whitespace-nowrap"
                                title="Click to view assigned operators"
                              >
                                <Users className="w-3 h-3 text-slate-500" />
                                <span>{p.operators?.length || 0} Operators</span>
                              </Link>
                            </div>
                          </td>

                          {/* Assigned Agent */}
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                {p.agent ? p.agent.name : "Direct (None)"}
                              </span>
                              {
                                p.agent ? (<span className="text-[10px] text-slate-500 font-semibold" >
                                  {p.agent.commissionPercent}% Commission Share
                                </span>) : (
                                  <span>
                                    <span className="text-[10px] text-primary font-semibold">
                                      Direct Switch API
                                    </span>
                                  </span>
                                )
                              }
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            {isHighExposure ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary text-[10px] font-semibold">
                                <AlertTriangle className="size-2.5" />
                                <span>Cap Alert</span>
                              </span>
                            ) : isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold w-fit bg-green-100 text-green-500">
                                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold w-fit bg-red-100 text-red-500">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span>Paused</span>
                              </span>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td className="p-3 text-center">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/qr-providers/${p.id}?tab=info`}
                                className="bg-white hover:bg-primary-100 border border-primary-200 px-2.5 py-1 rounded text-xs font-medium text-primary transition-all"
                                title="Click to view provider info"
                              >
                                <span>View Profile</span>
                              </Link>
                              <button
                                onClick={() => {
                                  setResetUser(p);
                                  setNewPassword("");
                                  setResetError("");
                                  setResetSuccess("");
                                }}
                                className="p-1 rounded text-slate-700 hover:text-primary transition-all"
                                title="Reset provider login password"
                              >
                                <KeyRound className="size-4" />
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

            {/* MOBILE & TABLET CARD VIEW (Visible on < lg screens) */}
            <div className="block lg:hidden divide-y divide-[#e0f2fe]">
              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                  <span className="text-xs font-semibold">Loading QR providers...</span>
                </div>
              ) : paginatedProviders.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <AlertTriangle className="w-6 h-6 mx-auto text-sky-600 mb-1" />
                  <p className="font-semibold text-xs text-base-900">No providers found</p>
                  <p className="text-[11px] text-gray-400">Try adjusting your filters or search keywords.</p>
                </div>
              ) : (
                paginatedProviders.map((p) => {
                  const totalBal = Number(p.balance || 0);
                  const exposure = Number(p.exposure || 0);
                  const availBal = Number(p.availableBalance || 0);
                  const initials = (p.name || "QR")
                    .split(" ")
                    .map((w: string) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const isActive = p.status === "ACTIVE";

                  return (
                    <div key={p.id} className="p-4 space-y-3 bg-white hover:bg-white transition">
                      {/* Card Header: Identity + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className={`size-10 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 ${!isActive
                            ? "bg-red-100 text-red-500"
                            : "bg-primary-100 text-primary"
                            }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/qr-providers/${p.id}?tab=info`}
                              className="font-semibold text-xs text-slate-700 hover:text-primary block truncate"
                              title="Click to view provider info"
                            >
                              {p.name}
                            </Link>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{p.phone || `--`}</div>
                            {/*  {p.telegramId && (
                              <a
                                href={`https://t.me/${p.telegramId.replace("@", "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 text-blue-600 text-[10px] font-mono mt-0.5"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>{p.telegramId.startsWith("@") ? p.telegramId : `@${p.telegramId}`}</span>
                              </a>
                            )} */}
                          </div>
                        </div>
                        {isActive ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-green-100 text-green-500 text-[10px] font-bold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-bold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>Pause</span>
                          </span>
                        )}
                      </div>

                      {/* Balance Metrics Grid */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 bg-base-100/30 rounded-lg text-center font-mono text-[11px]">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Total</div>
                          <div className="font-semibold text-slate-700">
                            ₹{totalBal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-primary uppercase">Locked</div>
                          <div className="font-semibold text-primary">
                            ₹{exposure.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-primary uppercase">Available</div>
                          <div className="font-semibold text-primary">
                            ₹{availBal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>

                      {/* Meta Row: Fee, Agent, Fleet Assets Links */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 flex-wrap gap-2">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="bg-slate-50 text-slate-900 border border-slate-200 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
                            Payin: {p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%
                          </span>
                          <span className="bg-slate-50 text-slate-900 border border-slate-200 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
                            Payout: {p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%
                          </span>
                          <span>{p.agent ? `Agent: ${p.agent.name}` : "Direct"}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Link
                            href={`/admin/qr-providers/${p.id}?tab=qrcodes`}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-primary/15 text-slate-500 hover:text-primary rounded text-[10px] font-semibold border border-slate-100 inline-flex items-center space-x-1 transition"
                            title="Click to view assigned QR codes"
                          >
                            <QrCode className="w-2.5 h-2.5 text-primary" />
                            <span>{p.qrCodes?.length || 0} QRs</span>
                          </Link>
                          <Link
                            href={`/admin/qr-providers/${p.id}?tab=operators`}
                            className="px-2 py-0.5 bg-gray-100 hover:bg-primary/15 text-gray-700 hover:text-primary rounded text-[10px] font-semibold border border-gray-200/60 inline-flex items-center space-x-1 transition"
                            title="Click to view assigned operators"
                          >
                            <Users className="w-2.5 h-2.5 text-slate-500" />
                            <span>{p.operators?.length || 0} Ops</span>
                          </Link>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                        <Link
                          href={`/admin/qr-providers/${p.id}?tab=info`}
                          className="py-1.5 text-xs text-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold flex items-center justify-center space-x-1"
                          title="Click to view provider info"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>View Info</span>
                        </Link>
                        <button
                          onClick={() => {
                            setResetUser(p);
                            setNewPassword("");
                            setResetError("");
                            setResetSuccess("");
                          }}
                          className="py-1.5 text-xs text-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold flex items-center justify-center space-x-1"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-sky-700" />
                          <span>Reset Pass</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ========================================================================= */}
            {/* PAGINATION TOOLBAR WITH INTEGRATED PER-PAGE DROPDOWN                       */}
            {/* ========================================================================= */}
            <div className="border-t border-slate-100 px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-slate-500">
              {/* Left: Summary text & Per-page selector */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 w-full sm:w-auto">
                <span>
                  Showing <b>{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</b> -{" "}
                  <b>{Math.min(currentPage * pageSize, totalItems)}</b> of <b>{totalItems}</b> Providers
                </span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none bg-white border border-slate-200 text-slate-500 text-xs py-1 pl-2.5 pr-7 rounded focus:outline-none cursor-pointer"
                    title="Records per page"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none text-base-700">
                    <ChevronDown className="size-3.5" />
                  </div>
                </div>
              </div>

              {/* Right: Page navigation buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 h-7 rounded border border-base-200 bg-white text-base-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all hover:bg-primary-100"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter((pNum) => {
                    if (totalPages <= 5) return true;
                    if (pNum === 1 || pNum === totalPages) return true;
                    return Math.abs(pNum - currentPage) <= 1;
                  })
                  .map((pNum, index, arr) => {
                    const showEllipsisBefore = index > 0 && pNum - arr[index - 1] > 1;
                    return (
                      <div key={pNum} className="flex items-center">
                        {showEllipsisBefore && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(pNum)}
                          className={`size-7 rounded font-bold flex items-center justify-center transition-colors ${currentPage === pNum
                            ? "bg-primary text-white shadow-2xs"
                            : "border border-slate-200 bg-white hover:bg-primary-100 hover:text-primary text-slate-700"
                            }`}
                        >
                          {pNum}
                        </button>
                      </div>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1 h-7 rounded border border-slate-200 bg-white hover:bg-primary-100 text-base-900 flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </PortalLayout>

      {/* =============== PASSWORD RESET MODAL OVERLAY ===============*/}
      {resetUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <KeyRound className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Reset Provider Password</h3>
                    <p className="text-[11px] text-slate-200">Rotate console credentials for this entity</p>
                  </div>
                </div>
                <button
                  onClick={() => setResetUser(null)} className="hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                {/* Provider Meta Box */}
                <div className="p-3 bg-base-100/40 rounded-xl border border-base-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-base-900">{resetUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{resetUser.phone || `Provider #${resetUser.id}`}</div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-base-200 text-gray-600 font-semibold">
                    ID: {resetUser.id}
                  </span>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3.5 mt-2">
                  {resetError && (
                    <div className="p-2.5 bg-red-50 text-red-500 text-xs rounded-lg flex items-center space-x-2 border border-red-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{resetError}</span>
                    </div>
                  )}
                  {resetSuccess && (
                    <div className="p-2.5 bg-green-50 text-green-500 text-xs rounded-lg flex items-center space-x-2 border border-green-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                      <span>{resetSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">New Password  <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-3 pr-9 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-base-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[11px]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Informational security note */}
                  <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl text-[11px] space-y-1">
                    <div className="font-semibold flex items-center space-x-1 text-primary">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span>Security Protocol</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Resetting credentials will require the provider to log in again. Sub-operator assignments and wallet balances remain intact.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetUser(null)}
                      className="flex-1 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetting || !newPassword || newPassword.trim().length < 6}
                      className="flex-1 btn-primary py-2 text-xs font-semibold shadow-sm rounded-lg flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {resetting ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="size-3.5" />
                          <span>Confirm & Rotate</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
