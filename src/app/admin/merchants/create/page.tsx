"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Store,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Percent,
  Briefcase,
  ExternalLink,
  Trash2,
  Lock,
  Mail,
  Phone,
  Send,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  isValidEmail,
  validateName,
  isValidUpiId,
  isValidTelegramId,
  normalizeTelegramId,
} from "@/lib/validation";

export default function CreateMerchantPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("ACTIVE");
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [upiId, setUpiId] = useState("");

  // Merchant Gateway Fees
  const [payinMerchantFee, setPayinMerchantFee] = useState("0");
  const [payoutMerchantFee, setPayoutMerchantFee] = useState("0");
  const [payinBrokerFee, setPayinBrokerFee] = useState("0");
  const [payoutBrokerFee, setPayoutBrokerFee] = useState("0");

  const [brokerId, setBrokerId] = useState("");

  // QR Code Image state
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Brokers dropdown
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(true);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch registered brokers on mount
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const res = await fetch("/api/admin/users?role=BROKER");
        const data = await res.json();
        if (data.success) {
          setBrokers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to load brokers:", err);
      } finally {
        setLoadingBrokers(false);
      }
    };
    fetchBrokers();
  }, []);

  // Helper to generate a secure random password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  // Image Upload handler
  const handleFileUpload = async (file: File) => {
    setUploadError("");
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setQrCodeUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload QR image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file);
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const nameCheck = validateName(name, "Store Name");
      if (!nameCheck.valid) throw new Error(nameCheck.error);

      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address (e.g. user@example.com)");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
      if (cleanPhone && !isValidPhone(cleanPhone)) {
        throw new Error("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      }

      if (upiId.trim() && !isValidUpiId(upiId)) {
        throw new Error("Please enter a valid UPI ID (e.g. store@okaxis)");
      }

      if (telegramId.trim() && !isValidTelegramId(telegramId)) {
        throw new Error("Please enter a valid Telegram handle (4-32 characters)");
      }

      const cleanTelegram = normalizeTelegramId(telegramId);

      // Automatically use uploaded image local/storage path or generated dynamic UPI QR
      const finalQrUrl = qrCodeUrl.trim() || (upiId.trim()
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upiId.trim())}`
        : null);

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "MERCHANT",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: cleanPhone,
          address: null,
          telegramId: cleanTelegram,
          status,
          portalAccess,
          transactionAllowed,
          upiId: upiId.trim() || null,
          qrCodeUrl: finalQrUrl,
          payinMerchantFee: parseFloat(payinMerchantFee) || 0.0,
          payoutMerchantFee: parseFloat(payoutMerchantFee) || 0.0,
          payinBrokerFee: brokerId ? (parseFloat(payinBrokerFee) || 0.0) : 0.0,
          payoutBrokerFee: brokerId ? (parseFloat(payoutBrokerFee) || 0.0) : 0.0,
          brokerId: brokerId ? brokerId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create merchant");

      setSuccess(`Merchant "${name}" created successfully! Redirecting...`);
      setTimeout(() => {
        router.push("/admin/merchants");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Create New Merchant"
      subtitle="Provision a new merchant store account with commission rules and UPI collection QR"
      action={
        <Link
          href="/admin/merchants"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Merchants</span>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto">
        {/* Error / Success Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2.5 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2.5 shadow-xs">
            <Check className="w-5 h-5 shrink-0 text-green-600" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* 2-COLUMN RESPONSIVE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 w-full items-start">
          {/* LEFT COLUMN: Store Details, Login Credentials, Contact & Fees */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5 xl:space-y-6">
            {/* CARD 1: Basic Store & Account */}
            <div className="card-theme p-4 sm:p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-3 px-4 sm:px-6 -mx-4 sm:-mx-6 border-b border-slate-200">
                <Store className="w-4 h-4 text-primary shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-base-900 truncate">
                  Store & Account Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Store Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Heritage Handicrafts"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium text-base-900"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Login Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-base-900">
                      Account Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[11px] text-[#0c4a6e] hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary UPI ID */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Primary Store UPI ID (Optional)
                  </label>
                  <div className="relative">
                    <QrCode className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. storename@okaxis"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Contact & Identification */}
            <div className="card-theme p-4 sm:p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-3 -mx-5 sm:-mx-6 px-5 sm:px-6 border-b border-base-200">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-base-900">
                  Contact & Business Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Telegram ID */}
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Telegram Support ID
                  </label>
                  <div className="relative">
                    <Send className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={telegramId}
                      onChange={(e) => setTelegramId(e.target.value)}
                      placeholder="@store_support"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Merchant Gateway Fees */}
            <div className="card-theme space-y-4">
              <div>
                <div className="flex items-center p-4 sm:p-6 justify-between pb-3 border-b border-base-200">
                  <div className="flex items-center space-x-2">
                    <Percent className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm sm:text-base text-base-900">
                      Merchant Gateway Fees
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 p-5 sm:p-6 sm:grid-cols-2 gap-4">
                  {/* Payin Merchant Fee */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Payin</span>
                      <span>Deposit Fee (%) <span className="text-red-500">*</span></span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payinMerchantFee}
                        onChange={(e) => setPayinMerchantFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 text-xs sm:text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-sky-50/30 text-slate-900 font-semibold"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-sky-600">%</span>
                    </div>
                  </div>

                  {/* Payout Merchant Fee */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Payout</span>
                      <span>Withdrawal Fee (%) <span className="text-red-500">*</span></span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payoutMerchantFee}
                        onChange={(e) => setPayoutMerchantFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 text-xs sm:text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/30 text-slate-900 font-semibold"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-600">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: Assigned Merchant Broker */}
            <div className="card-theme space-y-4">
              <div>
                <div className="flex items-center space-x-2 p-4 sm:p-6 pb-3 border-b border-base-200">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm sm:text-base text-base-900">
                    Assigned Merchant Broker
                  </h3>
                </div>

                <div className="p-5 sm:p-6">
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Assigned Broker (Optional)
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={brokerId}
                      onChange={(e) => setBrokerId(e.target.value)}
                      disabled={loadingBrokers}
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                    >
                      <option value="">None (Direct Merchant - No Broker)</option>
                      {brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.phone ? `(${b.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {brokerId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-base-200">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Payin</span>
                          <span>Broker Commission Fee (%)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payinBrokerFee}
                            onChange={(e) => setPayinBrokerFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 text-xs sm:text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-sky-50/30 text-slate-900 font-semibold"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-sky-600">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Payout</span>
                          <span>Broker Commission Fee (%)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payoutBrokerFee}
                            onChange={(e) => setPayoutBrokerFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 text-xs sm:text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/30 text-slate-900 font-semibold"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-600">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="card-theme p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="text-xs text-base-700">
            Please review the details before provisioning the merchant account.
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <Link
              href="/admin/merchants"
              className="px-4 py-2.5 border border-base-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Merchant...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Create Merchant Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </PortalLayout>
  );
}
