"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

export default function OperatorDetailPage() {
  const params = useParams();
  const operatorId = params.id as string;

  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOperator = async () => {
    try {
      setLoading(true);
      setError("");
      const opRes = await fetch(`/api/qr-provider/operators/${operatorId}`);
      const opData = await opRes.json();

      if (!opRes.ok) throw new Error(opData.error || "Failed to load operator details");

      setOperator(opData.operator);
    } catch (err: any) {
      setError(err.message || "Failed to load operator");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operatorId) fetchOperator();
  }, [operatorId]);

  if (loading) {
    return (
      <PortalLayout portal="qr-provider" title="Operator Details" subtitle="Loading operator info...">
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      </PortalLayout>
    );
  }

  if (error && !operator) {
    return (
      <PortalLayout portal="qr-provider" title="Operator Details" subtitle="Error">
        <div className="card-theme p-8 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-base-900">Operator Not Found</h2>
          <p className="text-xs text-gray-600">{error}</p>
          <Link href="/qr-provider/operators" className="btn-primary py-2 px-4 text-xs font-bold inline-block">
            Back to Operators
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const activeQRs = (operator?.assignedQRCodes || []).filter((q: any) => q.isActive);
  const isActive = operator?.status === "ACTIVE";

  return (
    <PortalLayout
      portal="qr-provider"
      title="Operator Details"
      subtitle="Dedicated Sub-Operator View"
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
      <div className="space-y-6">
        {/* Feedback Messages */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 font-bold">✕</button>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-800 font-bold">✕</button>
          </div>
        )}

        {/* Hero Identity Card (Read-Only Preview) */}
        <div className="card-theme p-5 sm:p-6 shadow-sm border border-base-200">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shrink-0 border shadow-xs transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                    : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
                }`}
              >
                {operator.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-base-900 truncate">{operator.name}</h1>
                </div>
                <div className="flex items-center space-x-4 text-xs text-base-700 mt-1 flex-wrap gap-y-1 min-w-0 font-mono">
                  <span className="font-semibold text-slate-600">ID: {operator.id}</span>
                  {operator.phone && (
                    <span className="flex items-center space-x-1 shrink-0">
                      <span className="text-slate-300">•</span>
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold">{operator.phone}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1 text-gray-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Registered {new Date(operator.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Active Collection QR</span>
              <QrCode className="w-4 h-4 text-primary shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-base-900">
              {activeQRs.length}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              {activeQRs.length > 0 ? activeQRs[0].upiId : "No active collection point"}
            </span>
          </div>

          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Orders Handled</span>
              <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-base-900">
              {operator.stats?.totalOrders || 0}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Total sessions routed to operator</span>
          </div>

          <div className="card-theme p-4 border border-base-200 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-700 font-bold truncate">Completed & Settled</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-700">
              {operator.stats?.completedOrders || 0}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Successfully fulfilled transactions</span>
          </div>
        </div>

        {/* Section: Active Collection QR Code (Read-Only) */}
        <div className="card-theme overflow-hidden shadow-sm border border-base-200">
          <div className="p-4 sm:p-5 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-base-100/30">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-primary shrink-0" />
                <h3 className="font-bold text-base text-base-900">Active Collection QR Code</h3>
              </div>
              <p className="text-xs text-base-700 mt-0.5">
                Current active collection QR code managed by this operator in their portal.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                <tr>
                  <th className="p-3.5">QR Preview</th>
                  <th className="p-3.5">UPI ID (VPA)</th>
                  <th className="p-3.5">Bank Details</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0f2fe]">
                {activeQRs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <QrCode className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="font-semibold text-gray-600">No Active QR Code</p>
                        <p className="text-[11px] text-gray-400">
                          The operator currently does not have an active QR code enabled in their portal.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeQRs.map((qr: any) => (
                    <tr key={qr.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3.5">
                        {qr.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg border border-base-200 bg-white p-0.5 overflow-hidden">
                            <img src={qr.imageUrl} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <QrCode className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-base-900">
                        {qr.upiId}
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">
                        {qr.bankName || "UPI Bank"} {qr.accountHolderName ? `• ${qr.accountHolderName}` : ""}
                      </td>
                      <td className="p-3.5 text-right">
                        <span className="px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Account Rules & Isolation Notice */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Operator Ledger & Security Rules</span>
            <p className="text-[11px] text-purple-800">
              This operator only has visibility over orders assigned to their designated collection QR codes above.
              Financial balances, payout disbursements, and ledger entries settle strictly against your parent QR Provider wallet.
            </p>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
