"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  X,
  Unlock,
  Edit3,
} from "lucide-react";
import { isValidPhone, normalizePhone, validateUsernameOrName } from "@/lib/validation";

export default function AdminOtherUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"ledger" | "info">(
    tabParam === "info" ? "info" : "ledger"
  );

  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tabParam === "info" || tabParam === "ledger") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
    if (otherUser) {
      setName(otherUser.name || "");
      setPhone(otherUser.phone || "");
      setStatus(otherUser.status || "ACTIVE");
    }
  };

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
      setIsEditing(false);
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
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 border transition-colors ${
              otherUser.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
            }`}
          >
            {otherUser.name?.charAt(0).toUpperCase() || "O"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {otherUser.name}
              </h1>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
              <span>ID: {otherUser.id}</span>
              {otherUser.phone && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-slate-400" />
                    <span>{otherUser.phone}</span>
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
          className="btn-secondary text-xs py-2 px-3 inline-flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
      }
    >
      <div className="space-y-6">

        {/* Top Summary Card (Net Wallet Balance & Settlement Actions) */}
        <div className="mb-4">
          <div className="card-theme p-4 sm:p-5 border-l-4 border-l-primary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Net Wallet Balance
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold mt-1 block text-base-900">
                ₹{(otherUser.wallet?.balance || otherUser.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        {/* Tabs Navigation (1st Transactions, 2nd Account Info) */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "ledger"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "info"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account Info</span>
          </button>
        </div>

        {/* TAB 1: TRANSACTIONS LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            <div className="p-4 border-b border-base-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg sm:text-base text-base-900">Transactions</h3>
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
        )}

        {/* TAB 2: ACCOUNT INFO */}
        {activeTab === "info" && (
          <div className="card-theme p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Account Information & Contact</h3>
                <p className="text-xs text-slate-500">User profile details and status settings</p>
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

          {isEditing && (
            <div className="p-3 mb-4 bg-blue-100 border border-blue-200 text-blue-500 text-xs rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Unlock className="size-3 shrink-0" />
                <span>
                  Editing mode active. Update fields below, then click <b>Save Account Info & Status</b>.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Username *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                ) : (
                  <div className="w-full px-3.5 py-2.5 text-xs font-bold text-base-900 bg-gray-50 rounded-lg border border-gray-200 truncate">
                    {name || "--"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                {isEditing ? (
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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

              {/* Account Status */}
              <div className="md:col-span-2 p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
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
                      <span>Save Account Info & Status</span>
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
                  <span>Registered: {otherUser?.createdAt ? new Date(otherUser.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "--"}</span>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Add Funds to Account Wallet</h3>
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
                  Manually credit funds directly into <b>{otherUser?.name}</b>'s settled wallet.
                </p>
                <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Settled Balance:</span>
                  <span className="font-semibold text-base-900">
                    ₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      )}

      {/* MODAL: CLEAR BALANCE / WITHDRAWAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MinusCircle className="w-4 h-4 text-rose-400" />
                <h3 className="font-semibold text-sm">Withdraw Funds from Account Wallet</h3>
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
                  Manually debit funds directly from <b>{otherUser?.name}</b>'s settled wallet.
                </p>
                <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Settled Balance:</span>
                  <span className="font-semibold text-base-900">
                    ₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {(otherUser?.wallet?.balance || otherUser?.balance || 0) > 0 && (
                    <button
                      type="button"
                      disabled={clearingBalance || !!clearSuccess}
                      onClick={() => setClearAmount((otherUser?.wallet?.balance || otherUser?.balance || 0).toString())}
                      className="text-[12px] font-semibold text-primary hover:text-primary-400 underline disabled:opacity-50"
                    >
                      Clear Exact Balance (₹{(otherUser?.wallet?.balance || otherUser?.balance || 0).toFixed(2)})
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
      )}

    </PortalLayout>
  );
}
