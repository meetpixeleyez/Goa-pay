"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  QrCode,
  ShieldCheck,
  Clock,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Bell,
  ArrowRight,
  Building,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";

import { useAppSelector } from "@/store/hooks";

export default function OperatorDashboardPage() {
  const reduxUser = useAppSelector((state) => state.auth.user);
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const profile = reduxUser;
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/operator/stats"),
        fetch("/api/operator/orders"),
      ]);

      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (ordersData.success) {
        setRecentOrders((ordersData.orders || []).slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket({ role: "OPERATOR" });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchDashboardData();
    };

    socket.on("payout:available", handleUpdate);
    socket.on("payout:claimed", handleUpdate);
    socket.on("order:assigned", handleUpdate);
    socket.on("payin:assigned", handleUpdate);
    socket.on("order:updated", handleUpdate);

    return () => {
      socket.off("payout:available", handleUpdate);
      socket.off("payout:claimed", handleUpdate);
      socket.off("order:assigned", handleUpdate);
      socket.off("payin:assigned", handleUpdate);
      socket.off("order:updated", handleUpdate);
    };
  }, [socket]);

  return (
    <PortalLayout
      portal="operator"
      title="Operator Dashboard"
      subtitle={
        profile?.qrProvider
          ? `Operating on behalf of ${profile.qrProvider.name} (${profile.qrProvider.email})`
          : "Fulfill deposit verifications and payouts for your assigned collection QR codes"
      }
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/operator/available-orders"
            className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3 shadow"
          >
            <Bell className="w-4 h-4" />
            <span>Available Payouts</span>
            {stats?.availablePayouts > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse">
                {stats.availablePayouts}
              </span>
            )}
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Operator Shift Status Header */}
        <div className="card-theme p-5 border-l-4 border-l-primary shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-base-700 uppercase tracking-wider">
                Shift Status:
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>ONLINE & ACTIVE</span>
              </span>
            </div>
            <h2 className="text-lg font-bold text-base-900">
              Welcome, {profile?.name || "Operator"}
            </h2>
            <p className="text-xs text-base-700">
              You have{" "}
              <strong className="text-base-900">
                {stats?.assignedQrCount || 0} collection QR code(s)
              </strong>{" "}
              assigned to your account. Orders routed to these QR codes will appear in your queue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/operator/orders"
              className="px-3.5 py-2 rounded-xl bg-white border border-base-200 text-gray-800 text-xs font-bold hover:bg-gray-50 flex items-center space-x-1.5 shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span>Assigned Orders</span>
            </Link>
            <Link
              href="/operator/qr-codes"
              className="px-3.5 py-2 rounded-xl bg-white border border-base-200 text-gray-800 text-xs font-bold hover:bg-gray-50 flex items-center space-x-1.5 shadow-xs"
            >
              <QrCode className="w-4 h-4 text-primary" />
              <span>My QR Codes</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Assigned QRs */}
          <div className="card-theme p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider">
                Assigned QR Codes
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-[#0c4a6e] flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-base-900">
              {stats?.assignedQrCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <span className="font-bold text-emerald-700">
                {stats?.activeQrCount || 0} active
              </span>
              <span>routing orders</span>
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="card-theme p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider">
                Pending Verification
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-sky-600">
              {stats?.processingOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500">Deposit orders awaiting UTR confirmation</div>
          </div>

          {/* Completed Orders */}
          <div className="card-theme p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider">
                Total Orders Handled
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {stats?.completedOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500">
              ₹{Number(stats?.totalVolume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
              total volume
            </div>
          </div>

          {/* Available Payouts in Pool */}
          <div className="card-theme p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider">
                Available Payouts Pool
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-blue-700">
              {stats?.availablePayouts || 0}
            </div>
            <Link
              href="/operator/available-orders"
              className="text-[11px] font-bold text-blue-700 hover:underline flex items-center space-x-1"
            >
              <span>Accept withdrawal orders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent Orders Queue */}
        <div className="card-theme overflow-hidden shadow-sm">
          <div className="p-4 bg-base-100/60 border-b border-base-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-[#0c4a6e]" />
              <h3 className="font-bold text-sm text-base-900">
                Recent Assigned Orders Queue (Your QR Codes)
              </h3>
            </div>
            <Link
              href="/operator/orders"
              className="text-xs font-bold text-[#0c4a6e] hover:underline flex items-center space-x-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700">No Orders in Your Queue</p>
              <p>When customer deposits are generated for your assigned QR codes, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/40 border-b border-base-200 text-base-700 uppercase text-[10px] tracking-wider font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">QR Code</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60 bg-white">
                  {recentOrders.map((ord) => {
                    const isDeposit = ord.type === "PAYIN";
                    return (
                      <tr key={ord.id} className="hover:bg-base-100/20 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-base-900">
                          {ord.orderNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDeposit
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {isDeposit ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{ord.type}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-800">{ord.customerName}</div>
                          <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-base-900">
                          ₹{Number(ord.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          {ord.qrCode ? (
                            <span className="font-mono text-[10px] text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {ord.qrCode.upiId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ord.status === "completed"
                                ? "badge-completed"
                                : ord.status === "processing"
                                ? "badge-processing animate-pulse"
                                : ord.status === "pending"
                                ? "badge-pending"
                                : "badge-rejected"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href="/operator/orders"
                            className="px-2.5 py-1 text-[11px] font-bold text-[#0c4a6e] bg-primary/15 hover:bg-primary/25 rounded border border-primary/30 transition inline-flex items-center space-x-1"
                          >
                            <span>Handle Order</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
