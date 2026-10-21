"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { validateUsernameOrName } from "@/lib/validation";

function generateSecurePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function CreateOperatorPage() {
  const router = useRouter();

  // Simple Form State with Username & Password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/users/quick-create?role=OPERATOR")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsername(data.username);
          setPassword(data.suggestedPassword);
          setShowPassword(true);
        }
      })
      .catch(console.error);
  }, []);

  const handleAutoGeneratePassword = () => {
    const generated = generateSecurePassword();
    setPassword(generated);
    setShowPassword(true);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(generated);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Please enter an operator username.");
      return;
    }

    if (cleanUsername.includes("@")) {
      setError("Username cannot be an email address (cannot contain '@'). Please enter a simple username e.g. rohit_operator.");
      return;
    }

    const nameCheck = validateUsernameOrName(cleanUsername, "Username");
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Please enter a valid username");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/qr-provider/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          name: cleanUsername,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create operator");
      }

      setSuccess(`Operator "${cleanUsername}" created successfully! Redirecting...`);
      setTimeout(() => {
        router.push("/qr-provider/operators");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create operator account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portal="qr-provider"
      title="Create Shift Operator"
      subtitle="Register an operator account. Operators self-manage collection QR codes inside their dedicated portal."
      actions={
        <Link
          href="/qr-provider/operators"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operators</span>
        </Link>
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header Alert Notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Streamlined Form Card */}
        <div className="card-theme p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-base-900">New Operator Account</h3>
              <p className="text-xs text-slate-500">
                Enter operator username and set a password. Auto-generate option available for strong passwords.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Simple Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rohit_operator"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Operator uses this username to log in at <span className="font-mono text-primary font-bold">/login</span>. (Emails not allowed)
              </p>
            </div>

            {/* Field 2: Password with Auto-Generate Option */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGeneratePassword}
                  className="text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md inline-flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                  title="Generate a random secure password"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Auto Generate Password</span>
                  {copiedPass && (
                    <span className="text-[10px] text-emerald-700 font-extrabold ml-1 animate-pulse">
                      (Copied!)
                    </span>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters or click Auto Generate"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>


            {/* Informational Guidance */}
            <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-sky-900 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Operator Self-Service QR Management</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                You are only opening the operator&apos;s account. Once created, the operator logs in at <span className="font-mono text-sky-800 font-bold">/login</span> and manages their own collection UPI QR codes directly inside the dedicated Operator Portal (<span className="font-mono text-sky-800 font-bold">/operator/qr-codes</span>).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <Link
                href="/qr-provider/operators"
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Operator...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Operator</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
