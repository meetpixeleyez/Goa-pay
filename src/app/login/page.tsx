"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      await dispatch(fetchCurrentUser({ force: true }));
      router.push(data.redirectUrl || "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="card-theme p-8 shadow-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-white mb-3 shadow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-base-900">Portal Login</h2>
          <p className="text-xs text-base-700 mt-1">
            Access Admin, Merchant, or QR Provider dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-base-900 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-900 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center space-x-2 shadow"
          >
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-base-200">
          <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider block mb-3 text-center">
            Quick-Fill Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo("admin@goapay.com", "admin123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left"
            >
              <div className="font-bold text-base-900">Super Admin</div>
              <div className="text-[10px] text-slate-500">admin@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("merchant@goapay.com", "merchant123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left"
            >
              <div className="font-bold text-base-900">Merchant</div>
              <div className="text-[10px] text-slate-500">merchant@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("provider@goapay.com", "provider123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left"
            >
              <div className="font-bold text-base-900">QR Provider</div>
              <div className="text-[10px] text-slate-500">provider@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("agent@goapay.com", "agent123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left"
            >
              <div className="font-bold text-base-900">Master Agent</div>
              <div className="text-[10px] text-slate-500">agent@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("broker@goapay.com", "broker123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left"
            >
              <div className="font-bold text-base-900">Elite Broker</div>
              <div className="text-[10px] text-slate-500">broker@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("operator@goapay.com", "operator123")}
              className="p-2 border border-base-200 rounded hover:bg-base-100/40 text-left bg-emerald-50/50"
            >
              <div className="font-bold text-[#0c4a6e]">QR Operator</div>
              <div className="text-[10px] text-slate-500">operator@goapay.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
