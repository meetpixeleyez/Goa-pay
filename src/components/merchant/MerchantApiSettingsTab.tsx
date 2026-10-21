"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  Save,
  Globe,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";
import ModalPortal from "@/components/common/ModalPortal";

interface MerchantApiSettingsTabProps {
  merchantId?: string;
  isAdminView?: boolean;
}

export default function MerchantApiSettingsTab({
  merchantId,
  isAdminView = false,
}: MerchantApiSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Settings
  const [webhookUrl, setWebhookUrl] = useState("");
  const [defaultSuccessUrl, setDefaultSuccessUrl] = useState("");
  const [defaultFailureUrl, setDefaultFailureUrl] = useState("");

  // API Keys & Webhook Deliveries
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Copied states
  const [copiedKeyId, setCopiedKeyId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Key Generation Modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{
    keyId: string;
    apiSecret: string;
  } | null>(null);

  // Test Webhook State
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Retrying Webhook ID
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const url = merchantId
        ? `/api/merchant/api-settings?merchantId=${merchantId}`
        : `/api/merchant/api-settings`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");

      if (data.merchant) {
        setWebhookUrl(data.merchant.webhookUrl || "");
        setDefaultSuccessUrl(data.merchant.defaultSuccessUrl || "");
        setDefaultFailureUrl(data.merchant.defaultFailureUrl || "");
      }
      setApiKeys(data.apiKeys || []);
      setDeliveries(data.webhookDeliveries || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load API settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [merchantId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/merchant/api-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId || undefined,
          webhookUrl: webhookUrl.trim() || null,
          defaultSuccessUrl: defaultSuccessUrl.trim() || null,
          defaultFailureUrl: defaultFailureUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setSuccessMsg("API and Redirect URLs saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/merchant/api-keys/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId || undefined,
          name: "Production API Key",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate key");

      setGeneratedKey({
        keyId: data.apiKey.keyId,
        apiSecret: data.apiKey.apiSecret,
      });
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate API Key");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleKey = async (keyId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch(`/api/merchant/api-keys/${keyId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle key status");
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle key status");
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl || !webhookUrl.trim()) {
      setErrorMsg("Please enter and save a Webhook Callback URL first.");
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/merchant/webhooks/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId || undefined,
          targetUrl: webhookUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Webhook test failed");

      setTestResult(data.message);
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || "Webhook test failed");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleRetryWebhook = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const res = await fetch(`/api/merchant/webhooks/${deliveryId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Webhook retry failed");
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message || "Webhook retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const activeApiKey = apiKeys.find((k) => k.status === "ACTIVE") || apiKeys[0];

  if (loading) {
    return (
      <div className="card-theme p-10 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Loading API & Webhook settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success & Error Banners */}
      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2 font-semibold">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Integration Docs Helper Banner */}
      <div className="p-4 bg-gradient-to-r from-sky-50 via-sky-50/50 to-white border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Developer Integration Documentation</h4>
            <p className="text-[11px] text-slate-500">
              Need copy-pasteable snippets? Check out our quick start guide with cURL, Node.js, Python, and PHP examples.
            </p>
          </div>
        </div>
        <a
          href={isAdminView ? "/docs/merchant" : "/merchant/docs"}
          target={isAdminView ? "_blank" : undefined}
          rel={isAdminView ? "noopener noreferrer" : undefined}
          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white border border-sky-200 hover:border-primary text-primary hover:text-sky-700 text-xs font-bold shadow-2xs transition shrink-0"
        >
          <span>View Integration Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* TOP SECTION: API KEY & CREDENTIALS CARD */}
      <div className="card-theme p-5 sm:p-6 border border-base-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-base-200 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-bold text-base text-base-900">API Key & Secret Credentials</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authenticate merchant REST APIs with HMAC-SHA256 signature verification.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setGeneratedKey(null);
              setShowGenModal(true);
            }}
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Generate New Secret & Key</span>
          </button>
        </div>

        {activeApiKey ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Key ID Box */}
            <div className="p-4 bg-gray-50 border border-base-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Merchant API Key ID (X-API-KEY)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeApiKey.status === "ACTIVE"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {activeApiKey.status}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5">
                <code className="text-xs font-mono font-bold text-base-900 truncate mr-2 select-all">
                  {activeApiKey.keyId}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeApiKey.keyId);
                    setCopiedKeyId(true);
                    setTimeout(() => setCopiedKeyId(false), 2000);
                  }}
                  className="p-1.5 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md transition shrink-0"
                  title="Copy Key ID"
                >
                  {copiedKeyId ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Created: {new Date(activeApiKey.createdAt).toLocaleDateString()} • Last used:{" "}
                {activeApiKey.lastUsedAt
                  ? new Date(activeApiKey.lastUsedAt).toLocaleString()
                  : "Never"}
              </p>
            </div>

            {/* Secret Box */}
            <div className="p-4 bg-gray-50 border border-base-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Merchant API Secret (HMAC Signing)
                </span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Encrypted at rest
                </span>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5">
                <code className="text-xs font-mono font-bold text-gray-600 truncate mr-2">
                  {activeApiKey.secretMasked || "gpay_live_sec_••••••••••••"}
                </code>
                <span className="text-[11px] text-gray-400 italic">Hidden for security</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Secret is revealed once upon generation.
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleKey(activeApiKey.id, activeApiKey.status)}
                  className={`text-[11px] font-bold hover:underline ${
                    activeApiKey.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {activeApiKey.status === "ACTIVE" ? "Disable Key" : "Enable Key"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">No API Key Generated Yet</h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                Generate an API key and secret to enable programmatic payin deposits, payouts, order status polling, and balance checks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setGeneratedKey(null);
                setShowGenModal(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Generate API Key & Secret</span>
            </button>
          </div>
        )}
      </div>

      {/* MIDDLE SECTION: REDIRECT URLS & WEBHOOK CONFIGURATION CARD */}
      <div className="card-theme p-5 sm:p-6 border border-base-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-base-200 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-bold text-base text-base-900">
                Hosted Checkout Redirects & Webhook Configuration
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure return URLs for customers after payment completion or failure, and webhook callback endpoint.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook || !webhookUrl}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition shrink-0 disabled:opacity-50"
          >
            {testingWebhook ? (
              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Send Test Webhook</span>
          </button>
        </div>

        {testResult && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Success Redirect URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-base-900">
                Default Success Redirect URL
              </label>
              <input
                type="url"
                value={defaultSuccessUrl}
                onChange={(e) => setDefaultSuccessUrl(e.target.value)}
                placeholder="https://merchant.com/checkout/success"
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-base-900"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Customers are redirected here with order details upon successful deposit payment completion.
              </p>
            </div>

            {/* Failure Redirect URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-base-900">
                Default Failure / Cancel Redirect URL
              </label>
              <input
                type="url"
                value={defaultFailureUrl}
                onChange={(e) => setDefaultFailureUrl(e.target.value)}
                placeholder="https://merchant.com/checkout/failure"
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-base-900"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Customers are redirected here if payment times out (5 mins) or is cancelled.
              </p>
            </div>
          </div>

          {/* Webhook Callback URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-base-900">
              Webhook Callback URL (POST)
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://merchant.com/api/webhooks/goapay"
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-base-900"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Receives signed real-time webhook events: <code className="font-bold text-gray-700">order.payin.completed</code>, <code className="font-bold text-gray-700">order.payin.rejected</code>, <code className="font-bold text-gray-700">order.payout.completed</code>.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Saving..." : "Save Redirect & Webhook Settings"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* BOTTOM SECTION: WEBHOOK DELIVERY LOGS TABLE */}
      <div className="card-theme p-5 sm:p-6 border border-base-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-base-200">
          <div>
            <h3 className="font-bold text-base text-base-900">Webhook Delivery History & Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live log of webhook events sent to the merchant endpoint with status, response codes, and manual retry.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="p-1.5 text-slate-500 hover:text-primary rounded-md transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {deliveries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-base-200 bg-gray-50/70 text-gray-600 font-bold">
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Target URL</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">HTTP Code</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-base-900">
                      {d.event}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600 truncate max-w-[200px]" title={d.targetUrl}>
                      {d.targetUrl}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === "DELIVERED"
                            ? "bg-green-100 text-green-800"
                            : d.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      {d.responseCode ? (
                        <span className={d.responseCode >= 200 && d.responseCode < 300 ? "text-green-700" : "text-red-700"}>
                          {d.responseCode}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {d.attempts} / {d.maxAttempts}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {d.status !== "DELIVERED" && (
                        <button
                          type="button"
                          onClick={() => handleRetryWebhook(d.id)}
                          disabled={retryingId === d.id}
                          className="px-2 py-1 text-[11px] font-bold bg-white hover:bg-gray-100 border border-gray-300 rounded text-gray-700 transition disabled:opacity-50"
                        >
                          {retryingId === d.id ? "Retrying..." : "Retry Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            No webhook deliveries recorded yet. Use the &quot;Send Test Webhook&quot; button above to verify your endpoint.
          </div>
        )}
      </div>

      {/* QUICK API INTEGRATION REFERENCE */}
      <div className="card-theme p-5 sm:p-6 border border-base-200 shadow-sm space-y-3 bg-gray-50/60">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-base-900">
            Developer Quick Reference: API Headers & Signature Formula
          </h4>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          All requests to <code className="font-mono font-bold text-gray-800">/api/v1/orders/payin</code> and <code className="font-mono font-bold text-gray-800">/api/v1/orders/payout</code> require three mandatory authentication headers:
        </p>
        <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto shadow-inner">
          <div><span className="text-sky-400">X-API-KEY</span>: {activeApiKey?.keyId || "gpay_live_key_..."}</div>
          <div><span className="text-sky-400">X-TIMESTAMP</span>: Math.floor(Date.now() / 1000)</div>
          <div><span className="text-sky-400">X-SIGNATURE</span>: HMAC-SHA256(apiSecret, &quot;timestamp.method.pathname.rawBody&quot;)</div>
        </div>
      </div>

      {/* GENERATE SECRET MODAL */}
      {showGenModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in duration-150">
            {!generatedKey ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-base-900">Generate New API Key & Secret</h3>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                    Generating a new API Key will create a new key pair for this merchant account. The secret will only be displayed once upon creation.
                  </p>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    disabled={generating}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    {generating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{generating ? "Generating..." : "Confirm & Generate"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-green-800">New Credentials Created!</h3>
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-semibold leading-relaxed">
                    ⚠️ Please copy and save your API Secret immediately. For your security, this secret will <u>never be shown again</u>!
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      API Key ID
                    </label>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <code className="text-xs font-mono font-bold text-base-900 select-all truncate mr-2">
                        {generatedKey.keyId}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey.keyId);
                          setCopiedKeyId(true);
                          setTimeout(() => setCopiedKeyId(false), 2000);
                        }}
                        className="p-1 text-gray-600 hover:text-primary transition shrink-0"
                      >
                        {copiedKeyId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      API Secret Key (Save Now)
                    </label>
                    <div className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-300 rounded-lg">
                      <code className="text-xs font-mono font-bold text-amber-900 select-all truncate mr-2">
                        {generatedKey.apiSecret}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey.apiSecret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="p-1 text-gray-600 hover:text-primary transition shrink-0"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    I Have Safely Saved My API Secret
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
