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
  User,
  ShieldCheck,
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
      title={otherUser.name || "Other Account"}
      subtitle={`Account ID: #${otherUser.id} • Role: Other`}
      actions={
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/others"
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Others</span>
          </Link>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-700" />
            <span>Reset Password</span>
          </button>
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteConfirmationText("");
              setDeleteError("");
            }}
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete</span>
          </button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Profile Summary Card */}
        <div className="card-theme p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xl shadow-xs">
              {otherUser.name?.charAt(0).toUpperCase() || "O"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-base-900">{otherUser.name}</h2>
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
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Joined: {new Date(otherUser.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </span>
                {otherUser.phone && (
                  <span className="flex items-center space-x-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{otherUser.phone}</span>
                  </span>
                )}
              </div>
            </div>
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
    </PortalLayout>
  );
}
