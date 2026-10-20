"use client";

import { useEffect, useState, useRef } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  X,
  ZoomIn,
  PlusCircle,
  Upload,
  ShieldCheck,
  Power,
  Building,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { isValidUpiId } from "@/lib/validation";

export default function OperatorQRCodesPage() {
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Toggle Loading tracker
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Add QR Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newQrImageUrl, setNewQrImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingQr, setSubmittingQr] = useState(false);
  const [addModalError, setAddModalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.get<{ success: boolean; qrCodes: any[] }>("/api/operator/qr-codes");
      if (data.success) {
        setQrCodes(data.qrCodes || []);
      }
    } catch (e: any) {
      setError("Failed to load assigned collection QR codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Toggle QR Code Status (Only 1 active QR at a time)
  const handleToggleStatus = async (qrId: number, currentActive: boolean) => {
    try {
      setTogglingId(qrId);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/operator/qr-codes/${qrId}/toggle`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update QR code status");

      setSuccess(
        !currentActive
          ? "QR code activated! All other QR codes have been automatically paused."
          : "QR code has been paused."
      );
      setTimeout(() => setSuccess(""), 4000);
      await fetchQRCodes();
    } catch (err: any) {
      setError(err.message || "Failed to toggle QR code");
    } finally {
      setTogglingId(null);
    }
  };

  // Upload QR Image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAddModalError("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    try {
      setUploadingImage(true);
      setAddModalError("");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Image upload failed");

      setNewQrImageUrl(data.url);
    } catch (err: any) {
      setAddModalError(err.message || "Failed to upload QR image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit New QR Code
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError("");

    const cleanUpi = newUpiId.trim();
    if (!cleanUpi) {
      setAddModalError("UPI ID is required");
      return;
    }

    if (!isValidUpiId(cleanUpi)) {
      setAddModalError("Please enter a valid UPI ID (e.g. username@bank)");
      return;
    }

    if (!newQrImageUrl) {
      setAddModalError("Custom QR Code Image is required. Please upload a UPI QR screenshot.");
      return;
    }

    setSubmittingQr(true);

    try {
      const res = await fetch("/api/operator/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: cleanUpi,
          imageUrl: newQrImageUrl,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create QR code");

      setSuccess("New QR code uploaded and activated! All other QR codes have been paused.");
      setTimeout(() => setSuccess(""), 4500);

      setShowAddModal(false);
      setNewUpiId("");
      setNewAccountHolder("");
      setNewBankName("");
      setNewQrImageUrl("");

      await fetchQRCodes();
    } catch (err: any) {
      setAddModalError(err.message || "Failed to create QR code");
    } finally {
      setSubmittingQr(false);
    }
  };

  return (
    <PortalLayout
      portal="operator"
      title="My Collection QR Codes"
      subtitle="Orders route to your queue based on your shift's single active collection QR code"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchQRCodes}
            className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddModalError("");
            }}
            className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5 shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload New QR</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Notifications */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1 Active QR Policy Banner */}
        <div className="card-theme p-4 border-l-4 border-l-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-base-900">
                Single Active QR Policy Enforced
              </h3>
              <p className="text-[11px] text-base-700 mt-0.5">
                At any time, <b>only 1 QR code remains active</b>. Uploading or toggling a QR code will automatically set all your other QR codes to inactive.
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 self-start sm:self-auto shrink-0">
            Active: <b>{qrCodes.filter((q) => q.isActive).length}</b> / Total: <b>{qrCodes.length}</b>
          </div>
        </div>

        {/* QR Codes Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center card-theme">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <span>Loading assigned QR codes...</span>
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3 card-theme border border-dashed border-slate-300">
            <QrCode className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-bold text-sm text-gray-800">No Collection QR Codes Added Yet</p>
            <p className="max-w-md mx-auto text-slate-500">
              You haven&apos;t added any collection QR code yet. Click the button below to upload your UPI QR code and start accepting shift payments.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5 shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Upload My First QR Code</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrCodes.map((qr) => {
              const isActive = Boolean(qr.isActive && qr.status === "ACTIVE");
              const isToggling = togglingId === qr.id;

              return (
                <div
                  key={qr.id}
                  className={`card-theme p-4 flex flex-col justify-between space-y-4 transition ${
                    isActive
                      ? "ring-2 ring-emerald-500/80 bg-emerald-50/20 shadow-md"
                      : "border border-base-200 opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                      <div>
                        <span className="font-bold text-sm text-base-900 block truncate max-w-[170px]" title={qr.name || "UPI QR"}>
                          {qr.name || "UPI Collection QR"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ID: #{qr.id}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ACTIVE (Current Shift)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>PAUSED</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* QR Code Image Preview */}
                    <div
                      onClick={() => setLightboxImage(qr.imageUrl)}
                      className={`p-3 bg-white border rounded-xl flex items-center justify-center relative group cursor-pointer shadow-inner ${
                        isActive ? "border-emerald-300" : "border-base-200"
                      }`}
                    >
                      <img
                        src={qr.imageUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl text-white text-xs font-bold space-x-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge QR</span>
                      </div>
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
                            onClick={() => handleCopy(qr.upiId, qr.id)}
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


                    </div>
                  </div>

                  {/* Toggle Active / Inactive Action Button */}
                  <div className="pt-3 border-t border-base-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Shift Status:</span>
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(qr.id, isActive)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isToggling ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : isActive ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active (Click to Pause)</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activate this QR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: UPLOAD NEW QR CODE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-base-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">Upload New Shift QR Code</h3>
                  <p className="text-[11px] text-primary-100">
                    Activating this QR will automatically pause all other QR codes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-gray-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {addModalError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{addModalError}</span>
                </div>
              )}

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  UPI ID (VPA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  placeholder="e.g. rahul@oksbi or merchant@icici"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              {/* QR Image File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Custom QR Code Image <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-3.5 py-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{uploadingImage ? "Uploading..." : "Select QR Image File"}</span>
                  </button>

                  {newQrImageUrl ? (
                    <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono text-[11px] truncate max-w-[140px]">Image Uploaded</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-red-500 font-medium">QR image is required</span>
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                • <b>Policy Notice:</b> This newly added QR code will be set as <b>Active</b>, and any other QR codes assigned to your shift will automatically be paused.
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQr || uploadingImage}
                  className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5"
                >
                  {submittingQr ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Upload & Activate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-sm max-h-[90vh] bg-white p-4 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="UPI QR Code"
              className="w-72 h-72 object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
