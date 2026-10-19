"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";

export default function OperatorProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PortalLayout
      portal="operator"
      title="Operator Profile & Security"
      subtitle="View your shift credentials and manage your account password"
    >
      <div className="max-w-3xl space-y-6">
        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
            <button onClick={() => setPasswordSuccess("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Card */}
        <div className="card-theme p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-base-200">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-lg shadow">
              {profile?.name?.substring(0, 2).toUpperCase() || "OP"}
            </div>
            <div>
              <h2 className="text-base font-bold text-base-900">{profile?.name || "Loading..."}</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  OPERATOR
                </span>
                <span className="text-xs text-slate-500">{profile?.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white border border-base-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-base-700 uppercase tracking-wider block">
                Contact Phone
              </span>
              <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{profile?.phone || "Not configured"}</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-base-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-base-700 uppercase tracking-wider block">
                Account Status
              </span>
              <div className="font-semibold text-emerald-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active & Verified</span>
              </div>
            </div>

            {/* Parent QR Provider info */}
            <div className="sm:col-span-2 p-3 bg-base-100/30 border border-base-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-base-700 uppercase tracking-wider block">
                Parent QR Provider Manager
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="font-bold text-base-900 flex items-center space-x-1.5">
                  <Building className="w-4 h-4 text-[#0c4a6e]" />
                  <span>{profile?.qrProvider?.name || "FastPay Liquidity Provider"}</span>
                </div>
                <div className="text-gray-600 text-[11px]">
                  {profile?.qrProvider?.email || "provider@goapay.com"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card-theme p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-4 border-b border-base-200">
            <KeyRound className="w-5 h-5 text-[#0c4a6e]" />
            <h3 className="font-bold text-sm text-base-900">Change Password</h3>
          </div>

          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs max-w-md">
            <div>
              <label className="block font-semibold text-base-900 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-base-900 mb-1">New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (Min 6 characters)"
                className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-base-900 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary py-2 px-5 font-semibold flex items-center space-x-1.5 shadow"
            >
              {passwordLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
