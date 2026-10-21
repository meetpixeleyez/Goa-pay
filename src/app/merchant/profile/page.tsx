"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import { User, Store, ShieldCheck, Check, AlertCircle, KeyRound } from "lucide-react";
import {
  isValidPhone,
  isValidEmail,
  validateName,
  normalizePhone,
} from "@/lib/validation";

export default function MerchantProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setName(data.profile.name || "");
          setPhone(data.profile.phone || "");
        }
      });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");

    const nameCheck = validateName(name, "Store Name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Store Name is required");
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout
      portal="merchant"
      title="Merchant Profile & Settings"
      subtitle="View your store credentials, fee percentage, and contact settings"
    >
      <div className="max-w-xl mx-auto card-theme p-6 sm:p-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-base-200 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-base-900">{profile?.name}</h2>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
        </div>

        {/* Read-only configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#ffffff] border border-base-200 rounded-lg text-xs mb-6">
          <div>
            <span className="text-slate-500 block">Payin Gateway Fee</span>
            <span className="font-bold text-sm text-primary">{profile?.payinMerchantFee ?? 0}%</span>
          </div>
          <div>
            <span className="text-slate-500 block">Payout Gateway Fee</span>
            <span className="font-bold text-sm text-[#8a5d3b]">{profile?.payoutMerchantFee ?? 0}%</span>
          </div>
          <div>
            <span className="text-slate-500 block">Assigned Broker</span>
            <span className="font-bold text-sm text-base-900">
              {profile?.broker ? profile.broker.name : "Direct (No Broker)"}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-base-900 mb-1">Store Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-900 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210 or +1 443 456 7890"
              className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer shadow"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
          </button>
        </form>

        {/* Developer API & Webhook Settings Card */}
        <div className="mt-6 card-theme p-4 sm:p-5 border border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-base-900 flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-primary shrink-0" />
              <span>Developer API & Webhook Settings</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage your merchant API keys, secrets, hosted checkout redirects, and webhook callbacks.
            </p>
          </div>
          <Link
            href="/merchant/api-settings"
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition text-center shrink-0 shadow-xs"
          >
            Manage API Credentials
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
