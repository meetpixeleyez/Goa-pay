"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { Users, Check, AlertCircle } from "lucide-react";
import {
  isValidIndianPhone,
  validateName,
  validateAddress,
  isValidTelegramId,
  normalizeIndianPhone,
  normalizeTelegramId,
} from "@/lib/validation";

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
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
          setAddress(data.profile.address || "");
          setTelegramId(data.profile.telegramId || "");
        }
      });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");

    const nameCheck = validateName(name, "Agent name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Name is required");
      return;
    }

    const cleanPhone = phone.trim() ? normalizeIndianPhone(phone) : null;
    if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210, starting with 6-9 without +91)");
      return;
    }

    if (address.trim()) {
      const addrCheck = validateAddress(address);
      if (!addrCheck.valid) {
        setError(addrCheck.error || "Invalid address");
        return;
      }
    }

    if (telegramId.trim() && !isValidTelegramId(telegramId)) {
      setError("Please enter a valid Telegram username (4-32 characters)");
      return;
    }

    const cleanTelegram = normalizeTelegramId(telegramId);

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim() || null,
          telegramId: cleanTelegram,
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
      portal="agent"
      title="Agent Profile & Settings"
      subtitle="View your agency commission percentage and contact information"
    >
      <div className="max-w-xl mx-auto card-theme p-6 sm:p-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-base-200 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-base-900">{profile?.name}</h2>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
        </div>

        {/* Read-only commission display */}
        <div className="p-4 bg-[#ffffff] border border-base-200 rounded-lg text-xs mb-6">
          <span className="text-slate-500 block">Configured Commission Rate</span>
          <span className="font-bold text-base text-primary">{profile?.commissionPercent}%</span>
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
            <label className="block text-xs font-semibold text-base-900 mb-1">Agent Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-900 mb-1">Telegram Handle</label>
            <input
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="@agent_tg"
              className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-base-900 mb-1">
                Contact Phone (10-digit Indian Mobile)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">10 digits, no +91</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-base-900 mb-1">
                Address / Location (Min 5 chars)
              </label>
              <input
                type="text"
                maxLength={250}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Margao, Goa"
                className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
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
      </div>
    </PortalLayout>
  );
}
