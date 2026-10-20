"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { Users, Check, AlertCircle } from "lucide-react";
import {
  isValidPhone,
  validateName,
  normalizePhone,
} from "@/lib/validation";

export default function AgentProfilePage() {
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

    const nameCheck = validateName(name, "Agent name");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Name is required");
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
            <label className="block text-xs font-semibold text-base-900 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 or +14155552671"
              className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">10-digit Indian mobile or International format with country code (e.g. +1...)</span>
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
