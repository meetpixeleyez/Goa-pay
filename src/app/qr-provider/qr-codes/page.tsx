"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  Plus,
  Edit,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  Building,
  User,
  Copy,
  ShieldCheck,
  Power,
} from "lucide-react";
import { isValidUpiId } from "@/lib/validation";

import { qrProvidersApi } from "@/lib/api/qr-providers.api";

export default function QRProviderQRCodesPage() {
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add QR Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUpiId, setAddUpiId] = useState("");
  const [addAccountHolder, setAddAccountHolder] = useState("");
  const [addBankName, setAddBankName] = useState("");
  const [addQrImageUrl, setAddQrImageUrl] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);
  const [uploadingAddImage, setUploadingAddImage] = useState(false);
  const [addModalError, setAddModalError] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Edit QR Modal State
  const [editingQr, setEditingQr] = useState<any | null>(null);
  const [editUpiId, setEditUpiId] = useState("");
  const [editAccountHolder, setEditAccountHolder] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editQrImageUrl, setEditQrImageUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [editModalError, setEditModalError] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Operator assignment states
  const [operators, setOperators] = useState<any[]>([]);
  const [addOperatorId, setAddOperatorId] = useState("");
  const [editOperatorId, setEditOperatorId] = useState("");

  // Toggling state tracker
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const [res, opsRes] = await Promise.all([
        qrProvidersApi.getQRCodes(),
        qrProvidersApi.getOperators(),
      ]);

      if (res.success) {
        setQrCodes(res.qrCodes || []);
      }
      if (opsRes.success) {
        setOperators(opsRes.operators || []);
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to load collection QR codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  // Quick Toggle Handler
  const handleToggle = async (qrId: string, currentActive: boolean) => {
    try {
      setTogglingId(qrId);
      const res = await qrProvidersApi.toggleQRCode(qrId);

      setQrCodes((prev) =>
        prev.map((q) =>
          q.id === qrId ? { ...q, isActive: res.qrCode.isActive, status: res.qrCode.status } : q
        )
      );
      setSuccess(`QR Code ${res.qrCode.isActive ? "activated" : "paused"} successfully.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to toggle status");
      setTimeout(() => setError(""), 4000);
    } finally {
      setTogglingId(null);
    }
  };

  // Image Upload for Add Modal
  const handleAddImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAddModalError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAddModalError("Image file size must be under 5MB");
      return;
    }

    setAddModalError("");
    setUploadingAddImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");
      setAddQrImageUrl(data.url);
    } catch (err: any) {
      setAddModalError(err.message || "Failed to upload image");
    } finally {
      setUploadingAddImage(false);
    }
  };

  // Image Upload for Edit Modal
  const handleEditImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setEditModalError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditModalError("Image file size must be under 5MB");
      return;
    }

    setEditModalError("");
    setUploadingEditImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");
      setEditQrImageUrl(data.url);
    } catch (err: any) {
      setEditModalError(err.message || "Failed to upload image");
    } finally {
      setUploadingEditImage(false);
    }
  };

  // Submit Add QR Form
  const handleCreateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = addUpiId.trim();

    if (!cleanUpi) {
      setAddModalError("UPI ID (VPA) is required");
      return;
    }
    if (!isValidUpiId(cleanUpi)) {
      setAddModalError("Please enter a valid UPI ID (e.g. name@bank, user@okaxis)");
      return;
    }

    setSubmittingAdd(true);
    setAddModalError("");

    const finalImage =
      addQrImageUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(cleanUpi)}`;

    try {
      await qrProvidersApi.createQRCode({
        upiId: cleanUpi,
        imageUrl: finalImage,
        accountHolderName: addAccountHolder.trim() || undefined,
        bankName: addBankName.trim() || undefined,
        isActive: addIsActive,
        operatorId: addOperatorId ? addOperatorId : undefined,
      });

      setSuccess("New collection QR code created successfully!");
      setShowAddModal(false);
      setAddUpiId("");
      setAddAccountHolder("");
      setAddBankName("");
      setAddQrImageUrl("");
      setAddIsActive(true);
      setAddOperatorId("");
      fetchQRCodes();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err: any) {
      setAddModalError(err.message || "Failed to create QR code");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (qr: any) => {
    setEditingQr(qr);
    setEditUpiId(qr.upiId || "");
    setEditAccountHolder(qr.accountHolderName || "");
    setEditBankName(qr.bankName || "");
    setEditQrImageUrl(qr.imageUrl || "");
    setEditIsActive(qr.isActive !== undefined ? qr.isActive : qr.status === "ACTIVE");
    setEditOperatorId(qr.operatorId || "");
    setEditModalError("");
  };

  // Submit Edit QR Form
  const handleUpdateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;

    const cleanUpi = editUpiId.trim();
    if (!cleanUpi) {
      setEditModalError("UPI ID (VPA) cannot be empty");
      return;
    }
    if (!isValidUpiId(cleanUpi)) {
      setEditModalError("Please enter a valid UPI ID (e.g. name@bank, user@okaxis)");
      return;
    }

    setSubmittingEdit(true);
    setEditModalError("");

    const finalImage =
      editQrImageUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(cleanUpi)}`;

    try {
      await qrProvidersApi.updateQRCode(editingQr.id, {
        upiId: cleanUpi,
        imageUrl: finalImage,
        accountHolderName: editAccountHolder.trim() || undefined,
        bankName: editBankName.trim() || undefined,
        isActive: editIsActive,
        operatorId: editOperatorId || undefined,
      });

      setSuccess("QR code updated successfully!");
      setEditingQr(null);
      fetchQRCodes();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err: any) {
      setEditModalError(err.message || "Failed to update QR code");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PortalLayout
      portal="qr-provider"
      title="Collection QR Codes"
      subtitle="Create, configure, and manage your active UPI collection QR codes for automated deposit routing"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setAddModalError("");
              setShowAddModal(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add QR Code</span>
          </button>
          <button
            onClick={fetchQRCodes}
            className="btn-secondary text-xs py-2 px-3 flex items-center space-x-1 shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Guidance Banner */}
        <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] flex items-start space-x-3 text-xs text-base-700">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-base-900 block text-sm mb-0.5">
              Provider Collection QR Management
            </span>
            <p className="leading-relaxed">
              You can create new collection QR codes, update bank & account holder details, and pause or resume active status at any time. When active, incoming customer payin deposit orders are dynamically routed to your QR codes based on your available liquidity.
            </p>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="card-theme p-12 text-center text-base-700">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            <p className="text-xs">Loading collection QR codes...</p>
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="card-theme p-12 text-center space-y-4 max-w-md mx-auto border border-base-200">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-base-900">No QR Codes Added Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                You haven't added any UPI collection QR codes. Create your first QR code to start receiving payin deposit volume.
              </p>
            </div>
            <button
              onClick={() => {
                setAddModalError("");
                setShowAddModal(true);
              }}
              className="btn-primary text-xs py-2.5 px-5 inline-flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First QR Code</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrCodes.map((qr) => {
              const isActive = qr.isActive !== undefined ? qr.isActive : qr.status === "ACTIVE";
              return (
                <div
                  key={qr.id}
                  className={`card-theme p-5 flex flex-col justify-between rounded-2xl transition border-2 ${
                    isActive
                      ? "border-primary/60 shadow-sm hover:border-primary"
                      : "border-gray-200 bg-gray-50/50 opacity-80"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Status Badge & Quick Toggle */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isActive
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-200 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {isActive ? "Active (Routing ON)" : "Paused (Routing OFF)"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggle(qr.id, isActive)}
                        disabled={togglingId === qr.id}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition flex items-center space-x-1 ${
                          isActive
                            ? "border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                            : "border-green-200 text-green-800 bg-green-50 hover:bg-green-100"
                        }`}
                        title={isActive ? "Pause order routing" : "Activate order routing"}
                      >
                        {togglingId === qr.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        <span>{isActive ? "Pause" : "Enable"}</span>
                      </button>
                    </div>

                    {/* QR Image Display */}
                    <div className="p-3 bg-white border border-base-200 rounded-xl flex items-center justify-center relative group shadow-inner">
                      <img
                        src={qr.imageUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                      <a
                        href={qr.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl text-white text-xs font-bold space-x-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Large</span>
                      </a>
                    </div>

                    {/* QR Details */}
                    <div className="space-y-2 text-xs">
                      {/* UPI ID */}
                      <div className="p-2.5 bg-white border border-base-200 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          UPI ID / VPA
                        </span>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                          <code className="font-mono font-bold text-base-900 text-xs truncate">
                            {qr.upiId}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(qr.id, qr.upiId)}
                            className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                            title="Copy UPI ID"
                          >
                            {copiedId === qr.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Account & Bank Info */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">Account Name</span>
                          <span className="font-bold text-gray-800 truncate block">
                            {qr.accountHolderName || "—"}
                          </span>
                        </div>
                        <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">Bank</span>
                          <span className="font-bold text-gray-800 truncate block">
                            {qr.bankName || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Operator Badge */}
                      <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-gray-400 font-medium">Assigned Operator</span>
                        {qr.operator ? (
                          <Link
                            href={`/qr-provider/operators/${qr.operator.id}`}
                            className="font-bold text-[#0c4a6e] bg-primary/15 border border-primary/30 hover:bg-primary/25 px-2 py-0.5 rounded text-[10px] flex items-center space-x-1 transition"
                            title="View Operator Profile"
                          >
                            <User className="w-3 h-3 text-[#0c4a6e]" />
                            <span className="hover:underline">{qr.operator.name}</span>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Unassigned (Direct)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#e0f2fe] mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(qr)}
                      className="px-3 py-1.5 text-xs font-bold text-base-900 bg-white hover:bg-emerald-50 border border-base-200 hover:border-primary rounded-lg transition flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5 text-primary" />
                      <span>Edit QR Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW QR CODE                                                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-base-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#ffffff] border-b border-base-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-base-900">
                    Add Collection QR Code
                  </h3>
                  <p className="text-[11px] text-base-700">
                    Register a new UPI ID to receive incoming deposit orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateQr} className="p-5 overflow-y-auto space-y-4 flex-1">
              {addModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addModalError}</span>
                </div>
              )}

              {/* UPI ID (Required) */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  required
                  value={addUpiId}
                  onChange={(e) => setAddUpiId(e.target.value.trim())}
                  placeholder="e.g. fastpay@okaxis, provider@icici"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
                <p className="text-[10px] text-base-700 mt-1">
                  Must be a valid VPA that receives incoming UPI payments.
                </p>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Account Holder Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={addAccountHolder}
                    onChange={(e) => setAddAccountHolder(e.target.value)}
                    placeholder="e.g. FastPay Services Pvt Ltd"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Bank Name (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={addBankName}
                    onChange={(e) => setAddBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, Axis Bank, ICICI"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>
              </div>

              {/* Assign to Operator (Optional) */}
              {operators.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Assign to Operator (Optional)
                  </label>
                  <select
                    value={addOperatorId}
                    onChange={(e) => setAddOperatorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  >
                    <option value="">-- Unassigned (Direct Provider Handling) --</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Image Upload */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-base-900">
                  Custom QR Code Image (Optional)
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload your app's UPI QR screenshot, or leave blank to auto-generate from the UPI ID.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="file"
                    ref={addFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleAddImageUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    disabled={uploadingAddImage}
                    className="btn-secondary py-2 px-3 text-xs flex items-center space-x-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{uploadingAddImage ? "Uploading..." : "Upload Screenshot"}</span>
                  </button>

                  {addQrImageUrl ? (
                    <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                      <img
                        src={addQrImageUrl}
                        alt="Preview"
                        className="w-7 h-7 object-contain rounded bg-white border border-green-300"
                      />
                      <span className="text-[11px] font-medium truncate max-w-[150px]">Custom Image</span>
                      <button
                        type="button"
                        onClick={() => setAddQrImageUrl("")}
                        className="text-red-500 hover:text-red-700 p-0.5"
                        title="Remove custom image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : addUpiId.trim() ? (
                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      Auto-generating dynamic QR for {addUpiId.trim()}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Status Switch */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <div>
                  <span className="text-xs font-bold text-base-900 block">Enable Immediately</span>
                  <span className="text-[11px] text-slate-500">
                    If enabled, this QR code will be included in the routing rotation right away.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={addIsActive}
                  onClick={() => setAddIsActive(!addIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    addIsActive ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      addIsActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-base-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd || uploadingAddImage}
                  className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  {submittingAdd ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create QR Code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT QR CODE                                                    */}
      {/* ========================================================================= */}
      {editingQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-base-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#ffffff] border-b border-base-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-base-900">
                    Edit Collection QR Code
                  </h3>
                  <p className="text-[11px] text-base-700">
                    Update UPI ID, account name, bank, or active routing status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingQr(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateQr} className="p-5 overflow-y-auto space-y-4 flex-1">
              {editModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  required
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value.trim())}
                  placeholder="e.g. fastpay@okaxis"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Account Holder Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={editAccountHolder}
                    onChange={(e) => setEditAccountHolder(e.target.value)}
                    placeholder="e.g. FastPay Services"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Bank Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="e.g. ICICI Bank"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>
              </div>

              {/* Assigned Operator */}
              {operators.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Assigned Operator
                  </label>
                  <select
                    value={editOperatorId}
                    onChange={(e) => setEditOperatorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  >
                    <option value="">-- Unassigned (Direct Provider Handling) --</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Image Update */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-base-900">
                  QR Code Image
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleEditImageUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploadingEditImage}
                    className="btn-secondary py-2 px-3 text-xs flex items-center space-x-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{uploadingEditImage ? "Uploading..." : "Replace Image"}</span>
                  </button>

                  {editQrImageUrl && (
                    <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                      <img
                        src={editQrImageUrl}
                        alt="Current QR"
                        className="w-7 h-7 object-contain rounded bg-white border border-green-300"
                      />
                      <span className="text-[11px] font-medium truncate max-w-[150px]">Current Image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <div>
                  <span className="text-xs font-bold text-base-900 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">
                    Pause or activate order routing for this QR code.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editIsActive}
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    editIsActive ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editIsActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingQr(null)}
                  className="px-4 py-2 border border-base-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || uploadingEditImage}
                  className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  {submittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
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
