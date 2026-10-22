"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import ModalPortal from "@/components/common/ModalPortal";
import PayoutFulfillmentModal from "@/components/orders/PayoutFulfillmentModal";
import BankTransferCard from "@/components/orders/BankTransferCard";
import {
  ShoppingBag,
  Eye,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Upload,
  UploadCloud,
  AlertCircle,
  TrendingUp,
  Bell,
  BellRing,
  XCircle,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  ZoomIn,
  Trash2,
  User,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { useAppSelector } from "@/store/hooks";

export default function QRProviderOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [availablePayoutCount, setAvailablePayoutCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYIN" | "PAYOUT">("ALL");

  // Releasing / cancelling assignment state
  const [releasingId, setReleasingId] = useState<number | null>(null);

  // Verification / Submission Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedPayoutOrder, setSelectedPayoutOrder] = useState<any>(null);
  const [verifierUtr, setVerifierUtr] = useState("");
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");

  const profile = useAppSelector((state) => state.auth.user);

  const fetchOrders = async () => {
    try {
      const ordersRes = await fetch("/api/qr-provider/orders");
      const data = await ordersRes.json();
      if (data.success) {
        setOrders(data.orders || []);
        setAvailablePayoutCount(data.availablePayoutCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { socket, isConnected } = useSocket({ role: "QR_PROVIDER" });

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-Time Socket.IO Synchronization (Eliminates repeated polling & API hammering)
  useEffect(() => {
    if (!socket) return;

    const handlePayoutAvailable = () => {
      setAvailablePayoutCount((prev) => prev + 1);
    };

    const handlePayoutClaimed = (data: any) => {
      setAvailablePayoutCount((prev) => Math.max(0, prev - 1));
      if (!data?.orderId) return;
      // If claimed by this provider, update orders
      if (profile && data.qrProviderId === profile.id) {
        fetchOrders();
      }
    };

    const handlePayoutCompleted = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: "completed" } : o))
      );
    };

    const handlePayoutReleased = (data: any) => {
      setAvailablePayoutCount((prev) => prev + 1);
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId ? { ...o, status: "pending", qrProviderId: null } : o
        )
      );
    };

    const handleOrderUpdated = (data: any) => {
      if (!data?.orderId && !data?.order?.id) return;
      const id = data.orderId || data.order.id;
      const updatedObj = data.order || data;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === id);
        if (exists) {
          return prev.map((o) => (o.id === id ? { ...o, ...updatedObj } : o));
        } else if (profile && updatedObj.qrProviderId === profile.id) {
          return [updatedObj, ...prev];
        }
        return prev;
      });
    };

    const handleOrderAssigned = (data: any) => {
      fetchOrders();
    };

    socket.on("payout:available", handlePayoutAvailable);
    socket.on("payout:claimed", handlePayoutClaimed);
    socket.on("payout:released", handlePayoutReleased);
    socket.on("payout:completed", handlePayoutCompleted);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:assigned", handleOrderAssigned);
    socket.on("payin:assigned", handleOrderAssigned);

    return () => {
      socket.off("payout:available", handlePayoutAvailable);
      socket.off("payout:claimed", handlePayoutClaimed);
      socket.off("payout:released", handlePayoutReleased);
      socket.off("payout:completed", handlePayoutCompleted);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:assigned", handleOrderAssigned);
      socket.off("payin:assigned", handleOrderAssigned);
    };
  }, [socket, profile]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || verifying || !!verifySuccess) return;

    const effectiveUtr = (selectedOrder.customerUtr || verifierUtr || "").trim();
    if (selectedOrder.type === "PAYOUT" && !verifierUtr.trim()) {
      setVerifyError("Please enter the UTR reference number");
      return;
    }
    if (selectedOrder.type !== "PAYOUT" && !effectiveUtr) {
      setVerifyError("No UTR reference found for this deposit order");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    setVerifySuccess("");

    try {
      let uploadedScreenshotUrl = "";
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("file", screenshotFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) uploadedScreenshotUrl = uploadData.url;
      }

      const isPayout = selectedOrder.type === "PAYOUT";
      const endpoint = isPayout
        ? `/api/orders/${selectedOrder.id}/payout/submit`
        : `/api/orders/${selectedOrder.id}/verify`;

      const reqBody = isPayout
        ? { utr: verifierUtr.trim(), screenshotUrl: uploadedScreenshotUrl }
        : { verifierUtr: effectiveUtr, verifierScreenshot: uploadedScreenshotUrl };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setVerifySuccess(
        isPayout
          ? "Payout payment completed and confirmed immediately!"
          : "Order verified and settled successfully!"
      );
      setTimeout(() => {
        setSelectedOrder(null);
        setScreenshotFile(null);
        setScreenshotPreview("");
        setVerifying(false);
        fetchOrders();
      }, 900);
    } catch (err: any) {
      setVerifyError(err.message);
      setVerifying(false);
    }
  };

  const handleCancelAssignment = async (orderId: number) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order assignment? The order will become pending again in the available pool for other QR providers."
    );
    if (!confirmCancel) return;

    try {
      setReleasingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/payout/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel assignment");
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to cancel assignment");
    } finally {
      setReleasingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const orderType = o.type || "PAYIN";
    const matchesType = typeFilter === "ALL" || orderType === typeFilter;
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerMobile.includes(search) ||
      (o.verifierUtr && o.verifierUtr.toLowerCase().includes(search.toLowerCase())) ||
      (o.payoutProofUtr && o.payoutProofUtr.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <PortalLayout
      portal="qr-provider"
      title="Assigned Liquidity & Orders"
      subtitle="Manage deposit intake verifications and customer withdrawal payout disbursements"
      actions={
        <div className="flex items-center space-x-2">
          {/* Top Notification Icon for QR Provider */}
          <Link
            href="/qr-provider/available-orders"
            className="relative p-2 border border-base-200 rounded-xl bg-white hover:bg-sky-50 text-gray-700 transition flex items-center justify-center shadow-xs"
            title={`${availablePayoutCount} Withdrawal Orders Waiting in Pool`}
          >
            <Bell className={`w-4 h-4 ${availablePayoutCount > 0 ? "text-sky-600 animate-bounce" : "text-slate-500"}`} />
            {availablePayoutCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white ring-2 ring-white">
                {availablePayoutCount}
              </span>
            )}
          </Link>
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
          <button
            onClick={fetchOrders}
            className="p-2 border border-base-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      {/* Top Notification Icon & Banner for QR Provider */}
      {availablePayoutCount > 0 && (
        <div className="mb-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-sky-50 to-sky-50 border-2 border-sky-300 text-sky-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
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
                New customer payout orders are broadcasted. Accept an order to earn payout commission.
              </p>
            </div>
          </div>
          <Link
            href="/qr-provider/available-orders"
            className="btn-primary text-xs py-2 px-4 shrink-0 font-bold shadow flex items-center space-x-1"
          >
            <span>Claim Orders Now</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Transaction Permissions Disabled Warning */}
      {profile && profile.transactionAllowed === false && (
        <div className="mb-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Transaction Permissions Disabled</h4>
            <p className="text-xs text-sky-700 mt-0.5">
              The administrator has disabled transaction actions on your account. Order verifications and payouts are currently paused.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, Customer, UTR..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex rounded-lg border border-base-200 overflow-hidden p-0.5 bg-white text-xs">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                typeFilter === "ALL" ? "bg-primary text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("PAYIN")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                typeFilter === "PAYIN" ? "bg-primary text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              Deposits
            </button>
            <button
              onClick={() => setTypeFilter("PAYOUT")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                typeFilter === "PAYOUT" ? "bg-primary text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              Withdrawals
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-1 text-xs">
            {["ALL", "processing", "submitted", "completed", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition uppercase text-[10px] ${
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
      </div>

      <div className="card-theme overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Order Number</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Type</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Customer</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Amount</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Verification / Proof</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Status</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Created</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isDeposit = (ord.type || "PAYIN") === "PAYIN";
                  return (
                    <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-base-900">{ord.orderNumber}</div>
                        {ord.qrCode?.operator && (
                          <div className="text-[10px] text-[#0c4a6e] font-bold bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded mt-0.5 inline-flex items-center space-x-1">
                            <User className="w-2.5 h-2.5" />
                            <span>Op: {ord.qrCode.operator.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-sky-100 text-sky-800 border border-sky-200"
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isDeposit ? "Deposit" : "Withdrawal"}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-base-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                        {ord.customerScreenshot && (
                          <button
                            type="button"
                            onClick={() => setLightboxImage(ord.customerScreenshot)}
                            className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded mt-1 font-semibold transition shadow-xs"
                            title="Click to view customer payment proof receipt"
                          >
                            <ImageIcon className="w-3 h-3 text-emerald-600" />
                            <span>Proof Attached</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-base-900">
                        ₹{ord.amount.toFixed(2)}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                        {isDeposit ? (
                          ord.status === "completed" ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {ord.verifierUtr || ord.customerUtr || "Bank Verified"}
                            </span>
                          ) : ord.status === "processing" ? (
                            ord.customerUtr ? (
                              <span
                                className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold text-[10px]"
                                title={ord.customerUtr}
                              >
                                {ord.customerUtr}
                              </span>
                            ) : (
                              <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                                Pending UTR
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">--</span>
                          )
                        ) : (
                          ord.payoutProofUtr ? (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {ord.payoutProofUtr}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not Submitted</span>
                          )
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === "completed"
                              ? "badge-completed"
                              : ord.status === "submitted"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
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
                        {new Date(ord.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        {isDeposit ? (
                          // Deposit actions
                          ord.status === "processing" ? (
                            <button
                              disabled={profile?.transactionAllowed === false}
                              onClick={() => {
                                if (profile?.transactionAllowed === false) return;
                                setSelectedOrder(ord);
                                setVerifierUtr(ord.customerUtr || "");
                                setScreenshotFile(null);
                                setVerifyError("");
                                setVerifySuccess("");
                              }}
                              className={`py-1 px-3 text-xs shadow rounded-lg font-medium transition ${
                                profile?.transactionAllowed === false
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                                  : "btn-primary"
                              }`}
                            >
                              Verify Deposit
                            </button>
                          ) : ord.status === "pending" ? (
                            <button
                              disabled={profile?.transactionAllowed === false}
                              onClick={() => {
                                if (profile?.transactionAllowed === false) return;
                                setSelectedOrder(ord);
                                setVerifierUtr(ord.customerUtr || "");
                                setScreenshotFile(null);
                                setVerifyError("");
                                setVerifySuccess("");
                              }}
                              className={`py-1 px-3 text-xs shadow rounded-lg font-bold transition inline-flex items-center space-x-1 ${
                                profile?.transactionAllowed === false
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept / Verify</span>
                            </button>
                          ) : ord.status === "completed" ? (
                            <span className="text-green-600 font-bold text-[11px] inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )
                        ) : (
                          // Withdrawal Payout actions
                          ord.status === "processing" ? (
                            <div className="flex items-center space-x-1.5 justify-end">
                              <button
                                disabled={profile?.transactionAllowed === false}
                                onClick={() => {
                                  if (profile?.transactionAllowed === false) return;
                                  setSelectedPayoutOrder(ord);
                                }}
                                className="btn-primary py-1 px-2.5 text-xs font-bold shadow rounded-lg inline-flex items-center space-x-1 bg-sky-600 hover:bg-sky-700"
                              >
                                <span>Submit Proof</span>
                              </button>
                              <button
                                disabled={releasingId === ord.id || profile?.transactionAllowed === false}
                                onClick={() => handleCancelAssignment(ord.id)}
                                className="py-1 px-2 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition inline-flex items-center space-x-1"
                                title="Cancel this assignment and return order back to the pending pool"
                              >
                                {releasingId === ord.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-red-600" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-600" />
                                )}
                                <span>Cancel</span>
                              </button>
                            </div>
                          ) : ord.status === "submitted" ? (
                            <span className="text-blue-700 font-semibold text-[11px] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              Awaiting Admin Confirm
                            </span>
                          ) : ord.status === "completed" ? (
                            <span className="text-green-600 font-bold text-[11px] inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Reimbursed (+Fee)</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )
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

      {/* VERIFY / SUBMIT PROOF MODAL */}
      {selectedOrder && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-base-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`p-4 text-white flex items-center justify-between shrink-0 ${
                selectedOrder.type === "PAYOUT" ? "bg-sky-700" : "bg-[#0f172a]"
              }`}
            >
              <div>
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <span>
                    {selectedOrder.type === "PAYOUT"
                      ? "Submit Payout Proof"
                      : "Verify Deposit Payment"}
                  </span>
                </h3>
                <p className="text-[11px] text-[#f0f7fc]/80">Order #{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setScreenshotFile(null);
                  setScreenshotPreview("");
                }}
                className="text-white/70 hover:text-white text-base font-bold p-1 rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Order Info Card */}
              <div className="bg-base-100/40 p-3.5 rounded-xl text-xs space-y-2 border border-base-200/60">
                <div className="flex justify-between items-center pb-1.5 border-b border-base-200/40">
                  <span className="text-gray-600 font-medium">
                    {selectedOrder.type === "PAYOUT" ? "Payout Amount to Transfer:" : "Expected Credit Amount:"}
                  </span>
                  <span className="font-bold text-base text-base-900">
                    ₹{selectedOrder.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="font-semibold text-base-900">{selectedOrder.customerName}</span>
                </div>
                {selectedOrder.customerMobile && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Customer Mobile:</span>
                    <span className="font-mono text-gray-700">{selectedOrder.customerMobile}</span>
                  </div>
                )}

                {selectedOrder.type === "PAYOUT" && (
                  <>
                    <BankTransferCard
                      beneficiaryDetails={selectedOrder.beneficiaryDetails}
                      amount={selectedOrder.amount}
                      customerName={selectedOrder.customerName}
                    />
                    <div className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1 pt-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        You will be reimbursed ₹{selectedOrder.amount.toFixed(2)} + fee earnings upon confirmation.
                      </span>
                    </div>
                  </>
                )}

                {selectedOrder.type !== "PAYOUT" && (
                  <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center space-x-1.5 text-emerald-950">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Deposit Payment UTR Reference</span>
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {selectedOrder.customerUtr ? "Directly Provided" : "Enter UTR"}
                      </span>
                    </div>

                    {selectedOrder.customerUtr ? (
                      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200 shadow-sm">
                        <span className="font-mono font-bold text-sm text-base-900">
                          {selectedOrder.customerUtr}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOrder.customerUtr);
                            setCopiedUtr(true);
                            setTimeout(() => setCopiedUtr(false), 2000);
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition flex items-center space-x-1 border border-emerald-200"
                        >
                          {copiedUtr ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                          <span>{copiedUtr ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={verifierUtr}
                          onChange={(e) => setVerifierUtr(e.target.value.trim())}
                          placeholder="Enter 12-digit UTR from your bank alert"
                          className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg font-mono font-bold bg-white text-base-900"
                        />
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      {selectedOrder.customerUtr
                        ? "The UTR is provided directly from the deposit payment submission. You do not need to manually enter the UTR code."
                        : "Customer has not submitted UTR on checkout yet. Enter bank UTR reference to verify and accept deposit immediately."}
                    </p>
                  </div>
                )}
              </div>

              {/* ═══ VISIBLE CUSTOMER PAYMENT PROOF RECEIPT (ONLY IF UPLOADED BY CUSTOMER) ═══ */}
              {selectedOrder.type !== "PAYOUT" && selectedOrder.customerScreenshot && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center space-x-1.5 text-slate-900 text-xs">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span>Customer Payment Proof Receipt</span>
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Proof Attached
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div
                      onClick={() => setLightboxImage(selectedOrder.customerScreenshot)}
                      className="relative group rounded-xl overflow-hidden border-2 border-base-200 bg-slate-900/5 hover:border-primary transition cursor-pointer shadow-inner max-h-64 flex items-center justify-center"
                      title="Click to enlarge receipt"
                    >
                      <img
                        src={selectedOrder.customerScreenshot}
                        alt="Customer Payment Receipt Proof"
                        className="w-full max-h-60 object-contain p-1.5 rounded-lg transition group-hover:scale-[1.01]"
                      />
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg">
                          <ZoomIn className="w-4 h-4 text-emerald-400" />
                          <span>Click to Enlarge</span>
                        </span>
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium flex items-center space-x-1 shadow">
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Zoom</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                      <span>Cross-check amount & timestamp with your banking app</span>
                      <a
                        href={selectedOrder.customerScreenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-[#527d65] font-semibold hover:underline inline-flex items-center space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Open in new tab</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

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

              <form onSubmit={handleVerify} className="space-y-4">
                {selectedOrder.type === "PAYOUT" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Bank / UPI Transfer UTR Reference ID *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={verifying || !!verifySuccess}
                      value={verifierUtr}
                      onChange={(e) => setVerifierUtr(e.target.value.trim())}
                      placeholder="Enter 12-digit UTR reference ID"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono font-bold bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter the UTR reference generated after transferring funds to customer.
                    </p>
                  </div>
                )}

                {/* Optional Provider Confirmation Screenshot with Preview */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Upload Bank Confirmation Screenshot (Optional)
                  </label>
                  {!screenshotPreview ? (
                    <label className={`flex items-center space-x-2 p-2.5 border border-dashed border-primary/60 rounded-xl transition bg-white ${
                      verifying || !!verifySuccess
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary hover:bg-emerald-50/30"
                    }`}>
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs text-gray-600">
                        Choose screenshot file <span className="text-gray-400">(PNG, JPG, max 10MB)</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={verifying || !!verifySuccess}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setScreenshotFile(file);
                            setScreenshotPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="p-2.5 border-2 border-emerald-400/60 bg-emerald-50/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Screenshot selected</span>
                        </span>
                        <button
                          type="button"
                          disabled={verifying || !!verifySuccess}
                          onClick={() => {
                            setScreenshotFile(null);
                            setScreenshotPreview("");
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border border-emerald-300 max-h-32 bg-black/5 flex items-center justify-center">
                        <img src={screenshotPreview} alt="Screenshot Preview" className="max-h-32 w-full object-contain p-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    disabled={verifying || !!verifySuccess}
                    onClick={() => {
                      setSelectedOrder(null);
                      setScreenshotFile(null);
                      setScreenshotPreview("");
                    }}
                    className="w-1/3 py-2 btn-secondary text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                  {selectedOrder.type === "PAYOUT" && (
                    <button
                      type="button"
                      disabled={releasingId === selectedOrder.id || verifying || !!verifySuccess}
                      onClick={() => handleCancelAssignment(selectedOrder.id)}
                      className="w-1/3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {releasingId === selectedOrder.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      <span>Cancel Assign</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={verifying || !!verifySuccess}
                    className={`flex-1 py-2 text-xs font-bold shadow rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 ${
                      selectedOrder.type === "PAYOUT"
                        ? "bg-sky-600 hover:bg-sky-700 text-white"
                        : "btn-primary"
                    }`}
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Settling...</span>
                      </>
                    ) : verifySuccess ? (
                      <span className="text-emerald-200 font-bold">✓ Settled Successfully</span>
                    ) : selectedOrder.type === "PAYOUT" ? (
                      "Submit Payout Proof"
                    ) : (
                      "Verify & Settle Deposit"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Lightbox Modal for enlarged receipt viewing */}
      {lightboxImage && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setLightboxImage(null)}
          >
            <div
            className="relative max-w-7xl max-h-[92vh] w-full flex flex-col items-center bg-zinc-950/90 rounded-2xl border border-white/20 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white pb-3 border-b border-white/10 mb-3 px-1">
              <span className="text-xs font-bold flex items-center space-x-2 text-emerald-400">
                <ImageIcon className="w-4 h-4" />
                <span>Customer Payment Proof Receipt</span>
              </span>
              <div className="flex items-center space-x-3">
                <a
                  href={lightboxImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-300 hover:text-white font-medium inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1 transition text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="w-full flex items-center justify-center overflow-auto max-h-[78vh]">
              <img
                src={lightboxImage}
                alt="Payment Proof Full"
                className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Payout Fulfillment Popup Screen with Customer QR & Proof Upload */}
      {selectedPayoutOrder && (
        <PayoutFulfillmentModal
          order={selectedPayoutOrder}
          isOpen={Boolean(selectedPayoutOrder)}
          onClose={() => {
            setSelectedPayoutOrder(null);
            fetchOrders();
          }}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </PortalLayout>
  );
}
