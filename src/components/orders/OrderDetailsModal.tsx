"use client";

import { useEffect, useState } from "react";
import {
  X,
  Clock,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  UploadCloud,
  Trash2,
  RefreshCw,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Send,
  Radio,
  Edit,
  Landmark,
} from "lucide-react";
import UpdateCustomerQrModal from "./UpdateCustomerQrModal";
import BankTransferCard from "./BankTransferCard";
import ModalPortal from "@/components/common/ModalPortal";

interface OrderDetailsModalProps {
  orderId: number | string | null;
  isOpen?: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
  portal?: "merchant" | "admin" | "qr-provider";
}

export default function OrderDetailsModal({
  orderId,
  isOpen = true,
  onClose,
  onOrderUpdated,
  portal = "merchant",
}: OrderDetailsModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [updateCustomerQrOpen, setUpdateCustomerQrOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // UTR submission state (for in-dashboard deposit confirmation)
  const [customerUtr, setCustomerUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Admin Direct UTR Verification state (for admin inspecting deposit orders)
  const [adminVerifierUtr, setAdminVerifierUtr] = useState("");
  const [adminVerifierScreenshot, setAdminVerifierScreenshot] = useState<File | null>(null);
  const [adminVerifierScreenshotPreview, setAdminVerifierScreenshotPreview] = useState<string>("");
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [adminVerifyError, setAdminVerifyError] = useState("");
  const [adminVerifySuccess, setAdminVerifySuccess] = useState("");

  // Payout actions & submission state
  const [payoutProofUtr, setPayoutProofUtr] = useState("");
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [payoutProofPreview, setPayoutProofPreview] = useState<string>("");
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutActionLoading, setPayoutActionLoading] = useState(false);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load order details");
      setOrder(data.order);
      setRemainingSeconds(data.order.remainingSeconds || 0);
      if (data.order.customerUtr) {
        setAdminVerifierUtr((prev) => prev || data.order.customerUtr);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
      setCustomerUtr("");
      setScreenshotFile(null);
      setScreenshotPreview("");
      setPayoutProofUtr("");
      setPayoutProofFile(null);
      setPayoutProofPreview("");
      setSubmitError("");
      setSubmitSuccess("");
      setAdminVerifierUtr("");
      setAdminVerifierScreenshot(null);
      setAdminVerifierScreenshotPreview("");
      setAdminVerifyError("");
      setAdminVerifySuccess("");
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  // Live countdown timer: PAYIN pending (session expiry) or PAYOUT processing (fulfillment window)
  useEffect(() => {
    if (!order) return;
    const shouldCountDown =
      (order.type === "PAYIN" && order.status === "pending") ||
      (order.type === "PAYOUT" && order.status === "processing");
    if (!shouldCountDown) return;
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.type, order?.status, remainingSeconds]);

  // Polling for status updates if processing or pending
  useEffect(() => {
    if (!isOpen || !order) return;
    if (order.status === "completed" || order.status === "rejected") return;

    const interval = setInterval(() => {
      fetch(`/api/orders/${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            setOrder(data.order);
            setRemainingSeconds(data.order.remainingSeconds || 0);
            if (data.order.status !== order.status && onOrderUpdated) {
              onOrderUpdated();
            }
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, order?.status, orderId]);

  const handleCopyUpi = () => {
    if (order?.qrCode?.upiId) {
      navigator.clipboard.writeText(order.qrCode.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/checkout/${order?.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUtr.trim()) {
      setSubmitError("Please enter the 12-digit UTR ID");
      return;
    }

    setSubmittingUtr(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      let uploadedScreenshotUrl: string | null = null;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("file", screenshotFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upRes.ok && upData.url) {
          uploadedScreenshotUrl = upData.url;
        }
      }

      const res = await fetch(`/api/orders/${order.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerUtr: customerUtr.trim(),
          customerScreenshot: uploadedScreenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitSuccess("Payment proof submitted! Status updated to Processing.");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit UTR");
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleAdminVerifyDeposit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    const utr = adminVerifierUtr.trim();
    if (!utr) {
      setAdminVerifyError("Please enter the Bank / UPI statement UTR reference number");
      return;
    }

    setAdminVerifying(true);
    setAdminVerifyError("");
    setAdminVerifySuccess("");

    try {
      let uploadedScreenshotUrl = "";
      if (adminVerifierScreenshot) {
        const formData = new FormData();
        formData.append("file", adminVerifierScreenshot);
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upRes.ok && upData.url) {
          uploadedScreenshotUrl = upData.url;
        }
      }

      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifierUtr: utr,
          verifierScreenshot: uploadedScreenshotUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setAdminVerifySuccess(data.message || "Deposit verified and settled successfully!");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setAdminVerifyError(err.message || "Verification failed");
    } finally {
      setAdminVerifying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmCancel = window.confirm("Are you sure you want to cancel this order? Any reserved QR provider balance will be released immediately.");
    if (!confirmCancel) return;

    setCancelling(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      setSubmitSuccess("Order cancelled successfully. Reserved exposure released.");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleBroadcastPayout = async () => {
    if (!order) return;
    try {
      setPayoutActionLoading(true);
      setSubmitError("");
      setSubmitSuccess("");
      const res = await fetch(`/api/orders/${order.id}/payout/broadcast`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to broadcast payout order");
      setSubmitSuccess("Payout order broadcasted to QR Provider network!");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to broadcast payout");
    } finally {
      setPayoutActionLoading(false);
    }
  };

  const handleAdminConfirmPayout = async (paidBy: "ADMIN" | "QR_PROVIDER") => {
    if (!order) return;
    try {
      setPayoutActionLoading(true);
      setSubmitError("");
      setSubmitSuccess("");
      const res = await fetch(`/api/orders/${order.id}/payout/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidBy,
          proofUtr: order.payoutProofUtr || `ADMIN-TXN-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm payout");
      setSubmitSuccess(
        `Payout confirmed & settled successfully (${paidBy === "ADMIN" ? "Admin Self-Paid" : "QR Provider Paid"})!`
      );
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to confirm payout");
    } finally {
      setPayoutActionLoading(false);
    }
  };

  const handleReassignPayout = async () => {
    if (!order) return;
    try {
      setPayoutActionLoading(true);
      setSubmitError("");
      setSubmitSuccess("");
      const res = await fetch(`/api/orders/${order.id}/payout/reassign`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reassign payout order");
      setSubmitSuccess("Payout order released and reassigned back to the pool!");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to reassign payout");
    } finally {
      setPayoutActionLoading(false);
    }
  };

  const handleProviderSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = payoutProofUtr.trim();
    if (!cleanUtr) {
      setSubmitError("Please enter the 12-digit transfer UTR reference");
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setSubmitError("UTR reference must be exactly 12 numeric digits.");
      return;
    }

    setSubmittingPayout(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      let uploadedScreenshotUrl = "";
      if (payoutProofFile) {
        const formData = new FormData();
        formData.append("file", payoutProofFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upRes.ok && upData.url) {
          uploadedScreenshotUrl = upData.url;
        }
      }

      const res = await fetch(`/api/orders/${order.id}/payout/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutProofUtr: payoutProofUtr.trim(),
          payoutProofImage: uploadedScreenshotUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitSuccess("Payout payment completed and confirmed immediately!");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit payout proof");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!order) return;
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order assignment? The order will become pending in the pool for other QR providers."
    );
    if (!confirmCancel) return;

    try {
      setPayoutActionLoading(true);
      setSubmitError("");
      setSubmitSuccess("");
      const res = await fetch(`/api/orders/${order.id}/payout/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel assignment");
      setSubmitSuccess("Assignment cancelled. Order returned to the available pool.");
      fetchOrder();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to cancel assignment");
    } finally {
      setPayoutActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDeposit = (order?.type || "PAYIN") === "PAYIN";
  const timerMinutes = Math.floor(remainingSeconds / 60);
  const timerSecs = remainingSeconds % 60;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-base-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#e4d8c2] bg-[#ffffff] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span
              className={`p-2 rounded-xl flex items-center justify-center ${
                isDeposit ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
              }`}
            >
              {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-base-900">
                  {isDeposit ? "Deposit Order (Payin)" : "Withdrawal Order (Payout)"}
                </h3>
                {order && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      order.status === "completed"
                        ? "badge-completed"
                        : order.status === "processing"
                        ? "badge-processing animate-pulse"
                        : order.status === "pending"
                        ? "badge-pending"
                        : "badge-rejected"
                    }`}
                  >
                    {order.status}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-500">{order?.orderNumber || "Loading..."}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading && !order ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-medium">Fetching order details...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Amount and Timer Summary Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDeposit
                    ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
                    : "bg-sky-50/70 border-sky-200/80 text-sky-950"
                }`}
              >
                <div>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
                    {isDeposit ? "Total Deposit Amount" : "Total Withdrawal Amount"}
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-base-900 mt-0.5">
                    ₹{order.amount.toFixed(2)}
                  </div>
                  {order.merchantFee > 0 && (
                    <div className="text-[11px] text-gray-600 mt-1 font-medium">
                      Store Fee: <span className="font-bold">₹{order.merchantFee.toFixed(2)}</span> ({order.merchantFeeRate}%)
                      {" • "}
                      {isDeposit ? (
                        <>
                          Net Settled: <span className="font-bold text-base-900">₹{(order.amount - order.merchantFee).toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          Total Merchant Debit: <span className="font-bold text-base-900">₹{(order.amount + order.merchantFee).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {((isDeposit && order.status === "pending") || (!isDeposit && order.status === "processing")) && remainingSeconds > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/90 border border-base-200 rounded-xl shadow-xs shrink-0">
                    <Clock className="w-4 h-4 text-sky-600 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">
                        {isDeposit ? "Session Expiry" : "Fulfillment Window"}
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-800">
                        {String(timerMinutes).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#ffffff] border border-base-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-primary" />
                    <span>Order Identification</span>
                  </span>
                  <div className="font-bold text-base-900 font-mono text-sm">{order.orderNumber}</div>
                  <div className="text-gray-600">Type: <span className="font-semibold text-primary">{order.type}</span></div>
                  {order.clientOrderId && <div className="text-slate-500 font-mono text-[11px]">Client Ref: {order.clientOrderId}</div>}
                </div>

                <div className="p-3 bg-[#ffffff] border border-base-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <User className="w-3 h-3 text-primary" />
                    <span>Store / Merchant</span>
                  </span>
                  <div className="text-gray-700">
                    Store / Merchant: <span className="font-bold text-base-900">{order.merchantName || order.merchant?.name || "Merchant"}</span>
                  </div>
                  {order.remark && (
                    <div className="text-gray-600">
                      Note: <span className="font-medium italic">{order.remark}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400">
                    Created: {new Date(order.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* If Withdrawal: Beneficiary Details & Payout Lifecycle */}
              {!isDeposit && (
                <div className="p-4 sm:p-5 rounded-2xl border border-sky-300 bg-sky-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-sky-700" />
                      <span>Customer Beneficiary Payout Details</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      {(portal === "merchant" || portal === "admin") && ["pending", "processing"].includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => setUpdateCustomerQrOpen(true)}
                          className="text-xs font-bold text-sky-900 hover:text-black bg-white border border-sky-300 hover:bg-sky-100/60 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition shadow-xs"
                        >
                          <Edit className="w-3.5 h-3.5 text-sky-700" />
                          <span>Update Customer QR / UPI</span>
                        </button>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          order.status === "completed"
                            ? "badge-completed"
                            : order.status === "processing"
                            ? "badge-processing animate-pulse"
                            : order.status === "pending"
                            ? "badge-pending"
                            : "badge-rejected"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Structured Bank Transfer Details Card */}
                  <BankTransferCard
                    beneficiaryDetails={order.beneficiaryDetails}
                    amount={order.amount}
                    title="Customer Bank Account Details"
                  />

                  {order.qrProvider && (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Assigned QR Provider:</span>
                      <span className="font-bold text-base-900">{order.qrProvider.name}</span>
                    </div>
                  )}

                  {order.qrCode?.operator && (
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                      <span className="text-purple-700 font-medium">Assigned Operator:</span>
                      <span className="font-bold text-purple-900 flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span>{order.qrCode.operator.name}</span>
                      </span>
                    </div>
                  )}

                  {order.payoutPaidBy && (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Disbursed By:</span>
                      <span className="font-bold text-base-900">
                        {order.payoutPaidBy === "ADMIN" ? "Platform Admin (Direct Self-Pay)" : "QR Provider"}
                      </span>
                    </div>
                  )}

                  {/* Action/Submit Feedback Messages */}
                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{submitSuccess}</span>
                    </div>
                  )}

                  {/* ADMIN ACTIONS */}
                  {portal === "admin" && (
                    <div className="space-y-3 pt-1">
                      {order.status === "pending" && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-gray-600">
                            {order.payoutBroadcast
                              ? "Order is broadcasted to the QR Provider Pool. Waiting for an active provider to accept."
                              : "Choose how to fulfill this withdrawal order:"}
                          </p>
                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <button
                              type="button"
                              onClick={handleBroadcastPayout}
                              disabled={payoutActionLoading || order.payoutBroadcast}
                              className={`w-full sm:flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
                                order.payoutBroadcast
                                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                  : "btn-primary shadow-xs"
                              }`}
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>{order.payoutBroadcast ? "Broadcasted to QR Pool" : "Broadcast to QR Pool"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAdminConfirmPayout("ADMIN")}
                              disabled={payoutActionLoading}
                              className="w-full sm:flex-1 py-2 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center justify-center space-x-1.5 transition shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Directly by Admin</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {order.status === "processing" && (
                        <div className="space-y-2">
                          {order.isTimedOut ? (
                            <div className="p-3 bg-sky-100/70 border border-sky-300 rounded-xl text-xs text-sky-900 space-y-2">
                              <div className="flex items-center space-x-1.5 font-bold">
                                <Clock className="w-4 h-4 text-sky-700" />
                                <span>5-Minute Fulfillment Window Expired</span>
                              </div>
                              <p className="text-[11px] text-sky-800">
                                The assigned QR Provider failed to submit payment proof within 5 minutes. You can release this order back to the pool or pay directly.
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleReassignPayout}
                                  disabled={payoutActionLoading}
                                  className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center space-x-1"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Reassign to Pool</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminConfirmPayout("ADMIN")}
                                  disabled={payoutActionLoading}
                                  className="py-1.5 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                                >
                                  Pay by Admin
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                              <span>
                                QR Provider {order.qrProvider?.name || ""} has accepted this order. 5-minute countdown is active.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {order.status === "submitted" && (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                            <span className="font-bold block">QR Provider has transferred funds and submitted proof.</span>
                            <span className="text-[11px] text-emerald-800">
                              Verify the UTR reference and receipt image below, then confirm settlement.
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdminConfirmPayout("QR_PROVIDER")}
                            disabled={payoutActionLoading}
                            className="w-full btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md rounded-xl transition"
                          >
                            {payoutActionLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Settling Multi-Party Ledger...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm Payout & Settle Wallet Accounts</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR PROVIDER ACTIONS (In QR Provider Portal) */}
                  {portal === "qr-provider" && order.status === "processing" && (
                    <div className="space-y-3 pt-1 border-t border-sky-200">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-800">
                        <Send className="w-3.5 h-3.5 text-primary" />
                        <span>Confirm Payout & Complete Order</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        After transferring ₹{order.amount.toFixed(2)} to the beneficiary above, enter the 12-digit UTR and upload the transfer receipt to immediately confirm the payout:
                      </p>

                      <form onSubmit={handleProviderSubmitPayout} className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            12-Digit Bank / UPI UTR Reference Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={payoutProofUtr}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                              setPayoutProofUtr(digits);
                            }}
                            placeholder="e.g. 428712984561 (12 digits)"
                            maxLength={12}
                            className="w-full px-3 py-2 text-xs font-mono font-bold border border-base-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Upload Transfer Receipt / Screenshot <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setPayoutProofFile(file);
                                setPayoutProofPreview(URL.createObjectURL(file));
                              }
                            }}
                            className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
                          />
                          {payoutProofPreview && (
                            <div className="mt-2 p-1 border border-gray-200 rounded-lg max-w-xs bg-white">
                              <img src={payoutProofPreview} alt="Receipt preview" className="h-28 object-contain rounded" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelAssignment}
                            disabled={submittingPayout || payoutActionLoading}
                            className="px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center justify-center space-x-1"
                            title="Cancel this order assignment and return it to the available pool"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Cancel Assignment</span>
                          </button>

                          <button
                            type="submit"
                            disabled={submittingPayout || payoutActionLoading}
                            className="flex-1 btn-primary py-2 px-3 text-xs font-bold flex items-center justify-center space-x-1.5 shadow rounded-xl"
                          >
                            {submittingPayout ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Confirming & Settling Payout...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Payment & Complete Payout</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* MERCHANT ACTIONS (Cancel if still pending) */}
                  {portal === "merchant" && order.status === "pending" && (
                    <div className="pt-2 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        Need to cancel this withdrawal request?
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-lg transition flex items-center space-x-1"
                      >
                        {cancelling ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-red-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span>{cancelling ? "Cancelling..." : "Cancel Payout Order"}</span>
                      </button>
                    </div>
                  )}

                  {/* PROOF DISPLAY (If submitted or completed) */}
                  {(order.payoutProofUtr || order.payoutProofImage) && (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Disbursement Proof & Reference
                      </span>
                      {order.payoutProofUtr && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 font-semibold">Transfer UTR:</span>
                          <code className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded font-mono font-bold text-base-900">
                            {order.payoutProofUtr}
                          </code>
                        </div>
                      )}
                      {order.payoutProofImage && (
                        <div className="pt-1 border-t border-gray-100">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                            Attached Transfer Receipt:
                          </span>
                          <a
                            href={order.payoutProofImage}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg overflow-hidden border border-base-200 max-h-36 max-w-xs group relative hover:opacity-95"
                          >
                            <img
                              src={order.payoutProofImage}
                              alt="Payout Proof"
                              className="h-32 w-full object-contain bg-black/5"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] flex items-center space-x-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>View Receipt</span>
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* If Deposit: QR Code and Payment Info */}
              {isDeposit && order.qrCode && (
                <div className="p-4 rounded-xl border border-base-200 bg-white space-y-3">
                  <span className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span>Assigned UPI QR Code & Payment Route</span>
                  </span>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {order.qrCode.imageUrl && (
                      <div className="w-32 h-32 p-1.5 border border-base-200 rounded-xl bg-white shadow-xs shrink-0 flex items-center justify-center">
                        <img
                          src={order.qrCode.imageUrl}
                          alt="Deposit QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="space-y-2 flex-1 w-full text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold">UPI ID</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <code className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-mono font-bold text-base-900 text-xs">
                            {order.qrCode.upiId}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="p-1.5 text-gray-600 hover:text-primary hover:bg-gray-100 rounded transition"
                            title="Copy UPI ID"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {order.qrCode.accountHolderName && (
                        <div>
                          <span className="text-[10px] text-gray-400 block">Account Holder</span>
                          <span className="font-semibold text-gray-800">{order.qrCode.accountHolderName}</span>
                          {order.qrCode.bankName && <span className="text-slate-500"> ({order.qrCode.bankName})</span>}
                        </div>
                      )}

                      {order.qrCode.operator && (
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Assigned Operator</span>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 mt-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                            <User className="w-3 h-3 text-purple-600" />
                            <span>{order.qrCode.operator.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* In-Dashboard Customer UTR Submission (If Pending Deposit) */}
              {isDeposit && order.status === "pending" && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Submit Payment UTR Directly</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    If payment has been completed on the QR code, enter the customer&apos;s 12-digit UTR reference here to transition this order to verification.
                  </p>

                  {submitError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{submitSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitUtr} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        12-Digit UPI UTR Reference Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerUtr}
                        onChange={(e) => setCustomerUtr(e.target.value.trim())}
                        placeholder="e.g. 408712345678"
                        maxLength={24}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border-2 border-base-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Upload Payment Screenshot / Receipt Image *
                      </label>

                      {!screenshotPreview ? (
                        <div className="space-y-2.5">
                          <div
                            onClick={() => {
                              const input = document.getElementById("modal-screenshot-input");
                              if (input) input.click();
                            }}
                            className="p-4 border-2 border-dashed border-primary/70 hover:border-primary bg-white hover:bg-emerald-50/40 rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center space-y-1.5 shadow-xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#ffffff] border border-primary flex items-center justify-center text-primary">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <span className="btn-primary py-1.5 px-3.5 text-xs font-bold inline-flex items-center space-x-1.5 shadow pointer-events-none">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Choose Screenshot Image</span>
                            </span>
                            <p className="text-[10px] text-slate-500">
                              PNG, JPG, JPEG, WEBP (Max 10MB)
                            </p>
                          </div>

                            <input
                              id="modal-screenshot-input"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setScreenshotFile(file);
                                  setScreenshotPreview(URL.createObjectURL(file));
                                }
                              }}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div className="p-3 border-2 border-green-500/50 bg-green-50/40 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-green-800 flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Screenshot Image Selected</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setScreenshotFile(null);
                                  setScreenshotPreview("");
                                }}
                                className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            <div className="relative rounded-lg overflow-hidden border border-base-200 bg-white flex items-center justify-center p-2 shadow-inner">
                              <img
                                src={screenshotPreview}
                                alt="Screenshot Preview"
                                className="max-h-40 w-full object-contain rounded"
                              />
                            </div>

                            {screenshotFile && (
                              <div className="flex items-center justify-between text-xs text-gray-700 bg-white p-2 rounded-lg border border-base-200">
                                <span className="truncate max-w-[200px] font-medium">{screenshotFile.name}</span>
                                <span className="font-mono text-slate-500">{(screenshotFile.size / 1024).toFixed(1)} KB</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("modal-screenshot-input");
                                if (input) input.click();
                              }}
                              className="w-full py-1 text-xs font-bold text-primary hover:text-primary-600 border border-primary rounded-lg bg-white hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Choose a Different Image</span>
                            </button>

                            <input
                              id="modal-screenshot-input"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setScreenshotFile(file);
                                  setScreenshotPreview(URL.createObjectURL(file));
                                }
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelOrder}
                          disabled={cancelling || submittingUtr}
                          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0"
                          title="Cancel this order and release reserved QR liquidity"
                        >
                          {cancelling ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          )}
                          <span>{cancelling ? "Cancelling..." : "Cancel Order"}</span>
                        </button>

                        <button
                          type="submit"
                          disabled={submittingUtr || cancelling}
                          className="w-full flex-1 btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md rounded-xl transition"
                        >
                          {submittingUtr ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Submitting UTR & Proof...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirm & Submit Deposit Proof</span>
                            </>
                          )}
                        </button>
                      </div>
                  </form>
                </div>
              )}

              {/* Already Submitted UTR / Proof Display (Hidden from QR Provider for zero-knowledge dual-UTR security) */}
              {portal !== "qr-provider" && order.customerUtr && (
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Recorded Customer UTR & Proof
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-semibold">Customer UTR:</span>
                    <code className="px-2 py-0.5 bg-white border border-gray-200 rounded font-mono font-bold text-base-900">
                      {order.customerUtr}
                    </code>
                  </div>
                  {order.customerScreenshot && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Attached Payment Proof:</span>
                      <a
                        href={order.customerScreenshot}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg overflow-hidden border border-base-200 max-h-36 max-w-xs group relative hover:opacity-95"
                      >
                        <img src={order.customerScreenshot} alt="Payment Proof" className="h-32 w-full object-contain bg-black/5" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] flex items-center space-x-1">
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>View Full Image</span>
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Completed Settlement Details Banner */}
              {isDeposit && order.status === "completed" && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Payment Verified & Settled</span>
                    </span>
                    {order.verifierUtr && (
                      <div className="flex items-center space-x-1 text-emerald-800 font-mono text-[11px]">
                        <span className="text-slate-500 font-normal">Verified UTR:</span>
                        <code className="px-2 py-0.5 bg-white border border-emerald-300 rounded font-bold">
                          {order.verifierUtr}
                        </code>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Merchant wallet has been credited and all commission ledgers have been settled.
                  </p>
                </div>
              )}

              {/* ADMIN DIRECT UTR VERIFICATION & SETTLEMENT FORM */}
              {portal === "admin" && isDeposit && (order.status === "processing" || order.status === "pending") && (
                <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <div className="flex items-center space-x-2 text-base-900 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>Admin Direct UTR Verification</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Direct Settlement
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    Verify this deposit payment against your bank or UPI statement to immediately settle merchant balance and distribute multi-party commissions.
                  </p>

                  {/* Customer UTR Quick Fill */}
                  {order.customerUtr && (
                    <div className="p-2.5 bg-white rounded-lg border border-base-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Customer Submitted UTR:</span>
                        <code className="font-mono font-bold text-base-900 text-xs sm:text-sm select-all">
                          {order.customerUtr}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminVerifierUtr(order.customerUtr);
                          setAdminVerifyError("");
                        }}
                        className="py-1 px-2.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center space-x-1"
                        title="Use customer submitted UTR for verification"
                      >
                        <Check className="w-3 h-3" />
                        <span>Use This UTR</span>
                      </button>
                    </div>
                  )}

                  {adminVerifyError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{adminVerifyError}</span>
                    </div>
                  )}

                  {adminVerifySuccess && (
                    <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{adminVerifySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminVerifyDeposit} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Bank / Statement UTR Reference Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={adminVerifierUtr}
                        onChange={(e) => {
                          setAdminVerifierUtr(e.target.value.trim());
                          if (adminVerifyError) setAdminVerifyError("");
                        }}
                        placeholder="e.g. 408712345678"
                        maxLength={24}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border-2 border-base-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      />
                    </div>

                    {/* Optional Verification Screenshot */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Admin Confirmation Screenshot (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setAdminVerifierScreenshot(file);
                            setAdminVerifierScreenshotPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-gray-100 file:text-gray-800 file:font-semibold hover:file:bg-gray-200"
                      />
                      {adminVerifierScreenshotPreview && (
                        <div className="relative mt-2 p-1.5 bg-white rounded-lg border border-base-200 w-32 h-20">
                          <img
                            src={adminVerifierScreenshotPreview}
                            alt="Screenshot Preview"
                            className="w-full h-full object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAdminVerifierScreenshot(null);
                              setAdminVerifierScreenshotPreview("");
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={adminVerifying}
                      className="w-full btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md rounded-xl transition"
                    >
                      {adminVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying & Settling Payment...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify UTR & Settle Payment</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#e4d8c2] bg-[#ffffff] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {order && isDeposit ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Link Copied" : "Copy Customer Link"}</span>
              </button>
              <a
                href={`/checkout/${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                title="Open Public Customer Page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Direct Verify UTR Button for Admin in Footer */}
              {portal === "admin" && (order.status === "processing" || order.status === "pending") && (
                <button
                  type="button"
                  onClick={() => handleAdminVerifyDeposit()}
                  disabled={adminVerifying}
                  className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center space-x-1.5 shadow"
                  title="Verify UTR and settle order immediately"
                >
                  {adminVerifying ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{adminVerifying ? "Verifying..." : "Verify UTR"}</span>
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>

      <UpdateCustomerQrModal
        order={order}
        isOpen={updateCustomerQrOpen}
        onClose={() => setUpdateCustomerQrOpen(false)}
        onSuccess={(updatedOrder) => {
          setOrder((prev: any) => ({ ...prev, ...updatedOrder }));
          onOrderUpdated?.();
        }}
      />
    </div>
    </ModalPortal>
  );
}
