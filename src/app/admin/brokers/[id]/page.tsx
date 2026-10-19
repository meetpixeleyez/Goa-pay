"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Briefcase,
  ArrowLeft,
  KeyRound,
  Percent,
  Wallet,
  Store,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Send,
  MapPin,
  Calendar,
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

export default function BrokerDetailPage() {
  const params = useParams();
  const brokerId = params.id as string;

  const [broker, setBroker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "merchants" | "ledger">("info");

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

  const fetchBroker = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/${brokerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load broker profile");

      const u = data.user;
      setBroker(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setTelegramId(u.telegramId || "");
      setCommissionPercent(u.commissionPercent?.toString() || "1.0");
      setStatus(u.status || "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Unable to fetch broker details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brokerId) {
      fetchBroker();
    }
  }, [brokerId]);

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

  // Save updated broker settings
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateName(name, "Broker name");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Broker name is required");
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
      const res = await fetch(`/api/admin/users/${brokerId}`, {
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
      if (!res.ok) throw new Error(data.error || "Failed to update broker");

      setSaveSuccess("Broker settings updated successfully!");
      fetchBroker();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update broker");
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
      const res = await fetch(`/api/admin/users/${brokerId}/reset-password`, {
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
      <PortalLayout portal="admin" title="Broker Profile" subtitle="Loading broker information...">
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading broker profile and merchant store relations...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !broker) {
    return (
      <PortalLayout portal="admin" title="Broker Profile" subtitle="Broker Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">Broker Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested broker could not be found."}</p>
          <Link href="/admin/brokers" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Brokers List</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const brokeredMerchants = broker.brokeredMerchants || [];
  const walletEntries = broker.wallet?.entries || [];
  const totalCommissionEarned = walletEntries
    .filter((e: any) => e.type === "CR")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <PortalLayout
      portal="admin"
      title={broker.name}
      subtitle="Dedicated Broker Profile, Brokered Merchants, and Commission Ledger"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowResetModal(true);
              setNewPassword("");
              setResetError("");
              setResetSuccess("");
            }}
            className="px-3 py-1.5 border border-base-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
          <Link
            href="/admin/brokers"
            className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Brokers</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Metadata Card */}
        <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-base-900 flex items-center justify-center font-bold text-lg border border-primary/30 shrink-0">
                {broker.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-lg font-semibold text-slate-900">{broker.name}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      broker.status === "ACTIVE"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {broker.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-slate-500 text-[10px] font-mono">
                    ID: {broker.id}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-base-700 mt-1 flex-wrap gap-y-1">
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{broker.email}</span>
                  </span>
                  {broker.telegramId && (
                    <span className="flex items-center space-x-1 font-mono text-slate-500">
                      <Send className="w-3.5 h-3.5 text-blue-500" />
                      <span>{broker.telegramId}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joined {new Date(broker.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchBroker}
                className="p-2 border border-base-200 rounded-lg hover:bg-gray-100 text-slate-500 transition"
                title="Refresh Broker Info"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase">Commission Wallet</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-base-900">
              ₹{(broker.wallet?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-base-700 mt-0.5 block">Net accrued commission</span>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate-500 font-medium uppercase">Commission Rate</span>
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-primary">
              {broker.commissionPercent}%
            </div>
            <span className="text-[12px] text-slate-500 mt-0.5 block">Applied to brokered stores</span>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase">Brokered Stores</span>
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-base-900">
              {brokeredMerchants.length}
            </div>
            <span className="text-[12px] text-slate-500 mt-0.5 block">Active linked merchant accounts</span>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase">Lifetime Earned</span>
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-green-700">
              ₹{totalCommissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[12px] text-slate-500 mt-0.5 block">Total broker payouts settled</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "info"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Broker Info & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("merchants")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === "merchants"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Brokered Merchants ({brokeredMerchants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 card-theme p-6 shadow-sm border border-base-200">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-5">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Edit Broker Profile & Settings</h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1">Company / Broker Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={broker.email}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-gray-100 text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Email cannot be modified directly.</span>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-1">
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
                    <label className="block text-[12px] font-semibold mb-1">
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

                  <div>
                    <label className="block text-[12px] font-semibold mb-1">Office / Address (Min 5 chars)</label>
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
                    <label className="block text-[12px] font-semibold mb-1">
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
                        className="w-full px-3 py-2 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 font-bold text-xs">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-2">Account Status</label>
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
                          {status === "ACTIVE" ? "(Active & Earning)" : "(Disabled)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
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

            {/* Right Card: Broker Rules & Option A Architecture */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card-theme p-5 shadow-sm border border-base-200">
                <div className="flex items-center space-x-2 pb-2 border-b border-base-200 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-base-900">Broker Economics (Option A)</h4>
                </div>
                <div className="space-y-2.5 text-xs text-base-700">
                  <p>
                    • When a broker is assigned to a merchant, the broker commission is applied to every completed deposit order.
                  </p>
                  <p>
                    • Commissions are automatically credited to the broker's wallet upon Dual-UTR verification approval.
                  </p>
                  <p>
                    • Current configured rate: <b>{broker.commissionPercent}%</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BROKERED MERCHANTS */}
        {activeTab === "merchants" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Brokered Merchant Stores</h3>
                <p className="text-xs text-base-700">Stores linked to {broker.name}</p>
              </div>
              <span className="text-xs text-base-700">
                Total Linked Stores: <b>{brokeredMerchants.length}</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-60 max-w-[240px]">Store Name & Email</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 whitespace-nowrap">Phone</th>
                    <th className="p-3 text-center whitespace-nowrap">Store Fee %</th>
                    <th className="p-3 text-center whitespace-nowrap">Completed Orders</th>
                    <th className="p-3 whitespace-nowrap">Joined Date</th>
                    <th className="p-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {brokeredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No merchant stores currently assigned to this broker.
                      </td>
                    </tr>
                  ) : (
                    brokeredMerchants.map((m: any) => (
                      <tr key={m.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 w-60 max-w-[240px]">
                          <div className="font-bold text-base-900 truncate" title={m.name}>{m.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate" title={m.email}>{m.email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{m.phone || "--"}</td>
                        <td className="p-3 text-center font-bold text-primary">{m.payinMerchantFee ?? 0}%</td>
                        <td className="p-3 text-center font-bold text-base-900">
                          {m._count?.merchantOrders || 0}
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/merchants/${m.id}`}
                            className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-semibold inline-flex items-center space-x-1"
                          >
                            <span>View Store</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Broker Commission Ledger</h3>
                <p className="text-xs text-base-700">All credit and debit entries on {broker.name}'s wallet</p>
              </div>
              <div className="text-xs font-bold text-base-900 bg-primary/15 px-3 py-1.5 rounded-lg border border-primary/30">
                Current Balance: ₹{(broker.wallet?.balance || 0).toFixed(2)}
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
                        No transactions recorded in this broker's wallet yet.
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
            <div className="card-theme max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Reset Broker Password</h3>
              </div>

              <p className="text-xs text-base-700 mb-4">
                Enter a new password for <b>{broker.name}</b> ({broker.email}).
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
                  <label className="block text-[12px] font-semibold mb-1">
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
