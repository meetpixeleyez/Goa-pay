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
  Building2,
  Power,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  validateName,
  isValidUpiId,
} from "@/lib/validation";

export default function AdminOperatorDetailPage() {
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

  // Create New QR Code Inside Operator State
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

      const opRes = await fetch(`/api/qr-provider/operators/${operatorId}`);
      const opData = await opRes.json();

      if (!opRes.ok) throw new Error(opData.error || "Failed to load operator details");

      setOperator(opData.operator);
      setEditName(opData.operator.name);
      setEditPhone(opData.operator.phone || "");
      setEditStatus(opData.operator.status || "ACTIVE");
      setEditPortalAccess(opData.operator.portalAccess !== false);
      setEditTransactionAllowed(opData.operator.transactionAllowed !== false);
      setSelectedQrIds((opData.operator.assignedQRCodes || []).map((q: any) => q.id));

      // Fetch QR codes for this operator's provider
      if (opData.operator.qrProviderId) {
        const qrsRes = await fetch(`/api/qr-provider/qr-codes?providerId=${opData.operator.qrProviderId}`);
        const qrsData = await qrsRes.json();
        if (qrsRes.ok) {
          setAvailableProviderQrs(qrsData.qrCodes || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load operator details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operatorId) {
      fetchOperator();
    }
  }, [operatorId]);

  // Toggle Operator Status (Active / Inactive)
  const handleToggleStatus = () => {
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
      const res = await fetch(`/api/qr-provider/operators/${operator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update operator status");

      setOperator((prev: any) => ({ ...prev, status: nextStatus }));
      setEditStatus(nextStatus);
      setShowStatusConfirmModal(false);
      setSuccess(`Operator status updated to ${nextStatus}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update operator status");
    } finally {
      setTogglingStatus(false);
    }
  };

  // Toggle QR Code Active/Inactive
  const handleToggleQr = async (qrId: string, currentActive: boolean) => {
    try {
      setTogglingQrId(qrId);
      const res = await fetch(`/api/qr-provider/qr-codes/${qrId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update QR code status");

      setOperator((prev: any) => ({
        ...prev,
        assignedQRCodes: prev.assignedQRCodes.map((q: any) =>
          q.id === qrId ? { ...q, isActive: !currentActive } : q
        ),
      }));
      setSuccess(`QR code status updated.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to toggle QR code");
    } finally {
      setTogglingQrId(null);
    }
  };

  // Save Operator Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(editName)) {
      setError("Please provide a valid operator name");
      return;
    }
    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : "";
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    setSavingEdit(true);
    setError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${operator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: cleanPhone,
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
        phone: editPhone ? editPhone.trim() : "",
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

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }

    setResettingPassword(true);
    setResetError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${operator.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setSuccess(`Password for "${operator.name}" reset successfully!`);
      setShowResetModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  // Save QR Assignments
  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssign(true);
    setError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${operator.id}/assign-qrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeIds: selectedQrIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update assigned QR codes");

      setSuccess("QR code assignments updated successfully!");
      setShowAssignModal(false);
      fetchOperator();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to assign QR codes");
    } finally {
      setSavingAssign(false);
    }
  };

  // Upload QR Image
  const handleQrUpload = async (file: File) => {
    if (!file) return;
    setUploadingQr(true);
    setQrCreateError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload QR code image");

      setNewQrImageUrl(data.url);
    } catch (err: any) {
      setQrCreateError(err.message || "Failed to upload image");
    } finally {
      setUploadingQr(false);
    }
  };

  // Create QR Code Directly for this Operator
  const handleCreateQrInsideOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = newUpiId.trim();

    if (!cleanUpi) {
      setQrCreateError("Please enter a valid UPI ID (VPA)");
      return;
    }
    if (!isValidUpiId(cleanUpi)) {
      setQrCreateError("Please enter a standard UPI ID (e.g., username@bank)");
      return;
    }

    setCreatingQr(true);
    setQrCreateError("");

    try {
      const res = await fetch("/api/qr-provider/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: cleanUpi,
          accountHolderName: newAccountHolder.trim() || undefined,
          bankName: newBankName.trim() || undefined,
          imageUrl: newQrImageUrl.trim() || undefined,
          isActive: true,
          operatorId: operator.id,
          targetProviderId: operator.qrProviderId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register QR code");

      setSuccess(`New QR code (${cleanUpi}) registered and assigned to ${operator.name}!`);
      setShowCreateQrModal(false);
      setNewUpiId("");
      setNewAccountHolder("");
      setNewBankName("");
      setNewQrImageUrl("");
      fetchOperator();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setQrCreateError(err.message || "Failed to create QR code");
    } finally {
      setCreatingQr(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="admin" title="Operator Profile" subtitle="Loading operator details...">
        <div className="card-theme p-12 text-center text-xs text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          Loading operator profile, assigned QR codes, and statistics...
        </div>
      </PortalLayout>
    );
  }

  if (error && !operator) {
    return (
      <PortalLayout portal="admin" title="Operator Profile" subtitle="Operator Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">Operator Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested operator could not be found."}</p>
          <Link href="/admin/operators" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Operators</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const assignedQrs = operator.assignedQRCodes || [];
  const isActive = operator.status === "ACTIVE";

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center space-x-2">
          <span>{operator.name}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
            Sub-Operator
          </span>
        </div>
      }
      subtitle={`Parent Provider: ${operator.qrProvider?.name || "Unassigned"} • Member since ${new Date(operator.createdAt).toLocaleDateString()}`}
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchOperator}
            className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
            title="Refresh operator details"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/operators"
            className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Operators</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Card: Quick Actions & Status */}
        <div className="card-theme p-6 shadow-sm border border-base-200">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                {operator.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-lg font-bold text-base-900 truncate">{operator.name}</h2>
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition shrink-0 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-red-50 text-red-800 border-red-300 hover:bg-red-100"
                    }`}
                    title="Click to toggle operator status (Active / Inactive)"
                  >
                    {isActive ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                    <span>{operator.status}</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 min-w-0">
                  <span className="flex items-center space-x-1 min-w-0 max-w-full">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate max-w-[240px] sm:max-w-md font-mono" title={operator.email}>{operator.email}</span>
                  </span>
                  {operator.phone && (
                    <span className="flex items-center space-x-1 shrink-0">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{operator.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end shrink-0">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 bg-white border border-base-200 text-base-900 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0 transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-primary" />
                <span>{isEditing ? "Cancel Edit" : "Edit Details"}</span>
              </button>

              <button
                onClick={() => setShowResetModal(true)}
                className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap shrink-0 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-sky-700" />
                <span>Reset Password</span>
              </button>

              <button
                onClick={() => setShowCreateQrModal(true)}
                className="btn-primary px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create QR Inside Operator</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parent QR Provider Information Card */}
        {operator.qrProvider && (
          <div className="card-theme p-4 shadow-sm border border-base-200 bg-[#fdfbf7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-base-700 block truncate">
                  Parent QR Provider (Direct Financial Account)
                </span>
                <Link
                  href={`/admin/qr-providers/${operator.qrProvider.id}`}
                  className="font-bold text-sm text-base-900 hover:text-primary hover:underline flex items-center space-x-1.5 truncate"
                >
                  <span className="truncate">{operator.qrProvider.name}</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                </Link>
                <div className="text-[11px] text-slate-500 font-mono truncate max-w-full" title={operator.qrProvider.email}>
                  {operator.qrProvider.email}
                </div>
              </div>
            </div>

            <Link
              href={`/admin/qr-providers/${operator.qrProvider.id}`}
              className="px-3 py-1.5 bg-white border border-base-200 hover:bg-base-100/40 text-xs font-semibold rounded-lg text-base-900 flex items-center space-x-1.5 transition shrink-0 whitespace-nowrap shadow-2xs self-start sm:self-auto"
            >
              <span>View Parent Provider</span>
              <ExternalLink className="w-3 h-3 text-primary" />
            </Link>
          </div>
        )}

        {/* Edit Operator Form (Collapsible) */}
        {isEditing && (
          <div className="card-theme p-6 shadow-sm border border-base-200 animate-in fade-in duration-200">
            <h3 className="font-bold text-sm text-base-900 mb-4 pb-2 border-b border-base-200">
              Edit Operator Information & Access Controls
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">Operator Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">Contact Phone (Indian or International)</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +14155552671"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">10-digit Indian mobile or International format with country code (e.g. +1...)</span>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <label className="block text-xs font-bold text-base-900 mb-1">Email Address (Login ID)</label>
                  <div className="relative min-w-0">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5 shrink-0" />
                    <input
                      type="email"
                      disabled
                      value={operator.email}
                      title={operator.email}
                      className="w-full min-w-0 pl-10 pr-3.5 py-2 text-xs border border-base-200 rounded-lg bg-gray-50 text-slate-500 font-mono cursor-not-allowed truncate select-all"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Login ID cannot be modified once registered.</span>
                </div>
              </div>

              {/* Permissions & Controls */}
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

                  {/* Order Fulfill / Orders & Txns Switch */}
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

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary px-5 py-1.5 text-xs font-bold shadow"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Performance & Assigned QR Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Assigned QRs</span>
            </div>
            <div className="text-2xl font-bold text-base-900">{assignedQrs.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Directly handling</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Orders Processed</span>
            </div>
            <div className="text-2xl font-bold text-base-900">
              {operator.stats?.totalOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Via assigned QR codes</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-emerald-700 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Completed Orders</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {operator.stats?.completedOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Settled & verified</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Portal Access</span>
            </div>
            <div className="text-base font-bold text-base-900 mt-1">
              {operator.portalAccess !== false ? "Permitted" : "Suspended"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Txns: {operator.transactionAllowed !== false ? "Allowed" : "Blocked"}
            </div>
          </div>
        </div>

        {/* ASSIGNED QR CODES SECTION */}
        <div className="card-theme shadow-sm border border-base-200 overflow-hidden">
          <div className="p-4 border-b border-base-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-base-100/30">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-primary shrink-0" />
                <h3 className="font-bold text-sm text-base-900">
                  Assigned QR Codes ({assignedQrs.length})
                </h3>
              </div>
              <p className="text-xs text-base-700 mt-0.5">
                Orders received on these QR codes are automatically assigned to {operator.name}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-start md:justify-end">
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 bg-white border border-base-200 text-base-900 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs whitespace-nowrap shrink-0 transition"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Manage Assignments</span>
              </button>

              <button
                onClick={() => setShowCreateQrModal(true)}
                className="btn-primary px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create QR Inside Operator</span>
              </button>
            </div>
          </div>

          {assignedQrs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-3">
              <QrCode className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-base-900 text-sm">No QR Codes Assigned</p>
              <p className="max-w-md mx-auto text-slate-500">
                This operator currently has 0 assigned QR codes and will not receive any deposit orders.
                Assign an existing QR code or register a new one directly below.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-primary text-xs py-2 px-4 shadow whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1" />
                  Assign Existing QR
                </button>
                <button
                  onClick={() => setShowCreateQrModal(true)}
                  className="px-4 py-2 bg-white border border-base-200 text-base-900 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-2xs whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  Create New QR
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {assignedQrs.map((qr: any) => (
                <div
                  key={qr.id}
                  className="bg-white rounded-xl border border-base-200 p-4 shadow-sm flex flex-col justify-between space-y-3 hover:border-primary transition"
                >
                  <div className="flex space-x-3 items-start">
                    {qr.imageUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={qr.imageUrl}
                          alt={qr.upiId}
                          className="w-16 h-16 object-contain rounded-lg border border-base-200 bg-white p-1"
                        />
                        <a
                          href={qr.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-[9px] font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-base-200 bg-base-100/30 flex items-center justify-center text-primary shrink-0">
                        <QrCode className="w-8 h-8" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center space-x-1 ${
                            qr.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              qr.isActive ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <span>{qr.isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </div>

                      <div className="font-mono text-xs font-bold text-base-900 truncate" title={qr.upiId}>
                        {qr.upiId}
                      </div>

                      <div className="text-[11px] text-base-700 truncate">
                        {qr.accountHolderName || "Holder Not Specified"}
                      </div>

                      <div className="text-[10px] text-gray-400 truncate">
                        {qr.bankName || "Bank Not Specified"}
                      </div>
                    </div>
                  </div>

                  {/* Active / Inactive Toggle Switch */}
                  <div className="pt-2.5 border-t border-[#e0f2fe] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-600">
                      QR Status:
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={qr.isActive}
                      disabled={togglingQrId === qr.id}
                      onClick={() => handleToggleQr(qr.id, qr.isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        qr.isActive ? "bg-primary" : "bg-gray-300"
                      } ${togglingQrId === qr.id ? "opacity-50" : ""}`}
                      title={`Click to ${qr.isActive ? "Deactivate" : "Activate"} this QR Code`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ${
                          qr.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: MANAGE ASSIGNED QR CODES */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-base-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Manage Assigned QRs</h3>
                  <p className="text-[11px] text-base-700">Operator: {operator.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="space-y-4">
              <p className="text-xs text-base-700">
                Select which QR codes from the parent provider's pool this operator is assigned to manage:
              </p>

              {availableProviderQrs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-base-100/20 rounded-xl border border-dashed border-base-200">
                  No QR codes found under parent provider. Register a QR code first.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableProviderQrs.map((qr) => {
                    const isChecked = selectedQrIds.includes(qr.id);
                    const isWithOther = qr.operator && qr.operator.id !== operator.id;

                    return (
                      <label
                        key={qr.id}
                        className={`flex items-start space-x-3 p-3 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-primary/10 border-primary"
                            : "bg-white border-base-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQrIds([...selectedQrIds, qr.id]);
                            } else {
                              setSelectedQrIds(selectedQrIds.filter((id) => id !== qr.id));
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary border-base-200"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-base-900">{qr.upiId}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                qr.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-slate-500"
                              }`}
                            >
                              {qr.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {qr.bankName ? `${qr.bankName} • ` : ""}
                            {qr.accountHolderName || "Holder Name"}
                          </div>
                          {isWithOther && (
                            <div className="text-[10px] text-sky-600 font-semibold mt-0.5">
                              Assigned to: {qr.operator.name} (will reassign to {operator.name})
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-base-200">
                <span className="text-xs text-base-700">
                  {selectedQrIds.length} QR code{selectedQrIds.length === 1 ? "" : "s"} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAssign}
                    className="btn-primary text-xs py-2 px-4 shadow font-bold"
                  >
                    {savingAssign ? "Saving..." : "Save Assignments"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QR CODE DIRECTLY INSIDE OPERATOR */}
      {showCreateQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-base-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Register QR Inside Operator</h3>
                  <p className="text-[11px] text-base-700">
                    Instantly registers QR under parent provider and assigns to {operator.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateQrModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {qrCreateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{qrCreateError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQrInsideOperator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">UPI ID (VPA) *</label>
                <input
                  type="text"
                  required
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  placeholder="operator.desk@icici"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value)}
                  placeholder="e.g. Ramesh Desk Collection"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. ICICI Bank / HDFC Bank"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* QR Image File Upload */}
              <div className="pt-2 border-t border-base-200/60">
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Upload QR Image (or leave empty to auto-generate dynamic QR)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="file"
                    ref={qrFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleQrUpload(file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="px-3.5 py-2 text-xs bg-white border border-base-200 hover:bg-base-100/40 text-base-900 font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{uploadingQr ? "Uploading..." : "Choose QR Image File"}</span>
                  </button>

                  {newQrImageUrl && (
                    <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <img
                        src={newQrImageUrl}
                        alt="QR Preview"
                        className="w-7 h-7 object-contain rounded border border-green-300 bg-white"
                      />
                      <span className="font-mono text-[11px] truncate max-w-xs">{newQrImageUrl}</span>
                      <button
                        type="button"
                        onClick={() => setNewQrImageUrl("")}
                        className="text-red-500 hover:text-red-700 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setShowCreateQrModal(false)}
                  className="px-4 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingQr || uploadingQr}
                  className="btn-primary text-xs py-2 px-5 shadow font-bold"
                >
                  {creatingQr ? "Registering QR..." : "Register & Assign QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-base-200">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Reset Password</h3>
                  <p className="text-[11px] text-base-700">{operator.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">New Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="btn-primary text-xs py-2 px-4 shadow bg-sky-600 hover:bg-sky-700 font-bold"
                >
                  {resettingPassword ? "Resetting..." : "Set Password"}
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
