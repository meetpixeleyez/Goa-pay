"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Store,
  UserPlus,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Percent,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sliders,
  FilterX,
  Send,
  Check,
  ChevronDown,
  Building2,
  AlertTriangle,
  Lock,
  Unlock,
} from "lucide-react";

import { useMerchants } from "@/hooks/useMerchants";
import { apiClient } from "@/lib/api/client";

export default function AdminMerchantsPage() {
  const [brokers, setBrokers] = useState<any[]>([]);

  const {
    merchants,
    stats,
    pagination,
    loading,
    error,
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
    refetch: fetchMerchants,
    createMerchant,
  } = useMerchants();

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [payinMerchantFee, setPayinMerchantFee] = useState("0");
  const [payoutMerchantFee, setPayoutMerchantFee] = useState("0");
  const [brokerId, setBrokerId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Fetch Brokers lazily on demand only
  const fetchBrokers = async () => {
    if (brokers.length > 0) return;
    try {
      const data = await apiClient.get<{ success: boolean; users: any[] }>("/api/admin/users?role=BROKER");
      if (data.success) {
        setBrokers(data.users || []);
      }
    } catch (e) {
      console.error("Error fetching brokers:", e);
    }
  };

  // Derive brokers from merchants list dynamically without calling Broker API on page load
  const availableBrokers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    merchants.forEach((m: any) => {
      if (m.broker && m.broker.id && m.broker.name) {
        map.set(m.broker.id, { id: m.broker.id, name: m.broker.name });
      }
    });
    brokers.forEach((b: any) => {
      if (b && b.id && b.name) {
        map.set(b.id, { id: b.id, name: b.name });
      }
    });
    return Array.from(map.values());
  }, [merchants, brokers]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      let uploadedQrUrl = "";
      if (qrImageFile) {
        const formData = new FormData();
        formData.append("file", qrImageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) uploadedQrUrl = uploadData.url;
      }

      await createMerchant({
        name,
        email,
        password,
        phone,
        address,
        telegramId,
        payinMerchantFee: parseFloat(payinMerchantFee) || 0.0,
        payoutMerchantFee: parseFloat(payoutMerchantFee) || 0.0,
        brokerId: brokerId || null,
        upiId: upiId || null,
        qrCodeUrl: uploadedQrUrl || null,
      });

      setCreateSuccess(`Merchant created successfully!`);
      setTimeout(() => {
        setShowCreateModal(false);
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setAddress("");
        setTelegramId("");
      }, 1200);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetError("");
    setResetSuccess("");

    try {
      const data = await apiClient.post<{ success: boolean; message: string }>(
        `/api/admin/users/${resetUser.id}/reset-password`,
        { newPassword }
      );

      setResetSuccess(data.message || "Password updated!");
      setTimeout(() => {
        setResetUser(null);
        setNewPassword("");
      }, 1200);
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
        title="Merchant Management"
        subtitle="Onboard, configure fee structures, and monitor merchant wallet settlements"
        actions={
          <Link
            href="/admin/merchants/create"
            className="bg-primary hover:bg-primary-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all active:scale-[0.99] shrink-0"
          >
            <span>+ Create New Merchant</span>
          </Link>
        }
      >
        <div className="space-y-4 sm:space-y-5 2xl:space-y-6">
          <div className="bg-white border border-base-200 rounded-xl p-3 sm:p-4 2xl:p-5 shadow-[0_4px_16px_-2px_rgba(45,52,54,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-4 xl:gap-5 2xl:gap-6">
            {/* Search Input field (Full width on < 1024px, generous width on 1440px+) */}
            <div className="relative w-full lg:flex-1 lg:max-w-md xl:max-w-lg 2xl:max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-700">
                <Search className="size-4 2xl:w-4.5 2xl:h-4.5" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by store name, email, phone, or merchant ID..."
                className="w-full pl-9 pr-8 py-2 sm:pl-10 text-sm 2xl:py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 placeholder:text-slate-500"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-700 hover:text-base-900"
                  title="Clear search"
                >
                  <X className="size-3.5 2xl:size-4" />
                </button>
              )}
            </div>

            {/* Filter Controls Cluster (Grid on mobile < 640px, flex wrap on tablet, inline with comfortable widths on 1440px+) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 xl:gap-3 2xl:gap-3.5 w-full lg:w-auto shrink-0">
              {/* Status Filter Dropdown */}
              <div className="relative col-span-1 sm:flex-1 lg:flex-none">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-base-900 text-xs 2xl:text-sm py-2 2xl:py-2.5 pl-2.5 sm:pl-3 2xl:pl-3.5 pr-7 sm:pr-8 2xl:pr-9 rounded-lg focus:border-primary focus:outline-none cursor-pointer sm:min-w-[130px] lg:min-w-[150px] 2xl:min-w-[170px]"
                >
                  <option value="ALL">Status: All ({stats?.totalMerchants ?? pagination.total})</option>
                  <option value="ACTIVE">Status: Active ({stats?.activeMerchants ?? 0})</option>
                  <option value="INACTIVE">Status: Suspended ({stats?.inactiveMerchants ?? 0})</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-base-700">
                  <ChevronDown className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
              </div>

              {/* Linked Broker Dropdown */}
              <div className="relative col-span-1 sm:flex-1 lg:flex-none">
                <select
                  value={brokerFilter}
                  onChange={(e) => {
                    setBrokerFilter(e.target.value);
                    setPage(1);
                  }}
                  onFocus={() => {
                    if (brokers.length === 0) fetchBrokers();
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-base-900 text-xs 2xl:text-sm py-2 2xl:py-2.5 pl-2.5 sm:pl-3 2xl:pl-3.5 pr-7 sm:pr-8 2xl:pr-9 rounded-lg focus:border-primary focus:outline-none cursor-pointer sm:min-w-[130px] lg:min-w-[150px] 2xl:min-w-[180px] truncate"
                >
                  <option value="ALL">Broker: All</option>
                  <option value="NONE">Direct (None)</option>
                  {availableBrokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-base-700">
                  <ChevronDown className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="relative col-span-2 sm:col-span-1 sm:flex-1 lg:flex-none">
                <select
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-base-900 text-xs 2xl:text-sm py-2 2xl:py-2.5 pl-2.5 sm:pl-3 2xl:pl-3.5 pr-7 sm:pr-8 2xl:pr-9 rounded-lg focus:border-primary focus:outline-none cursor-pointer sm:min-w-[170px] lg:min-w-[190px] 2xl:min-w-[220px] truncate"
                >
                  <option value="volume:desc">Sort: Volume High-to-Low</option>
                  <option value="balance:desc">Sort: Wallet Balance</option>
                  <option value="createdAt:desc">Sort: Recent Onboarding</option>
                  <option value="name:asc">Sort: Name (A to Z)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-base-700">
                  <ChevronDown className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
              </div>

              {/* Action Buttons: Reset & Refresh */}
              <div className="col-span-2 sm:col-span-1 flex items-center justify-end sm:justify-start gap-1.5 shrink-0 ml-auto sm:ml-0">
                <button
                  onClick={resetFilters}
                  disabled={!isFiltered}
                  className={`h-8 w-8 sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 rounded-lg border border-base-200 bg-[#ffffff] transition-colors flex items-center justify-center shrink-0 ${isFiltered
                    ? "text-[#8f4a4e] hover:bg-[#ffdad6] border-[#ffdad6] cursor-pointer"
                    : "text-base-700 opacity-50 cursor-not-allowed"
                    }`}
                  title="Reset Filters"
                >
                  <FilterX className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
                </button>

                <button
                  onClick={fetchMerchants}
                  disabled={loading}
                  className="h-8 w-8 sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 rounded-lg border border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-100 hover:text-primary text-base-900 transition-all flex items-center justify-center shrink-0"
                  title="Refresh merchant records"
                >
                  <RefreshCw className={`w-4 h-4 2xl:w-4.5 2xl:h-4.5 ${loading ? "animate-spin text-primary" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Badges (Responsive wrap) */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-base-700 -mt-1 sm:-mt-2 px-1">
              <span className="font-medium flex items-center space-x-1 shrink-0">
                <SlidersHorizontal className="w-3 h-3 text-primary" />
                <span>Active filters:</span>
              </span>
              {search.trim() && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary text-[11px] font-semibold">
                  <span className="max-w-[120px] sm:max-w-xs truncate">"{search}"</span>
                  <button onClick={() => setSearchInput("")} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary text-[11px] font-semibold">
                  <span>Status: {statusFilter}</span>
                  <button onClick={() => setStatusFilter("ALL")} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {brokerFilter !== "ALL" && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary text-[11px] font-semibold">
                  <span className="max-w-[140px] truncate">
                    Broker: {brokerFilter === "NONE" ? "Direct" : availableBrokers.find((b) => b.id === brokerFilter)?.name || brokerFilter}
                  </span>
                  <button onClick={() => setBrokerFilter("ALL")} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-primary hover:underline font-semibold text-[11px] ml-auto shrink-0"
              >
                Clear All
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. COMPREHENSIVE MERCHANT LISTING TABLE (Exact Stitch Styling)            */}
          {/* ========================================================================= */}
          <div className="bg-white border border-base-200 rounded-xl shadow-[0_4px_16px_-2px_rgba(45,52,54,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-base-200 text-base-700 text-[11px] font-semibold tracking-wider uppercase">
                    <th className="py-3 px-5">MERCHANT BUSINESS</th>
                    <th className="py-3 px-5">CONTACT & TELEGRAM</th>
                    <th className="py-3 px-5">ASSIGNED BROKER</th>
                    <th className="py-3 px-5">PAYIN / PAYOUT FEE</th>
                    <th className="py-3 px-5 text-right">WALLET BALANCE</th>
                    <th className="py-3 px-5">STATUS & PERMISSIONS</th>
                    <th className="py-3 px-5 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading && merchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-xs font-semibold text-base-900">
                            Loading merchant accounts...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : merchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="p-3 bg-primary-100 rounded-full text-primary">
                            <Store className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-base-900 mb-1">No merchants found</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isFiltered
                                ? "Try adjusting your search criteria or resetting filters."
                                : "No merchants registered yet."}
                            </p>
                          </div>
                          {isFiltered ? (
                            <button
                              onClick={resetFilters}
                              className="bg-primary text-white py-1.5 px-3 rounded-lg text-xs font-semibold shadow-sm mt-1"
                            >
                              Clear Filters
                            </button>
                          ) : (
                            <Link
                              href="/admin/merchants/create"
                              className="bg-primary text-white py-1.5 px-3 rounded-lg text-xs font-semibold shadow-sm mt-1"
                            >
                              + Onboard Merchant
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    merchants.map((m) => {
                      const isSuspended = m.status === "INACTIVE";
                      const initials = m.name
                        ? m.name
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                        : "ME";

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-primary-50 transition-colors ${isSuspended ? "bg-red-50" : ""
                            }`}
                        >
                          {/* 1. Merchant Business */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`size-10 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 ${isSuspended
                                  ? "bg-red-100 text-red-500"
                                  : "bg-primary-100 text-primary"
                                  }`}
                              >
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <Link
                                  href={`/admin/merchants/${m.id}`}
                                  className="font-semibold text-sm text-base-900 hover:text-primary transition-colors truncate block"
                                  title={m.name}
                                >
                                  {m.name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-base-700">
                                  <span className="text-[11px] text-base-700 font-medium">
                                    #MER-{String(m.id).slice(-4).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Contact & Telegram */}
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="text-base-900 text-xs font-medium truncate max-w-[200px]" title={m.email}>
                                {m.email}
                              </span>
                              <span className="text-slate-500 text-[11px] mt-0.5">
                                {m.phone || "--"}
                              </span>
                              {m.telegramId ? (
                                <div className="flex items-center gap-1 mt-1 text-primary">
                                  <Send className="w-3 h-3 text-primary" />
                                  <span className="text-[11px] font-medium">
                                    @{m.telegramId.replace(/^@/, "")}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px] italic mt-0.5">
                                  No telegram
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Assigned Broker */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">
                                {m.broker ? m.broker.name : "Direct (None)"}
                              </span>
                              {m.broker ? (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {m.broker.commissionPercent ?? 0}% Commission Share
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary font-semibold">
                                  Direct Switch API
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Payin / Payout Fee */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="inline-flex flex-col gap-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-900">
                                Payin: <strong className="text-primary font-semibold">{m.payinMerchantFee ?? 0}%</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-900">
                                Payout: <strong className="text-slate-700 font-semibold">{m.payoutMerchantFee ?? 0}%</strong>
                              </span>
                            </div>
                          </td>

                          {/* 5. Wallet Balance */}
                          <td className="py-4 px-5 text-right">
                            <span className="text-sm font-bold text-base-900 block">
                              ₹{(m.wallet?.balance || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <div className="text-[10px] text-primary font-semibold mt-0.5">
                              {isSuspended ? "Account Locked" : "100% Liquid"}
                            </div>
                          </td>

                          {/* 6. Status & Permissions */}
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold w-fit ${isSuspended
                                  ? "bg-red-100 text-red-500"
                                  : "bg-green-100 text-green-500"
                                  }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${isSuspended ? "bg-red-500" : "bg-green-500"
                                    }`}
                                />
                                {isSuspended ? "SUSPENDED" : "ACTIVE"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-50 border border-slate-200 text-slate-700 w-fit whitespace-nowrap">
                                {m.portalAccess !== false ? (
                                  <>
                                    <CheckCircle2 className="size-3 text-primary" />
                                    <span>API Allowed</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="size-3 text-red-500" />
                                    <span>Blocked</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* 7. Actions */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/admin/merchants/${m.id}`}
                                className="bg-white hover:bg-primary-100 border border-primary-200 px-2.5 py-1 rounded text-xs font-medium text-primary transition-all"
                              >
                                View Profile
                              </Link>
                              <button
                                onClick={() => {
                                  setResetUser(m);
                                  setNewPassword("");
                                  setResetError("");
                                  setResetSuccess("");
                                }}
                                className="p-1 rounded text-slate-700 hover:text-primary transition-all"
                                title="Reset API Key / Credentials"
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

            {/* ========================================================================= */}
            {/* PAGINATION & SUMMARY FOOTER (Exact Stitch Footer Design - Responsive)     */}
            {/* ========================================================================= */}
            <div className="border-t border-slate-100 px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-slate-500">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 w-full sm:w-auto">
                <span>
                  Showing{" "}
                  <strong className="text-slate-700 font-semibold">
                    {pagination.total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)}
                  </strong>{" "}
                  of <strong className="text-slate-700 font-semibold">{pagination.total}</strong> merchants
                </span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-500 text-xs py-1 pl-2.5 pr-7 rounded focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none text-base-700">
                    <ChevronDown className="size-3.5" />
                  </div>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                  className="px-2.5 py-1 h-7 rounded border border-base-200 bg-white text-base-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all hover:bg-primary-100"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNumber = i + 1;
                  if (pagination.totalPages > 5 && page > 3) {
                    pageNumber = page - 3 + i;
                    if (pageNumber > pagination.totalPages) {
                      pageNumber = pagination.totalPages - (4 - i);
                    }
                  }
                  if (pageNumber <= 0) pageNumber = 1;

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      className={`size-7 rounded font-bold flex items-center justify-center transition-colors ${page === pageNumber
                        ? "bg-primary text-white shadow-sm"
                        : "border border-slate-200 bg-white hover:bg-primary-100 hover:text-primary text-slate-700"
                        }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={page >= pagination.totalPages || loading}
                  className="px-2.5 py-1 h-7 rounded border border-slate-200 bg-white hover:bg-primary-100 text-base-900 flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MICRO-DETAIL CARD: Realtime Settlement Gateway Buffer                     */}
          {/* ========================================================================= */}
          <div className="bg-primary-100 border border-primary-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-xs text-slate-900 block">
                  Realtime Settlement Gateway Buffer
                </span>
                <p className="text-[11px] text-slate-500">
                  Dual-UTR automatic verification is enabled across all active merchant routes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] text-primary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                NPCI UPI Switch 2.4 — 38ms Latency
              </span>
            </div>
          </div>
        </div>

        {/* CREATE MERCHANT MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-base-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <h3 className="font-bold text-sm">Provision New Merchant</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:text-gray-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMerchant} className="p-5 space-y-4 overflow-y-auto">
                {createError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded">
                    {createSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Store / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Goa Beachwear"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="store@example.com"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Telegram ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={telegramId}
                      onChange={(e) => setTelegramId(e.target.value)}
                      placeholder="@merchant_telegram"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3 bg-base-100 border border-base-200 rounded-lg space-y-2">
                  <span className="text-xs font-bold text-base-900 block">
                    Merchant Gateway Fees (%)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-base-700">
                        Payin Fee %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payinMerchantFee}
                        onChange={(e) => setPayinMerchantFee(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-xs border border-base-200 rounded font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-base-700">
                        Payout Fee %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payoutMerchantFee}
                        onChange={(e) => setPayoutMerchantFee(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-xs border border-base-200 rounded font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Assigned Broker
                  </label>
                  <select
                    value={brokerId}
                    onFocus={() => {
                      if (brokers.length === 0) fetchBrokers();
                    }}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white"
                  >
                    <option value="">Direct (No Broker)</option>
                    {(brokers.length > 0 ? brokers : availableBrokers).map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.email ? `(${b.email})` : ""} {b.commissionPercent !== undefined ? `— ${b.commissionPercent}% commission` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Phone (10-digit Indian Mobile)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Store UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="store@upi"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-3 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 text-xs border border-base-200 rounded-lg text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-semibold"
                  >
                    {creating ? "Creating..." : "Create Merchant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PortalLayout>
      {/* PASSWORD RESET MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Reset Password</h3>
              <button
                onClick={() => setResetUser(null)}
                className="text-white hover:text-gray-200 text-sm font-bold"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-base-700">
                Resetting password for: <b>{resetUser.email}</b>
              </p>

              {resetError && (
                <div className="p-2 bg-red-50 text-red-700 text-xs rounded">{resetError}</div>
              )}
              {resetSuccess && (
                <div className="p-2 bg-green-50 text-green-700 text-xs rounded">{resetSuccess}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="flex-1 py-2 text-xs border border-base-200 rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-semibold"
                >
                  {resetting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
