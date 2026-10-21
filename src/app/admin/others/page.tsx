"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  CircleEllipsis,
  User,
  UserPlus,
  Search,
  RefreshCw,
  KeyRound,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { isValidPhone, normalizePhone, validateUsernameOrName } from "@/lib/validation";
import ModalPortal from "@/components/common/ModalPortal";

export default function AdminOthersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Confirmation Modal for Edit
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);

  // Delete User Modal State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users?role=OTHER");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load other accounts");
      setUsers(data.users || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          String(u.id).includes(q)
        );
      }
      return true;
    });
  }, [users, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "ACTIVE").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [users]);

  // Edit Modal Handlers
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditPhone(user.phone || "");
    setEditPassword("");
    setEditStatus(user.status || "ACTIVE");
    setEditError("");
    setShowEditPassword(false);
    setShowConfirmEditModal(false);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditError("");
    setShowConfirmEditModal(false);
  };

  const handleInitiateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    const nameCheck = validateUsernameOrName(editName, "Full Name / Username");
    if (!nameCheck.valid) {
      setEditError(nameCheck.error || "Please enter a valid name");
      return;
    }

    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setEditError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setEditError("Password must be at least 6 characters long");
      return;
    }

    setShowConfirmEditModal(true);
  };

  const handleConfirmUpdate = async () => {
    if (!editingUser) return;
    setUpdating(true);
    setEditError("");

    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : null;

    try {
      const payload: any = {
        name: editName.trim(),
        phone: cleanPhone,
        status: editStatus,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account");

      setToastMessage(`Account "${editName.trim()}" updated successfully!`);
      setShowConfirmEditModal(false);
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update account");
      setShowConfirmEditModal(false);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (deleteConfirmationText.trim().toLowerCase() !== "delete") {
      setDeleteError('Please type "delete" to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      setToastMessage(`Account "${deletingUser.name}" deleted permanently.`);
      setDeletingUser(null);
      setDeleteConfirmationText("");
      fetchUsers();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Other Accounts"
      subtitle="Manage all other staff, support, and specialized platform accounts."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
          <Link
            href="/admin/users/create?role=OTHER"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Create User</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Floating Success Toast */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Accounts</span>
              <span className="text-2xl font-extrabold text-base-900 mt-1 block">{stats.total}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <CircleEllipsis className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Active Status</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{stats.active}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Inactive</span>
              <span className="text-2xl font-extrabold text-slate-600 mt-1 block">{stats.inactive}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username, contact..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {st === "ALL" ? "All Status" : st === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact Num</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No other accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => (window.location.href = `/admin/others/${u.id}`)}
                      className="hover:bg-sky-50/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0 border border-teal-200">
                            {u.name?.charAt(0).toUpperCase() || "O"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-base-900 hover:text-primary transition truncate block">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              ID: #{u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border bg-teal-50 text-teal-700 border-teal-200">
                          Other
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.phone ? (
                          <span className="font-mono text-slate-700 font-medium">{u.phone}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not Provided</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              u.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/admin/others/${u.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-sky-50 border border-sky-200 transition"
                            title="View Profile"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Profile</span>
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                            title="Edit User"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteError("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== EDIT USER MODAL ==================== */}
      {editingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-base-900">Edit Other Account</h3>
                    <p className="text-[11px] text-slate-500">ID: #{editingUser.id}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEdit}
                  disabled={updating}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleInitiateUpdate} className="p-6 space-y-4">
                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name / Username *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter name or username"
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Change Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep existing password"
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    disabled={updating}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-600 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirmation Modal for Edit */}
      {showConfirmEditModal && editingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-base-900">Confirm Details Update</h3>
                  <p className="text-xs text-slate-500">Are you sure you want to save these changes?</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-base-900">{editName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-mono text-base-900">{editPhone || "Not Provided"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-base-900">{editStatus}</span>
                </div>
                {editPassword && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Password:</span>
                    <span>Will be reset</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmEditModal(false)}
                  disabled={updating}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdate}
                  disabled={updating}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-600 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{updating ? "Saving..." : "Yes, Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
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
                  You are about to permanently delete <strong>{deletingUser.name}</strong> (ID: #{deletingUser.id}).
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
                    setDeletingUser(null);
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
                  onClick={handleConfirmDelete}
                  disabled={deleting || deleteConfirmationText.trim().toLowerCase() !== "delete"}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </PortalLayout>
  );
}
