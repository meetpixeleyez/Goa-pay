"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  UserPlus,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Phone,
  Send,
  Percent,
  RefreshCw,
} from "lucide-react";
import {
  isValidIndianPhone,
  validateName,
  isValidTelegramId,
  normalizeIndianPhone,
  normalizeTelegramId,
} from "@/lib/validation";

// Permitted roles in this creation form for Super Admin
const ALLOWED_ROLES = [
  { id: "MERCHANT", name: "Merchant" },
  { id: "QR_PROVIDER", name: "QR Provider" },
  { id: "BROKER", name: "Broker" },
  { id: "AGENT", name: "Agent" },
];

export default function CreateUserPage() {
  // 1. Role Selection (Dropdown)
  const [role, setRole] = useState("MERCHANT");

  // 2. User Info (Name & ID)
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // 3. Password Field
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 4. Contact Info & Telegram ID
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");

  // 5. Configured Fees: Merchant
  const [payinMerchantFee, setPayinMerchantFee] = useState("0");
  const [payoutMerchantFee, setPayoutMerchantFee] = useState("0");
  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [payinBrokerFee, setPayinBrokerFee] = useState("0");
  const [payoutBrokerFee, setPayoutBrokerFee] = useState("0");
  const [merchantUpiId, setMerchantUpiId] = useState("");

  // 5. Configured Fees: QR Provider
  const [payinQrProviderFee, setPayinQrProviderFee] = useState("2.0");
  const [payoutQrProviderFee, setPayoutQrProviderFee] = useState("1.0");
  const [initialBalance, setInitialBalance] = useState("0");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [payinAgentFee, setPayinAgentFee] = useState("0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0");
  const [initialUpiId, setInitialUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // Default all accounts to active
  const status = "ACTIVE";
  const portalAccess = true;
  const transactionAllowed = true;

  // Auxiliary dropdown lists
  const [brokers, setBrokers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAux, setLoadingAux] = useState(false);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch Brokers and Agents on mount
  useEffect(() => {
    async function loadAuxData() {
      try {
        setLoadingAux(true);
        const [brokersRes, agentsRes] = await Promise.all([
          fetch("/api/admin/users?role=BROKER"),
          fetch("/api/admin/users?role=AGENT"),
        ]);
        if (brokersRes.ok) {
          const bData = await brokersRes.json();
          setBrokers(bData.users || []);
        }
        if (agentsRes.ok) {
          const aData = await agentsRes.json();
          setAgents(aData.users || []);
        }
      } catch (err) {
        console.error("Failed to load aux users:", err);
      } finally {
        setLoadingAux(false);
      }
    }
    loadAuxData();
  }, []);

  // Generate random password
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setConfirmPassword(pwd);
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const isPasswordMatch = password && confirmPassword && password === confirmPassword;
  const isPasswordMismatch = password && confirmPassword && password !== confirmPassword;

  // Computed login email
  const effectiveEmail = username.trim()
    ? username.trim().includes("@")
      ? username.trim().toLowerCase()
      : `${username.trim().toLowerCase()}@goapay.internal`
    : "";

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate full name
    const nameCheck = validateName(fullName, "Full Name");
    if (!nameCheck.valid) {
      setErrorMessage(nameCheck.error || "Please enter a valid full name.");
      return;
    }

    // Validate username (User ID)
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage("User Name (User ID) must be at least 3 characters.");
      return;
    }

    // Validate password
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    // Validate phone (optional)
    if (phone.trim() && !isValidIndianPhone(phone.trim())) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number (starting with 6-9).");
      return;
    }

    // Validate telegram (optional)
    if (telegramId.trim() && !isValidTelegramId(telegramId.trim())) {
      setErrorMessage("Telegram ID must be 4-32 characters (letters, numbers, and underscores).");
      return;
    }

    setSubmitting(true);

    try {
      const cleanTelegram = normalizeTelegramId(telegramId);
      const cleanPhone = phone.trim() ? normalizeIndianPhone(phone) : null;

      const payload: Record<string, any> = {
        role,
        name: fullName.trim(),
        username: cleanUser,
        email: effectiveEmail,
        password,
        phone: cleanPhone,
        telegramId: cleanTelegram,
        address: null,
        status,
        portalAccess,
        transactionAllowed,
      };

      if (role === "MERCHANT") {
        payload.payinMerchantFee = parseFloat(payinMerchantFee) || 0.0;
        payload.payoutMerchantFee = parseFloat(payoutMerchantFee) || 0.0;
        payload.brokerId = selectedBrokerId ? parseInt(selectedBrokerId, 10) : null;
        payload.payinBrokerFee = selectedBrokerId ? parseFloat(payinBrokerFee) || 0.0 : 0.0;
        payload.payoutBrokerFee = selectedBrokerId ? parseFloat(payoutBrokerFee) || 0.0 : 0.0;
        payload.upiId = merchantUpiId.trim() || null;
      } else if (role === "QR_PROVIDER") {
        payload.balance = parseFloat(initialBalance) || 0.0;
        payload.payinQrProviderFee = parseFloat(payinQrProviderFee) || 2.0;
        payload.payoutQrProviderFee = parseFloat(payoutQrProviderFee) || 1.0;
        payload.qrProviderFee = parseFloat(payinQrProviderFee) || 2.0;
        payload.agentId = selectedAgentId ? parseInt(selectedAgentId, 10) : null;
        payload.payinAgentFee = selectedAgentId ? parseFloat(payinAgentFee) || 0.0 : 0.0;
        payload.payoutAgentFee = selectedAgentId ? parseFloat(payoutAgentFee) || 0.0 : 0.0;
        payload.initialUpiId = initialUpiId.trim() || null;
        payload.bankName = bankName.trim() || null;
        payload.accountHolderName = accountHolderName.trim() || null;
      } else if (role === "BROKER" || role === "AGENT") {
        payload.commissionPercent = 0.0;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.");
      }

      setSuccessData({
        user: data.user,
        username: cleanUser,
        email: effectiveEmail,
        password,
        role,
        fullName: fullName.trim(),
      });
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while creating user.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSuccessData(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setPhone("");
    setTelegramId("");
    setPayinMerchantFee("0");
    setPayoutMerchantFee("0");
    setSelectedBrokerId("");
    setPayinBrokerFee("0");
    setPayoutBrokerFee("0");
    setMerchantUpiId("");
    setPayinQrProviderFee("2.0");
    setPayoutQrProviderFee("1.0");
    setInitialBalance("0");
    setSelectedAgentId("");
    setPayinAgentFee("0");
    setPayoutAgentFee("0");
    setInitialUpiId("");
    setBankName("");
    setAccountHolderName("");
    setErrorMessage("");
  };

  return (
    <PortalLayout
      portal="admin"
      title="Create New User"
      subtitle="Register a new system user with credentials and contact details."
      actions={
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>User Directory</span>
        </Link>
      }
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-primary transition font-medium">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/users" className="hover:text-primary transition font-medium">
            Users
          </Link>
          <span>/</span>
          <span className="text-base-900 font-semibold">Create User</span>
        </div>

        {/* ==================== SUCCESS VIEW CARD ==================== */}
        {successData ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-base-900">User Successfully Created!</h2>
                <p className="text-xs text-slate-600">
                  The account has been created with active status and is ready for login access.
                </p>
              </div>
            </div>

            {/* Created Credentials Summary */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  User ID / Username
                </span>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-base-900">
                  <span className="font-bold truncate">{successData.username}</span>
                  <button
                    onClick={() => handleCopy(successData.username, "user")}
                    className="p-1 hover:text-primary transition ml-1"
                    title="Copy Username"
                  >
                    {copiedKey === "user" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Assigned Role
                </span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-semibold text-base-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>{successData.role}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Full Name
                </span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-base-900 font-medium truncate">
                  {successData.fullName}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Login Email
                </span>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-base-900">
                  <span className="truncate">{successData.email}</span>
                  <button
                    onClick={() => handleCopy(successData.email, "email")}
                    className="p-1 hover:text-primary transition ml-1"
                    title="Copy Email"
                  >
                    {copiedKey === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions after Success */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Another User</span>
              </button>
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <span>Back to Users Directory</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ==================== SIMPLE UNIFIED USER CREATION FORM ==================== */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Please check the required information:</p>
                  <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* 1. User Role (Dropdown Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold transition cursor-pointer shadow-xs"
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. User Info: Name and ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  User Name (User ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="e.g. rajesh_kumar"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Login email:{" "}
                  <span className="font-mono text-slate-600">
                    {effectiveEmail || "username@goapay.internal"}
                  </span>
                </p>
              </div>
            </div>

            {/* 3. Password Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-600 transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  {isPasswordMatch && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Match
                    </span>
                  )}
                  {isPasswordMismatch && (
                    <span className="text-[11px] font-bold text-rose-600">Mismatch</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 font-mono transition shadow-xs ${
                      isPasswordMismatch
                        ? "border-rose-300 focus:ring-rose-200 focus:border-rose-400"
                        : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Contact Info and Telegram ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210 (10 digits)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telegram ID (Optional)
                </label>
                <div className="relative">
                  <Send className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="e.g. @username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Fee Configuration (ONLY visible for MERCHANT or QR_PROVIDER, otherwise completely NOT visible) */}
            {role === "MERCHANT" && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Merchant Payin Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={payinMerchantFee}
                        onChange={(e) => setPayinMerchantFee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Merchant Payout Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={payoutMerchantFee}
                        onChange={(e) => setPayoutMerchantFee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Store UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={merchantUpiId}
                      onChange={(e) => setMerchantUpiId(e.target.value)}
                      placeholder="store@okaxis"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                    />
                  </div>
                </div>

                {/* Broker Assignment & Direct Fees for this Merchant */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Assigned Broker & Direct Fees
                  </label>
                  <select
                    value={selectedBrokerId}
                    onChange={(e) => setSelectedBrokerId(e.target.value)}
                    disabled={loadingAux}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                  >
                    <option value="">None (Direct Merchant - No Broker)</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.email})
                      </option>
                    ))}
                  </select>

                  {selectedBrokerId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Broker Payin Fee (%) for this Merchant
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={payinBrokerFee}
                            onChange={(e) => setPayinBrokerFee(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                          />
                          <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Broker Payout Fee (%) for this Merchant
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={payoutBrokerFee}
                            onChange={(e) => setPayoutBrokerFee(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                          />
                          <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {role === "QR_PROVIDER" && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Provider Payin Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={payinQrProviderFee}
                        onChange={(e) => setPayinQrProviderFee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Provider Payout Fee (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={payoutQrProviderFee}
                        onChange={(e) => setPayoutQrProviderFee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Initial Collateral Balance (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                    />
                  </div>
                </div>

                {/* Agent Assignment & Direct Fees for this Provider */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Assigned Agent & Direct Fees
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    disabled={loadingAux}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                  >
                    <option value="">None (Direct Provider - No Agent)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                  </select>

                  {selectedAgentId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Agent Payin Fee (%) for this Provider
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={payinAgentFee}
                            onChange={(e) => setPayinAgentFee(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                          />
                          <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Agent Payout Fee (%) for this Provider
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={payoutAgentFee}
                            onChange={(e) => setPayoutAgentFee(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                          />
                          <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Initial UPI ID & Bank Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Initial UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={initialUpiId}
                      onChange={(e) => setInitialUpiId(e.target.value)}
                      placeholder="provider@upi"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Axis Bank"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Holder Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If Broker or Agent: fee configuration is completely not visible */}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-primary hover:bg-primary-600 active:scale-98 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating User...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create User</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
