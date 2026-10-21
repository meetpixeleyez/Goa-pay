"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Briefcase,
  ArrowLeft,
  KeyRound,
  Percent,
  Wallet,
  Store,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Send,
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Save,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
} from "lucide-react";
import {
  isValidPhone,
  isValidEmail,
  validateName,
  normalizePhone,
} from "@/lib/validation";

export default function BrokerDetailPage() {
  const params = useParams();
  const brokerId = params.id as string;

  const [broker, setBroker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "merchants" | "ledger">("info");

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [payinBrokerFee, setPayinBrokerFee] = useState("0.0");
  const [payoutBrokerFee, setPayoutBrokerFee] = useState("0.0");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

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
      const res = await fetch(`/api/admin/users/${brokerId}`, {
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
      await fetchBroker();
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

    const available = Number(broker?.wallet?.balance ?? broker?.balance ?? 0);
    if (num > available || available - num < 0) {
      setClearError(`Cannot withdraw more than current balance (₹${Math.max(0, available).toFixed(2)}). Negative balance is only permitted for Merchants.`);
      return;
    }
    setClearingBalance(true);
    setClearError("");
    setClearSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${brokerId}`, {
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
      await fetchBroker();
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

  const fetchBroker = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/${brokerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load broker profile");

      const u = data.user;
      setBroker(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setTelegramId(u.telegramId || "");
      setPayinBrokerFee((u.payinBrokerFee ?? 0).toString());
      setPayoutBrokerFee((u.payoutBrokerFee ?? 0).toString());
      setStatus(u.status || "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Unable to fetch broker details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brokerId) {
      fetchBroker();
    }
  }, [brokerId]);

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

  // Save updated broker settings
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateName(name, "Broker name");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Broker name is required");
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
      const res = await fetch(`/api/admin/users/${brokerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update broker");

      setSaveSuccess("Broker settings updated successfully!");
      fetchBroker();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update broker");
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
      const res = await fetch(`/api/admin/users/${brokerId}/reset-password`, {
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
      <PortalLayout portal="admin" title="Broker Profile" subtitle="Loading broker information...">
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading broker profile and merchant store relations...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !broker) {
    return (
      <PortalLayout portal="admin" title="Broker Profile" subtitle="Broker Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">Broker Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested broker could not be found."}</p>
          <Link href="/admin/brokers" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Brokers List</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const brokeredMerchants = broker.brokeredMerchants || [];
  const walletEntries = broker.wallet?.entries || [];
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
          <div className="size-10 sm:size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-base sm:text-lg border border-primary/30 shrink-0">
            {broker.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-bold text-slate-800">{broker.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Broker
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  broker.status === "ACTIVE"
                    ? "bg-green-50 text-green-600 border-green-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
              >
                {broker.status}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                ID: {broker.id}
              </span>
            </div>
            {(broker.phone || broker.telegramId) && (
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                {broker.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="size-3 text-slate-400" />
                    <span>{broker.phone}</span>
                  </span>
                )}
                {broker.telegramId && (
                  <span className="flex items-center gap-1 text-slate-600 font-mono">
                    <span>{broker.telegramId}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      }
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchBroker}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center space-x-1.5"
            title="Refresh broker info"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/users"
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Users</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Toolbar: Deposit | Withdrawal (Just above the cards) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Balance Overview
            </span>
            <span className="text-[11px] text-slate-500">
              Manage commission wallet settlement
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
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-600 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
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
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>- Withdrawal</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Commission Wallet</span>
              <div className="size-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                <Wallet className="size-4 fill-primary-500/20" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold truncate text-slate-800">
              ₹{(broker.wallet?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">Net accrued commission</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Brokered Stores</span>
              <div className="size-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <Store className="size-4 text-sky-600" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-800 truncate">
              {brokeredMerchants.length}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">Active linked merchant accounts</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Lifetime Earned</span>
              <div className="size-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="size-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 truncate">
              ₹{totalCommissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">All-time commission credited</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "info"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Broker Info & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("merchants")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "merchants"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Brokered Merchants ({brokeredMerchants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "ledger"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Commission Ledger ({walletEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: INFO & SETTINGS */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="card-theme p-6 shadow-sm border border-base-200">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Edit Broker Profile & Settings</h3>
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

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1">Company / Broker Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-1">
                      Contact Phone (Indian or International)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210 or +14155552671"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">10-digit Indian mobile or International format with country code (e.g. +1...)</span>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-2">Account Status</label>
                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={status === "ACTIVE"}
                        onClick={() => setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
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
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-gray-400"
                          }`}
                        />
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            status === "ACTIVE" ? "text-green-700" : "text-slate-500"
                          }`}
                        >
                          {status}
                        </span>
                        <span className="text-[11px] text-base-700">
                          {status === "ACTIVE" ? "(Active & Earning)" : "(Disabled)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="card-theme p-5 shadow-sm border border-base-200">
              <div className="flex items-center space-x-2 pb-2 border-b border-base-200 mb-3">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-xs text-base-900">Broker Economics (Option A)</h4>
              </div>
              <div className="space-y-2.5 text-xs text-base-700">
                <p>
                  • When a broker is assigned to a merchant, the broker commission is applied to every completed deposit order.
                </p>
                <p>
                  • Commissions are automatically credited to the broker's wallet upon Dual-UTR verification approval.
                </p>
                <p>
                  • Broker fees (Payin & Payout) are configured dynamically directly on each merchant store when assigning this broker.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BROKERED MERCHANTS */}
        {activeTab === "merchants" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Brokered Merchant Stores</h3>
                <p className="text-xs text-base-700">Stores linked to {broker.name}</p>
              </div>
              <span className="text-xs text-base-700">
                Total Linked Stores: <b>{brokeredMerchants.length}</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-60 max-w-[240px]">Store Name & Email</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 whitespace-nowrap">Phone</th>
                    <th className="p-3 text-center whitespace-nowrap">Store Fee %</th>
                    <th className="p-3 text-center whitespace-nowrap">Completed Orders</th>
                    <th className="p-3 whitespace-nowrap">Joined Date</th>
                    <th className="p-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {brokeredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No merchant stores currently assigned to this broker.
                      </td>
                    </tr>
                  ) : (
                    brokeredMerchants.map((m: any) => (
                      <tr key={m.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 w-60 max-w-[240px]">
                          <div className="font-bold text-base-900 truncate" title={m.name}>{m.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate" title={m.email}>{m.email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{m.phone || "--"}</td>
                        <td className="p-3 text-center font-bold text-primary">{m.payinMerchantFee ?? 0}%</td>
                        <td className="p-3 text-center font-bold text-base-900">
                          {m._count?.merchantOrders || 0}
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/merchants/${m.id}`}
                            className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1"
                          >
                            <span>View Store</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Broker Commission Ledger</h3>
                <p className="text-xs text-base-700">All credit and debit entries on {broker.name}'s wallet</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 shadow-xs">
                  Current Balance: <b className="text-primary font-mono font-bold">₹{(broker.wallet?.balance || broker.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                </span>
                <button
                  type="button"
                  onClick={fetchBroker}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                  title="Refresh Ledger"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

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
                        No transactions recorded in this broker's wallet yet.
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
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="card-theme max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Reset Broker Password</h3>
              </div>

              <p className="text-xs text-base-700 mb-4">
                Enter a new password for <b>{broker.name}</b> ({broker.email}).
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
                  <label className="block text-[12px] font-semibold mb-1">
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
        )}
        {/* MODAL: ADD BALANCE / DEPOSIT */}
        {showAddBalanceModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-base-200 overflow-hidden">
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-emerald-100" />
                  <div>
                    <h3 className="font-bold text-sm">+ Deposit (Add Balance)</h3>
                    <p className="text-[11px] text-emerald-100">Credit funds into Broker's wallet & ledger</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddBalanceModal(false)}
                  className="text-white hover:text-gray-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBalance} className="p-5 space-y-4">
                <div className="p-3 bg-base-100/40 border border-base-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-base-700 font-semibold">Current Commission Balance:</span>
                  <span className="font-extrabold text-sm text-base-900">
                    ₹{(broker?.wallet?.balance || broker?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Amount to Deposit (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.01"
                      disabled={addingBalance || !!addBalanceSuccess}
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-7 pr-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={addingBalance || !!addBalanceSuccess}
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="e.g. Broker bonus / manual adjustment"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={addingBalance || !!addBalanceSuccess}
                    onClick={() => setShowAddBalanceModal(false)}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingBalance || !!addBalanceSuccess || !addAmount || parseFloat(addAmount) <= 0}
                    className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {addingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Crediting...</span>
                      </>
                    ) : addBalanceSuccess ? (
                      <span className="text-emerald-200 font-bold">✓ Credited Successfully</span>
                    ) : (
                      <span>Deposit ₹{parseFloat(addAmount) > 0 ? parseFloat(addAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CLEAR BALANCE / WITHDRAWAL */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-base-200 overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">- Withdrawal (Payout)</h3>
                  <p className="text-[11px] text-[#f0f7fc]/80">Disburse / deduct funds from Broker's wallet & ledger</p>
                </div>
                <button
                  disabled={clearingBalance || !!clearSuccess}
                  onClick={() => setShowClearModal(false)}
                  className="text-white hover:text-gray-300 text-sm font-bold disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleClearBalance} className="p-5 space-y-4">
                <div className="p-3 bg-base-100/40 border border-base-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-base-700 font-semibold">Current Commission Balance:</span>
                  <span className="font-extrabold text-sm text-base-900">
                    ₹{(broker?.wallet?.balance || broker?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-base-900">
                      Amount to Withdraw (₹) *
                    </label>
                    {(broker?.wallet?.balance || broker?.balance || 0) > 0 && (
                      <button
                        type="button"
                        disabled={clearingBalance || !!clearSuccess}
                        onClick={() => setClearAmount((broker?.wallet?.balance || broker?.balance || 0).toString())}
                        className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Exact Balance (₹{(broker?.wallet?.balance || broker?.balance || 0).toFixed(2)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.01"
                      max={Math.max(0, Number(broker?.wallet?.balance ?? broker?.balance ?? 0)).toString()}
                      disabled={clearingBalance || !!clearSuccess}
                      value={clearAmount}
                      onChange={(e) => setClearAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-7 pr-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={clearingBalance || !!clearSuccess}
                    value={clearDescription}
                    onChange={(e) => setClearDescription(e.target.value)}
                    placeholder="e.g. Bank payout disbursement ref #IMPS1234"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={clearingBalance || !!clearSuccess}
                    onClick={() => setShowClearModal(false)}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={clearingBalance || !!clearSuccess || !clearAmount || parseFloat(clearAmount) <= 0}
                    className="flex-1 py-2 text-xs font-bold bg-[#0f172a] text-white rounded-lg hover:bg-slate-800 shadow flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {clearingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Debiting...</span>
                      </>
                    ) : clearSuccess ? (
                      <span className="text-emerald-300 font-bold">✓ Withdrawn Successfully</span>
                    ) : (
                      <span>Withdraw ₹{parseFloat(clearAmount) > 0 ? parseFloat(clearAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}
