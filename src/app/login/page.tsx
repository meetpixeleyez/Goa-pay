"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let deviceId = "";
      let clientIp = "";
      let location = "";
      let deviceInfo = "";

      if (typeof window !== "undefined") {
        deviceId = localStorage.getItem("goa_device_id") || "";
        if (!deviceId) {
          deviceId = "dev_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          localStorage.setItem("goa_device_id", deviceId);
        }

        const ua = navigator.userAgent;
        let os = "Windows";
        if (ua.includes("Mac")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

        let browser = "Chrome";
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Edg")) browser = "Edge";

        deviceInfo = `${browser} on ${os}`;

        // Attempt fast public IP & Geo lookup
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const geoRes = await fetch("https://ipwho.is/", { signal: controller.signal });
          clearTimeout(timeoutId);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.success) {
              clientIp = geoData.ip || "";
              location = `${geoData.city || ""}, ${geoData.region || ""}, ${geoData.country || "India"}`.replace(/^, |, $/g, "").trim();
            }
          }
        } catch {
          // Graceful fallback if offline
        }
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceId, clientIp, location, deviceInfo }),
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
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="card-theme p-8 shadow-sm border border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 items-center justify-center text-white mb-3 shadow-sm ring-1 ring-white/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Access Admin, Merchant, QR Provider, or Operator dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email, Username, or Mobile Number
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email, username, or mobile"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5"
          >
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
            Quick-Fill Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo("admin@goapay.com", "admin123")}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-slate-900 text-xs">Super Admin</div>
              <div className="text-[10px] text-slate-500 font-mono">admin@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("merchant@goapay.com", "merchant123")}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-slate-900 text-xs">Merchant</div>
              <div className="text-[10px] text-slate-500 font-mono">merchant@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("provider@goapay.com", "provider123")}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-slate-900 text-xs">QR Provider</div>
              <div className="text-[10px] text-slate-500 font-mono">provider@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("agent@goapay.com", "agent123")}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-slate-900 text-xs">Master Agent</div>
              <div className="text-[10px] text-slate-500 font-mono">agent@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("broker@goapay.com", "broker123")}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-slate-900 text-xs">Elite Broker</div>
              <div className="text-[10px] text-slate-500 font-mono">broker@goapay.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("operator@goapay.com", "operator123")}
              className="p-2 border border-emerald-200 bg-emerald-50/40 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
            >
              <div className="font-bold text-emerald-800 text-xs">QR Operator</div>
              <div className="text-[10px] text-emerald-600 font-mono">operator@goapay.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
