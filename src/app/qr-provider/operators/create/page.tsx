"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  UserPlus,
  Users,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Upload,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  isValidEmail,
  validateName,
  isValidUpiId,
} from "@/lib/validation";

export default function CreateOperatorPage() {
  const router = useRouter();

  // Basic Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);

  // Existing QR Codes selection
  const [availableQrs, setAvailableQrs] = useState<any[]>([]);
  const [loadingQrs, setLoadingQrs] = useState(true);
  const [selectedQrIds, setSelectedQrIds] = useState<string[]>([]);

  // Optional: Create new QR code directly
  const [createNewQr, setCreateNewQr] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newQrImageUrl, setNewQrImageUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/qr-provider/qr-codes")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAvailableQrs(d.qrCodes || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingQrs(false));
  }, []);

  const handleToggleQrSelect = (qrId: string) => {
    setSelectedQrIds((prev) =>
      prev.includes(qrId) ? prev.filter((id) => id !== qrId) : [...prev, qrId]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    try {
      setUploadingQr(true);
      setError("");
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
      setError(err.message || "Failed to upload QR image");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const nameCheck = validateName(name, "Operator Name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Invalid name");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : "";
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (createNewQr && newUpiId.trim() && !isValidUpiId(newUpiId.trim())) {
      setError("Please enter a valid UPI ID (e.g. user@bank)");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create the operator
      const res = await fetch("/api/qr-provider/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone || undefined,
          password,
          qrCodeIds: selectedQrIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create operator");
      }

      const createdOperator = data.operator;

      // 2. If user also created a new QR code directly, create it assigned to this operator
      if (createNewQr && newUpiId.trim() && createdOperator?.id) {
        const qrRes = await fetch("/api/qr-provider/qr-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upiId: newUpiId.trim(),
            imageUrl:
              newQrImageUrl.trim() ||
              `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(
                newUpiId.trim()
              )}`,
            accountHolderName: newAccountHolder.trim() || undefined,
            bankName: newBankName.trim() || undefined,
            isActive: true,
            operatorId: createdOperator.id,
          }),
        });
        const qrData = await qrRes.json();
        if (!qrRes.ok) {
          console.warn("Operator created, but new QR code creation encountered an issue:", qrData.error);
        }
      }

      setSuccess(`Operator "${name}" created successfully! Redirecting...`);
      setTimeout(() => {
        router.push(`/qr-provider/operators/${createdOperator.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create operator");
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portal="qr-provider"
      title="Create Sub-Operator"
      subtitle="Register a new operator sub-user to manage your collection QR codes"
      actions={
        <Link
          href="/qr-provider/operators"
          className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operators</span>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-[#0c4a6e] shrink-0 border border-primary/30 shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-base-900">New Operator Onboarding Form</h1>
              <p className="text-xs text-base-700 mt-0.5">
                Operators receive assigned QR codes, monitor deposit orders, verify payments, and handle payouts.
                All balances remain strictly under your QR Provider master account.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2.5 shadow-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2.5 shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Main Creation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Credentials & Contact */}
          <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#e0f2fe]">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-base-900">Operator Profile & Credentials</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Operator Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Email Address (Login ID) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.operator@example.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Contact Phone (Indian or International)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +14155552671"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">10-digit Indian mobile or International format with country code (e.g. +1...)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Initial Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Permissions & Account Status */}
          <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#e0f2fe]">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-base-900">Account Status & Access Permissions</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-white border border-[#e0f2fe] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-base-900 block">Account Status</span>
                  <span className="text-[10px] text-slate-500">Allow login to portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus((prev) => (prev === "ACTIVE" ? "INACTIVE" : "ACTIVE"))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  {status}
                </button>
              </div>

              <div className="p-3 bg-white border border-[#e0f2fe] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-base-900 block">Portal Access</span>
                  <span className="text-[10px] text-slate-500">Dashboard UI login</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPortalAccess((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    portalAccess
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
                >
                  {portalAccess ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="p-3 bg-white border border-[#e0f2fe] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-base-900 block">Transaction Actions</span>
                  <span className="text-[10px] text-slate-500">Verify & complete orders</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTransactionAllowed((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    transactionAllowed
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
                >
                  {transactionAllowed ? "Allowed" : "Blocked"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Assign Existing Collection QR Codes */}
          <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0f2fe]">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-base-900">Assign Existing Collection QR Codes</h2>
              </div>
              <span className="text-xs text-base-700 font-semibold">
                {selectedQrIds.length} Selected
              </span>
            </div>

            {loadingQrs ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading collection QR codes...</div>
            ) : availableQrs.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 bg-white border border-[#e0f2fe] rounded-xl">
                No collection QR codes configured yet under your account. You can create one below!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {availableQrs.map((qr) => {
                  const isChecked = selectedQrIds.includes(qr.id);
                  const isCurrentlyAssigned = Boolean(qr.operatorId);

                  return (
                    <label
                      key={qr.id}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? "bg-primary/10 border-primary shadow-2xs"
                          : "bg-white border-[#e0f2fe] hover:border-base-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleQrSelect(qr.id)}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <div className="truncate">
                          <span className="font-mono text-xs font-bold text-base-900 block truncate">
                            {qr.upiId}
                          </span>
                          <span className="text-[11px] text-base-700 block truncate">
                            {qr.bankName || "Bank"} {qr.accountHolderName ? `• ${qr.accountHolderName}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right ml-2">
                        {isCurrentlyAssigned && qr.operator && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold block">
                            Assigned to {qr.operator.name}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            qr.isActive ? "text-emerald-700" : "text-gray-400"
                          }`}
                        >
                          {qr.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Optional - Directly Create New QR Code For This Operator */}
          <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0f2fe]">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-base-900">
                  Create New Collection QR Code For This Operator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateNewQr((prev) => !prev)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  createNewQr
                    ? "bg-primary text-white"
                    : "bg-white border border-base-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {createNewQr ? "Enabled" : "+ Add New QR"}
              </button>
            </div>

            {createNewQr && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    placeholder="e.g. operator.upi@icici"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Account Holder Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAccountHolder}
                    onChange={(e) => setNewAccountHolder(e.target.value)}
                    placeholder="e.g. Rahul Sharma Collections"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Upload QR Image (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQr}
                      className="btn-secondary py-2 px-3 text-xs font-bold flex items-center space-x-1 shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>{uploadingQr ? "Uploading..." : "Upload QR Image"}</span>
                    </button>
                    {newQrImageUrl && (
                      <span className="text-[11px] text-emerald-700 font-semibold truncate">
                        ✔ QR Image attached
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/qr-provider/operators"
              className="btn-secondary text-xs py-2 px-4 font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center space-x-2 shadow-md cursor-pointer"
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
