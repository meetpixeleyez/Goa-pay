"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Users,
  ArrowLeft,
  KeyRound,
  Percent,
  Wallet,
  QrCode,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Send,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Save,
} from "lucide-react";
import {
  isValidIndianPhone,
  isValidEmail,
  validateName,
  validateAddress,
  isValidTelegramId,
  normalizeIndianPhone,
  normalizeTelegramId,
} from "@/lib/validation";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "providers" | "ledger">("info");

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("1.0");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/${agentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load agent profile");

      const u = data.user;
      setAgent(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setTelegramId(u.telegramId || "");
      setCommissionPercent(u.commissionPercent?.toString() || "1.0");
      setStatus(u.status || "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Unable to fetch agent details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

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

  // Save updated agent settings
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateName(name, "Agent name");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Agent name is required");
      setSaving(false);
      return;
    }

    const cleanPhone = phone.trim() ? normalizeIndianPhone(phone) : null;
    if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
      setSaveError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210, starting with 6, 7, 8, or 9 without +91)");
      setSaving(false);
      return;
    }

    if (address.trim()) {
      const addrCheck = validateAddress(address);
      if (!addrCheck.valid) {
        setSaveError(addrCheck.error || "Invalid address");
        setSaving(false);
        return;
      }
    }

    if (telegramId.trim() && !isValidTelegramId(telegramId)) {
      setSaveError("Please enter a valid Telegram username (4-32 characters)");
      setSaving(false);
      return;
    }

    const formattedTelegram = normalizeTelegramId(telegramId);

    try {
      const res = await fetch(`/api/admin/users/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim() || null,
          telegramId: formattedTelegram,
          commissionPercent: parseFloat(commissionPercent) || 1.0,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update agent");

      setSaveSuccess("Agent settings updated successfully!");
      fetchAgent();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetSuccess("");
    setResetError("");

    try {
      const res = await fetch(`/api/admin/users/${agentId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetSuccess(data.message || "Password updated successfully!");
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword("");
        setResetSuccess("");
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="admin" title="Agent Profile" subtitle="Loading agent information...">
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading agent profile and performance data...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !agent) {
    return (
      <PortalLayout portal="admin" title="Agent Profile" subtitle="Agent Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">Agent Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested agent could not be found."}</p>
          <Link href="/admin/agents" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Agents List</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const assignedProviders = agent.agentQrProviders || [];
  const walletEntries = agent.wallet?.entries || [];
  const totalCommissionEarned = walletEntries
    .filter((e: any) => e.type === "CR")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <PortalLayout
      portal="admin"
      title={agent.name}
      subtitle="Master Agent Profile, Linked QR Providers, and Commission Ledger"
      actions={
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowResetModal(true);
              setNewPassword("");
              setResetError("");
              setResetSuccess("");
            }}
            className="flex-1 sm:flex-initial px-3 py-1.5 border border-base-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center space-x-1.5 shadow-2xs transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-600" />
            <span>Reset Password</span>
          </button>
          <Link
            href="/admin/agents"
            className="flex-1 sm:flex-initial btn-secondary text-xs py-1.5 px-3 flex items-center justify-center space-x-1.5 shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Agents</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Header Metadata Card */}
        <div className="card-theme p-4 sm:p-5 shadow-sm border border-base-200 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/15 text-base-900 flex items-center justify-center font-bold text-base sm:text-lg border border-primary/30 shrink-0">
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-base sm:text-xl font-bold text-base-900 truncate">{agent.name}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      agent.status === "ACTIVE"
                        ? "bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]/60"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {agent.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono shrink-0">
                    ID: {agent.id}
                  </span>
                </div>
                <div className="flex items-center gap-x-4 gap-y-1.5 text-xs text-base-700 mt-1.5 flex-wrap">
                  <span className="flex items-center space-x-1 truncate max-w-[240px] sm:max-w-none" title={agent.email}>
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{agent.email}</span>
                  </span>
                  {agent.telegramId && (
                    <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-[#1565c0]">
                      <Send className="w-3 h-3 text-[#1565c0] shrink-0" />
                      <span>{agent.telegramId}</span>
                    </span>
                  )}
                  {agent.phone && (
                    <span className="flex items-center space-x-1 font-mono text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{agent.phone}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Joined {new Date(agent.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end sm:justify-start space-x-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-base-200/60">
              <button
                onClick={fetchAgent}
                disabled={loading}
                className="w-full sm:w-auto p-2 bg-white border border-base-200 rounded-lg hover:bg-gray-100 text-gray-600 transition shadow-2xs flex items-center justify-center space-x-1.5 text-xs font-semibold"
                title="Refresh Agent Info"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                <span className="sm:hidden">Refresh Info</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Metric Cards - 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Commission Wallet</span>
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-base-900 font-mono truncate">
              ₹{(agent.wallet?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Current withdrawable balance</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Commission Rate</span>
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-primary font-mono truncate">
              {Number(agent.commissionPercent || 0).toFixed(2)}%
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Applied on routing deposits</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Linked QR Providers</span>
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-base-900 font-mono truncate">
              {assignedProviders.length}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Active liquidity partners</span>
          </div>

          <div className="card-theme p-3.5 sm:p-4 shadow-sm border border-base-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-base-700 font-medium truncate">Lifetime Earned</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 ml-1" />
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-extrabold text-green-700 font-mono truncate">
              ₹{totalCommissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block truncate">Total commissions settled</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1 pb-px no-scrollbar">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "info"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agent Info & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("providers")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "providers"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Assigned QR Providers ({assignedProviders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "ledger"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Commission Ledger ({walletEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: INFO & SETTINGS */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-8 card-theme p-4 sm:p-6 shadow-sm border border-base-200 rounded-xl">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4 sm:mb-5">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-base-900">Edit Agent Profile & Settings</h3>
              </div>

              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">Agent Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={agent.email}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-gray-100 text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Email cannot be modified directly.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Telegram Username (Auto @)
                    </label>
                    <div className="relative">
                      <Send className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={telegramId}
                        onChange={handleTelegramChange}
                        onBlur={handleTelegramBlur}
                        placeholder="@username"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Phone Number (10-digit Indian Mobile)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">10 digits starting with 6-9, no +91 prefix</span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-base-900 mb-1">City / Address (Min 5 chars)</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        maxLength={250}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Panaji, Goa"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Commission Percentage (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        required
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold font-mono border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 font-bold text-xs">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Earned on routing deposits</span>
                  </div>

                  {/* Account Status Switch */}
                  <div className="sm:col-span-2 p-3 bg-[#ffffff] border border-base-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-semibold text-base-900 block">Account Status</span>
                      <span className="text-[11px] text-base-700 block">
                        {status === "ACTIVE"
                          ? "Active partner receiving auto-commission credits."
                          : "Temporarily disabled from new commission credits."}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={status === "ACTIVE"}
                        onClick={() => setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
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
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-4 border-t border-base-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto btn-primary py-2 px-6 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm rounded-lg"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Card: How Agent Commissions Work */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card-theme p-4 sm:p-5 shadow-sm border border-base-200 rounded-xl">
                <div className="flex items-center space-x-2 pb-2.5 border-b border-base-200 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-base-900">Settlement Safeguards</h4>
                </div>
                <div className="space-y-2.5 text-xs text-base-700">
                  <p>
                    • Whenever a customer completes a deposit through a QR code owned by any of this agent's linked QR providers, the agent fee is calculated and locked atomically.
                  </p>
                  <p>
                    • Commissions are automatically credited to the agent's commission wallet upon successful dual-UTR verification.
                  </p>
                  <p>
                    • Current configured commission rate: <b className="text-base-900 font-mono">{agent.commissionPercent}%</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNED QR PROVIDERS */}
        {activeTab === "providers" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-base-900">Assigned QR Providers</h3>
                <p className="text-xs text-base-700">Liquidity providers managed by {agent.name}</p>
              </div>
              <Link
                href="/admin/qr-providers/create"
                className="btn-primary text-xs py-2 px-3.5 flex items-center justify-center space-x-1 shadow-xs rounded-lg w-full sm:w-auto"
              >
                <span>+ Add QR Provider</span>
              </Link>
            </div>

            {/* Desktop Table View (Visible on md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-64 max-w-[260px] whitespace-nowrap">Provider Name & Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right whitespace-nowrap">Liquidity Balance</th>
                    <th className="p-3 text-right whitespace-nowrap">Locked Exposure</th>
                    <th className="p-3 text-right whitespace-nowrap">Available Balance</th>
                    <th className="p-3 text-center whitespace-nowrap">Fee % (In / Out)</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {assignedProviders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No QR providers currently assigned to this agent.
                      </td>
                    </tr>
                  ) : (
                    assignedProviders.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 w-64 max-w-[260px]">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                              {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-base-900 truncate" title={p.name}>
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate" title={p.email}>
                                {p.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-base-900 font-mono">
                          ₹{(p.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sky-700 font-bold font-mono whitespace-nowrap">
                          ₹{(p.exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-primary font-extrabold font-mono whitespace-nowrap">
                          ₹{(p.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1 font-mono text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60">
                              IN: {p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]/60">
                              OUT: {p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/qr-providers/${p.id}`}
                            className="px-2.5 py-1 text-xs border border-base-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1 shadow-2xs"
                          >
                            <span>View Details</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Visible on small screens) */}
            <div className="block md:hidden divide-y divide-[#e0f2fe]">
              {assignedProviders.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No QR providers currently assigned to this agent.
                </div>
              ) : (
                assignedProviders.map((p: any) => (
                  <div key={p.id} className="p-3.5 space-y-2.5 hover:bg-[#ffffff] transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                          {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-base-900 truncate" title={p.name}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate" title={p.email}>
                            {p.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          p.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Financial Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-[#ffffff] rounded-lg border border-[#e0f2fe] text-[11px] font-mono">
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Available</span>
                        <span className="font-extrabold text-primary truncate block" title={`₹${(p.availableBalance || 0).toFixed(2)}`}>
                          ₹{(p.availableBalance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Exposure</span>
                        <span className="font-bold text-sky-700 truncate block" title={`₹${(p.exposure || 0).toFixed(2)}`}>
                          ₹{(p.exposure || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-base-700 block uppercase font-sans">Holding</span>
                        <span className="font-bold text-base-900 truncate block" title={`₹${(p.balance || 0).toFixed(2)}`}>
                          ₹{(p.balance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* Footer with Fee info & Action button */}
                    <div className="flex items-center justify-between pt-0.5 text-xs">
                      <div className="inline-flex items-center space-x-1 font-mono text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60">
                          IN: {p.payinQrProviderFee ?? p.qrProviderFee ?? 0}%
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]/60">
                          OUT: {p.payoutQrProviderFee ?? p.qrProviderFee ?? 0}%
                        </span>
                      </div>

                      <Link
                        href={`/admin/qr-providers/${p.id}`}
                        className="px-2.5 py-1 text-xs border border-base-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1 shadow-2xs"
                      >
                        <span>View Details</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200 rounded-xl">
            <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-base-900">Commission Ledger & Audit Trail</h3>
                <p className="text-xs text-base-700">All credit and debit entries on {agent.name}'s wallet</p>
              </div>
              <div className="text-xs font-bold text-base-900 bg-primary/15 px-3 py-1.5 rounded-lg border border-primary/30 w-full sm:w-auto text-center sm:text-right font-mono">
                Current Balance: ₹{(agent.wallet?.balance || 0).toFixed(2)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {walletEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No transactions recorded in this agent's wallet yet.
                      </td>
                    </tr>
                  ) : (
                    walletEntries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.type === "CR"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {entry.type === "CR" ? "+ CREDIT" : "- DEBIT"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {entry.category || "COMMISSION"}
                        </td>
                        <td className="p-3 font-medium text-base-900">{entry.description}</td>
                        <td
                          className={`p-3 text-right font-extrabold ${
                            entry.type === "CR" ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {entry.type === "CR" ? "+" : "-"}₹
                          {entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-bold text-base-900">
                          ₹{entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="card-theme max-w-sm w-full p-6 rounded-2xl border border-base-200 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-base-900">Reset Agent Password</h3>
              </div>

              <p className="text-xs text-base-700 mb-4 ">
                Enter a new password for <b>{agent.name}</b> ({agent.email}).
              </p>

              {resetError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="mb-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
                  {resetSuccess}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-1.5 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="btn-primary px-4 py-1.5 text-xs font-semibold shadow-sm"
                  >
                    {resetting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
