"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  UserPlus,
  Users,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Upload,
  Check,
  Building2,
  Trash2,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  isValidEmail,
  validateName,
  isValidUpiId,
} from "@/lib/validation";

function CreateOperatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProviderId = searchParams.get("providerId") || "";

  // QR Providers list
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState(preselectedProviderId);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);

  // Available QR codes for selected provider
  const [providerQrs, setProviderQrs] = useState<any[]>([]);
  const [selectedQrIds, setSelectedQrIds] = useState<string[]>([]);
  const [loadingQrs, setLoadingQrs] = useState(false);

  // Optional: Create initial QR Code inline
  const [createInitialQr, setCreateInitialQr] = useState(false);
  const [initialUpiId, setInitialUpiId] = useState("");
  const [initialAccountHolder, setInitialAccountHolder] = useState("");
  const [initialBankName, setInitialBankName] = useState("");
  const [initialQrImageUrl, setInitialQrImageUrl] = useState("");
  const [uploadingQrImage, setUploadingQrImage] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 1. Fetch QR Providers
  useEffect(() => {
    async function loadProviders() {
      try {
        setLoadingProviders(true);
        const res = await fetch("/api/admin/users?role=QR_PROVIDER");
        const data = await res.json();
        if (res.ok && data.users) {
          setProviders(data.users);
          if (!selectedProviderId && data.users.length > 0) {
            setSelectedProviderId(data.users[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load QR providers", err);
      } finally {
        setLoadingProviders(false);
      }
    }
    loadProviders();
  }, []);

  // 2. Fetch QR codes whenever selectedProviderId changes
  useEffect(() => {
    if (!selectedProviderId) {
      setProviderQrs([]);
      setSelectedQrIds([]);
      return;
    }

    async function loadQrs() {
      try {
        setLoadingQrs(true);
        const res = await fetch(`/api/qr-provider/qr-codes?providerId=${selectedProviderId}`);
        const data = await res.json();
        if (res.ok && data.qrCodes) {
          setProviderQrs(data.qrCodes);
        } else {
          setProviderQrs([]);
        }
      } catch (err) {
        console.error("Failed to load QR codes for provider", err);
      } finally {
        setLoadingQrs(false);
      }
    }

    loadQrs();
    setSelectedQrIds([]);
  }, [selectedProviderId]);

  const handleQrImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingQrImage(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload QR code image");

      setInitialQrImageUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingQrImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedProviderId) {
      setError("Please select a QR Provider for this operator");
      return;
    }

    if (!validateName(name)) {
      setError("Please provide a valid operator name (at least 2 letters)");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : undefined;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    if (createInitialQr) {
      if (!initialUpiId.trim()) {
        setError("Please enter a valid UPI ID for the initial QR code");
        return;
      }
      if (!isValidUpiId(initialUpiId.trim())) {
        setError("Please enter a standard UPI ID (e.g., username@bank)");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload: any = {
        targetProviderId: selectedProviderId,
        providerId: selectedProviderId,
        qrProviderId: selectedProviderId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: cleanPhone,
        status,
        portalAccess,
        transactionAllowed,
        assignedQrIds: selectedQrIds,
        qrCodeIds: selectedQrIds,
      };

      if (createInitialQr && initialUpiId.trim()) {
        payload.initialQr = {
          upiId: initialUpiId.trim(),
          accountHolderName: initialAccountHolder.trim() || undefined,
          bankName: initialBankName.trim() || undefined,
          imageUrl: initialQrImageUrl.trim() || undefined,
        };
      }

      const res = await fetch("/api/qr-provider/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create operator");

      setSuccess(`Operator "${name}" created successfully!`);
      setTimeout(() => {
        router.push(`/admin/operators/${data.operator.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create operator");
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Create New Operator"
      subtitle="Register a sub-user under a QR Provider and assign collection QR codes"
      actions={
        <Link
          href="/admin/operators"
          className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operators</span>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Parent QR Provider Selection */}
          <div className="card-theme p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-base-900">1. Parent QR Provider</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-base-900 mb-1.5">
                Assign Operator to QR Provider *
              </label>
              {loadingProviders ? (
                <div className="text-xs text-slate-500 py-2">Loading QR providers...</div>
              ) : providers.length === 0 ? (
                <div className="text-xs text-red-600 py-2">
                  No QR providers found. Please create a QR provider first before creating operators.
                </div>
              ) : (
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a QR Provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                The operator will work under this provider's financial balance and will only handle orders for QR codes owned by this provider.
              </p>
            </div>
          </div>

          {/* Section 2: Account Credentials & Identity */}
          <div className="card-theme p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-base-900">2. Operator Credentials</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Operator Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Email Address (Login Username) *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@goapay.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Password (Min 6 characters) *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter operator password"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">Contact Phone (Indian or International)</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
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
            </div>

            {/* Account Controls & Permissions */}
            <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3 mt-4">
              <span className="text-xs font-bold text-base-900 uppercase tracking-wider block pb-2 border-b border-[#e4d8c2]">
                Permissions & Controls
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Account Status */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Account Status</span>
                    <span className="text-[11px] font-bold text-green-700">{status}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={status === "ACTIVE"}
                    onClick={() => setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      status === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                        status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Portal Access */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Portal Access</span>
                    <span className="text-[11px] font-bold text-green-700">
                      {portalAccess ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={portalAccess}
                    onClick={() => setPortalAccess(!portalAccess)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      portalAccess ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                        portalAccess ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Transaction Handling */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Order Fulfill</span>
                    <span className="text-[11px] font-bold text-green-700">
                      {transactionAllowed ? "Allowed" : "Blocked"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={transactionAllowed}
                    onClick={() => setTransactionAllowed(!transactionAllowed)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      transactionAllowed ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                        transactionAllowed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Assign Existing QR Codes */}
          <div className="card-theme p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-base-900">3. Assign Existing QR Codes</h3>
              </div>
              <span className="text-xs text-base-700">
                {selectedQrIds.length} of {providerQrs.length} Selected
              </span>
            </div>

            {loadingQrs ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                Loading QR codes for selected provider...
              </div>
            ) : providerQrs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-base-100/20 rounded-xl border border-dashed border-base-200">
                No QR codes registered under this provider yet. You can create an initial QR code below.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {providerQrs.map((qr) => {
                  const isChecked = selectedQrIds.includes(qr.id);
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
                          <span className="font-bold text-xs text-base-900 truncate">{qr.upiId}</span>
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
                        <div className="text-[11px] text-slate-500 truncate">
                          {qr.bankName ? `${qr.bankName} • ` : ""}
                          {qr.accountHolderName || "Holder Name"}
                        </div>
                        {qr.operator && (
                          <div className="text-[10px] text-sky-600 font-semibold mt-0.5">
                            Currently with: {qr.operator.name}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Optionally Register Initial QR Code */}
          <div className="card-theme p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-base-900">4. Register New QR Code Inside Operator (Optional)</h3>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createInitialQr}
                  onChange={(e) => setCreateInitialQr(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary border-base-200"
                />
                <span className="text-xs font-bold text-base-900">Create New QR Now</span>
              </label>
            </div>

            {createInitialQr && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-base-900 mb-1">UPI ID (VPA) *</label>
                    <input
                      type="text"
                      required={createInitialQr}
                      value={initialUpiId}
                      onChange={(e) => setInitialUpiId(e.target.value)}
                      placeholder="operator.desk@icici"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-900 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={initialAccountHolder}
                      onChange={(e) => setInitialAccountHolder(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Desk"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-900 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={initialBankName}
                      onChange={(e) => setInitialBankName(e.target.value)}
                      placeholder="e.g. ICICI Bank / HDFC Bank"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Upload QR Image */}
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
                        if (file) handleQrImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      disabled={uploadingQrImage}
                      className="px-3.5 py-2 text-xs bg-white border border-base-200 hover:bg-base-100/40 text-base-900 font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>{uploadingQrImage ? "Uploading..." : "Choose QR Image File"}</span>
                    </button>

                    {initialQrImageUrl && (
                      <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <img
                          src={initialQrImageUrl}
                          alt="QR Preview"
                          className="w-7 h-7 object-contain rounded border border-green-300 bg-white"
                        />
                        <span className="font-mono text-[11px] truncate max-w-xs">{initialQrImageUrl}</span>
                        <button
                          type="button"
                          onClick={() => setInitialQrImageUrl("")}
                          className="text-red-500 hover:text-red-700 p-1 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-base-200">
            <Link
              href="/admin/operators"
              className="px-5 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingProviders}
              className="btn-primary text-xs py-2 px-6 shadow flex items-center space-x-2 font-bold"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? "Creating Operator..." : "Create Operator"}</span>
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}

export default function AdminCreateOperatorPage() {
  return (
    <Suspense
      fallback={
        <PortalLayout portal="admin" title="Create New Operator">
          <div className="p-12 text-center text-xs text-slate-500">Loading form...</div>
        </PortalLayout>
      }
    >
      <CreateOperatorContent />
    </Suspense>
  );
}
