"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Phone,
  User,
  Check,
  Percent,
  ExternalLink,
} from "lucide-react";
import {
  isValidPhone,
  validateUsernameOrName,
} from "@/lib/validation";

export default function UsersDirectoryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Edit User State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fee state for edit
  const [editPayinMerchantFee, setEditPayinMerchantFee] = useState("0");
  const [editPayoutMerchantFee, setEditPayoutMerchantFee] = useState("0");
  const [editBrokerId, setEditBrokerId] = useState("");
  const [editPayinBrokerFee, setEditPayinBrokerFee] = useState("0");
  const [editPayoutBrokerFee, setEditPayoutBrokerFee] = useState("0");

  const [editPayinQrProviderFee, setEditPayinQrProviderFee] = useState("0");
  const [editPayoutQrProviderFee, setEditPayoutQrProviderFee] = useState("0");
  const [editAgentId, setEditAgentId] = useState("");
  const [editPayinAgentFee, setEditPayinAgentFee] = useState("0");
  const [editPayoutAgentFee, setEditPayoutAgentFee] = useState("0");

  const [editDirectBrokerPayinFee, setEditDirectBrokerPayinFee] = useState("0");
  const [editDirectBrokerPayoutFee, setEditDirectBrokerPayoutFee] = useState("0");

  const [editDirectAgentPayinFee, setEditDirectAgentPayinFee] = useState("0");
  const [editDirectAgentPayoutFee, setEditDirectAgentPayoutFee] = useState("0");

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const availableBrokers = useMemo(() => users.filter((u) => u.role === "BROKER"), [users]);
  const availableAgents = useMemo(() => users.filter((u) => u.role === "AGENT"), [users]);

  const ALLOWED_DIRECTORY_ROLES = useMemo(() => ["MERCHANT", "QR_PROVIDER", "AGENT", "BROKER", "OTHER"], []);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => ALLOWED_DIRECTORY_ROLES.includes(u.role))
      .filter((u) => {
        if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.toLowerCase().includes(q) ||
            String(u.id).includes(q)
          );
        }
        return true;
      });
  }, [users, roleFilter, searchTerm, ALLOWED_DIRECTORY_ROLES]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return { label: "Super Admin", color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "MERCHANT":
        return { label: "Merchant", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "QR_PROVIDER":
        return { label: "QR Provider", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "OPERATOR":
        return { label: "Operator", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "AGENT":
        return { label: "Agent", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "BROKER":
        return { label: "Broker", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "OTHER":
        return { label: "Other", color: "bg-teal-50 text-teal-700 border-teal-200" };
      default:
        return { label: role, color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  const getUserProfileUrl = (u: any) => {
    switch (u.role) {
      case "MERCHANT":
        return `/admin/merchants/${u.id}?tab=info`;
      case "QR_PROVIDER":
        return `/admin/qr-providers/${u.id}?tab=info`;
      case "BROKER":
        return `/admin/brokers/${u.id}`;
      case "AGENT":
        return `/admin/agents/${u.id}`;
      case "OPERATOR":
        return `/admin/operators/${u.id}`;
      default:
        return null;
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditPhone(user.phone || "");
    setEditPassword("");
    setEditError("");
    setShowEditConfirm(false);

    // Populate merchant fees & broker
    setEditPayinMerchantFee(String(user.payinMerchantFee ?? 0));
    setEditPayoutMerchantFee(String(user.payoutMerchantFee ?? 0));
    setEditBrokerId(user.brokerId ? String(user.brokerId) : "");
    setEditPayinBrokerFee(String(user.payinBrokerFee ?? 0));
    setEditPayoutBrokerFee(String(user.payoutBrokerFee ?? 0));

    // Populate QR provider fees & agent
    setEditPayinQrProviderFee(String(user.payinQrProviderFee ?? (user.qrProviderFee ?? 0)));
    setEditPayoutQrProviderFee(String(user.payoutQrProviderFee ?? 0));
    setEditAgentId(user.agentId ? String(user.agentId) : "");
    setEditPayinAgentFee(String(user.payinAgentFee ?? 0));
    setEditPayoutAgentFee(String(user.payoutAgentFee ?? 0));

    // Populate broker direct fees
    setEditDirectBrokerPayinFee(String(user.payinBrokerFee ?? (user.commissionPercent ?? 0)));
    setEditDirectBrokerPayoutFee(String(user.payoutBrokerFee ?? 0));

    // Populate agent direct fees
    setEditDirectAgentPayinFee(String(user.payinAgentFee ?? (user.commissionPercent ?? 0)));
    setEditDirectAgentPayoutFee(String(user.payoutAgentFee ?? 0));
  };

  // Close Edit Modal
  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditName("");
    setEditPhone("");
    setEditPassword("");
    setEditError("");
    setShowEditConfirm(false);
    setUpdating(false);
  };

  // Validate before showing Edit Confirmation
  const handleInitiateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    const nameCheck = validateUsernameOrName(editName, "Full Name / Username");
    if (!nameCheck.valid) {
      setEditError(nameCheck.error || "Please enter a valid name or username.");
      return;
    }

    if (editPhone.trim() && !isValidPhone(editPhone.trim())) {
      setEditError("Please enter a valid phone number (Indian 10-digit mobile or International format with country code e.g. +1...).");
      return;
    }

    if (editPassword.trim() && editPassword.trim().length < 6) {
      setEditError("Password must be at least 6 characters long.");
      return;
    }

    // Validate fee percentages (0 to 100)
    const validateFee = (val: string, label: string) => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 100) {
        return `${label} must be a valid number between 0% and 100%.`;
      }
      return null;
    };

    if (editingUser?.role === "MERCHANT") {
      const err1 = validateFee(editPayinMerchantFee, "Merchant Payin Fee");
      if (err1) { setEditError(err1); return; }
      const err2 = validateFee(editPayoutMerchantFee, "Merchant Payout Fee");
      if (err2) { setEditError(err2); return; }
      if (editBrokerId) {
        const err3 = validateFee(editPayinBrokerFee, "Broker Payin Fee");
        if (err3) { setEditError(err3); return; }
        const err4 = validateFee(editPayoutBrokerFee, "Broker Payout Fee");
        if (err4) { setEditError(err4); return; }
      }
    } else if (editingUser?.role === "BROKER") {
      const err1 = validateFee(editDirectBrokerPayinFee, "Broker Payin Fee");
      if (err1) { setEditError(err1); return; }
      const err2 = validateFee(editDirectBrokerPayoutFee, "Broker Payout Fee");
      if (err2) { setEditError(err2); return; }
    } else if (editingUser?.role === "QR_PROVIDER") {
      const err1 = validateFee(editPayinQrProviderFee, "Provider Payin Fee");
      if (err1) { setEditError(err1); return; }
      const err2 = validateFee(editPayoutQrProviderFee, "Provider Payout Fee");
      if (err2) { setEditError(err2); return; }
      if (editAgentId) {
        const err3 = validateFee(editPayinAgentFee, "Agent Payin Fee");
        if (err3) { setEditError(err3); return; }
        const err4 = validateFee(editPayoutAgentFee, "Agent Payout Fee");
        if (err4) { setEditError(err4); return; }
      }
    } else if (editingUser?.role === "AGENT") {
      const err1 = validateFee(editDirectAgentPayinFee, "Agent Payin Fee");
      if (err1) { setEditError(err1); return; }
      const err2 = validateFee(editDirectAgentPayoutFee, "Agent Payout Fee");
      if (err2) { setEditError(err2); return; }
    }

    // Pass validation, open confirmation prompt
    setShowEditConfirm(true);
  };

  // Execute Final User Update
  const handleConfirmUpdate = async () => {
    if (!editingUser) return;
    setUpdating(true);
    setEditError("");

    try {
      const payload: Record<string, any> = {
        name: editName.trim(),
        phone: editPhone.trim() ? editPhone.trim() : null,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      if (editingUser.role === "MERCHANT") {
        payload.payinMerchantFee = parseFloat(editPayinMerchantFee) || 0;
        payload.payoutMerchantFee = parseFloat(editPayoutMerchantFee) || 0;
        payload.brokerId = editBrokerId ? parseInt(editBrokerId, 10) : null;
        payload.payinBrokerFee = editBrokerId ? (parseFloat(editPayinBrokerFee) || 0) : 0;
        payload.payoutBrokerFee = editBrokerId ? (parseFloat(editPayoutBrokerFee) || 0) : 0;
      } else if (editingUser.role === "BROKER") {
        payload.payinBrokerFee = parseFloat(editDirectBrokerPayinFee) || 0;
        payload.payoutBrokerFee = parseFloat(editDirectBrokerPayoutFee) || 0;
        payload.commissionPercent = parseFloat(editDirectBrokerPayinFee) || 0;
      } else if (editingUser.role === "QR_PROVIDER") {
        payload.payinQrProviderFee = parseFloat(editPayinQrProviderFee) || 0;
        payload.qrProviderFee = parseFloat(editPayinQrProviderFee) || 0;
        payload.payoutQrProviderFee = parseFloat(editPayoutQrProviderFee) || 0;
        payload.agentId = editAgentId ? parseInt(editAgentId, 10) : null;
        payload.payinAgentFee = editAgentId ? (parseFloat(editPayinAgentFee) || 0) : 0;
        payload.payoutAgentFee = editAgentId ? (parseFloat(editPayoutAgentFee) || 0) : 0;
      } else if (editingUser.role === "AGENT") {
        payload.payinAgentFee = parseFloat(editDirectAgentPayinFee) || 0;
        payload.payoutAgentFee = parseFloat(editDirectAgentPayoutFee) || 0;
        payload.commissionPercent = parseFloat(editDirectAgentPayinFee) || 0;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user.");
      }

      showToast(`User "${editName.trim()}" updated successfully.`);
      handleCloseEdit();
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user.");
      setShowEditConfirm(false);
    } finally {
      setUpdating(false);
    }
  };

  // Execute Final User Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user.");
      }

      showToast(`User "${deletingUser.name}" was successfully deleted.`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Users"
      subtitle="View, search, and manage all provisioned accounts across all roles."
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
            href="/admin/users/create"
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
            {[
              { id: "ALL", label: "All Roles" },
              { id: "MERCHANT", label: "Merchant" },
              { id: "QR_PROVIDER", label: "QR Provider" },
              { id: "AGENT", label: "Agent" },
              { id: "BROKER", label: "Broker" },
              { id: "OTHER", label: "Other" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setRoleFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  roleFilter === id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {label}
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
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Loading user directory...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role);
                    const profileUrl = getUserProfileUrl(u);
                    const displayName = u.name || (u.email ? u.email.replace("@goapay.internal", "") : `user_${u.id}`);

                    return (
                      <tr
                        key={u.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
                          if (profileUrl) router.push(profileUrl);
                        }}
                        className={`hover:bg-slate-50/80 transition ${profileUrl ? "cursor-pointer" : ""}`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono text-xs">
                          {profileUrl ? (
                            <Link
                              href={profileUrl}
                              className="inline-flex items-center gap-1.5 text-base-900 hover:text-primary transition group font-bold"
                              title={`Open ${badge.label} Profile`}
                            >
                              <span>{displayName}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition shrink-0 opacity-75 group-hover:opacity-100" />
                            </Link>
                          ) : (
                            <span>{displayName}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-xs font-medium">
                          {u.phone ? u.phone : <span className="text-slate-400 italic font-sans text-xs">None</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {profileUrl && (
                              <Link
                                href={profileUrl}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                                title={`View ${badge.label} Profile`}
                              >
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                                <span>Profile</span>
                              </Link>
                            )}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary-50 border border-primary/20 transition cursor-pointer"
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== EDIT USER MODAL ==================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-base-900">Edit User Details</h3>
                  <p className="text-[11px] text-slate-500">
                    Role: <span className="font-semibold text-slate-700">{editingUser.role}</span>
                  </p>
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

            {/* Modal Body */}
            <form onSubmit={handleInitiateUpdate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Username / Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. rajesh_kumar or Rajesh Kumar"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter name or username. Do not enter an email address.
                </p>
              </div>

              {/* Contact Phone Input */}
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
                    placeholder="e.g. 9876543210 or +1 202 555 0199"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports Indian 10-digit mobile or International formats with country code.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password or leave blank to keep unchanged"
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave empty if you do not wish to reset the user's password.
                </p>
              </div>

              {/* ================= Role Specific Fee Configurations ================= */}
              {editingUser.role === "MERCHANT" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span>Merchant Fee & Broker Configuration</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Merchant Payin Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editPayinMerchantFee}
                        onChange={(e) => setEditPayinMerchantFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Merchant Payout Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editPayoutMerchantFee}
                        onChange={(e) => setEditPayoutMerchantFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Broker
                    </label>
                    <select
                      value={editBrokerId}
                      onChange={(e) => setEditBrokerId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">None (Direct Merchant)</option>
                      {availableBrokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.phone || b.email?.replace("@goapay.internal", "") || `broker_${b.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {editBrokerId && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Broker Payin Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editPayinBrokerFee}
                          onChange={(e) => setEditPayinBrokerFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Broker Payout Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editPayoutBrokerFee}
                          onChange={(e) => setEditPayoutBrokerFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingUser.role === "BROKER" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span>Broker Fee Configuration</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Broker Payin Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editDirectBrokerPayinFee}
                        onChange={(e) => setEditDirectBrokerPayinFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Broker Payout Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editDirectBrokerPayoutFee}
                        onChange={(e) => setEditDirectBrokerPayoutFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingUser.role === "QR_PROVIDER" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span>QR Provider Fee & Agent Configuration</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Provider Payin Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editPayinQrProviderFee}
                        onChange={(e) => setEditPayinQrProviderFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Provider Payout Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editPayoutQrProviderFee}
                        onChange={(e) => setEditPayoutQrProviderFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Agent
                    </label>
                    <select
                      value={editAgentId}
                      onChange={(e) => setEditAgentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">None (Independent Provider)</option>
                      {availableAgents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.phone || a.email?.replace("@goapay.internal", "") || `agent_${a.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {editAgentId && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Agent Payin Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editPayinAgentFee}
                          onChange={(e) => setEditPayinAgentFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Agent Payout Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editPayoutAgentFee}
                          onChange={(e) => setEditPayoutAgentFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingUser.role === "AGENT" && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span>Agent Fee Configuration</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Agent Payin Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editDirectAgentPayinFee}
                        onChange={(e) => setEditDirectAgentPayinFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Agent Payout Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editDirectAgentPayoutFee}
                        onChange={(e) => setEditDirectAgentPayoutFee(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={updating}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT CONFIRMATION DIALOG ==================== */}
      {showEditConfirm && editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-base-900">Confirm User Details Update</h4>
                <p className="text-xs text-slate-600">
                  Are you sure you want to apply these changes for user <span className="font-bold text-base-900">"{editName}"</span>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Username / Name:</span>
                <span className="font-semibold text-slate-800">{editName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Phone:</span>
                <span className="font-semibold text-slate-800 font-mono">{editPhone || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="font-semibold text-slate-800">
                  {editPassword ? "Will be updated" : "Unchanged"}
                </span>
              </div>

              {editingUser.role === "MERCHANT" && (
                <>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                    <span className="text-slate-500">Merchant Fees (Payin / Payout):</span>
                    <span className="font-bold text-primary font-mono">{editPayinMerchantFee}% / {editPayoutMerchantFee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Broker:</span>
                    <span className="font-semibold text-slate-800">
                      {editBrokerId
                        ? availableBrokers.find((b) => String(b.id) === String(editBrokerId))?.name || `Broker #${editBrokerId}`
                        : "None"}
                    </span>
                  </div>
                  {editBrokerId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Broker Fees (Payin / Payout):</span>
                      <span className="font-semibold text-slate-800 font-mono">{editPayinBrokerFee}% / {editPayoutBrokerFee}%</span>
                    </div>
                  )}
                </>
              )}

              {editingUser.role === "BROKER" && (
                <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                  <span className="text-slate-500">Broker Fees (Payin / Payout):</span>
                  <span className="font-bold text-primary font-mono">{editDirectBrokerPayinFee}% / {editDirectBrokerPayoutFee}%</span>
                </div>
              )}

              {editingUser.role === "QR_PROVIDER" && (
                <>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                    <span className="text-slate-500">Provider Fees (Payin / Payout):</span>
                    <span className="font-bold text-primary font-mono">{editPayinQrProviderFee}% / {editPayoutQrProviderFee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Agent:</span>
                    <span className="font-semibold text-slate-800">
                      {editAgentId
                        ? availableAgents.find((a) => String(a.id) === String(editAgentId))?.name || `Agent #${editAgentId}`
                        : "None"}
                    </span>
                  </div>
                  {editAgentId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agent Fees (Payin / Payout):</span>
                      <span className="font-semibold text-slate-800 font-mono">{editPayinAgentFee}% / {editPayoutAgentFee}%</span>
                    </div>
                  )}
                </>
              )}

              {editingUser.role === "AGENT" && (
                <div className="pt-2 border-t border-slate-200/80 flex justify-between">
                  <span className="text-slate-500">Agent Fees (Payin / Payout):</span>
                  <span className="font-bold text-primary font-mono">{editDirectAgentPayinFee}% / {editDirectAgentPayoutFee}%</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditConfirm(false)}
                disabled={updating}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, Confirm Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-base-900">Confirm Delete User</h4>
                <p className="text-xs text-slate-600">
                  Are you sure you want to permanently delete user <span className="font-bold text-base-900">"{deletingUser.name}"</span> ({deletingUser.role})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <p className="font-bold">Warning: This action cannot be undone.</p>
              <p className="mt-0.5 text-rose-700">
                The account will be permanently removed and access will be immediately revoked.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
