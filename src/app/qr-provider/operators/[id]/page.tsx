"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  User,
  Users,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Upload,
  ShoppingBag,
  ExternalLink,
  Lock,
  Sparkles,
  X,
  Check,
  Copy,
  Power,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  validateName,
  isValidUpiId,
} from "@/lib/validation";

export default function OperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = params.id as string;

  const [operator, setOperator] = useState<any>(null);
  const [availableProviderQrs, setAvailableProviderQrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit Operator State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPortalAccess, setEditPortalAccess] = useState(true);
  const [editTransactionAllowed, setEditTransactionAllowed] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password State
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState("");

  // Manage Assigned QRs Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQrIds, setSelectedQrIds] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // Create New QR Code For Operator State
  const [showCreateQrModal, setShowCreateQrModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newQrImageUrl, setNewQrImageUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [qrCreateError, setQrCreateError] = useState("");
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Status toggle loading & modal
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [togglingQrId, setTogglingQrId] = useState<string | null>(null);

  const fetchOperator = async () => {
    try {
      setLoading(true);
      setError("");
      const [opRes, qrsRes] = await Promise.all([
        fetch(`/api/qr-provider/operators/${operatorId}`),
        fetch("/api/qr-provider/qr-codes"),
      ]);

      const opData = await opRes.json();
      const qrsData = await qrsRes.json();

      if (!opRes.ok) throw new Error(opData.error || "Failed to load operator details");

      const op = opData.operator;
      setOperator(op);
      setEditName(op.name || "");
      setEditPhone(op.phone || "");
      setEditStatus(op.status || "ACTIVE");
      setEditPortalAccess(op.portalAccess !== false);
      setEditTransactionAllowed(op.transactionAllowed !== false);

      if (qrsData.success) {
        setAvailableProviderQrs(qrsData.qrCodes || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load operator");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operatorId) fetchOperator();
  }, [operatorId]);

  // Toggle Operator Status (Active / Inactive)
  const handleToggleOperatorStatus = () => {
    if (!operator) return;
    setShowStatusConfirmModal(true);
  };

  const handleConfirmStatusChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!operator) return;
    const nextStatus = operator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setTogglingStatus(true);
      setError("");
      const res = await fetch(`/api/qr-provider/operators/${operatorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setOperator((prev: any) => ({ ...prev, status: nextStatus }));
      setEditStatus(nextStatus);
      setShowStatusConfirmModal(false);
      setSuccess(`Operator status set to ${nextStatus}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  // Toggle individual QR code active status
  const handleToggleQrActive = async (qrId: string, currentActive: boolean) => {
    try {
      setTogglingQrId(qrId);
      const res = await fetch(`/api/qr-provider/qr-codes/${qrId}/toggle`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle QR code");

      setOperator((prev: any) => ({
        ...prev,
        assignedQRCodes: prev.assignedQRCodes.map((q: any) =>
          q.id === qrId ? { ...q, isActive: !currentActive, status: !currentActive ? "ACTIVE" : "INACTIVE" } : q
        ),
      }));
      setAvailableProviderQrs((prev) =>
        prev.map((q) => (q.id === qrId ? { ...q, isActive: !currentActive } : q))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingQrId(null);
    }
  };

  // Save Operator Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameCheck = validateName(editName, "Operator Name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Invalid name");
      return;
    }
    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : "";
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");
      const res = await fetch(`/api/qr-provider/operators/${operatorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: cleanPhone || null,
          status: editStatus,
          portalAccess: editPortalAccess,
          transactionAllowed: editTransactionAllowed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update operator");

      setOperator((prev: any) => ({
        ...prev,
        name: editName.trim(),
        phone: editPhone.trim() || null,
        status: editStatus,
        portalAccess: editPortalAccess,
        transactionAllowed: editTransactionAllowed,
      }));
      setIsEditing(false);
      setSuccess("Operator profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update operator");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Assign QRs modal
  const handleOpenAssignModal = () => {
    if (!operator) return;
    const currentIds = (operator.assignedQRCodes || []).map((q: any) => q.id);
    setSelectedQrIds(currentIds);
    setShowAssignModal(true);
  };

  // Save Assign QRs
  const handleSaveAssignQrs = async () => {
    try {
      setSavingAssign(true);
      setError("");
      const res = await fetch(`/api/qr-provider/operators/${operatorId}/assign-qrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeIds: selectedQrIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign QR codes");

      setShowAssignModal(false);
      setSuccess("Assigned QR codes updated successfully!");
      fetchOperator();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update assigned QR codes");
    } finally {
      setSavingAssign(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }

    try {
      setResettingPassword(true);
      setResetError("");
      const res = await fetch(`/api/qr-provider/operators/${operatorId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setShowResetModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Operator password reset successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  // Create QR Code directly for this Operator
  const handleCreateQrForOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = newUpiId.trim();
    if (!cleanUpi) {
      setQrCreateError("UPI ID (VPA) is required");
      return;
    }
    if (!isValidUpiId(cleanUpi)) {
      setQrCreateError("Please enter a valid UPI ID (e.g. user@bank)");
      return;
    }

    try {
      setCreatingQr(true);
      setQrCreateError("");
      const res = await fetch("/api/qr-provider/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: cleanUpi,
          imageUrl:
            newQrImageUrl.trim() ||
            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(
              cleanUpi
            )}`,
          accountHolderName: newAccountHolder.trim() || undefined,
          bankName: newBankName.trim() || undefined,
          isActive: true,
          operatorId: operator.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create QR code");

      setShowCreateQrModal(false);
      setNewUpiId("");
      setNewAccountHolder("");
      setNewBankName("");
      setNewQrImageUrl("");
      setSuccess("New QR code created and assigned to operator successfully!");
      fetchOperator();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setQrCreateError(err.message || "Failed to create QR code");
    } finally {
      setCreatingQr(false);
    }
  };

  const handleUploadQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingQr(true);
      setQrCreateError("");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Image upload failed");
      setNewQrImageUrl(data.url);
    } catch (err: any) {
      setQrCreateError(err.message || "Failed to upload QR image");
    } finally {
      setUploadingQr(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="qr-provider" title="Operator Profile" subtitle="Loading operator info...">
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      </PortalLayout>
    );
  }

  if (error && !operator) {
    return (
      <PortalLayout portal="qr-provider" title="Operator Profile" subtitle="Error">
        <div className="card-theme p-8 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-base-900">Operator Not Found</h2>
          <p className="text-xs text-gray-600">{error}</p>
          <Link href="/qr-provider/operators" className="btn-primary py-2 px-4 text-xs font-bold inline-block">
            Back to Operators
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const assignedQRs = operator?.assignedQRCodes || [];
  const isActive = operator?.status === "ACTIVE";

  return (
    <PortalLayout
      portal="qr-provider"
      title={operator?.name || "Operator Details"}
      subtitle={`Dedicated Sub-Operator View • ${operator?.email}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Enable / Disable Button */}
          <button
            type="button"
            onClick={handleToggleOperatorStatus}
            disabled={togglingStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
              isActive
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
            }`}
          >
            {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{togglingStatus ? "Updating..." : isActive ? "Disable Operator" : "Enable Operator"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowResetModal(true);
              setResetError("");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="px-3 py-1.5 border border-base-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>

          <Link
            href="/qr-provider/operators"
            className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Operators</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Feedback Messages */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 font-bold">✕</button>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-800 font-bold">✕</button>
          </div>
        )}

        {/* Hero Card */}
        <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-xl shrink-0 border border-purple-200 shadow-xs">
                {operator.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h1 className="text-lg sm:text-xl font-bold text-base-900 truncate">{operator.name}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-red-50 text-red-800 border-red-300"
                    }`}
                  >
                    {operator.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono shrink-0">
                    ID: {operator.id}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-base-700 mt-1.5 flex-wrap gap-y-1 min-w-0">
                  <span className="flex items-center space-x-1 min-w-0 max-w-full">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate max-w-[240px] sm:max-w-md font-mono" title={operator.email}>{operator.email}</span>
                  </span>
                  <span className="flex items-center space-x-1 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className={operator.phone ? "font-mono font-semibold" : "text-gray-400 italic"}>
                      {operator.phone || "No Mobile Added"}
                    </span>
                  </span>
                  <span className="flex items-center space-x-1 text-gray-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Registered {new Date(operator.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full xl:w-auto justify-start xl:justify-end">
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-primary" />
                <span>{isEditing ? "Close Edit" : "Edit Profile"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Assigned Collection QRs</span>
              <QrCode className="w-4 h-4 text-primary shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-base-900">
              {assignedQRs.length}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Active payment collection points</span>
          </div>

          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Orders Handled</span>
              <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-base-900">
              {operator.stats?.totalOrders || 0}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Total sessions routed to operator</span>
          </div>

          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Completed & Settled</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-700">
              {operator.stats?.completedOrders || 0}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Successfully fulfilled transactions</span>
          </div>
        </div>

        {/* Inline Edit Form (When Toggled) */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="card-theme p-5 sm:p-6 shadow-sm border border-primary animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0f2fe]">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-base-900">Edit Operator Details & Permissions</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Contact Phone (Indian or International)</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +14155552671"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl bg-white font-medium"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">10-digit Indian mobile or International format with country code (e.g. +1...)</span>
              </div>

              <div className="sm:col-span-2 min-w-0">
                <label className="block text-xs font-bold text-base-900 mb-1">Email Address (Login ID)</label>
                <div className="relative min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5 shrink-0" />
                  <input
                    type="email"
                    disabled
                    value={operator.email}
                    title={operator.email}
                    className="w-full min-w-0 pl-10 pr-3.5 py-2 text-xs border border-base-200 rounded-xl bg-gray-50 text-slate-500 font-mono cursor-not-allowed select-all truncate"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Login ID cannot be modified once registered.</span>
              </div>
            </div>

            {/* Account Controls & Permissions Switch Buttons */}
            <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
              <span className="text-xs font-bold text-base-900 uppercase tracking-wider block pb-2 border-b border-[#e4d8c2]">
                Account Controls & Permissions
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Account Status Switch */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Account Status</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editStatus === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          editStatus === "ACTIVE" ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {editStatus === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editStatus === "ACTIVE"}
                    onClick={() => setEditStatus(editStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editStatus === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editStatus === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Portal Access Switch */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Portal Access</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editPortalAccess ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          editPortalAccess ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editPortalAccess ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editPortalAccess}
                    onClick={() => setEditPortalAccess(!editPortalAccess)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editPortalAccess ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editPortalAccess ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Transaction / Order Fulfillment Switch */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Orders / Txns</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editTransactionAllowed ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          editTransactionAllowed ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editTransactionAllowed ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editTransactionAllowed}
                    onClick={() => setEditTransactionAllowed(!editTransactionAllowed)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editTransactionAllowed ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editTransactionAllowed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#e0f2fe]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="btn-primary py-1.5 px-4 text-xs font-bold"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Section: Assigned Collection QR Codes */}
        <div className="card-theme overflow-hidden shadow-sm border border-base-200">
          <div className="p-4 sm:p-5 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-base-100/30">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-primary shrink-0" />
                <h3 className="font-bold text-base text-base-900">Assigned Collection QR Codes</h3>
              </div>
              <p className="text-xs text-base-700 mt-0.5">
                Collection points managed by this operator. Deposit orders routing to these QRs will be verified here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end">
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Manage Assigned QRs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateQrModal(true);
                  setQrCreateError("");
                }}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center space-x-1.5 shadow-xs whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create QR Inside Operator</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                <tr>
                  <th className="p-3.5">QR Preview</th>
                  <th className="p-3.5">UPI ID (VPA)</th>
                  <th className="p-3.5">Account Holder</th>
                  <th className="p-3.5">Bank Name</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Enable / Disable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0f2fe]">
                {assignedQRs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <QrCode className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="font-semibold text-gray-600">No QR Codes Assigned</p>
                        <p className="text-[11px] text-gray-400">
                          Click "Manage Assigned QRs" to assign existing ones, or click "Create QR Inside Operator" to add a new one directly.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assignedQRs.map((qr: any) => (
                    <tr key={qr.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3.5">
                        {qr.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg border border-base-200 bg-white p-0.5 overflow-hidden">
                            <img src={qr.imageUrl} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <QrCode className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-base-900">
                        {qr.upiId}
                      </td>
                      <td className="p-3.5 font-medium text-gray-800">
                        {qr.accountHolderName || "--"}
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {qr.bankName || "--"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            qr.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-slate-500"
                          }`}
                        >
                          {qr.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleQrActive(qr.id, qr.isActive)}
                          disabled={togglingQrId === qr.id}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                            qr.isActive
                              ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                          }`}
                        >
                          {togglingQrId === qr.id
                            ? "Updating..."
                            : qr.isActive
                            ? "Disable QR"
                            : "Enable QR"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Account Rules & Isolation Notice */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Operator Ledger & Security Rules</span>
            <p className="text-[11px] text-purple-800">
              This operator only has visibility over orders assigned to their designated collection QR codes above.
              Financial balances, payout disbursements, and ledger entries settle strictly against your parent QR Provider wallet.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL 1: RESET PASSWORD */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-base-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-base-900">
                <KeyRound className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-sm">Reset Password</h3>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="btn-primary py-1.5 px-4 text-xs font-bold"
                >
                  {resettingPassword ? "Saving..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE ASSIGNED QRS */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-base-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-base-900">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm">Assign / Reassign QR Codes</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select which collection QR codes under your account belong to {operator.name}:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {availableProviderQrs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No collection QR codes available.</div>
              ) : (
                availableProviderQrs.map((qr) => {
                  const isChecked = selectedQrIds.includes(qr.id);
                  const isOtherAssigned = qr.operatorId && qr.operatorId !== operator.id;

                  return (
                    <label
                      key={qr.id}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? "bg-blue-50/60 border-blue-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setSelectedQrIds((prev) =>
                              prev.includes(qr.id) ? prev.filter((id) => id !== qr.id) : [...prev, qr.id]
                            )
                          }
                          className="w-4 h-4 text-primary rounded border-gray-300"
                        />
                        <div>
                          <span className="font-mono text-xs font-bold text-base-900 block">{qr.upiId}</span>
                          <span className="text-[11px] text-slate-500">
                            {qr.bankName || "Bank"} {qr.accountHolderName ? `• ${qr.accountHolderName}` : ""}
                          </span>
                        </div>
                      </div>

                      {isOtherAssigned && qr.operator && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                          Assigned to {qr.operator.name}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignQrs}
                disabled={savingAssign}
                className="btn-primary py-1.5 px-4 text-xs font-bold"
              >
                {savingAssign ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE QR CODE DIRECTLY FOR OPERATOR */}
      {showCreateQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-base-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-base-900">
                <PlusCircle className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Create New QR For {operator.name}</h3>
              </div>
              <button onClick={() => setShowCreateQrModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {qrCreateError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {qrCreateError}
              </div>
            )}

            <form onSubmit={handleCreateQrForOperator} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">UPI ID (VPA) *</label>
                <input
                  type="text"
                  required
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  placeholder="e.g. operator.upi@icici"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Holder Name (Optional)</label>
                <input
                  type="text"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value)}
                  placeholder="e.g. Operator Collection Name"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name (Optional)</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Upload QR Image (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQrImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center space-x-1"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{uploadingQr ? "Uploading..." : "Upload Image"}</span>
                  </button>
                  {newQrImageUrl && (
                    <span className="text-[11px] text-emerald-700 font-semibold truncate">
                      ✔ Attached
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateQrModal(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingQr}
                  className="btn-primary py-1.5 px-4 text-xs font-bold"
                >
                  {creatingQr ? "Creating..." : "Create & Assign QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION POPUP FORM */}
      {showStatusConfirmModal && operator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    operator.status === "ACTIVE"
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Confirm Operator Status</h3>
                  <p className="text-xs text-base-700 mt-0.5">Toggle active or inactive state</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusConfirmModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-base-900">
                  Are you sure you want to active and deactive operator?
                </p>
                <p className="text-xs text-base-700 mt-1">
                  This action will switch the operator status from{" "}
                  <strong className="text-base-900">{operator.status}</strong> to{" "}
                  <strong className={operator.status === "ACTIVE" ? "text-red-600" : "text-emerald-700"}>
                    {operator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                  </strong>.
                </p>
              </div>

              <div className="p-3.5 bg-[#ffffff] border border-base-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-base-700 font-medium">Operator Name:</span>
                  <span className="font-bold text-base-900">{operator.name}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-base-700 font-medium shrink-0">Login Email:</span>
                  <span className="font-mono text-gray-600 truncate max-w-[220px]" title={operator.email}>
                    {operator.email}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Current Status:</span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      operator.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <span>{operator.status}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: If active then Inactive, if inactive then Active, and one Cancel */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setShowStatusConfirmModal(false)}
                  disabled={togglingStatus}
                  className="px-4 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                {operator.status === "ACTIVE" ? (
                  <button
                    type="submit"
                    disabled={togglingStatus}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                  >
                    {togglingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Inactive</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={togglingStatus}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                  >
                    {togglingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Active</span>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
