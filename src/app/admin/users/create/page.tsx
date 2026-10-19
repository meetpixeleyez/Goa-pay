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
  RotateCcw,
  Phone,
  Percent,
  RefreshCw,
} from "lucide-react";
import {
  isValidPhone,
  validateUsernameOrName,
  normalizePhone,
} from "@/lib/validation";

// Permitted roles in this creation form for Super Admin
const ALLOWED_ROLES = [
  { id: "MERCHANT", name: "Merchant" },
  { id: "QR_PROVIDER", name: "QR Provider" },
  { id: "BROKER", name: "Broker" },
  { id: "AGENT", name: "Agent" },
  { id: "OTHER", name: "Other" },
];

export default function CreateUserPage() {
  // 1. Role Selection (Dropdown)
  const [role, setRole] = useState("MERCHANT");

  // 2. Strict / Required Fields
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 3. Optional Contact Info
  const [phone, setPhone] = useState("");

  // 4. Configured Fees & Broker: Merchant (Optional)
  const [payinMerchantFee, setPayinMerchantFee] = useState("0");
  const [payoutMerchantFee, setPayoutMerchantFee] = useState("0");
  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [payinBrokerFee, setPayinBrokerFee] = useState("0");
  const [payoutBrokerFee, setPayoutBrokerFee] = useState("0");

  // 5. Configured Fees & Agent: QR Provider (Optional)
  const [payinQrProviderFee, setPayinQrProviderFee] = useState("2.0");
  const [payoutQrProviderFee, setPayoutQrProviderFee] = useState("1.0");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [payinAgentFee, setPayinAgentFee] = useState("0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0");

  // Auxiliary dropdown lists
  const [brokers, setBrokers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAux, setLoadingAux] = useState(false);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  // Generate random strong password
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setConfirmPassword(pwd);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.password;
      delete copy.confirmPassword;
      return copy;
    });
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const isPasswordMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const isPasswordMismatch = Boolean(password && confirmPassword && password !== confirmPassword);

  // Handle Form Submit with Strict Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const errors: Record<string, string> = {};

    // 1. Strict Validation: Full Name / Username (Strictly no email format)
    const nameCheck = validateUsernameOrName(fullName, "Full Name / Username");
    if (!nameCheck.valid) {
      errors.fullName = nameCheck.error || "Full Name / Username is required.";
    }

    // 2. Strict Validation: Password
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    } else if (password.length > 128) {
      errors.password = "Password cannot exceed 128 characters.";
    }

    // 3. Strict Validation: Confirm Password
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match. Please verify.";
    }

    // 4. Optional Validation: Contact Phone (supports Indian and International numbers)
    if (phone.trim() && !isValidPhone(phone.trim())) {
      errors.phone = "Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...).";
    }

    // 5. Optional Validation: Merchant Fees
    if (role === "MERCHANT") {
      const pIn = parseFloat(payinMerchantFee);
      if (isNaN(pIn) || pIn < 0 || pIn > 100) {
        errors.payinMerchantFee = "Merchant Payin Fee must be between 0% and 100%.";
      }
      const pOut = parseFloat(payoutMerchantFee);
      if (isNaN(pOut) || pOut < 0 || pOut > 100) {
        errors.payoutMerchantFee = "Merchant Payout Fee must be between 0% and 100%.";
      }
      if (selectedBrokerId) {
        const bIn = parseFloat(payinBrokerFee);
        if (isNaN(bIn) || bIn < 0 || bIn > 100) {
          errors.payinBrokerFee = "Broker Payin Fee must be between 0% and 100%.";
        }
        const bOut = parseFloat(payoutBrokerFee);
        if (isNaN(bOut) || bOut < 0 || bOut > 100) {
          errors.payoutBrokerFee = "Broker Payout Fee must be between 0% and 100%.";
        }
      }
    }

    // 6. Optional Validation: QR Provider Fees
    if (role === "QR_PROVIDER") {
      const qIn = parseFloat(payinQrProviderFee);
      if (isNaN(qIn) || qIn < 0 || qIn > 100) {
        errors.payinQrProviderFee = "Provider Payin Fee must be between 0% and 100%.";
      }
      const qOut = parseFloat(payoutQrProviderFee);
      if (isNaN(qOut) || qOut < 0 || qOut > 100) {
        errors.payoutQrProviderFee = "Provider Payout Fee must be between 0% and 100%.";
      }
      if (selectedAgentId) {
        const aIn = parseFloat(payinAgentFee);
        if (isNaN(aIn) || aIn < 0 || aIn > 100) {
          errors.payinAgentFee = "Agent Payin Fee must be between 0% and 100%.";
        }
        const aOut = parseFloat(payoutAgentFee);
        if (isNaN(aOut) || aOut < 0 || aOut > 100) {
          errors.payoutAgentFee = "Agent Payout Fee must be between 0% and 100%.";
        }
      }
    }

    setFieldErrors(errors);

    // If there are validation errors, halt and show top message
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      return;
    }

    setSubmitting(true);

    try {
      const cleanPhone = phone.trim() ? normalizePhone(phone) : null;

      const payload: Record<string, any> = {
        role,
        name: fullName.trim(),
        password,
        phone: cleanPhone,
        status: "ACTIVE",
        portalAccess: true,
        transactionAllowed: true,
      };

      if (role === "MERCHANT") {
        payload.payinMerchantFee = parseFloat(payinMerchantFee) || 0.0;
        payload.payoutMerchantFee = parseFloat(payoutMerchantFee) || 0.0;
        payload.brokerId = selectedBrokerId ? parseInt(selectedBrokerId, 10) : null;
        payload.payinBrokerFee = selectedBrokerId ? parseFloat(payinBrokerFee) || 0.0 : 0.0;
        payload.payoutBrokerFee = selectedBrokerId ? parseFloat(payoutBrokerFee) || 0.0 : 0.0;
      } else if (role === "QR_PROVIDER") {
        payload.balance = 0.0;
        payload.payinQrProviderFee = parseFloat(payinQrProviderFee) || 2.0;
        payload.payoutQrProviderFee = parseFloat(payoutQrProviderFee) || 1.0;
        payload.qrProviderFee = parseFloat(payinQrProviderFee) || 2.0;
        payload.agentId = selectedAgentId ? parseInt(selectedAgentId, 10) : null;
        payload.payinAgentFee = selectedAgentId ? parseFloat(payinAgentFee) || 0.0 : 0.0;
        payload.payoutAgentFee = selectedAgentId ? parseFloat(payoutAgentFee) || 0.0 : 0.0;
      } else if (role === "BROKER" || role === "AGENT" || role === "OTHER") {
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

      const createdUser = data.user;
      const createdEmail = createdUser.email || "";
      const generatedUsername = createdEmail.replace("@goapay.internal", "");

      setSuccessData({
        user: createdUser,
        username: generatedUsername,
        email: createdEmail,
        password,
        role,
        fullName: fullName.trim(),
        phone: cleanPhone,
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
    setPassword("");
    setConfirmPassword("");
    setPhone("");
    setPayinMerchantFee("0");
    setPayoutMerchantFee("0");
    setSelectedBrokerId("");
    setPayinBrokerFee("0");
    setPayoutBrokerFee("0");
    setPayinQrProviderFee("2.0");
    setPayoutQrProviderFee("1.0");
    setSelectedAgentId("");
    setPayinAgentFee("0");
    setPayoutAgentFee("0");
    setErrorMessage("");
    setFieldErrors({});
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
          <span>Users</span>
        </Link>
      }
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
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
                  Login Username
                </span>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-base-900">
                  <span className="truncate font-bold">{successData.username}</span>
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
                  Password
                </span>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-base-900">
                  <span className="truncate">{successData.password}</span>
                  <button
                    onClick={() => handleCopy(successData.password, "password")}
                    className="p-1 hover:text-primary transition ml-1"
                    title="Copy Password"
                  >
                    {copiedKey === "password" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {successData.phone && (
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Contact Phone
                  </span>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-base-900 flex items-center justify-between">
                    <span>{successData.phone}</span>
                    <button
                      onClick={() => handleCopy(successData.phone, "phone")}
                      className="p-1 hover:text-primary transition ml-1"
                      title="Copy Phone"
                    >
                      {copiedKey === "phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
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
          /* ==================== CLEAN STREAMLINED USER CREATION FORM ==================== */
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6"
          >
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Please check the required information:</p>
                  <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* 1. User Role (Dropdown) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setErrorMessage("");
                  setFieldErrors({});
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold transition cursor-pointer shadow-xs"
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Full Name / Username (Strict Required Field - No Email) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name / Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.fullName;
                      return copy;
                    });
                  }
                }}
                placeholder="e.g. rajesh_kumar or Rajesh Kumar (No email address)"
                className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 transition shadow-xs font-medium ${
                  fieldErrors.fullName
                    ? "border-rose-300 focus:ring-rose-200 focus:border-rose-500"
                    : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your desired username or full name (e.g. <span className="font-mono text-slate-600">rajesh_kumar</span>). Do not enter an email address.
              </p>
              {fieldErrors.fullName && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* 3. Password & Confirm Password (Strict Required Fields) */}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.password;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Minimum 6 characters"
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 font-mono transition shadow-xs ${
                      fieldErrors.password
                        ? "border-rose-300 focus:ring-rose-200 focus:border-rose-500"
                        : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
                )}
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
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.confirmPassword;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Re-enter password"
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 font-mono transition shadow-xs ${
                      fieldErrors.confirmPassword || isPasswordMismatch
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
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* 4. Contact Phone (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.phone;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. 9876543210 or +1 202 555 0199"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 transition shadow-xs ${
                    fieldErrors.phone
                      ? "border-rose-300 focus:ring-rose-200 focus:border-rose-500"
                      : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            {/* 5. Merchant Fee & Broker Configuration (ONLY visible when role is MERCHANT) */}
            {role === "MERCHANT" && (
              <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        onChange={(e) => {
                          setPayinMerchantFee(e.target.value);
                          if (fieldErrors.payinMerchantFee) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.payinMerchantFee;
                              return copy;
                            });
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 font-mono transition shadow-xs ${
                          fieldErrors.payinMerchantFee
                            ? "border-rose-300 focus:ring-rose-200 focus:border-rose-500"
                            : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                        }`}
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                    {fieldErrors.payinMerchantFee && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.payinMerchantFee}</p>
                    )}
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
                        onChange={(e) => {
                          setPayoutMerchantFee(e.target.value);
                          if (fieldErrors.payoutMerchantFee) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.payoutMerchantFee;
                              return copy;
                            });
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-base-900 focus:outline-none focus:ring-2 font-mono transition shadow-xs ${
                          fieldErrors.payoutMerchantFee
                            ? "border-rose-300 focus:ring-rose-200 focus:border-rose-500"
                            : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                        }`}
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                    {fieldErrors.payoutMerchantFee && (
                      <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.payoutMerchantFee}</p>
                    )}
                  </div>
                </div>

                {/* Assigned Broker & Direct Fees for this Merchant */}
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

            {/* 6. QR Provider Fee & Agent Configuration (ONLY visible when role is QR_PROVIDER) */}
            {role === "QR_PROVIDER" && (
              <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                {/* Assigned Agent & Direct Fees for this Provider */}
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
              </div>
            )}

            {/* Actions: Reset & Create User */}
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
