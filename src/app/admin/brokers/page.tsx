"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import Link from "next/link";
import {
  Briefcase,
  UserPlus,
  KeyRound,
  RefreshCw,
  Search,
  Store,
  Wallet,
  Phone,
  Send,
  Check,
  Copy,
  Edit,
  Eye,
  X,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  validateName,
} from "@/lib/validation";
import { brokersApi } from "@/lib/api/brokers.api";
import ModalPortal from "@/components/common/ModalPortal";

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Selected Broker for Interactive Store Linkage Desk Drawer (null by default)
  const [selectedBroker, setSelectedBroker] = useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Edit Broker Modal State
  const [editBroker, setEditBroker] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTelegramId, setEditTelegramId] = useState("");
  const [editPayinBrokerFee, setEditPayinBrokerFee] = useState("0.0");
  const [editPayoutBrokerFee, setEditPayoutBrokerFee] = useState("0.0");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Reset Password Modal State
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await brokersApi.getBrokers();
      if (res.success) {
        const userList = res.users || [];
        setBrokers(userList);

        // Do NOT auto-select on initial load; only keep existing selection updated if present
        setSelectedBroker((prev: any) => {
          if (prev) {
            const updated = userList.find((b: any) => b.id === prev.id);
            return updated || null;
          }
          return null;
        });
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

  // Lock mobile body scroll and handle Escape key when mobile drawer is open
  useEffect(() => {
    if (selectedBroker && typeof window !== "undefined" && window.innerWidth < 1280) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedBroker) {
        setSelectedBroker(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBroker]);

  const handleToggleBrokerStores = (broker: any) => {
    setSelectedBroker((prev: any) => (prev?.id === broker.id ? null : broker));
  };

  const handleOpenEdit = (broker: any) => {
    setEditBroker(broker);
    setEditName(broker.name || "");
    setEditPhone(broker.phone || "");
    setEditAddress(broker.address || "");
    setEditTelegramId(broker.telegramId || "");
    setEditPayinBrokerFee((broker.payinBrokerFee ?? broker.commissionPercent ?? 0).toString());
    setEditPayoutBrokerFee((broker.payoutBrokerFee ?? 0).toString());
    setEditStatus(broker.status || "ACTIVE");
    setEditError("");
    setEditSuccess("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBroker) return;
    setEditing(true);
    setEditError("");
    setEditSuccess("");

    const nameCheck = validateName(editName, "Broker name");
    if (!nameCheck.valid) {
      setEditError(nameCheck.error || "Broker name is required");
      setEditing(false);
      return;
    }

    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setEditError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      setEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${editBroker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: cleanPhone,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update broker");

      setEditSuccess("Broker details updated successfully!");
      setTimeout(() => {
        setEditBroker(null);
        fetchData();
        setEditSuccess("");
      }, 1000);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetSuccess(data.message || "Password updated successfully");
      setTimeout(() => {
        setResetUser(null);
        setNewPassword("");
        setResetSuccess("");
      }, 1200);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetting(false);
    }
  };

  // Filtered list
  const filteredBrokers = brokers.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      b.name?.toLowerCase().includes(q) ||
      b.telegramId?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      `brk-${b.id}`.includes(q);

    const matchesStatus =
      statusFilter === "ALL" || (b.status || "ACTIVE") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Aggregate stats for filter counts
  const totalBrokers = brokers.length;
  const activeBrokers = brokers.filter((b) => (b.status || "ACTIVE") === "ACTIVE").length;
  const inactiveBrokers = totalBrokers - activeBrokers;

  // Pagination calculation
  const totalPages = Math.ceil(filteredBrokers.length / PAGE_SIZE) || 1;
  const paginatedBrokers = filteredBrokers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const renderStoreLinkageDesk = (isMobile = false) => {
    if (!selectedBroker) return null;
    const storeCount = selectedBroker.brokeredMerchants?.length || 0;

    return (
      <div className={`flex flex-col justify-between ${isMobile ? "h-full" : "space-y-4"}`}>
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-base-200">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#0c4a6e] bg-primary/20 px-2 py-0.5 rounded inline-block">
                STORE LINKAGE DESK
              </span>
              <h4 className="font-bold text-sm sm:text-base text-base-900 mt-1.5 truncate">
                Linked Merchant Stores
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                {selectedBroker.name} (BRK-{selectedBroker.id})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBroker(null)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition shrink-0"
              title="Close Store Linkage Desk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Responsive Broker Summary Quick Box */}
          <div className="my-3 p-3 bg-[#ffffff] rounded-lg border border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Linked Merchants</span>
              <span className="font-mono font-bold text-[#0c4a6e] whitespace-nowrap">
                {storeCount} {storeCount === 1 ? "Store" : "Stores"}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-500 block text-[11px]">Commission Wallet</span>
              <span className="font-mono font-bold text-base-900 whitespace-nowrap">
                ₹{(selectedBroker.wallet?.balance || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Merchant Store List - Scrollable & Responsive */}
          <div className="space-y-2 mt-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Mapped Outlets ({storeCount} Active)
            </span>

            <div className={`space-y-2.5 overflow-y-auto pr-1 ${isMobile ? "max-h-[calc(100vh-290px)]" : "max-h-96"}`}>
              {selectedBroker.brokeredMerchants && selectedBroker.brokeredMerchants.length > 0 ? (
                selectedBroker.brokeredMerchants.map((store: any) => (
                  <div
                    key={store.id}
                    className="p-3 bg-white border border-base-200 rounded-lg space-y-1.5 shadow-2xs hover:border-primary transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-base-900 truncate" title={store.name}>
                        {store.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 whitespace-nowrap ${store.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {store.status || "ACTIVE"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {store.phone || "--"}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-base-200/60 text-xs font-mono">
                      <span className="text-slate-500 text-[11px] whitespace-nowrap">
                        Payin Fee: {store.payinMerchantFee ?? 0}%
                      </span>
                      <span className="text-[#0c4a6e] font-bold text-[11px] whitespace-nowrap">
                        Broker Cut: {store.payinBrokerFee ?? selectedBroker.commissionPercent ?? 1}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-[#ffffff] rounded-lg border border-dashed border-base-200">
                  <Store className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-gray-600">No merchant outlets linked</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Map merchant stores to this broker to track and collect commissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-base-200 space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/admin/brokers/${selectedBroker.id}`}
              className="py-2 px-2 bg-white border border-base-200 hover:bg-[#ffffff] text-base-900 rounded-lg text-xs font-semibold text-center transition truncate"
            >
              Broker Profile
            </Link>
            <Link
              href={`/admin/merchants?brokerId=${selectedBroker.id}`}
              className="py-2 px-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-semibold text-center transition shadow-2xs truncate"
            >
              + Manage Stores
            </Link>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSelectedBroker(null)}
              className="w-full py-2 px-3 bg-[#e2e8f0]/40 hover:bg-[#e2e8f0] text-base-900 rounded-lg text-xs font-semibold transition text-center"
            >
              Close Drawer
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PortalLayout
      portal="admin"
      title="Broker Management & Store Linkage"
      subtitle="Manage partner broker profiles, commission wallets, and mapped merchant outlet linkages across UPI rails."
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/brokers/create"
            className="px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Broker</span>
          </Link>
        </div>
      }
    >
      {/* 1. RESPONSIVE SEARCH & FILTER BAR */}
      <div className="card-theme p-3 sm:p-4 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        {/* Search Bar - Full width on mobile, max-w-md on desktop */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search broker name, email, or telegram..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs & Refresh Button - Clean responsive flex wrap */}
        <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
          <div className="inline-flex rounded-lg border border-base-200 p-0.5 sm:p-1 bg-white text-xs">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold transition whitespace-nowrap ${statusFilter === "ALL"
                ? "bg-primary text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              All ({totalBrokers})
            </button>
            <button
              onClick={() => {
                setStatusFilter("ACTIVE");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold transition whitespace-nowrap ${statusFilter === "ACTIVE"
                ? "bg-green-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Active ({activeBrokers})
            </button>
            <button
              onClick={() => {
                setStatusFilter("INACTIVE");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold transition whitespace-nowrap ${statusFilter === "INACTIVE"
                ? "bg-red-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              Inactive ({inactiveBrokers})
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-base-200 bg-white hover:bg-primary-50 rounded-lg text-slate-500 hover:text-primary transition shrink-0"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. MAIN LAYOUT: DATA TABLE + INTERACTIVE STORE LINKAGE DESK */}
      <div className={`grid grid-cols-1 ${selectedBroker ? "xl:grid-cols-3" : "grid-cols-1"} gap-5 items-start`}>
        {/* BROKERS DATA TABLE */}
        <div className={`${selectedBroker ? "xl:col-span-2" : "w-full"} card-theme overflow-hidden shadow-xs`}>
          {loading ? (
            <div className="p-12 text-center text-base-700">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs">Loading registered brokers...</p>
            </div>
          ) : filteredBrokers.length === 0 ? (
            <div className="p-12 text-center text-base-700">
              <Briefcase className="w-12 h-12 mx-auto text-[#e2e8f0] mb-3 opacity-60" />
              <p className="font-bold text-sm text-base-900">No brokers found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== "ALL"
                  ? "Try clearing your filters or search keywords."
                  : "Create your first broker account to assign brokers to merchants and track commission fees."}
              </p>
              {!searchTerm && statusFilter === "ALL" && (
                <Link
                  href="/admin/brokers/create"
                  className="mt-4 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Broker</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-[850px] w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider h-10 select-none border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">Broker / Company</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">Contact Details</th>
                    <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Linked Stores</th>
                    <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Commission Wallet</th>
                    <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60">
                  {paginatedBrokers.map((broker) => {
                    const linkedStoresCount =
                      broker._count?.brokeredMerchants ?? broker.brokeredMerchants?.length ?? 0;
                    const isActive = (broker.status || "ACTIVE") === "ACTIVE";
                    const isSelected = selectedBroker?.id === broker.id;

                    return (
                      <tr
                        key={broker.id}
                        className={`transition-colors ${isSelected
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-white"
                          }`}
                      >
                        {/* Broker / Company (Never wraps) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-slate-200 text-[#0c4a6e] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              <span className="text-xs font-mono">
                                {broker.name ? broker.name.slice(0, 2).toUpperCase() : "BR"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-base-900 whitespace-nowrap"
                                title={broker.name}
                              >
                                {broker.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                ID: BRK-{broker.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details (Never wraps) */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5">
                            {broker.telegramId ? (
                              <div className="flex items-center space-x-1 font-mono text-xs text-[#0c4a6e] whitespace-nowrap">
                                <Send className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-medium">{broker.telegramId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(broker.telegramId, `tg-${broker.id}`)}
                                  className="text-slate-500 hover:text-slate-700 ml-1 p-0.5"
                                  title="Copy Telegram ID"
                                >
                                  {copiedText === `tg-${broker.id}` ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] block whitespace-nowrap">No Telegram</span>
                            )}
                            <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                              {broker.phone ? `+91 ${broker.phone}` : "No phone"}
                            </div>
                          </div>
                        </td>



                        {/* Linked Stores Button - Clear & Easy to Understand as a Button */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleBrokerStores(broker)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs whitespace-nowrap ${isSelected
                              ? "bg-primary text-white ring-2 ring-primary/30"
                              : "bg-primary-50 text-primary border-primary-300 hover:bg-primary-100 hover:border-primary-400"
                              }`}
                            title="Click to view linked merchant stores"
                          >
                            <Store className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {linkedStoresCount} {linkedStoresCount <= 1 ? "Store" : "Stores"}
                            </span>
                            <Eye className="w-3 h-3 opacity-75 shrink-0" />
                          </button>
                        </td>

                        {/* Commission Wallet (Never wraps) */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-base-900 whitespace-nowrap">
                          ₹{(broker.wallet?.balance || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Status (Never wraps) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold whitespace-nowrap ${isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600 "
                              }`}
                          >
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>

                        {/* Actions (Never wraps) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1.5">
                            <Link
                              href={`/admin/brokers/${broker.id}`}
                              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-700 hover:text-primary transition"
                              title="View Broker Profile & Ledger"
                            >
                              <Eye className="size-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(broker)}
                              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-700 hover:text-purple-500 transition"
                              title="Edit Broker Details"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetUser(broker);
                                setResetError("");
                                setResetSuccess("");
                                setNewPassword("");
                              }}
                              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-700 hover:text-red-500 transition"
                              title="Reset Password"
                            >
                              <KeyRound className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* RESPONSIVE PAGINATION FOOTER */}
          <div className="px-4 sm:px-5 py-3 border-t border-base-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#ffffff]">
            <span className="text-xs text-base-700 whitespace-nowrap">
              Showing {filteredBrokers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filteredBrokers.length)} of {filteredBrokers.length} brokers
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-2.5 py-1 h-7 rounded border border-slate-200 bg-white text-salte-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all hover:bg-primary-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition whitespace-nowrap ${currentPage === p
                    ? "bg-primary text-white shadow-sm"
                    : "border border-slate-200 bg-white hover:bg-primary-100 hover:text-primary text-base-900"
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2.5 py-1 h-7 rounded border border-slate-200 bg-white hover:bg-primary-100 text-base-900 flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. DESKTOP STORE LINKAGE DESK (MERCHANT LIST) */}
        {selectedBroker ? (
          <div className="hidden xl:block card-theme p-4 sm:p-5 shadow-md sticky top-20 w-full">
            {renderStoreLinkageDesk(false)}
          </div>
        ) : null}
      </div>

      {/* 4. MOBILE DRAWER: SLIDE-IN FROM RIGHT TO LEFT WITH BACKDROP */}
      {selectedBroker && (
        <ModalPortal>
          <div
            className="xl:hidden fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-end"
            onClick={() => setSelectedBroker(null)}
          >
            <div
              className="w-full max-w-md h-full bg-base-100 p-4 sm:p-5 flex flex-col justify-between shadow-2xl border-l border-base-200 animate-slide-in-right overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {renderStoreLinkageDesk(true)}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: EDIT BROKER */}
      {editBroker && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="max-w-lg w-full bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Edit className="size-4 text-primary" />
                  <h3 className="font-semibold text-base truncate">Edit Broker: {editBroker.name}</h3>
                </div>
                <button
                  onClick={() => setEditBroker(null)}
                  className="text-slate-500 hover:text-slate-100 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                {editError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
                    {editSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1">Broker Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                        className="w-full px-3 py-2 border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-2">Account Status</label>
                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={editStatus === "ACTIVE"}
                        onClick={() => setEditStatus(editStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${editStatus === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${editStatus === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${editStatus === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-gray-400"
                            }`}
                        />
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${editStatus === "ACTIVE" ? "text-green-700" : "text-slate-500"
                            }`}
                        >
                          {editStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditBroker(null)}
                      className="px-4 py-2 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editing}
                      className="px-5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      {editing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="max-w-sm w-full bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 bg-[#0f172a] text-white flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                <h3 className="font-semibold text-base">Reset Broker Password</h3>
              </div>

              <div className="p-5">
                <p className="text-xs text-slate-500 mb-4">
                  Setting new password for <b>{resetUser.name || `Broker #${resetUser.id}`}</b>.
                </p>

                {resetError && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {resetError}
                  </div>
                )}
                {resetSuccess && (
                  <div className="mb-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
                    {resetSuccess}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5">
                      New Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setResetUser(null)}
                      className="px-3.5 py-1.5 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetting || !newPassword || newPassword.trim().length < 6}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resetting ? "Resetting..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </PortalLayout>
  );
}
