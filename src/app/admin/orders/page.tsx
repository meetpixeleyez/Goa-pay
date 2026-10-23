"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import ModalPortal from "@/components/common/ModalPortal";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  ShieldAlert,
  Eye,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  PlusCircle,
  Bell,
  BellRing,
  Clock,
  Wifi,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  User,
  Phone,
  Store,
  Hash,
  Trash2,
  Upload,
  ImageIcon,
  Landmark,
} from "lucide-react";
import BankTransferCard from "@/components/orders/BankTransferCard";
import { useSocket } from "@/lib/socket-client";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYIN" | "PAYOUT">("ALL");
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState(false);

  // In-Dashboard Order Inspect Modal
  const [inspectOrderId, setInspectOrderId] = useState<number | string | null>(null);

  // Admin Override Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [adminDirectPay, setAdminDirectPay] = useState(false);
  const [verifierUtr, setVerifierUtr] = useState("");
  const [verifierScreenshotFile, setVerifierScreenshotFile] = useState<File | null>(null);
  const [verifierScreenshotPreview, setVerifierScreenshotPreview] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<number | string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { socket, isConnected } = useSocket({ role: "ADMIN" });

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-Time Socket.IO Synchronization (Updates admin orders live without re-fetching API)
  useEffect(() => {
    if (!socket) return;

    const handlePayoutAvailable = (data: any) => {
      if (!data?.order) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.order.id);
        if (exists) {
          return prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o));
        }
        return [data.order, ...prev];
      });
    };

    const handlePayoutClaimed = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? { ...o, status: "processing", qrProviderId: data.qrProviderId }
            : o
        )
      );
    };

    const handlePayoutSubmitted = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? {
                ...o,
                status: "submitted",
                payoutProofUtr: data.utr || o.payoutProofUtr,
                payoutProofImage: data.proofImage || o.payoutProofImage,
                customerUtr: data.utr || o.customerUtr,
              }
            : o
        )
      );
    };

    const handlePayoutCompleted = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: "completed" } : o))
      );
    };

    const handlePayoutCancelled = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: "rejected" } : o))
      );
    };

    const handleOrderUpdated = (data: any) => {
      if (!data?.orderId && !data?.order?.id) return;
      const id = data.orderId || data.order.id;
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...(data.order || data) } : o))
      );
    };

    const handlePayoutReleased = (data: any) => {
      const id = data.orderId || data.order?.id;
      if (!id) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: "pending",
                qrProviderId: null,
                payoutBroadcast: false,
                wasCancelledByProvider: true,
                providerName: data.providerName || o.providerName,
              }
            : o
        )
      );
    };

    socket.on("payout:available", handlePayoutAvailable);
    socket.on("payout:claimed", handlePayoutClaimed);
    socket.on("payout:submitted", handlePayoutSubmitted);
    socket.on("payout:completed", handlePayoutCompleted);
    socket.on("payout:cancelled", handlePayoutCancelled);
    socket.on("payout:released", handlePayoutReleased);
    socket.on("payout:provider_cancelled", handlePayoutReleased);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("payout:available", handlePayoutAvailable);
      socket.off("payout:claimed", handlePayoutClaimed);
      socket.off("payout:submitted", handlePayoutSubmitted);
      socket.off("payout:completed", handlePayoutCompleted);
      socket.off("payout:cancelled", handlePayoutCancelled);
      socket.off("payout:released", handlePayoutReleased);
      socket.off("payout:provider_cancelled", handlePayoutReleased);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [socket]);

  const handleBroadcastPayout = async (orderId: number | string) => {
    try {
      setBroadcastingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/payout/broadcast`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to broadcast");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, payoutBroadcast: true, status: "pending", wasCancelledByProvider: false }
            : o
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleReassignPayout = async (orderId: number | string) => {
    const confirm = window.confirm("Reassign this payout order back to all active QR providers?");
    if (!confirm) return;
    try {
      setBroadcastingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/payout/reassign`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reassign");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, payoutBroadcast: true, status: "pending", qrProviderId: null, wasCancelledByProvider: false }
            : o
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || verifying || verifySuccess) return;

    if (!verifierUtr.trim()) {
      setVerifyError("Please enter the received UTR ID");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    setVerifySuccess("");

    try {
      let uploadedScreenshotUrl = "";
      if (verifierScreenshotFile) {
        const formData = new FormData();
        formData.append("file", verifierScreenshotFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) uploadedScreenshotUrl = uploadData.url;
      }

      const isPayout = selectedOrder.type === "PAYOUT";
      const endpoint = isPayout
        ? `/api/orders/${selectedOrder.id}/payout/confirm`
        : `/api/orders/${selectedOrder.id}/verify`;

      const reqBody = isPayout
        ? {
            utr: verifierUtr.trim(),
            screenshotUrl: uploadedScreenshotUrl,
            paidByAdmin: adminDirectPay || !selectedOrder.qrProviderId,
          }
        : {
            verifierUtr: verifierUtr.trim(),
            verifierScreenshot: uploadedScreenshotUrl,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setVerifySuccess(
        isPayout
          ? (adminDirectPay || !selectedOrder.qrProviderId
              ? "Payout completed directly by Admin!"
              : "Payout confirmed & settled successfully!")
          : "Order verified and settled successfully!"
      );
      setTimeout(() => {
        setSelectedOrder(null);
        fetchOrders();
        setVerifying(false);
      }, 900);
    } catch (err: any) {
      setVerifyError(err.message);
      setVerifying(false);
    }
  };

  // Metrics
  const depositOrders = orders.filter((o) => (o.type || "PAYIN") === "PAYIN");
  const withdrawalOrders = orders.filter((o) => o.type === "PAYOUT");

  const depositVolume = depositOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const withdrawalVolume = withdrawalOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // 5-Minute Unaccepted Payout Alerts (No one accepted within 5 minutes)
  const nowTime = Date.now();
  const unacceptedPayoutOrders = orders.filter((o) => {
    if (o.type !== "PAYOUT" || o.status !== "pending") return false;
    const elapsedMs = nowTime - new Date(o.createdAt).getTime();
    return elapsedMs >= 5 * 60 * 1000;
  });

  const timedOutPayoutOrders = orders.filter((o) => {
    if (o.type !== "PAYOUT" || o.status !== "processing") return false;
    return o.expiresAt && new Date(o.expiresAt).getTime() <= nowTime;
  });

  const totalAdminAlerts = unacceptedPayoutOrders.length + timedOutPayoutOrders.length;

  const filteredOrders = orders.filter((o) => {
    if (filterOnlyAlerts) {
      const isUnaccepted =
        o.type === "PAYOUT" &&
        o.status === "pending" &&
        nowTime - new Date(o.createdAt).getTime() >= 5 * 60 * 1000;
      const isTimedOut =
        o.type === "PAYOUT" &&
        o.status === "processing" &&
        o.expiresAt &&
        new Date(o.expiresAt).getTime() <= nowTime;
      if (!isUnaccepted && !isTimedOut) return false;
    }
    const orderType = o.type || "PAYIN";
    const matchesType = typeFilter === "ALL" || orderType === typeFilter;
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerUtr && o.customerUtr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.merchant?.name && o.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <PortalLayout
      portal="admin"
      title="Global Orders & Settlements"
      subtitle="Monitor all deposit (Payin) and withdrawal (Payout) orders, inspect fee distributions, and execute Admin Override verification"
      actions={
        <div className="flex items-center space-x-2">
          {/* Top Notification Icon for Admin */}
          <button
            type="button"
            onClick={() => setFilterOnlyAlerts((prev) => !prev)}
            className={`relative p-2 border rounded-xl transition flex items-center justify-center shadow-xs ${
              filterOnlyAlerts
                ? "bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400"
                : totalAdminAlerts > 0
                ? "bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100"
                : "bg-white border-base-200 text-gray-700 hover:bg-gray-50"
            }`}
            title={
              totalAdminAlerts > 0
                ? `${totalAdminAlerts} Withdrawal Alerts (Pending > 5 mins without QR provider acceptance)`
                : "No pending alerts"
            }
          >
            <Bell className={`w-4 h-4 ${totalAdminAlerts > 0 ? "text-sky-800 animate-bounce" : "text-slate-500"}`} />
            {totalAdminAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white ring-2 ring-white animate-pulse">
                {totalAdminAlerts}
              </span>
            )}
          </button>

          <button
            onClick={fetchOrders}
            className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Top Volume & Count Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-theme p-4 shadow-sm border border-base-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Deposits
            </span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-base-900 mt-1">
            ₹{depositVolume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <b className="text-emerald-700 font-bold">{depositOrders.length}</b> total deposit transactions
          </div>
        </div>

        <div className="card-theme p-4 shadow-sm border border-base-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Withdrawals
            </span>
            <span className="p-2 rounded-xl bg-sky-100 text-sky-800">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-base-900 mt-1">
            ₹{withdrawalVolume.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <b className="text-sky-800 font-bold">{withdrawalOrders.length}</b> total withdrawal transactions
          </div>
        </div>

        <div className="card-theme p-4 shadow-sm border border-base-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active / Processing
            </span>
            <span className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <RefreshCw className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">
            {orders.filter((o) => o.status === "processing" || o.status === "pending").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Orders pending settlement or UTR check
          </div>
        </div>

        <div className="card-theme p-4 shadow-sm border border-base-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Settled Orders
            </span>
            <span className="p-2 rounded-xl bg-green-100 text-green-800">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-green-800 mt-1">
            {orders.filter((o) => o.status === "completed").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Successfully matched and distributed
          </div>
        </div>
      </div>

      {/* Type Segmentation Filter Tabs (Deposit vs Withdrawal) with Create Order button on right end side */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              typeFilter === "ALL"
                ? "bg-[#0f172a] text-white shadow-xs"
                : "bg-[#ffffff] text-gray-700 hover:bg-base-100"
            }`}
          >
            <span>All Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter("PAYIN")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              typeFilter === "PAYIN"
                ? "bg-primary text-white shadow-xs"
                : "bg-[#ffffff] text-emerald-800 hover:bg-emerald-50 border border-emerald-200/60"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Deposit Orders (Payin)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                typeFilter === "PAYIN" ? "bg-white/20" : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {depositOrders.length}
            </span>
          </button>

          <button
            onClick={() => setTypeFilter("PAYOUT")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              typeFilter === "PAYOUT"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-[#ffffff] text-red-700 hover:bg-red-50 border border-red-200/60"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdrawal Orders (Payout)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                typeFilter === "PAYOUT" ? "bg-white/20" : "bg-red-100 text-red-800"
              }`}
            >
              {withdrawalOrders.length}
            </span>
          </button>
        </div>

        {/* Order Create Button on straight line right end side */}
        <Link
          href="/admin/orders/create"
          className="btn-primary text-xs py-1.5 px-3.5 flex items-center space-x-1.5 shadow-sm shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create Order</span>
        </Link>
      </div>

      {/* Top 5-Minute Unaccepted Withdrawal Orders Notification Banner */}
      {totalAdminAlerts > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 border-2 border-sky-400 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-sm text-base-900">
                    Withdrawal Action Required: No QR Provider Accepted Within 5 Minutes!
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse">
                    {totalAdminAlerts} {totalAdminAlerts === 1 ? "Alert" : "Alerts"}
                  </span>
                </div>
                <p className="text-xs text-base-700 mt-0.5">
                  {unacceptedPayoutOrders.length > 0 && (
                    <span>
                      <b>{unacceptedPayoutOrders.length}</b> withdrawal {unacceptedPayoutOrders.length === 1 ? "order has" : "orders have"} been pending for &gt; 5 minutes without any QR provider accepting.
                    </span>
                  )}
                  {timedOutPayoutOrders.length > 0 && (
                    <span className="ml-1">
                      <b>{timedOutPayoutOrders.length}</b> assigned {timedOutPayoutOrders.length === 1 ? "order has" : "orders have"} timed out without payment proof.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setFilterOnlyAlerts((prev) => !prev)}
                className={`py-1.5 px-3 text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1 ${
                  filterOnlyAlerts
                    ? "bg-red-600 text-white"
                    : "btn-primary"
                }`}
              >
                <span>{filterOnlyAlerts ? "Clear Alert Filter" : "Filter Alert Orders"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Cards for Unaccepted Payout Orders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-sky-200">
            {unacceptedPayoutOrders.slice(0, 3).map((uo) => (
              <div
                key={uo.id}
                className="p-2.5 bg-white rounded-xl border border-sky-200 flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <span className="font-mono font-bold text-base-900 block">{uo.orderNumber}</span>
                  <span className="text-[11px] text-gray-600">
                    ₹{uo.amount.toFixed(2)} • {uo.customerName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectOrderId(uo.id)}
                  className="btn-secondary py-1 px-2.5 text-[10px] font-bold shrink-0"
                >
                  Manage / Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Status Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, UTR, Customer, Store..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white"
            />
          </div>

          {totalAdminAlerts > 0 && (
            <button
              type="button"
              onClick={() => setFilterOnlyAlerts((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                filterOnlyAlerts
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 animate-pulse"
              }`}
            >
              <BellRing className="w-3.5 h-3.5 text-red-600" />
              <span>{totalAdminAlerts} Alerts</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs w-full sm:w-auto">
          {["ALL", "processing", "pending", "completed", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition uppercase text-[10px] ${
                statusFilter === st
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-base-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-theme overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Order Number</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Type</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Merchant</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Customer</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Amount</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Customer UTR</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Assigned QR Provider</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Status</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Created</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isDeposit = (ord.type || "PAYIN") === "PAYIN";
                  return (
                    <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-base-900">
                        {ord.orderNumber}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft className="w-3 h-3 text-emerald-700" /> : <ArrowUpRight className="w-3 h-3 text-rose-700" />}
                          <span>{isDeposit ? "Deposit" : "Withdrawal"}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold text-base-900">
                        {ord.merchant?.name || "--"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-medium text-base-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-base-900">
                        ₹{ord.amount.toFixed(2)}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                        {ord.customerUtr ? (
                          <span className="font-semibold text-gray-800">{ord.customerUtr}</span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="text-gray-700 font-medium">
                          {ord.qrProvider?.name || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                        {ord.qrCode?.operator && (
                          <div className="text-[10px] text-purple-700 font-semibold flex items-center space-x-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                            <span>Op: {ord.qrCode.operator.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
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
                      <td className="p-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectOrderId(ord.id)}
                            className="btn-secondary py-1 px-2 text-xs font-semibold inline-flex items-center space-x-1 shadow-xs hover:border-primary"
                            title="Inspect complete order details"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Inspect</span>
                          </button>

                          {isDeposit ? (
                            ord.status === "processing" ? (
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setAdminDirectPay(false);
                                  setVerifierUtr(ord.customerUtr || "");
                                  setVerifierScreenshotFile(null);
                                  setVerifierScreenshotPreview("");
                                  setVerifyError("");
                                  setVerifySuccess("");
                                }}
                                className="btn-primary py-1 px-2.5 text-xs shadow"
                              >
                                Verify UTR
                              </button>
                            ) : ord.status === "completed" ? (
                              <span className="text-green-600 font-bold text-[11px] inline-flex items-center space-x-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </span>
                            ) : null
                          ) : (
                            // PAYOUT Order actions
                            ord.status === "pending" ? (
                              <div className="flex items-center space-x-1.5">
                                {ord.payoutBroadcast ? (
                                  <span className="h-8 px-3 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 inline-flex items-center space-x-1.5 shadow-2xs shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Broadcasted</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBroadcastPayout(ord.id)}
                                    disabled={broadcastingId === ord.id}
                                    className="h-8 px-3 text-xs font-bold text-white bg-primary hover:bg-[#528468] active:bg-[#436e56] rounded-lg shadow-2xs transition flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
                                    title="Broadcast withdrawal order to all active QR providers"
                                  >
                                    {broadcastingId === ord.id ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Assigning...</span>
                                      </>
                                    ) : (
                                      <>
                                        <QrCode className="w-3.5 h-3.5" />
                                        <span>Assign to QR</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setAdminDirectPay(true);
                                    setVerifierUtr("");
                                    setVerifierScreenshotFile(null);
                                    setVerifierScreenshotPreview("");
                                    setVerifyError("");
                                    setVerifySuccess("");
                                  }}
                                  className="h-8 px-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-2xs transition flex items-center justify-center space-x-1.5 shrink-0"
                                  title="Admin fulfills payment directly to customer"
                                >
                                  Pay Admin
                                </button>
                              </div>
                            ) : ord.status === "processing" ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleReassignPayout(ord.id)}
                                  disabled={broadcastingId === ord.id}
                                  className="h-8 px-3 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition flex items-center justify-center space-x-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                                  title="Reassign payout back to all QR providers"
                                >
                                  {broadcastingId === ord.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                                      <span>Reassigning...</span>
                                    </>
                                  ) : (
                                    <span>Reassign</span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setAdminDirectPay(true);
                                    setVerifierUtr("");
                                    setVerifierScreenshotFile(null);
                                    setVerifierScreenshotPreview("");
                                    setVerifyError("");
                                    setVerifySuccess("");
                                  }}
                                  className="py-1 px-2.5 text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow transition"
                                  title="Admin fulfills payment directly to customer"
                                >
                                  Pay Admin
                                </button>
                              </div>
                            ) : ord.status === "submitted" ? (
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setAdminDirectPay(false);
                                  setVerifierUtr(ord.payoutProofUtr || ord.customerUtr || "");
                                  setVerifierScreenshotFile(null);
                                  setVerifierScreenshotPreview("");
                                  setVerifyError("");
                                  setVerifySuccess("");
                                }}
                                className="py-1 px-2.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow animate-pulse"
                              >
                                Confirm Payout
                              </button>
                            ) : ord.status === "completed" ? (
                              <span className="text-green-600 font-bold text-[11px] inline-flex items-center space-x-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled ({ord.payoutPaidBy === "ADMIN" ? "Admin" : "Provider"})</span>
                              </span>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IN-DASHBOARD FULL ORDER INSPECT MODAL */}
      <OrderDetailsModal
        orderId={inspectOrderId}
        isOpen={Boolean(inspectOrderId)}
        onClose={() => setInspectOrderId(null)}
        onOrderUpdated={fetchOrders}
        portal="admin"
      />

      {/* ADMIN OVERRIDE / PAYOUT SETTLEMENT MODAL */}
      {selectedOrder && (() => {
        const isPayout = selectedOrder.type === "PAYOUT";
        const customerUpi = isPayout
          ? selectedOrder.customerUpiId ||
            (selectedOrder.beneficiaryDetails &&
            selectedOrder.beneficiaryDetails.includes("@") &&
            !selectedOrder.beneficiaryDetails.includes(" ")
              ? selectedOrder.beneficiaryDetails.trim()
              : null)
          : null;

        const customerQrUrl = isPayout
          ? selectedOrder.customerQrImage ||
            (customerUpi
              ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `upi://pay?pa=${customerUpi}&pn=${encodeURIComponent(
                    selectedOrder.customerName || "Customer"
                  )}&am=${selectedOrder.amount}&cu=INR`
                )}`
              : null)
          : null;

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[94vh] flex flex-col border border-base-200 overflow-hidden">

              {/* Header */}
              <div className={`px-5 py-4 text-white flex items-center justify-between shrink-0 ${isPayout ? "bg-sky-700" : "bg-primary"}`}>
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    {isPayout ? <ArrowUpRight className="w-4 h-4 text-white/80" /> : <ArrowDownLeft className="w-4 h-4 text-white/80" />}
                    <h3 className="font-bold text-sm">
                      {isPayout
                        ? adminDirectPay || !selectedOrder.qrProviderId
                          ? `Admin Direct Payout — #${selectedOrder.orderNumber}`
                          : `Confirm Payout Proof — #${selectedOrder.orderNumber}`
                        : `Verify Deposit — #${selectedOrder.orderNumber}`}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-white/80 pl-6">
                    <span>{isPayout ? "Withdrawal Disbursement" : "Deposit (Payin)"}</span>
                    <span className="opacity-50">•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedOrder.status === "completed" ? "bg-green-500/30" :
                      selectedOrder.status === "processing" ? "bg-blue-400/30" :
                      selectedOrder.status === "submitted" ? "bg-purple-400/30" :
                      "bg-white/20"
                    }`}>{selectedOrder.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">

                {/* ═══ ORDER INFO ROW ═══ */}
                <div className={`rounded-xl border text-xs ${isPayout ? "border-sky-200 bg-sky-50/50" : "border-base-200 bg-base-100/30"}`}>
                  {/* Amount hero */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${isPayout ? "border-sky-200" : "border-base-200"}`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {isPayout ? "Disbursement Amount" : "Payment Amount"}
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-2xl font-black text-base-900">
                          ₹{selectedOrder.amount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(selectedOrder.amount));
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 1500);
                          }}
                          className="p-1 text-slate-500 hover:text-primary rounded transition flex items-center space-x-1"
                          title="Copy Amount"
                        >
                          {copiedAmount ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {selectedOrder.merchant?.name && (
                        <div className="flex items-center justify-end space-x-1 text-gray-600">
                          <Store className="w-3 h-3" />
                          <span className="font-semibold text-base-900">{selectedOrder.merchant.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end space-x-1 text-slate-500">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono text-[11px]">{selectedOrder.orderNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer info row */}
                  <div className="px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-semibold text-gray-800">{selectedOrder.customerName || "—"}</span>
                    </div>
                    {selectedOrder.customerEmail && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-gray-400 text-[10px]">✉</span>
                        <span className="text-gray-600">{selectedOrder.customerEmail}</span>
                      </div>
                    )}
                    {selectedOrder.customerMobile && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono text-gray-700">{selectedOrder.customerMobile}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══ PAYOUT: Customer Bank Account Details ═══ */}
                {isPayout && (
                  <>
                    <BankTransferCard
                      beneficiaryDetails={selectedOrder.beneficiaryDetails}
                      amount={selectedOrder.amount}
                      customerName={selectedOrder.customerName}
                      customerMobile={selectedOrder.customerMobile}
                      title="Customer Bank Account (Send Transfer Here)"
                    />

                    {/* QR Provider proof (submitted status) */}
                    {(selectedOrder.payoutProofImage || selectedOrder.payoutProofUtr) && (
                      <div className="p-3 bg-white rounded-xl border border-sky-200 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">QR Provider Proof Submission</span>
                        {selectedOrder.payoutProofUtr && (
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-500 font-semibold">UTR:</span>
                            <code className="px-2 py-0.5 bg-gray-50 border rounded font-mono font-bold text-base-900">{selectedOrder.payoutProofUtr}</code>
                          </div>
                        )}
                        {selectedOrder.payoutProofImage && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Provider Payment Proof:</span>
                            <a href={selectedOrder.payoutProofImage} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-sky-200 max-w-xs relative group">
                              <img src={selectedOrder.payoutProofImage} alt="Provider Payment Proof" className="w-full max-h-40 object-contain bg-black/5" />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>View Full</span>
                              </span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ═══ PAYIN: Order Info + Customer Proof Image ═══ */}
                {!isPayout && (
                  <div className="rounded-xl border border-base-200 bg-base-100/20 overflow-hidden space-y-0 divide-y divide-[#e2e8f0]/60">
                    {/* Customer UTR row */}
                    <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Customer UTR</span>
                      {selectedOrder.customerUtr ? (
                        <div className="flex items-center space-x-2">
                          <code className="px-2.5 py-1 bg-white border border-base-200 rounded font-mono font-bold text-base-900">
                            {selectedOrder.customerUtr}
                          </code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(selectedOrder.customerUtr); setCopiedUpi(true); setTimeout(() => setCopiedUpi(false), 1500); }}
                            className="p-1 text-slate-500 hover:text-primary rounded transition"
                            title="Copy UTR"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifierUtr(selectedOrder.customerUtr)}
                            className="py-0.5 px-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition"
                          >
                            Use This UTR
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Not submitted yet</span>
                      )}
                    </div>

                    {/* QR Provider assigned */}
                    {selectedOrder.qrProvider?.name && (
                      <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Assigned QR Provider</span>
                        <span className="font-semibold text-base-900">{selectedOrder.qrProvider.name}</span>
                      </div>
                    )}

                    {/* Customer payment proof IMAGE (visible inline only if uploaded) */}
                    {selectedOrder.customerScreenshot && (
                      <div className="px-4 py-3 space-y-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer Payment Proof</span>
                        <a
                          href={selectedOrder.customerScreenshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-base-200 max-w-sm relative group shadow-sm"
                        >
                          <img
                            src={selectedOrder.customerScreenshot}
                            alt="Customer Payment Proof"
                            className="w-full max-h-52 object-contain bg-black/5"
                          />
                          <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <ExternalLink className="w-3 h-3" />
                            <span>View Full Image</span>
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ FEE BREAKDOWN ═══ */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] space-y-1.5">
                  <span className="font-bold text-gray-700 block uppercase tracking-wider text-[10px] pb-1 border-b border-gray-200">
                    Settlement Fee Distribution
                  </span>
                  <div className="flex justify-between text-gray-600">
                    <span>Merchant Fee ({selectedOrder.merchantFeeRate}%):</span>
                    <span className="font-bold text-gray-800">₹{(selectedOrder.merchantFee || 0).toFixed(2)}</span>
                  </div>
                  {isPayout && (adminDirectPay || !selectedOrder.qrProviderId) ? (
                    <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 font-semibold text-[11px]">
                      Admin Direct Payment: all payout fees → Platform profit!
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>QR Provider Fee ({selectedOrder.qrProviderFeeRate}%):</span>
                        <span>₹{(selectedOrder.qrProviderFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Agent Fee ({selectedOrder.agentFeeRate}%):</span>
                        <span>₹{(selectedOrder.agentFee || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Broker Fee ({selectedOrder.brokerFeeRate}%):</span>
                    <span>₹{(selectedOrder.brokerFee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold border-t border-gray-200 pt-1.5">
                    <span>Platform Profit:</span>
                    <span>
                      ₹{(
                        isPayout && (adminDirectPay || !selectedOrder.qrProviderId)
                          ? (selectedOrder.merchantFee || 0) - (selectedOrder.brokerFee || 0)
                          : selectedOrder.platformFee || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ═══ FEEDBACK BANNERS ═══ */}
                {verifyError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-bold flex items-center space-x-1.5 border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
                {verifySuccess && (
                  <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-xl font-bold flex items-center space-x-1.5 border border-green-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{verifySuccess}</span>
                  </div>
                )}

                {/* ═══ VERIFICATION FORM ═══ */}
                <form onSubmit={handleAdminVerify} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-base-900 mb-1.5">
                      {isPayout ? "Disbursement / UTR Reference ID *" : "Bank / UPI Statement UTR ID *"}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={verifying || !!verifySuccess}
                      value={verifierUtr}
                      onChange={(e) => setVerifierUtr(e.target.value)}
                      placeholder="Enter 12-digit UTR reference"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border-2 border-base-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner disabled:opacity-60"
                    />
                  </div>

                  {/* Screenshot upload with preview */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-base-900">
                      Admin Confirmation Screenshot (Optional)
                    </label>
                    {!verifierScreenshotPreview ? (
                      <label className={`flex items-center space-x-2 p-2.5 border border-dashed border-primary/60 rounded-xl transition ${
                        verifying || !!verifySuccess ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-emerald-50/30"
                      }`}>
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs text-slate-500">Click to upload screenshot <span className="text-gray-400">(PNG, JPG, max 10MB)</span></span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={verifying || !!verifySuccess}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setVerifierScreenshotFile(file);
                              setVerifierScreenshotPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <div className="p-2.5 border-2 border-green-400/60 bg-green-50/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-green-800 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            <span>Screenshot selected</span>
                          </span>
                          {!verifying && !verifySuccess && (
                            <button
                              type="button"
                              onClick={() => { setVerifierScreenshotFile(null); setVerifierScreenshotPreview(""); }}
                              className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <a href={verifierScreenshotPreview} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-green-300 relative group max-h-36">
                          <img src={verifierScreenshotPreview} alt="Screenshot Preview" className="w-full max-h-36 object-contain bg-black/5" />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>View Full</span>
                          </span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button"
                      disabled={verifying || !!verifySuccess}
                      onClick={() => setSelectedOrder(null)}
                      className="flex-1 py-2.5 text-xs border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifying || !!verifySuccess || !verifierUtr.trim()}
                      className={`flex-1 py-2.5 text-xs font-bold shadow-md rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPayout ? "bg-sky-600 hover:bg-sky-700 text-white" : "btn-primary"
                      }`}
                    >
                      {verifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : verifySuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled Successfully</span>
                        </>
                      ) : isPayout ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{adminDirectPay || !selectedOrder.qrProviderId ? "Confirm Direct Payout" : "Confirm & Settle Payout"}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify UTR & Settle</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}
    </PortalLayout>
  );
}
