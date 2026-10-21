"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Percent,
  Wallet,
  Users,
  Upload,
  Lock,
  Mail,
  Phone,
  Send,
  Building,
  ShieldCheck,
  Trash2,
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

export default function CreateQRProviderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("ACTIVE");
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [agentId, setAgentId] = useState("");
  const [payinQrProviderFee, setPayinQrProviderFee] = useState("3.0");
  const [payoutQrProviderFee, setPayoutQrProviderFee] = useState("1.0");
  const [payinAgentFee, setPayinAgentFee] = useState("0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0");

  // Initial QR Code details
  const [initialUpiId, setInitialUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Agents dropdown
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/admin/users?role=AGENT");
        const data = await res.json();
        if (data.success) {
          setAgents(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  // Helper to generate secure random password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  // Telegram auto-prefix handler
  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() && !val.startsWith("@")) {
      setTelegramId("@" + val.trim());
    } else {
      setTelegramId(val);
    }
  };

  const handleTelegramBlur = () => {
    if (telegramId.trim() && !telegramId.trim().startsWith("@")) {
      setTelegramId("@" + telegramId.trim());
    }
  };

  // Custom QR Image upload handler
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload QR image");
      }

      setQrCodeImageUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const nameCheck = validateName(name, "Provider name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Provider name is required");
      setSubmitting(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g. user@example.com)");
      setSubmitting(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      setSubmitting(false);
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      setSubmitting(false);
      return;
    }

    if (telegramId.trim() && !isValidTelegramId(telegramId)) {
      setError("Please enter a valid Telegram username (4-32 characters)");
      setSubmitting(false);
      return;
    }

    const trimmedUpi = initialUpiId.trim();
    if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
      setError("Please enter a valid UPI ID (e.g. provider@bank, name@okhdfcbank)");
      setSubmitting(false);
      return;
    }

    const formattedTelegram = normalizeTelegramId(telegramId);

    const finalQrImage = trimmedUpi
      ? qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(trimmedUpi)}`
      : undefined;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "QR_PROVIDER",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: cleanPhone,
          address: null,
          telegramId: formattedTelegram,
          status,
          portalAccess,
          transactionAllowed,
          balance: parseFloat(initialBalance) || 0.0,
          agentId: agentId || null,
          payinQrProviderFee: parseFloat(payinQrProviderFee) || 0.0,
          payoutQrProviderFee: parseFloat(payoutQrProviderFee) || 0.0,
          payinAgentFee: agentId ? (parseFloat(payinAgentFee) || 0.0) : 0.0,
          payoutAgentFee: agentId ? (parseFloat(payoutAgentFee) || 0.0) : 0.0,
          qrProviderFee: parseFloat(payinQrProviderFee) || 3.0,
          initialUpiId: trimmedUpi,
          initialQrImageUrl: finalQrImage,
          accountHolderName: accountHolderName.trim() || undefined,
          bankName: bankName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create QR provider");
      }

      setSuccess(`QR Provider "${data.user?.name || name}" provisioned successfully!`);
      setTimeout(() => {
        router.push("/admin/qr-providers");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="Provision New QR Provider"
      subtitle="Register an account provider with initial liquidity balance, link to an agent, and configure collection QR codes"
      actions={
        <Link
          href="/admin/qr-providers"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to QR Providers</span>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error / Success Banners */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2.5 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center space-x-2.5 shadow-xs animate-in fade-in duration-200">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-medium">{success} Redirecting to QR providers directory...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Credentials */}
          <div className="card-theme p-6 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
              <QrCode className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-[16px] text-base-900">Account Credentials</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Provider Full / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FastPay Liquidity Services"
                  className="w-full px-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Email Address (Login ID) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="provider@goapay.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-base-900">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] text-primary hover:text-[#527e65] font-semibold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-9 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Identification */}
          <div className="card-theme p-6 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
              <Phone className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-[16px] text-base-900">Contact & Telegram Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Telegram Username (Auto @)
                </label>
                <div className="relative">
                  <Send className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={telegramId}
                    onChange={handleTelegramChange}
                    onBlur={handleTelegramBlur}
                    placeholder="@fastpay_provider"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-base-700 mt-1">
                  Prefix "@" will be added automatically if omitted.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Liquidity, Agent & Fees */}
          <div className="card-theme p-6 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-[16px] text-base-900">Liquidity, Fee & Agent Relation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Initial Liquidity Balance (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="0"
                    required
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-500 font-bold text-xs">INR</span>
                </div>
              </div>

              {/* Dual Fee Configuration: Payin and Payout Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Payin</span>
                    <span>Deposit Fee (%) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="100"
                      required
                      placeholder="0.00"
                      value={payinQrProviderFee}
                      onChange={(e) => setPayinQrProviderFee(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-bold border border-sky-200 rounded-lg bg-sky-50/30 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-sky-600 font-bold text-xs">%</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Payout</span>
                    <span>Withdrawal Fee (%) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="100"
                      required
                      placeholder="0.00"
                      value={payoutQrProviderFee}
                      onChange={(e) => setPayoutQrProviderFee(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-bold border border-amber-200 rounded-lg bg-amber-50/30 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-amber-600 font-bold text-xs">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Assigned Master Agent
                </label>
                <div className="relative">
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    disabled={loadingAgents}
                    className="w-full px-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Direct (No Agent Assigned)</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} {ag.phone ? `(${ag.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {agentId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-base-200">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Payin</span>
                        <span>Agent Commission Fee (%)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={payinAgentFee}
                          onChange={(e) => setPayinAgentFee(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg bg-sky-50/30 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                        <span className="absolute right-3 top-2 text-sky-600 font-bold text-xs">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Payout</span>
                        <span>Agent Commission Fee (%)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={payoutAgentFee}
                          onChange={(e) => setPayoutAgentFee(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-xs border border-amber-200 rounded-lg bg-amber-50/30 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <span className="absolute right-3 top-2 text-amber-600 font-bold text-xs">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-base-200">
            <Link
              href="/admin/qr-providers"
              className="px-4 py-2 border border-base-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary py-2 px-6 text-xs font-bold flex items-center space-x-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Provisioning Provider...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Provision QR Provider</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
