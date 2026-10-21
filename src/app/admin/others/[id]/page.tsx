"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  CircleEllipsis,
  ArrowLeft,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
  Phone,
  Calendar,
  Save,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Wallet,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  User,
  CreditCard,
} from "lucide-react";
import { isValidPhone, normalizePhone, validateUsernameOrName } from "@/lib/validation";

export default function AdminOtherUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  // Delete User Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      const res = await fetch(`/api/admin/users/${userId}`, {
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
      await fetchUser();
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

    const available = Number(otherUser?.wallet?.balance ?? otherUser?.balance ?? 0);
    if (num > available || available - num < 0) {
      setClearError(`Cannot withdraw more than current balance (₹${Math.max(0, available).toFixed(2)}). Negative balance is only permitted for Merchants.`);
      return;
    }
    setClearingBalance(true);
    setClearError("");
    setClearSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
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
      await fetchUser();
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

  // Handle Save Info
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

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load account profile");

      const u = data.user;
      setOtherUser(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setStatus(u.status || "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Unable to fetch account details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateUsernameOrName(name, "Full Name / Username");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Please enter a valid name");
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account");

      setSaveSuccess("Account settings updated successfully!");
      fetchUser();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetSuccess("");
    setResetError("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      setResetting(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetSuccess("Password reset successfully!");
      setNewPassword("");
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess("");
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmationText.trim().toLowerCase() !== "delete") {
      setDeleteError('Please type "delete" to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      router.push("/admin/others");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="admin" title="Other Account Profile">
        <div className="flex items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" />
          <span>Loading account profile...</span>
        </div>
      </PortalLayout>
    );
  }

  if (error || !otherUser) {
    return (
      <PortalLayout portal="admin" title="Other Account Profile">
        <div className="max-w-xl mx-auto p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{error || "Account not found"}</span>
          </div>
          <div className="mt-4">
            <Link href="/admin/others" className="text-xs text-primary font-bold hover:underline">
              &larr; Back to Other Accounts
            </Link>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700 text-base shadow-xs shrink-0">
            {otherUser.name?.charAt(0).toUpperCase() || "O"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {otherUser.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Other
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  otherUser.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {otherUser.status}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                ID: {otherUser.id}
              </span>
            </div>
            {otherUser.phone && (
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="size-3 text-slate-400" />
                  <span>{otherUser.phone}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      }
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUser}
            disabled={loading}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center space-x-1.5"
            title="Refresh user info"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Toolbar: Deposit | Withdrawal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Balance Overview
            </span>
            <span className="text-[11px] text-slate-500">
              Manage operational wallet balance settlement
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
          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Total Balance</span>
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-base-900 font-mono truncate">
              ₹{(otherUser.wallet?.balance || otherUser.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Current settled balance</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Account Role</span>
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-base-900 font-mono truncate">
              Other
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Custom staff / member</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Account Status</span>
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-emerald-600 font-mono truncate">
              {otherUser.status}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">System permissions active</span>
          </div>
        </div>

        {/* Edit Information Form */}
        <div className="card-theme p-6 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-5">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-base-900">Account Details & Status</h3>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Username *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone (Indian or International)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +1 202 555 0199"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  10-digit Indian mobile or International format with country code (e.g. +1...)
                </span>
              </div>
            </div>

            {/* Account Status */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-base-900 block">Account Status</span>
                <span className="text-[11px] text-slate-500 block">
                  {status === "ACTIVE"
                    ? "Account is active and authorized."
                    : "Account is currently disabled."}
                </span>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-base-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Transaction Ledger */}
        <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
          <div className="p-4 border-b border-base-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-base-900">Transaction Ledger & Audit Trail</h3>
              <p className="text-xs text-base-700">All credit and debit entries on {otherUser.name}'s wallet</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 shadow-xs">
                Total Bal: <b className="text-primary font-mono font-bold">₹{(otherUser.wallet?.balance || otherUser.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </span>
              <button
                type="button"
                onClick={fetchUser}
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
                {(!otherUser.wallet?.entries || otherUser.wallet.entries.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No transactions recorded in this account's wallet yet.
                    </td>
                  </tr>
                ) : (
                  otherUser.wallet.entries.map((entry: any) => {
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
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-sm text-base-900">Reset Account Password</h3>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
                {resetSuccess}
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (Min 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="btn-primary py-1.5 px-4 text-xs font-bold"
                >
                  {resetting ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-900">Delete Account</h3>
                <p className="text-xs text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-xs text-rose-800 space-y-1">
              <p>
                You are about to permanently delete <strong>{otherUser.name}</strong> (ID: #{otherUser.id}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">delete</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="delete"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText("");
                  setDeleteError("");
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting || deleteConfirmationText.trim().toLowerCase() !== "delete"}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
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
                  <p className="text-[11px] text-emerald-100">Credit funds into Account's wallet & ledger</p>
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
                <span className="text-base-700 font-semibold">Current Balance:</span>
                <span className="font-extrabold text-sm text-base-900">
                  ₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  placeholder="e.g. Manual top-up / credit"
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
                <h3 className="font-bold text-sm text-white">- Withdrawal (Clear Balance)</h3>
                <p className="text-[11px] text-[#f0f7fc]/80">Debit / deduct funds from Account's wallet & ledger</p>
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
                <span className="text-base-700 font-semibold">Current Balance:</span>
                <span className="font-extrabold text-sm text-base-900">
                  ₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {(otherUser?.wallet?.balance || otherUser?.balance || 0) > 0 && (
                    <button
                      type="button"
                      disabled={clearingBalance || !!clearSuccess}
                      onClick={() => setClearAmount((otherUser?.wallet?.balance || otherUser?.balance || 0).toString())}
                      className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Exact Balance (₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toFixed(2)})
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
                    max={Math.max(0, Number(otherUser?.wallet?.balance ?? otherUser?.balance ?? 0)).toString()}
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
                  placeholder="e.g. Manual balance debit"
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

    </PortalLayout>
  );
}
