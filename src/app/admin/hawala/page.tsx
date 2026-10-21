"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  Clock,
  Search,
  ShieldAlert,
  HelpCircle,
  FileText,
  User as UserIcon,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Send,
  Building2,
  X,
  CreditCard,
  Layers,
} from "lucide-react";

interface AccountUser {
  id: number;
  name: string;
  role: "MERCHANT" | "QR_PROVIDER" | "BROKER" | "AGENT" | "OTHER";
  phone: string | null;
  balance: number;
  exposure: number;
  availableBalance: number;
  walletId?: number;
}

interface HawalaHistoryItem {
  id: number;
  createdAt: string;
  hawalaRef: string;
  fromUserId: number;
  fromUserName: string;
  fromUserRole: string;
  toUserId: number;
  toUserName: string;
  toUserRole: string;
  amount: number;
  remarks: string | null;
  fromBalanceAfter?: number;
  toBalanceAfter?: number;
  executedBy?: string;
}

// Role color helpers
function getRoleBadge(role: string) {
  switch (role) {
    case "MERCHANT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Merchant
        </span>
      );
    case "QR_PROVIDER":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
          QR Provider
        </span>
      );
    case "BROKER":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Broker
        </span>
      );
    case "AGENT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Agent
        </span>
      );
    case "OTHER":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          Other
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
          {role}
        </span>
      );
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "MERCHANT":
      return "Merchant";
    case "QR_PROVIDER":
      return "QR Provider";
    case "BROKER":
      return "Broker";
    case "AGENT":
      return "Agent";
    case "OTHER":
      return "Other";
    default:
      return role;
  }
}

// Custom Searchable Dropdown for selecting Accounts
interface UserSelectorProps {
  label: string;
  required?: boolean;
  users: AccountUser[];
  selectedId: string;
  onSelect: (id: string) => void;
  excludeId?: string;
  placeholder?: string;
  type: "source" | "destination";
}

function UserSelector({
  label,
  required,
  users,
  selectedId,
  onSelect,
  excludeId,
  placeholder = "-- Select User --",
  type,
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id.toString() === selectedId) || null;
  }, [users, selectedId]);

  const availableUsers = useMemo(() => {
    return users.filter((u) => u.id.toString() !== excludeId);
  }, [users, excludeId]);

  const filteredUsers = useMemo(() => {
    return availableUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        getRoleLabel(u.role).toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [availableUsers, search, roleFilter]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roles = ["ALL", "MERCHANT", "QR_PROVIDER", "BROKER", "AGENT", "OTHER"];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-bold text-[#050505] uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {selectedUser && (
          <span className="text-[10px] font-medium text-slate-400 capitalize">
            ID: #{selectedUser.id}
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          isOpen
            ? "border-primary ring-2 ring-primary/10"
            : selectedUser
            ? type === "source"
              ? "border-rose-200 hover:border-rose-300"
              : "border-emerald-200 hover:border-emerald-300"
            : "border-[#ced0d4] hover:border-slate-400"
        }`}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                type === "source"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {selectedUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-sm font-bold text-[#050505] truncate">
                {selectedUser.name}
              </span>
              {getRoleBadge(selectedUser.role)}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400 font-normal">{placeholder}</span>
        )}

        <div className="flex items-center gap-1.5 text-slate-400">
          {selectedUser && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect("");
              }}
              className="p-1 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#e4e6eb] rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {/* Search Bar */}
          <div className="p-2.5 border-b border-[#e4e6eb] bg-slate-50/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role or username..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ced0d4] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#050505]"
              />
            </div>

            {/* Quick Role Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition ${
                    roleFilter === r
                      ? "bg-primary text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {r === "ALL" ? "All" : getRoleLabel(r)}
                </button>
              ))}
            </div>
          </div>

          {/* List Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No users found matching "{search}"
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = u.id.toString() === selectedId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onSelect(u.id.toString());
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition ${
                      isSelected
                        ? "bg-primary/5 text-primary"
                        : "hover:bg-slate-50 text-[#050505]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold truncate">{u.name}</span>
                      {getRoleBadge(u.role)}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HawalaPage() {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [history, setHistory] = useState<HawalaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Transfer form state
  const [fromUserId, setFromUserId] = useState<string>("");
  const [toUserId, setToUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successData, setSuccessData] = useState<any | null>(null);

  // Filter history
  const [historySearch, setHistorySearch] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/hawala");
      if (!res.ok) throw new Error("Failed to load accounts");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setHistory(data.history || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedFromUser = useMemo(() => {
    return users.find((u) => u.id === parseInt(fromUserId, 10)) || null;
  }, [users, fromUserId]);

  const selectedToUser = useMemo(() => {
    return users.find((u) => u.id === parseInt(toUserId, 10)) || null;
  }, [users, toUserId]);

  const parsedAmount = parseFloat(amount) || 0;

  // Validation
  const validationError = useMemo(() => {
    if (!fromUserId) return "Please select a source account (From)";
    if (!toUserId) return "Please select a destination account (To)";
    if (fromUserId === toUserId) return "Source and destination accounts must be different";
    if (parsedAmount <= 0) return "Please enter a valid transfer amount greater than ₹0";

    if (selectedFromUser && selectedFromUser.role !== "MERCHANT") {
      const maxCap = Math.max(0, selectedFromUser.availableBalance);
      if (parsedAmount > maxCap) {
        return `Non-merchant (${getRoleLabel(selectedFromUser.role)}) balance cannot be negative. Max transferable amount is ₹${maxCap.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      }
    }
    return null;
  }, [fromUserId, toUserId, parsedAmount, selectedFromUser]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError || submitting) return;

    setErrorMsg("");
    setSuccessData(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/hawala", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId,
          toUserId,
          amount: parsedAmount,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Hawala transfer failed");
      }

      setSuccessData(data);
      setAmount("");
      setRemarks("");
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during Hawala transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        h.hawalaRef?.toLowerCase().includes(q) ||
        h.fromUserName?.toLowerCase().includes(q) ||
        h.toUserName?.toLowerCase().includes(q) ||
        h.remarks?.toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  // Aggregate stats
  const totalVolume = useMemo(() => {
    return history.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [history]);

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#050505]">Hawala Transfer</h1>
          </div>
        </div>
      }
      subtitle="Administrative inter-account liquidity relocation & balance management"
      actions={
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#050505] bg-white border border-[#ced0d4] rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#e4e6eb] p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#65676b] block">Eligible Accounts</span>
              <span className="text-xl font-bold text-[#050505] mt-1 block">
                {users.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Merchants, QRs, Brokers, Agents</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e4e6eb] p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#65676b] block">Transfers Settled</span>
              <span className="text-xl font-bold text-[#050505] mt-1 block">
                {history.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">100% Atomic Dual-Entry</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e4e6eb] p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#65676b] block">Total Settled Volume</span>
              <span className="text-xl font-bold text-[#050505] mt-1 block">
                ₹{totalVolume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-primary font-medium">Platform Liquidity Moved</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successData && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs animate-in fade-in-50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Hawala Transfer Successful!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Reference: <span className="font-mono font-bold">{successData.transfer?.reference}</span> | Transferred:{" "}
                  <span className="font-bold text-emerald-800">
                    ₹{successData.transfer?.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>{" "}
                  from <span className="font-semibold">{successData.transfer?.from?.name}</span> to{" "}
                  <span className="font-semibold">{successData.transfer?.to?.name}</span>.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-emerald-800">
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                    {successData.transfer?.from?.name} New Balance:{" "}
                    <strong>₹{Number(successData.transfer?.from?.newBalance).toFixed(2)}</strong>
                  </span>
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                    {successData.transfer?.to?.name} New Balance:{" "}
                    <strong>₹{Number(successData.transfer?.to?.newBalance).toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSuccessData(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1 rounded hover:bg-emerald-100 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Transfer Error</h4>
                <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMsg("")}
              className="text-rose-700 hover:text-rose-900 text-xs font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Section: Interactive Transfer Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Transfer Form Box */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e4e6eb] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e4e6eb] mb-5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#050505] flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                    <span>Initiate Inter-Account Transfer</span>
                  </h3>
                  <p className="text-xs text-[#65676b] mt-0.5">
                    Move liquidity seamlessly with instantaneous atomic ledger reflection.
                  </p>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Admin Hawala
                </span>
              </div>

              <form onSubmit={handleTransfer} className="space-y-5">
                {/* Visual Connected Account Selection */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                  {/* FROM Field */}
                  <div>
                    <UserSelector
                      label="From (Source Account - Debit)"
                      required
                      users={users}
                      selectedId={fromUserId}
                      onSelect={(id) => {
                        setFromUserId(id);
                        if (id === toUserId) setToUserId("");
                      }}
                      excludeId={toUserId}
                      placeholder="Select sender account..."
                      type="source"
                    />

                    {/* From User Details Card */}
                    {selectedFromUser && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white border border-rose-100 flex items-center justify-between shadow-xs animate-in fade-in-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs">
                            {selectedFromUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#050505]">
                                {selectedFromUser.name}
                              </span>
                              {getRoleBadge(selectedFromUser.role)}
                            </div>
                            <div className="text-[11px] text-[#65676b]">
                              {selectedFromUser.phone ? `Phone: ${selectedFromUser.phone}` : "No phone recorded"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-semibold text-[#65676b] uppercase">Available Balance</div>
                          <div
                            className={`text-sm font-bold ${
                              selectedFromUser.availableBalance < 0
                                ? "text-rose-600"
                                : "text-[#050505]"
                            }`}
                          >
                            ₹
                            {selectedFromUser.availableBalance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          {selectedFromUser.role === "QR_PROVIDER" && selectedFromUser.exposure > 0 && (
                            <div className="text-[10px] text-amber-600 font-medium">
                              Exposure: ₹{selectedFromUser.exposure.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Direction Indicator */}
                  <div className="flex items-center justify-center -my-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      <Send className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-semibold text-slate-600">Transfer Flow</span>
                    </div>
                  </div>

                  {/* TO Field */}
                  <div>
                    <UserSelector
                      label="To (Destination Account - Credit)"
                      required
                      users={users}
                      selectedId={toUserId}
                      onSelect={(id) => setToUserId(id)}
                      excludeId={fromUserId}
                      placeholder="Select receiver account..."
                      type="destination"
                    />

                    {/* To User Details Card */}
                    {selectedToUser && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white border border-emerald-100 flex items-center justify-between shadow-xs animate-in fade-in-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            {selectedToUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#050505]">
                                {selectedToUser.name}
                              </span>
                              {getRoleBadge(selectedToUser.role)}
                            </div>
                            <div className="text-[11px] text-[#65676b]">
                              {selectedToUser.phone ? `Phone: ${selectedToUser.phone}` : "No phone recorded"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-semibold text-[#65676b] uppercase">Current Balance</div>
                          <div className="text-sm font-bold text-emerald-700">
                            ₹
                            {selectedToUser.balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#050505] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      <span>Transfer Amount (₹)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {selectedFromUser && selectedFromUser.role !== "MERCHANT" && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Cap: ₹{Math.max(0, selectedFromUser.availableBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-lg">
                      ₹
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 text-lg font-bold text-[#050505] border border-[#ced0d4] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {[1000, 5000, 10000, 25000, 50000].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setAmount(chip.toString())}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-[#050505] transition active:scale-95"
                      >
                        +₹{chip.toLocaleString("en-IN")}
                      </button>
                    ))}
                    {selectedFromUser && selectedFromUser.availableBalance > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAmount(
                            Math.max(0, selectedFromUser.availableBalance).toString()
                          )
                        }
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition active:scale-95"
                      >
                        Max Available (₹{Math.max(0, selectedFromUser.availableBalance).toLocaleString("en-IN")})
                      </button>
                    )}
                  </div>

                  {/* Rule Notice */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-start gap-2 text-slate-600">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong>Balance Cap:</strong> Only Merchants can hold a negative balance. All other accounts (QR Providers, Brokers, Agents, Others) are strictly capped at their available balance.
                    </span>
                  </div>
                </div>

                {/* Remarks Input */}
                <div>
                  <label className="block text-xs font-bold text-[#050505] uppercase tracking-wider mb-1.5">
                    Remarks / Transfer Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly settlement / Liquidity relocation"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-[#ced0d4] rounded-xl text-[#050505] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>

                {/* Validation Warning Alert */}
                {validationError && fromUserId && toUserId && parsedAmount > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in-50">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Submit Transfer Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(validationError) || submitting}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/95 active:scale-[0.99] transition shadow-md shadow-primary/25 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing Hawala Settlement...</span>
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>
                          Confirm & Transfer{" "}
                          {parsedAmount > 0
                            ? `₹${parsedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : ""}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live Impact Preview & Audit Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-[#e4e6eb] p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[#050505] flex items-center gap-2 pb-3.5 border-b border-[#e4e6eb] mb-4">
                <Wallet className="w-4 h-4 text-primary" />
                <span>Live Balance Impact Preview</span>
              </h3>

              {selectedFromUser && selectedToUser && parsedAmount > 0 ? (
                <div className="space-y-4 animate-in fade-in-50">
                  {/* Sender Card */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-rose-800 mb-2">
                      <span className="font-bold">Source: {selectedFromUser.name}</span>
                      {getRoleBadge(selectedFromUser.role)}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#65676b]">
                        <span>Current Balance</span>
                        <span className="font-semibold text-[#050505]">
                          ₹{selectedFromUser.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-rose-600 font-medium">
                        <span>Hawala Debit</span>
                        <span className="font-bold">
                          -₹{parsedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-rose-200/80 font-bold text-xs">
                        <span className="text-rose-900">Projected Balance</span>
                        <span
                          className={
                            selectedFromUser.balance - parsedAmount < 0
                              ? "text-rose-600 font-extrabold"
                              : "text-[#050505]"
                          }
                        >
                          ₹
                          {(selectedFromUser.balance - parsedAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Connector */}
                  <div className="flex items-center justify-center text-xs text-[#65676b] font-medium gap-2">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
                      ₹{parsedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>

                  {/* Receiver Card */}
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-2">
                      <span className="font-bold">Destination: {selectedToUser.name}</span>
                      {getRoleBadge(selectedToUser.role)}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#65676b]">
                        <span>Current Balance</span>
                        <span className="font-semibold text-[#050505]">
                          ₹{selectedToUser.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600 font-medium">
                        <span>Hawala Credit</span>
                        <span className="font-bold">
                          +₹{parsedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200/80 font-bold text-xs">
                        <span className="text-emerald-900">Projected Balance</span>
                        <span className="text-emerald-700 font-extrabold">
                          ₹
                          {(selectedToUser.balance + parsedAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-600 mb-1">Preview Awaiting Input</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Select source & destination accounts and enter an amount to preview projected balance changes.
                  </p>
                </div>
              )}
            </div>

            {/* Audit & Compliance Guide */}
            <div className="bg-slate-50 rounded-2xl border border-[#e4e6eb] p-5 text-xs text-[#65676b] space-y-2.5">
              <h4 className="font-bold text-[#050505] flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Dual-Entry Ledger Architecture</span>
              </h4>
              <p className="text-[11px] leading-relaxed">
                Transactions are recorded with immediate ACID guarantee across both participant ledgers:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="font-bold text-rose-700 block">Debit (DR)</span>
                  <span className="text-slate-500">Source wallet reduced with category HAWALA</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="font-bold text-emerald-700 block">Credit (CR)</span>
                  <span className="text-slate-500">Destination wallet credited with category HAWALA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer History Table */}
        <div className="bg-white rounded-2xl border border-[#e4e6eb] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#e4e6eb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#050505] flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Recent Hawala Transfers</span>
              </h3>
              <p className="text-xs text-[#65676b] mt-0.5">
                Complete audit trail of administrative inter-account balance movements
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ref, user, or note..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#ced0d4] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f2f5] text-[#65676b] font-semibold border-b border-[#e4e6eb]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4 text-center">Flow</th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6eb] text-[#050505]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                      Loading Hawala history...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No Hawala transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700">
                          <span>{item.hawalaRef}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.hawalaRef)}
                            className="p-1 hover:text-primary rounded text-slate-400 transition"
                            title="Copy reference"
                          >
                            {copiedRef === item.hawalaRef ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#65676b] whitespace-nowrap text-[11px]">
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#050505]">{item.fromUserName}</span>
                          {getRoleBadge(item.fromUserRole)}
                        </div>
                        {item.fromBalanceAfter !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            New: ₹{Number(item.fromBalanceAfter).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400">
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#050505]">{item.toUserName}</span>
                          {getRoleBadge(item.toUserRole)}
                        </div>
                        {item.toBalanceAfter !== undefined && (
                          <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                            New: ₹{Number(item.toBalanceAfter).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm text-[#050505] whitespace-nowrap">
                        ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-[#65676b] max-w-xs truncate text-[11px]">
                        {item.remarks || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Optimized for small screens) */}
          <div className="md:hidden divide-y divide-[#e4e6eb]">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                Loading Hawala history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No Hawala transfers recorded yet.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
                      <span>{item.hawalaRef}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.hawalaRef)}
                        className="p-1 text-slate-400"
                      >
                        {copiedRef === item.hawalaRef ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <span className="text-sm font-bold text-[#050505]">
                      ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-rose-700">{item.fromUserName}</span>
                      {getRoleBadge(item.fromUserRole)}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-700">{item.toUserName}</span>
                      {getRoleBadge(item.toUserRole)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#65676b]">
                    <span>
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {item.remarks && <span className="italic truncate max-w-[180px]">{item.remarks}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
