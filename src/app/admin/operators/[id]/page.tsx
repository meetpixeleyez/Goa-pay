"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Building2,
  Monitor,
} from "lucide-react";

export default function AdminOperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const operatorId = params.id as string;
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"qrs" | "sessions">(
    tabParam === "sessions" ? "sessions" : "qrs"
  );
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOperator = async () => {
    try {
      setLoading(true);
      setError("");

      const opRes = await fetch(`/api/qr-provider/operators/${operatorId}`);
      const opData = await opRes.json();

      if (!opRes.ok) throw new Error(opData.error || "Failed to load operator details");

      setOperator(opData.operator);
    } catch (err: any) {
      setError(err.message || "Failed to load operator details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operatorId) {
      fetchOperator();
    }
  }, [operatorId]);

  if (loading) {
    return (
      <PortalLayout
        portal="admin"
        title="Operator Details"
        subtitle="Loading sub-operator profile..."
      >
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading operator profile & assigned QR codes...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !operator) {
    return (
      <PortalLayout portal="admin" title="Operator Not Found" subtitle="Error locating operator">
        <div className="card-theme p-8 text-center space-y-4">
          <p className="text-sm text-red-600 font-semibold">{error || "Operator does not exist."}</p>
          <button
            onClick={() => router.push("/admin/operators")}
            className="btn-primary text-xs py-2 px-4 shadow inline-flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Operators</span>
          </button>
        </div>
      </PortalLayout>
    );
  }

  const activeQrs = (operator.assignedQRCodes || []).filter((q: any) => q.isActive);
  const isActive = operator.status === "ACTIVE";

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center gap-3">
          <div
            className={`size-10 sm:size-11 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg border shrink-0 transition-colors ${
              isActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
            }`}
          >
            {operator.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-800">{operator.name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
              <span>ID: {operator.id}</span>
            </div>
          </div>
        </div>
      }
      actions={
        <Link
          href="/admin/users"
          className="btn-secondary text-xs py-2 px-3 inline-flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* Parent QR Provider Information Card */}
        {operator.qrProvider && (
          <div className="card-theme p-4 shadow-sm border border-base-200 bg-[#fdfbf7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-base-700 block truncate">
                  Parent QR Provider
                </span>
                <Link
                  href={`/admin/qr-providers/${operator.qrProvider.id}`}
                  className="font-bold text-sm text-base-900 hover:text-primary hover:underline flex items-center space-x-1.5 truncate"
                >
                  <span className="truncate">{operator.qrProvider.name}</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                </Link>
                <div className="text-[11px] text-slate-500 font-mono truncate max-w-full mt-0.5 flex items-center gap-2">
                  <span>ID: {operator.qrProvider.id}</span>
                  {operator.qrProvider.phone && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-slate-400" />
                        <span>{operator.qrProvider.phone}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/admin/qr-providers/${operator.qrProvider.id}`}
              className="px-3 py-1.5 bg-white border border-base-200 hover:bg-base-100/40 text-xs font-semibold rounded-lg text-base-900 flex items-center space-x-1.5 transition shrink-0 whitespace-nowrap shadow-2xs self-start sm:self-auto"
            >
              <span>View Parent Provider</span>
              <ExternalLink className="w-3 h-3 text-primary" />
            </Link>
          </div>
        )}

        {/* Live Performance & Assigned QR Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active QR</span>
            </div>
            <div className="text-2xl font-bold text-base-900">{activeQrs.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {activeQrs.length > 0 ? activeQrs[0].upiId : "No active collection point"}
            </div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Orders Processed</span>
            </div>
            <div className="text-2xl font-bold text-base-900">
              {operator.stats?.totalOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Via assigned QR codes</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-emerald-700 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Completed Orders</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {operator.stats?.completedOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Settled & verified</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Portal Access</span>
            </div>
            <div className="text-base font-bold text-base-900 mt-1">
              {operator.portalAccess !== false ? "Permitted" : "Suspended"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Txns: {operator.transactionAllowed !== false ? "Allowed" : "Blocked"}
            </div>
          </div>
        </div>

        {/* Tabs Navigation (1st Active Collection QR Code, 2nd Recent Login & Device Security Sessions) */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("qrs")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "qrs"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Active Collection QR Code ({activeQrs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "sessions"
                ? "border-primary text-base-900"
                : "border-transparent text-slate-500 hover:text-gray-700"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Recent Login & Device Security Sessions</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE QR CODE SECTION (READ-ONLY) */}
        {activeTab === "qrs" && (
          <div className="card-theme shadow-sm border border-base-200 overflow-hidden">
            <div className="p-4 border-b border-base-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-base-100/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-bold text-sm text-base-900">
                    Active Collection QR Code ({activeQrs.length})
                  </h3>
                </div>
                <p className="text-xs text-base-700 mt-0.5">
                  Current active collection QR code utilized by {operator.name} for incoming deposits
                </p>
              </div>
            </div>

            {activeQrs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <QrCode className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-base-900 text-sm">No Active QR Code</p>
                <p className="max-w-md mx-auto text-slate-500">
                  This operator currently does not have an active QR code enabled in their portal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {activeQrs.map((qr: any) => (
                  <div
                    key={qr.id}
                    className="bg-white rounded-xl border border-base-200 p-4 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex space-x-3 items-start">
                      {qr.imageUrl ? (
                        <div className="relative group shrink-0">
                          <img
                            src={qr.imageUrl}
                            alt={qr.upiId}
                            className="w-16 h-16 object-contain rounded-lg border border-base-200 bg-white p-1"
                          />
                          <a
                            href={qr.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-[9px] font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-base-200 bg-base-100/30 flex items-center justify-center text-primary shrink-0">
                          <QrCode className="w-8 h-8" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-mono text-xs font-bold text-base-900 truncate" title={qr.upiId}>
                          {qr.upiId}
                        </div>
                        {qr.bankName && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {qr.bankName}
                          </div>
                        )}
                        {qr.accountHolderName && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {qr.accountHolderName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Read-Only Status Badge */}
                    <div className="pt-2.5 border-t border-[#e0f2fe] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-600">QR Status:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center space-x-1 ${
                          qr.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            qr.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{qr.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECENT LOGIN & DEVICE SECURITY SESSIONS */}
        {activeTab === "sessions" && (
          <div className="card-theme p-6 shadow-sm border border-base-200 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-base-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-900">Recent Login & Device Security Sessions</h3>
                <p className="text-[11px] text-slate-500">
                  Audit trail of verified shift logins with IP address, device ID, and location
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3">Login Date & Time</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Device ID</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200">
                  {!operator.auditLogs || operator.auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No shift login sessions recorded yet for this operator.
                      </td>
                    </tr>
                  ) : (
                    operator.auditLogs.map((log: any) => {
                      let meta: any = {};
                      try {
                        meta =
                          typeof log.metadata === "string"
                            ? JSON.parse(log.metadata)
                            : log.metadata || {};
                      } catch {
                        meta = {};
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {meta.ip || "127.0.0.1"}
                          </td>
                          <td
                            className="p-3 font-mono text-[11px] text-slate-600 truncate max-w-[180px]"
                            title={meta.deviceId || meta.userAgent}
                          >
                            {meta.deviceId || "Web Client"}
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            {meta.location || "India"}
                          </td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Verified
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
