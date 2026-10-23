"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Wallet,
  Lock,
  CheckCircle2,
  QrCode,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  Bell,
  BellRing,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";

export default function QRProviderDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [availablePayoutCount, setAvailablePayoutCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { socket } = useSocket({ role: "QR_PROVIDER" });

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/qr-provider/stats"),
        fetch("/api/qr-provider/orders"),
      ]);

      const statsData = await statsRes.json();
      const ordersData = await ordersRes.json();

      if (statsData.success) setStats(statsData);
      if (ordersData.success) {
        setOrders(ordersData.orders || []);
        if (ordersData.availablePayoutCount !== undefined) {
          setAvailablePayoutCount(ordersData.availablePayoutCount);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-Time Socket.IO Synchronization (Eliminates repeated polling & API hammering)
  useEffect(() => {
    if (!socket) return;

    const handlePayoutAvailable = () => {
      setAvailablePayoutCount((prev) => prev + 1);
    };

    const handlePayoutClaimed = () => {
      setAvailablePayoutCount((prev) => Math.max(0, prev - 1));
      fetchData();
    };

    const handlePayoutReleased = () => {
      setAvailablePayoutCount((prev) => prev + 1);
      fetchData();
    };

    const handlePayoutCompleted = () => {
      fetchData();
    };

    const handleStatsUpdate = () => {
      fetchData();
    };

    socket.on("payout:available", handlePayoutAvailable);
    socket.on("payout:claimed", handlePayoutClaimed);
    socket.on("payout:released", handlePayoutReleased);
    socket.on("payout:completed", handlePayoutCompleted);
    socket.on("order:assigned", handleStatsUpdate);
    socket.on("payin:assigned", handleStatsUpdate);
    socket.on("order:updated", handleStatsUpdate);
    socket.on("stats:update", handleStatsUpdate);

    return () => {
      socket.off("payout:available", handlePayoutAvailable);
      socket.off("payout:claimed", handlePayoutClaimed);
      socket.off("payout:released", handlePayoutReleased);
      socket.off("payout:completed", handlePayoutCompleted);
      socket.off("order:assigned", handleStatsUpdate);
      socket.off("payin:assigned", handleStatsUpdate);
      socket.off("order:updated", handleStatsUpdate);
      socket.off("stats:update", handleStatsUpdate);
    };
  }, [socket]);

  const processingOrders = orders.filter((o) => o.status === "processing");
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <PortalLayout
      portal="qr-provider"
      title="QR Provider Liquidity Dashboard"
      subtitle="Monitor your exposure reserve, available balance for order intake, and pending payment verifications"
      actions={
        <div className="flex items-center space-x-2">
          {/* Notification Bell Icon */}
          <Link
            href="/qr-provider/available-orders"
            className="relative p-2 border border-base-200 rounded-xl bg-white hover:bg-sky-50 text-gray-700 transition flex items-center justify-center shadow-xs"
            title={
              availablePayoutCount > 0
                ? `${availablePayoutCount} Withdrawal Orders Waiting in Pool`
                : "No pending withdrawal orders"
            }
          >
            <Bell
              className={`w-4 h-4 ${
                availablePayoutCount > 0 ? "text-sky-600 animate-bounce" : "text-slate-500"
              }`}
            />
            {availablePayoutCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white ring-2 ring-white">
                {availablePayoutCount}
              </span>
            )}
          </Link>

          {/* Available Withdrawals Quick-Link Button with Badge */}
          <Link
            href="/qr-provider/available-orders"
            className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow relative"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Available Withdrawals</span>
            {availablePayoutCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                {availablePayoutCount}
              </span>
            )}
          </Link>

          <Link
            href="/qr-provider/operators"
            className="p-2 border border-base-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center space-x-1"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Operators</span>
          </Link>


          <button
            onClick={fetchData}
            className="p-2 border border-base-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      {/* Prominent Notification Banner for Available Withdrawal Orders */}
      {availablePayoutCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-sky-50 border-2 border-sky-300 text-sky-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-sm text-base-900">
                  Incoming Withdrawal Orders Waiting in Pool!
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse">
                  {availablePayoutCount} Available
                </span>
              </div>
              <p className="text-xs text-base-700 mt-0.5">
                New customer payout orders are broadcasted. Accept an order to fulfill customer disbursement and earn payout commission.
              </p>
            </div>
          </div>
          <Link
            href="/qr-provider/available-orders"
            className="btn-primary text-xs py-2 px-4 shrink-0 font-bold shadow flex items-center space-x-1"
          >
            <span>View & Claim Orders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Transaction Restricted Warning */}
      {stats && stats.transactionAllowed === false && (
        <div className="mb-6 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Transactions Restricted by Administrator</h4>
            <p className="text-xs text-sky-700 mt-0.5">
              Your transaction permission is currently disabled. Incoming order assignment and verification are paused until re-enabled by the administrator.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Holding Balance
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              ₹{stats?.balance?.toFixed(2) || "0.00"}
            </span>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Total account holding funds</span>
        </div>

        {/* Reserved Exposure */}
        <div className="card-theme p-5 border-sky-200 bg-sky-50/20">
          <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider block">
            Reserved Exposure
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-sky-700">
              ₹{stats?.exposure?.toFixed(2) || "0.00"}
            </span>
            <Lock className="w-5 h-5 text-sky-600" />
          </div>
          <span className="text-[11px] text-sky-700 mt-1 block">
            Locked during active 5-min checkouts
          </span>
        </div>

        {/* Available Balance */}
        <div className="card-theme p-5 border-green-200 bg-green-50/20">
          <span className="text-xs font-semibold text-green-800 uppercase tracking-wider block">
            Available Balance
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-green-700">
              ₹{stats?.availableBalance?.toFixed(2) || "0.00"}
            </span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-[11px] text-green-700 mt-1 block">
            Balance - Exposure (Ready for new orders)
          </span>
        </div>

        {/* Provider Fee % */}
        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Fee Commission
          </span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]/60">
              IN: {stats?.payinFeePercent ?? stats?.feePercent ?? 3}%
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]/60">
              OUT: {stats?.payoutFeePercent ?? stats?.feePercent ?? 1}%
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block">
            Deposit (Payin) & Withdrawal (Payout)
          </span>
        </div>
      </div>

      {/* Pending Action Alert */}
      {processingOrders.length > 0 && (
        <div className="card-theme p-4 bg-sky-50 border border-sky-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
              {processingOrders.length}
            </div>
            <div>
              <h3 className="font-bold text-sm text-sky-900">
                Payments Awaiting Your Verification
              </h3>
              <p className="text-xs text-sky-700">
                Customers have submitted payments with UTR. Verify and settle balances directly.
              </p>
            </div>
          </div>
          <Link
            href="/qr-provider/orders"
            className="btn-primary text-xs py-2 px-3 shrink-0 shadow"
          >
            Verify Now
          </Link>
        </div>
      )}

      {/* Assigned Orders Quick Table */}
      <div className="card-theme overflow-hidden shadow-sm">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-base-900">Recent Orders</h2>
            <p className="text-xs text-base-700">Real-time stream of incoming collections and customer disbursements</p>
          </div>
          <Link
            href="/qr-provider/orders"
            className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Type</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No assigned orders yet.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((ord) => {
                  const isDeposit = (ord.type || "PAYIN") === "PAYIN";
                  return (
                    <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3 font-mono font-bold text-base-900">
                        {ord.orderNumber}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {isDeposit ? "+ DEPOSIT" : "- WITHDRAWAL"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-base-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                      </td>
                      <td className="p-3 font-bold text-base-900">
                        ₹{ord.amount.toFixed(2)}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {isDeposit ? (
                          ord.status === "completed" ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              {ord.verifierUtr || ord.customerUtr || "Bank Verified"}
                            </span>
                          ) : ord.status === "processing" ? (
                            ord.customerUtr ? (
                              <span className="text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                {ord.customerUtr}
                              </span>
                            ) : (
                              <span className="text-sky-800 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 text-[10px]">
                                Pending UTR
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">--</span>
                          )
                        ) : (
                          ord.payoutProofUtr ? (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                              {ord.payoutProofUtr}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not Submitted</span>
                          )
                        )}
                      </td>
                      <td className="p-3">
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
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        {ord.status === "processing" ? (
                          <Link
                            href="/qr-provider/orders"
                            className="btn-primary py-1 px-2.5 text-xs shadow"
                          >
                            {isDeposit ? "Verify Deposit" : "Fulfill Payout"}
                          </Link>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
