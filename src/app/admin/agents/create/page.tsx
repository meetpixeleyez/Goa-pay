"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Users,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import {
  isValidPhone,
  normalizePhone,
  isValidEmail,
  validateName,
  isValidTelegramId,
  normalizeTelegramId,
} from "@/lib/validation";

export default function CreateAgentPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("ACTIVE");
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const nameCheck = validateName(name, "Agent name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Agent name is required");
      setSubmitting(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g. agent@example.com)");
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

    const formattedTelegram = normalizeTelegramId(telegramId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "AGENT",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: cleanPhone,
          address: null,
          telegramId: formattedTelegram,
          status,
          commissionPercent: 0.0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      setSuccess(`Agent "${data.user?.name || name}" provisioned successfully!`);
      setTimeout(() => {
        router.push("/admin/agents");
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
      title="Provision New Agent"
      subtitle="Register a new master agent partner, set commission percentage, and link QR provider liquidity"
      actions={
        <Link
          href="/admin/agents"
          className="btn-secondary text-xs py-2 px-3.5 flex items-center space-x-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Agents</span>
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
            <span className="font-medium">{success} Redirecting to agents directory...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Account Credentials */}
          <div className="card-theme p-6 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-[16px] text-base-900">Agent Account Credentials</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1.5">
                  Agent Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Agent Rajesh"
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
                    placeholder="agent@goapay.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
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

              <div>
                <label className="block text-xs font-semibold text-base-900 mb-2">
                  Account Status
                </label>
                <div className="flex items-center space-x-3 pt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={status === "ACTIVE"}
                    onClick={() => setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                      status === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        status === "ACTIVE" ? "text-green-700" : "text-slate-500"
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-[11px] text-base-700">
                      {status === "ACTIVE" ? "(Can log in & earn)" : "(Disabled)"}
                    </span>
                  </div>
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
                    placeholder="@agent_rajesh"
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

          {/* Section 3: Commission Info */}
          <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200 bg-white space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b border-base-200">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm sm:text-base text-base-900">Agent Commission Assignment</h2>
            </div>
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-1">
              <span className="font-bold block text-sm">Direct Per-Provider Fee Configuration</span>
              <p className="text-purple-800 leading-relaxed">
                No fee configuration is required during agent creation. Custom agent payin and payout fees are configured directly on each QR Provider when assigned (e.g., Agent A can earn 0.5% Payin & 0.25% Payout on Provider 1, and 1.0% Payin & 0.5% Payout on Provider 2).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-base-200">
            <Link
              href="/admin/agents"
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
                  <span>Provisioning Agent...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Provision Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
