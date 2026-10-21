"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Users,
  ArrowLeft,
  KeyRound,
  Percent,
  Wallet,
  QrCode,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Send,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Save,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  CreditCard,
  X,
  Unlock,
  Edit3,
  ExternalLink,
} from "lucide-react";
import {
  isValidPhone,
  isValidEmail,
  validateName,
  normalizePhone,
} from "@/lib/validation";
import ModalPortal from "@/components/common/ModalPortal";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state (default to Transactions)
  const [activeTab, setActiveTab] = useState<"info" | "providers" | "ledger">("ledger");

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [payinAgentFee, setPayinAgentFee] = useState("0.0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0.0");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  // Balance Action States (Deposit & Withdrawal Modals)
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addingBalance, setAddingBalance] = useState(false);
  const [addBalanceError, setAddBalanceError] = useState("");
  const [addBalanceSuccess, setAddBalanceSuccess] = useState("");

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearAmount, setClearAmount] = useState("");
  const [clearDescription, setClearDescription] = useState("");
  const [clearingBalance, setClearingBalance] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearSuccess, setClearSuccess] = useState("");

  // Handle Add Balance / Deposit
  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingBalance || addBalanceSuccess) return;

    const num = parseFloat(addAmount);
    if (isNaN(num) || num <= 0) {
      setAddBalanceError("Please enter a valid amount greater than ₹0");
      return;
    }
    setAddingBalance(true);
    setAddBalanceError("");
    setAddBalanceSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BALANCE",
          amount: num,
          description: addDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add balance");

      setAddBalanceSuccess(data.message || "Balance deposited successfully!");
      await fetchAgent();
      setTimeout(() => {
        setShowAddBalanceModal(false);
        setAddAmount("");
        setAddDescription("");
        setAddBalanceSuccess("");
        setAddingBalance(false);
      }, 900);
    } catch (err: any) {
      setAddBalanceError(err.message || "Failed to add balance");
      setAddingBalance(false);
    }
  };

  // Handle Clear Balance / Withdrawal
  const handleClearBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearingBalance || clearSuccess) return;

    const num = parseFloat(clearAmount);
    if (isNaN(num) || num <= 0) {
      setClearError("Please enter a valid amount greater than ₹0");
      return;
    }

    const available = Number(agent?.wallet?.balance ?? agent?.balance ?? 0);
    if (num > available || available - num < 0) {
      setClearError(`Cannot withdraw more than current balance (₹${Math.max(0, available).toFixed(2)}). Negative balance is only permitted for Merchants.`);
      return;
    }
    setClearingBalance(true);
    setClearError("");
    setClearSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLEAR_BALANCE",
          amount: num,
          description: clearDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear balance");

      setClearSuccess(data.message || "Balance withdrawn successfully!");
      await fetchAgent();
      setTimeout(() => {
        setShowClearModal(false);
        setClearAmount("");
        setClearDescription("");
        setClearSuccess("");
        setClearingBalance(false);
      }, 900);
    } catch (err: any) {
      setClearError(err.message || "Failed to clear balance");
      setClearingBalance(false);
    }
  };

  const getEntryTypeBadge = (entry: any) => {
    const type = (entry.type || "").toUpperCase();

    if (type === "CR") {
      return {
        label: "+ DEPOSIT",
        className: "bg-green-100 text-green-800",
        amountPrefix: "+",
        amountColor: "text-green-700",
        displayCategory: entry.category || "DEPOSIT",
      };
    }

    return {
      label: "- WITHDRAWAL",
      className: "bg-red-100 text-red-800",
      amountPrefix: "-",
      amountColor: "text-red-700",
      displayCategory: entry.category || "WITHDRAWAL",
    };
  };

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/${agentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load agent profile");

      const u = data.user;
      setAgent(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setTelegramId(u.telegramId || "");
      setPayinAgentFee((u.payinAgentFee ?? 0).toString());
      setPayoutAgentFee((u.payoutAgentFee ?? 0).toString());
      setStatus(u.status || "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Unable to fetch agent details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  // Telegram auto-prefix handler
  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() && !val.startsWith("@")) {
      setTelegramId("@" + val.trim());
    } else {
      setTelegramId(val);
    }
  };

  const handleTelegramBlur = () => {
    if (telegramId.trim() && !telegramId.trim().startsWith("@")) {
      setTelegramId("@" + telegramId.trim());
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
    if (agent) {
      setName(agent.name || "");
      setPhone(agent.phone || "");
      setStatus(agent.status || "ACTIVE");
    }
  };

  // Save updated agent settings
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateName(name, "Agent name");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Agent name is required");
      setSaving(false);
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setSaveError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update agent");

      setSaveSuccess("Agent settings updated successfully!");
      setIsEditing(false);
      fetchAgent();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetSuccess("");
    setResetError("");

    try {
      const res = await fetch(`/api/admin/users/${agentId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetSuccess(data.message || "Password updated successfully!");
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword("");
        setResetSuccess("");
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="admin" title="Agent Profile" subtitle="Loading agent information...">
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading agent profile and performance data...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !agent) {
    return (
      <PortalLayout portal="admin" title="Agent Profile" subtitle="Agent Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">Agent Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested agent could not be found."}</p>
          <Link href="/admin/agents" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Agents List</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const assignedProviders = agent.agentQrProviders || [];
  const walletEntries = agent.wallet?.entries || [];
  const totalCommissionEarned = walletEntries
    .filter((e: any) => e.type === "CR")
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalDebit = walletEntries
    .filter((e: any) => e.type === "DR")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center gap-3">
          <div
            className={`size-10 sm:size-11 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg border shrink-0 transition-colors ${
              agent.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
            }`}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-800">{agent.name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
              <span>ID: {agent.id}</span>
              {agent.phone && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-slate-400" />
                    <span>{agent.phone}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      }
      actions={
        <Link
          href="/admin/users"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
      }
    >
      <div className="space-y-5 sm:space-y-6">

        {/* Top Summary Card (Net Wallet Balance & Settlement Actions) */}
        <div className="mb-4">
          <div className="card-theme p-4 sm:p-5 border-l-4 border-l-primary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Net Wallet Balance
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold mt-1 block text-base-900">
                ₹{(agent.wallet?.balance || agent.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddBalanceModal(true);
                  setAddAmount("");
                  setAddDescription("");
                  setAddBalanceError("");
                  setAddBalanceSuccess("");
                }}
                className="btn-primary text-xs py-2 px-4 flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>+ Deposit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(true);
                  setClearAmount("");
                  setClearDescription("");
                  setClearError("");
                  setClearSuccess("");
                }}
                className="px-4 py-2 text-xs bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold flex items-center justify-center shadow-xs transition cursor-pointer"
              >
                <MinusCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mr-1" />
                <span>- Withdrawal</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Linked QR Providers</span>
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-base-900 font-mono truncate">
              {assignedProviders.length}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Active liquidity partners</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Lifetime Earned</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-emerald-600 font-mono truncate">
              ₹{totalCommissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">All-time commission credited</span>
          </div>
        </div>

        {/* Tab Navigation (1st Transactions, 2nd Assigned QR Providers, 3rd Agent Info) */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1 pb-px no-scrollbar">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "ledger"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => setActiveTab("providers")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "providers"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Linked QR Providers</span>
          </button>

          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "info"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agent Info</span>
          </button>
        </div>

        {/* TAB 1: INFO & SETTINGS */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="card-theme p-4 sm:p-5 shadow-sm border border-base-200 rounded-xl">
              <div className="flex items-center justify-between pb-3 border-b border-base-200 mb-4 sm:mb-5">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-bold text-[16px] text-base-900">Agent Information & Contact</h3>
                    <p className="text-xs text-slate-500">Agent profile details and commission settings</p>
                  </div>
                </div>
                <div>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition flex items-center space-x-1.5 shadow-xs whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-xs bg-sky-100 border border-sky-200 text-sky-500 rounded-lg font-semibold flex items-center space-x-1 whitespace-nowrap">
                      <Unlock className="w-3 h-3" />
                      <span>Editing</span>
                    </span>
                  )}
                </div>
              </div>

              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {isEditing && (
                <div className="p-3 mb-4 bg-blue-100 border border-blue-200 text-blue-500 text-xs rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Unlock className="size-3 shrink-0" />
                    <span>
                      Editing mode active. Update fields below, then click <b>Save Agent Info & Status</b>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-blue-600 hover:text-blue-700 font-semibold underline ml-2 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">Agent Name *</label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <div className="w-full px-3.5 py-2.5 text-xs font-bold text-base-900 bg-gray-50 rounded-lg border border-gray-200 truncate">
                        {name || "--"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Contact Phone
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="w-full px-3.5 py-2.5 text-xs font-medium font-mono text-gray-800 bg-gray-50 rounded-lg border border-gray-200 truncate">
                        {phone || <span className="text-gray-400 font-mono">e.g. +91 9876543210 or +1 443 456 7890</span>}
                      </div>
                    )}
                  </div>

                  {/* Account Status Switch */}
                  <div className="sm:col-span-2 p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <span className="text-xs font-bold text-base-900 uppercase tracking-wider block">
                      Account Controls & Permissions
                    </span>
                    <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
                      <div>
                        <span className="text-xs font-bold text-base-900 block">Account Status</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              status === "ACTIVE" ? "text-green-700" : "text-red-600"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        disabled={!isEditing}
                        aria-checked={status === "ACTIVE"}
                        onClick={() => isEditing && setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                        className={`relative inline-flex h-6 w-11 shrink-0 ${
                          isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                        } rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                          status === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center space-x-3 pt-4 border-t border-base-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Agent Info & Status</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[12px] text-slate-500 pt-2 border-t border-base-200">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Registered: {agent?.createdAt ? new Date(agent.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "--"}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNED QR PROVIDERS */}
        {activeTab === "providers" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-base-900">Assigned QR Providers</h3>
                <p className="text-xs text-base-700">Liquidity providers managed by {agent.name}</p>
              </div>
              <span className="text-xs text-base-700">
                Total Linked Providers: <b>{assignedProviders.length}</b>
              </span>
            </div>

            {/* Desktop Table View (Visible on md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-64 max-w-[260px] whitespace-nowrap">Provider Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right whitespace-nowrap">Liquidity Balance</th>
                    <th className="p-3 text-right whitespace-nowrap">Locked Exposure</th>
                    <th className="p-3 text-right whitespace-nowrap">Available Balance</th>
                    <th className="p-3 text-center whitespace-nowrap">Fee % (In / Out)</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {assignedProviders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No QR providers currently assigned to this agent.
                      </td>
                    </tr>
                  ) : (
                    assignedProviders.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 w-64 max-w-[260px]">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                              {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-base-900 truncate" title={p.name}>
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                ID: {p.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-base-900 font-mono">
                          ₹{(p.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sky-700 font-bold font-mono whitespace-nowrap">
                          ₹{(p.exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-primary font-extrabold font-mono whitespace-nowrap">
                          ₹{(p.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1 font-mono text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60">
                              IN: {p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]/60">
                              OUT: {p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/qr-providers/${p.id}`}
                            className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all inline-flex items-center space-x-1.5 shadow-2xs"
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Visible on small screens) */}
            <div className="block md:hidden divide-y divide-[#e0f2fe]">
              {assignedProviders.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No QR providers currently assigned to this agent.
                </div>
              ) : (
                assignedProviders.map((p: any) => (
                  <div key={p.id} className="p-3.5 space-y-2.5 hover:bg-[#ffffff] transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                          {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-base-900 truncate" title={p.name}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {p.id}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          p.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Financial Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-[#ffffff] rounded-lg border border-[#e0f2fe] text-[11px] font-mono">
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Available</span>
                        <span className="font-extrabold text-primary truncate block" title={`₹${(p.availableBalance || 0).toFixed(2)}`}>
                          ₹{(p.availableBalance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Exposure</span>
                        <span className="font-bold text-sky-700 truncate block" title={`₹${(p.exposure || 0).toFixed(2)}`}>
                          ₹{(p.exposure || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Holding</span>
                        <span className="font-bold text-base-900 truncate block" title={`₹${(p.balance || 0).toFixed(2)}`}>
                          ₹{(p.balance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* Footer with Fee info & Action button */}
                    <div className="flex items-center justify-between pt-0.5 text-xs">
                      <div className="inline-flex items-center space-x-1 font-mono text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60">
                          IN: {p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]/60">
                          OUT: {p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%
                        </span>
                      </div>

                      <Link
                        href={`/admin/qr-providers/${p.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all inline-flex items-center space-x-1.5 shadow-2xs"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {walletEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No transactions recorded in this agent's wallet yet.
                      </td>
                    </tr>
                  ) : (
                    walletEntries.map((entry: any) => {
                      const typeBadge = getEntryTypeBadge(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-[#ffffff] transition">
                          <td className="p-3 font-mono text-[11px] text-gray-600">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-gray-600">
                            {typeBadge.displayCategory}
                          </td>
                          <td className="p-3 font-medium text-base-900">{entry.description}</td>
                          <td className={`p-3 text-right font-extrabold ${typeBadge.amountColor}`}>
                            {typeBadge.amountPrefix}₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-bold text-base-900">
                            ₹{entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {showResetModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="card-theme max-w-sm w-full p-6 rounded-2xl border border-base-200 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base text-base-900">Reset Agent Password</h3>
                </div>

                <p className="text-xs text-base-700 mb-4 ">
                  Enter a new password for <b>{agent.name || `Agent #${agent.id}`}</b>.
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
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-base-200">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-3.5 py-1.5 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetting}
                      className="btn-primary px-4 py-1.5 text-xs font-semibold shadow-sm"
                    >
                      {resetting ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}
        {/* MODAL: ADD BALANCE / DEPOSIT */}
        {showAddBalanceModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Add Funds to Agent Wallet</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddBalanceModal(false);
                      setAddAmount("");
                      setAddDescription("");
                      setAddBalanceError("");
                      setAddBalanceSuccess("");
                    }}
                    className="text-white hover:text-gray-200 text-sm font-bold"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleAddBalance} className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Manually credit funds directly into <b>{agent?.name}</b>'s settled wallet.
                    </p>
                    <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Current Settled Balance:</span>
                      <span className="font-semibold text-base-900">
                        ₹{(agent?.wallet?.balance || agent?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {addBalanceError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{addBalanceError}</span>
                    </div>
                  )}

                  {addBalanceSuccess && (
                    <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      <span>{addBalanceSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5">
                      Deposit Amount (₹)*
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        autoFocus
                        disabled={addingBalance || !!addBalanceSuccess}
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      />
                    </div>
                    {/* Quick Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[500, 1000, 5000, 10000, 25000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={addingBalance || !!addBalanceSuccess}
                          onClick={() => setAddAmount(amt.toString())}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                      Reference Note / Description
                    </label>
                    <input
                      type="text"
                      disabled={addingBalance || !!addBalanceSuccess}
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      placeholder="e.g. Manual top-up, Bank transfer settlement"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      disabled={addingBalance || !!addBalanceSuccess}
                      onClick={() => {
                        setShowAddBalanceModal(false);
                        setAddAmount("");
                        setAddDescription("");
                        setAddBalanceError("");
                        setAddBalanceSuccess("");
                      }}
                      className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingBalance || !!addBalanceSuccess || !addAmount || parseFloat(addAmount) <= 0}
                      className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingBalance ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Crediting...</span>
                        </>
                      ) : addBalanceSuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Credited Successfully</span>
                        </>
                      ) : (
                        <span>Credit ₹{parseFloat(addAmount) > 0 ? parseFloat(addAmount).toLocaleString("en-IN") : "0"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* MODAL: CLEAR BALANCE / WITHDRAWAL */}
        {showClearModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MinusCircle className="w-4 h-4 text-rose-400" />
                    <h3 className="font-semibold text-sm">Withdraw Funds from Agent Wallet</h3>
                  </div>
                  <button
                    disabled={clearingBalance || !!clearSuccess}
                    onClick={() => {
                      setShowClearModal(false);
                      setClearAmount("");
                      setClearDescription("");
                      setClearError("");
                      setClearSuccess("");
                    }}
                    className="text-white hover:text-gray-200 text-sm font-bold disabled:opacity-50"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleClearBalance} className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Manually debit funds directly from <b>{agent?.name}</b>'s settled wallet.
                    </p>
                    <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Current Settled Balance:</span>
                      <span className="font-semibold text-base-900">
                        ₹{(agent?.wallet?.balance || agent?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {clearError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{clearError}</span>
                    </div>
                  )}

                  {clearSuccess && (
                    <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      <span>{clearSuccess}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[12px] font-semibold text-base-900">
                        Withdrawal Amount (₹)*
                      </label>
                      {(agent?.wallet?.balance || agent?.balance || 0) > 0 && (
                        <button
                          type="button"
                          disabled={clearingBalance || !!clearSuccess}
                          onClick={() => setClearAmount((agent?.wallet?.balance || agent?.balance || 0).toString())}
                          className="text-[12px] font-semibold text-primary hover:text-primary-400 underline disabled:opacity-50"
                        >
                          Clear Exact Balance (₹{(agent?.wallet?.balance || agent?.balance || 0).toFixed(2)})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        disabled={clearingBalance || !!clearSuccess}
                        autoFocus
                        value={clearAmount}
                        onChange={(e) => setClearAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      />
                    </div>
                    {/* Quick Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[500, 1000, 5000, 10000, 25000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={clearingBalance || !!clearSuccess}
                          onClick={() => setClearAmount(amt.toString())}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                      Reference Note / Description
                    </label>
                    <input
                      type="text"
                      disabled={clearingBalance || !!clearSuccess}
                      value={clearDescription}
                      onChange={(e) => setClearDescription(e.target.value)}
                      placeholder="e.g. Bank payout issued, settlement withdrawal"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      disabled={clearingBalance || !!clearSuccess}
                      onClick={() => {
                        setShowClearModal(false);
                        setClearAmount("");
                        setClearDescription("");
                        setClearError("");
                        setClearSuccess("");
                      }}
                      className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={clearingBalance || !!clearSuccess || !clearAmount || parseFloat(clearAmount) <= 0}
                      className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {clearingBalance ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Debiting...</span>
                        </>
                      ) : clearSuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Debited Successfully</span>
                        </>
                      ) : (
                        <span>Debit ₹{parseFloat(clearAmount) > 0 ? parseFloat(clearAmount).toLocaleString("en-IN") : "0"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </PortalLayout>
  );
}
