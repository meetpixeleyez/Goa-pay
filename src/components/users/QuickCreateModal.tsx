"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus,
  X,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Building2,
  ExternalLink,
} from "lucide-react";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "OPERATOR" | "OTHER";
  onSuccess?: (user: any) => void;
  defaultProviderId?: number | null;
}

export default function QuickCreateModal({
  isOpen,
  onClose,
  role,
  onSuccess,
  defaultProviderId,
}: QuickCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Series Data
  const [sequence, setSequence] = useState<number>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admin provider selection (only for OPERATOR role created by Admin)
  const [qrProviders, setQrProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [providerName, setProviderName] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Created State
  const [createdData, setCreatedData] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNextSequence = async () => {
    try {
      setLoading(true);
      setError("");
      setCreatedData(null);

      const res = await fetch(`/api/users/quick-create?role=${role}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load sequence data.");
      }

      setSequence(data.sequence);
      setUsername(data.username);
      setPassword(data.suggestedPassword);
      setIsSuperAdmin(data.userRole === "ADMIN");

      if (data.providerName) {
        setProviderName(data.providerName);
      }

      if (Array.isArray(data.qrProviders) && data.qrProviders.length > 0) {
        setQrProviders(data.qrProviders);
        if (defaultProviderId) {
          setSelectedProviderId(String(defaultProviderId));
        } else {
          setSelectedProviderId(String(data.qrProviders[0].id));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load series sequence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNextSequence();
    }
  }, [isOpen, role]);

  const handleCopy = (text: string, fieldKey: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCopyAll = () => {
    if (!createdData) return;
    const fullText = `Goa-Pay Portal Login Credentials:\nRole: ${createdData.role}\nUsername: ${createdData.username}\nPassword: ${createdData.password}\nLogin URL: ${window.location.origin}/login`;
    handleCopy(fullText, "all");
  };

  const handleRegeneratePassword = () => {
    const prefix = role === "OPERATOR" ? "Op@" : "Ot@";
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const newPass = `${prefix}${randomDigits}`;
    setPassword(newPass);
    setShowPassword(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setSubmitting(true);
      setError("");

      const payload: any = {
        role,
        username,
        password,
      };

      if (role === "OPERATOR" && isSuperAdmin && selectedProviderId) {
        payload.qrProviderId = parseInt(selectedProviderId, 10);
      }

      const res = await fetch("/api/users/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      setCreatedData(data.credentials);
      if (onSuccess) {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                role === "OPERATOR" ? "bg-emerald-600" : "bg-slate-700"
              }`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {createdData
                  ? `${role === "OPERATOR" ? "Operator" : "Other User"} Created`
                  : `Create ${role === "OPERATOR" ? "Operator" : "Other User"}`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {createdData
                  ? "Account is active and ready for immediate login"
                  : "Review login credentials for this account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs font-semibold">Preparing credentials...</p>
            </div>
          ) : createdData ? (
            /* SUCCESS VIEW */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900">
                  {createdData.username} Created Successfully
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Account is active and ready to log in immediately.
                </p>
              </div>

              {/* Credentials Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Login Credentials
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                {/* Username */}
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Username</span>
                    <span className="text-xs font-bold font-mono text-slate-900">{createdData.username}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(createdData.username, "username")}
                    className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-50 transition cursor-pointer"
                    title="Copy Username"
                  >
                    {copiedField === "username" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Password</span>
                    <span className="text-xs font-bold font-mono text-slate-900">{createdData.password}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(createdData.password, "password")}
                    className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-50 transition cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Login Portal Link */}
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Login URL</span>
                    <span className="text-xs font-semibold text-primary font-mono">/login</span>
                  </div>
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/login`, "url")}
                    className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-50 transition cursor-pointer"
                    title="Copy Login URL"
                  >
                    {copiedField === "url" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCopyAll}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedField === "all" ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied All Credentials to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy All Credentials</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            /* CONFIRMATION / PREVIEW VIEW */
            <div className="space-y-4">
              {/* If Operator & Admin: Provider Selection */}
              {role === "OPERATOR" && isSuperAdmin && qrProviders.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Parent QR Provider *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                    >
                      {qrProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Parent Provider Info Badge if QR Provider */}
              {role === "OPERATOR" && !isSuperAdmin && providerName && (
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-medium">Managing QR Provider</span>
                  <span className="font-bold text-slate-800">{providerName}</span>
                </div>
              )}

              {/* Username Card */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-slate-900">
                  <span>{username}</span>
                  <button
                    onClick={() => handleCopy(username, "preview_user")}
                    className="text-slate-400 hover:text-slate-600 transition"
                    title="Copy Username"
                  >
                    {copiedField === "preview_user" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Card */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-700 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl font-mono text-xs font-bold text-slate-900">
                  <span>{showPassword ? password : "••••••••••"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(password, "preview_pass")}
                      className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedField === "preview_pass" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Create</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
