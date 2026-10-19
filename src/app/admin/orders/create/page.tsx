"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/layout/PortalLayout";
import UpdateCustomerQrModal from "@/components/orders/UpdateCustomerQrModal";
import BankTransferCard from "@/components/orders/BankTransferCard";
import BankNameInput from "@/components/ui/BankNameInput";
import { validateBankAccountDetails } from "@/lib/validation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PlusCircle,
  ListOrdered,
  CreditCard,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Upload,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Edit,
  Landmark,
} from "lucide-react";

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);

  // Form states
  const [merchantId, setMerchantId] = useState("");
  const [orderType, setOrderType] = useState<"PAYIN" | "PAYOUT">("PAYIN");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Customer Bank Details for Withdrawal (PAYOUT)
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountType, setAccountType] = useState<"SAVINGS" | "CURRENT">("SAVINGS");

  const [updateQrModalOpen, setUpdateQrModalOpen] = useState(false);
  const [remark, setRemark] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // In-Dashboard Active Order Session State (after creation)
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Direct In-Dashboard UTR Confirmation
  const [customerUtr, setCustomerUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [utrError, setUtrError] = useState("");
  const [utrSuccess, setUtrSuccess] = useState("");

  useEffect(() => {
    fetch("/api/merchants/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.merchants && data.merchants.length > 0) {
          setMerchants(data.merchants);
          setMerchantId(data.merchants[0].id);
        }
      })
      .catch((err) => console.error("Failed to load merchants:", err))
      .finally(() => setLoadingMerchants(false));
  }, []);

  // Countdown timer for active pending session
  useEffect(() => {
    if (!createdOrder || createdOrder.status !== "pending") return;
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [createdOrder?.status, remainingSeconds]);

  // Live poll for status updates
  useEffect(() => {
    if (!createdOrder) return;
    if (createdOrder.status === "completed" || createdOrder.status === "rejected") return;

    const poll = setInterval(() => {
      fetch(`/api/orders/${createdOrder.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            setCreatedOrder((prev: any) => ({ ...prev, ...data.order }));
          }
        })
        .catch(() => { });
    }, 4000);

    return () => clearInterval(poll);
  }, [createdOrder?.id, createdOrder?.status]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUtrError("");
    setUtrSuccess("");
    setCustomerUtr("");

    const orderAmount = parseFloat(amount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      setError("Please enter a valid order amount greater than 0");
      setLoading(false);
      return;
    }

    if (!merchantId) {
      setError("Please select a merchant");
      setLoading(false);
      return;
    }

    if (orderType === "PAYOUT") {
      const bankCheck = validateBankAccountDetails({
        accountNumber,
        confirmAccountNumber,
        ifscCode,
        accountHolderName: accountHolderName.trim() || customerName.trim(),
        bankName,
      });

      if (!bankCheck.valid) {
        setError(bankCheck.errors[0] || "Invalid bank details");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          amount: orderAmount,
          type: orderType,
          customerName: customerName.trim(),
          customerMobile: customerMobile.trim(),
          customerEmail: customerEmail.trim() || undefined,
          accountNumber: orderType === "PAYOUT" ? accountNumber.trim() : undefined,
          confirmAccountNumber: orderType === "PAYOUT" ? confirmAccountNumber.trim() : undefined,
          ifscCode: orderType === "PAYOUT" ? ifscCode.trim().toUpperCase() : undefined,
          accountHolderName: orderType === "PAYOUT" ? (accountHolderName.trim() || customerName.trim()) : undefined,
          bankName: orderType === "PAYOUT" ? bankName.trim() : undefined,
          accountType: orderType === "PAYOUT" ? accountType : undefined,
          remark: remark.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      setCreatedOrder(data.order);
      setRemainingSeconds(300);
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdOrder) return;
    const fullUrl = `${window.location.origin}/checkout/${createdOrder.id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyUpi = () => {
    if (createdOrder?.qrCode?.upiId) {
      navigator.clipboard.writeText(createdOrder.qrCode.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUtr.trim()) {
      setUtrError("Please enter the 12-digit UTR ID");
      return;
    }

    setSubmittingUtr(true);
    setUtrError("");
    setUtrSuccess("");

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

      const res = await fetch(`/api/orders/${createdOrder.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerUtr: customerUtr.trim(),
          customerScreenshot: uploadedScreenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit UTR");

      setUtrSuccess("Payment proof submitted! Order moved to processing. Redirecting to global orders...");
      setCreatedOrder((prev: any) => ({
        ...prev,
        status: "processing",
        customerUtr: customerUtr.trim(),
        customerScreenshot: uploadedScreenshotUrl,
      }));

      setTimeout(() => {
        router.push("/admin/orders");
      }, 700);
    } catch (err: any) {
      setUtrError(err.message || "Failed to submit UTR");
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!createdOrder) return;
    const confirmCancel = window.confirm("Are you sure you want to cancel this order? Any reserved QR provider balance will be released immediately.");
    if (!confirmCancel) return;

    setCancelling(true);
    setUtrError("");
    setUtrSuccess("");

    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      setCreatedOrder((prev: any) => ({
        ...prev,
        status: "rejected",
      }));
      setUtrSuccess("Order cancelled. Redirecting to order listing...");
      router.push("/admin/orders");
    } catch (err: any) {
      setUtrError(err.message || "Failed to cancel order");
      setCancelling(false);
    }
  };

  const handleResetForm = () => {
    setCreatedOrder(null);
    setCustomerName("");
    setCustomerMobile("");
    setCustomerEmail("");
    setBankName("");
    setAccountNumber("");
    setConfirmAccountNumber("");
    setIfscCode("");
    setAccountHolderName("");
    setAccountType("SAVINGS");
    setRemark("");
    setAmount("");
    setScreenshotFile(null);
    setScreenshotPreview("");
  };

  const timerMins = Math.floor(remainingSeconds / 60);
  const timerSecs = remainingSeconds % 60;

  return (
    <PortalLayout
      portal="admin"
      title="Create New Order"
      subtitle="Initiate customer deposits (Payin) or disbursements (Payout) for any merchant store"
      actions={
        <Link
          href="/admin/orders"
          className="btn-secondary text-xs py-2 px-3.5 flex items-center space-x-1.5 shadow-xs"
        >
          <ListOrdered className="w-3.5 h-3.5 text-primary" />
          <span>Back to Global Orders</span>
        </Link>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================
            IN-DASHBOARD ACTIVE SESSION VIEW (AFTER ORDER IS CREATED)
        ======================================================== */}
        {createdOrder ? (
          <div className="card-theme p-6 sm:p-8 space-y-6 shadow-md border border-base-200 animate-fadeIn">
            {/* Header Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e4d8c2] gap-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`p-2.5 rounded-xl flex items-center justify-center ${createdOrder.type === "PAYIN"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-sky-100 text-sky-800"
                    }`}
                >
                  {createdOrder.type === "PAYIN" ? (
                    <ArrowDownLeft className="w-6 h-6" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6" />
                  )}
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-lg text-base-900">
                      {createdOrder.type === "PAYIN" ? "Deposit Session Active" : "Withdrawal Order Created"}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${createdOrder.status === "completed"
                        ? "badge-completed"
                        : createdOrder.status === "processing"
                          ? "badge-processing animate-pulse"
                          : createdOrder.status === "pending"
                            ? "badge-pending"
                            : "badge-rejected"
                        }`}
                    >
                      {createdOrder.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">{createdOrder.orderNumber}</p>
                </div>
              </div>

              {createdOrder.status === "pending" && remainingSeconds > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl shadow-xs self-start sm:self-auto">
                  <Clock className="w-4 h-4 text-sky-600 animate-pulse" />
                  <div>
                    <span className="text-[10px] text-sky-800 uppercase block font-bold">Session Expiry</span>
                    <span className="font-mono text-xs font-bold text-sky-900">
                      {String(timerMins).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Amount & Settlement Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#ffffff] border border-base-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                  Order Amount
                </span>
                <span className="text-2xl font-extrabold text-base-900">
                  ₹{createdOrder.amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                  Assigned Store / Merchant
                </span>
                <span className="text-base font-bold text-base-900">
                  {merchants.find((m) => m.id === merchantId)?.name || "Selected Merchant"}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 bg-white border border-base-200 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Customer Information
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-700">
                <span>Name: <b className="text-base-900">{createdOrder.customerName}</b></span>
                <span>Mobile: <b className="font-mono text-base-900">{createdOrder.customerMobile}</b></span>
                {createdOrder.customerEmail && <span>Email: <b>{createdOrder.customerEmail}</b></span>}
              </div>
              {createdOrder.remark && (
                <div className="text-slate-500 text-[11px] pt-1 border-t border-gray-100">
                  Note: <i>{createdOrder.remark}</i>
                </div>
              )}
            </div>

            {/* Deposit QR & In-Dashboard Payment Confirmation */}
            {createdOrder.type === "PAYIN" && createdOrder.qrCode && (
              <div className="p-4 rounded-xl border border-base-200 bg-white space-y-3">
                <span className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Assigned Deposit UPI QR Code</span>
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {createdOrder.qrCode.imageUrl && (
                    <div className="w-32 h-32 p-1.5 border border-base-200 rounded-xl bg-white shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={createdOrder.qrCode.imageUrl}
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
                          {createdOrder.qrCode.upiId}
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

                    {createdOrder.qrCode.accountHolderName && (
                      <div>
                        <span className="text-[10px] text-gray-400 block">Account Holder</span>
                        <span className="font-semibold text-gray-800">{createdOrder.qrCode.accountHolderName}</span>
                        {createdOrder.qrCode.bankName && (
                          <span className="text-slate-500"> ({createdOrder.qrCode.bankName})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* IN-DASHBOARD CHECKOUT CONFIRMATION & UPLOAD SECTION */}
                {createdOrder.status === "pending" ? (
                  <div className="mt-4 p-4 sm:p-5 border-2 border-primary bg-[#ffffff] rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-base-200 pb-3">
                      <div>
                        <span className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span>Deposit Payment Confirmation</span>
                        </span>
                        <p className="text-[11px] text-base-700 mt-0.5">
                          Enter customer's 12-digit UPI UTR and upload the payment receipt screenshot:
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Dashboard Checkout
                      </span>
                    </div>

                    {utrError && (
                      <div className="p-3 bg-red-50 border-2 border-red-300 text-red-800 text-xs rounded-xl flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span className="font-semibold leading-relaxed">{utrError}</span>
                      </div>
                    )}
                    {utrSuccess && (
                      <div className="p-3 bg-green-50 border-2 border-green-300 text-green-800 text-xs rounded-xl flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                        <span className="font-semibold">{utrSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitUtr} className="space-y-4">
                      {/* Step 1: 12-Digit UTR */}
                      <div>
                        <label className="block text-xs font-bold text-base-900 mb-1">
                          12-Digit UPI UTR Reference Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerUtr}
                          onChange={(e) => setCustomerUtr(e.target.value.trim())}
                          placeholder="e.g. 427812984561"
                          maxLength={24}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border-2 border-base-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-inner"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Found as UPI Ref No. or RRN on Google Pay, PhonePe, Paytm, or bank receipt.
                        </p>
                      </div>

                      {/* Step 2: High-Visibility Upload Image Section */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-base-900">
                          Upload Payment Screenshot / Receipt Image (Optional)
                        </label>

                        {!screenshotPreview ? (
                          <div
                            onClick={() => {
                              const input = document.getElementById("admin-screenshot-input");
                              if (input) input.click();
                            }}
                            className="p-5 border-2 border-dashed border-primary/70 hover:border-primary bg-white hover:bg-emerald-50/40 rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center space-y-2 shadow-xs"
                          >
                            <div className="w-12 h-12 rounded-xl bg-[#ffffff] border border-primary flex items-center justify-center text-primary shadow-xs">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <span className="btn-primary py-1.5 px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow pointer-events-none">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Choose Screenshot Image</span>
                            </span>
                            <p className="text-[11px] text-base-700">
                              Click to select image or drag & drop (PNG, JPG, JPEG, WEBP - Max 10MB)
                            </p>
                            <input
                              id="admin-screenshot-input"
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
                          <div className="p-3.5 border-2 border-green-500/50 bg-green-50/40 rounded-xl space-y-2.5">
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
                                className="max-h-48 w-full object-contain rounded"
                              />
                            </div>

                            {screenshotFile && (
                              <div className="flex items-center justify-between text-xs text-gray-700 bg-white p-2 rounded-lg border border-base-200">
                                <span className="truncate max-w-[220px] font-medium">{screenshotFile.name}</span>
                                <span className="font-mono text-slate-500">{(screenshotFile.size / 1024).toFixed(1)} KB</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("admin-screenshot-input");
                                if (input) input.click();
                              }}
                              className="w-full py-1.5 text-xs font-bold text-primary hover:text-primary-600 border border-primary rounded-lg bg-white hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Choose a Different Image</span>
                            </button>

                            <input
                              id="admin-screenshot-input"
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

                      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelOrder}
                          disabled={cancelling || submittingUtr}
                          className="w-full sm:w-auto px-4 py-3 text-xs sm:text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0"
                          title="Cancel this order and release reserved QR liquidity"
                        >
                          {cancelling ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>{cancelling ? "Cancelling Order..." : "Cancel Order"}</span>
                        </button>

                        <button
                          type="submit"
                          disabled={submittingUtr || cancelling}
                          className="w-full flex-1 btn-primary py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md rounded-xl transition"
                        >
                          {submittingUtr ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Submitting Proof & UTR...</span>
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
                ) : (
                  /* Display when already submitted (processing / completed) */
                  (createdOrder.customerUtr || createdOrder.customerScreenshot) && (
                    <div className="mt-4 p-4 border border-blue-200 bg-blue-50/40 rounded-xl space-y-3">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Submitted Deposit Proof & Verification Status</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-blue-100">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer UTR</span>
                          <span className="font-mono font-bold text-sm text-base-900">{createdOrder.customerUtr}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
                          <span className="font-bold text-xs uppercase text-blue-700">{createdOrder.status}</span>
                        </div>
                      </div>

                      {createdOrder.customerScreenshot && (
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Attached Receipt Image:</span>
                          <a
                            href={createdOrder.customerScreenshot}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg overflow-hidden border border-base-200 max-h-40 max-w-xs group relative hover:opacity-95 bg-white"
                          >
                            <img src={createdOrder.customerScreenshot} alt="Uploaded Proof" className="h-36 w-full object-contain p-1" />
                            <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center space-x-1">
                              <ExternalLink className="w-3 h-3" />
                              <span>View Full Image</span>
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Withdrawal Order Status Card (For PAYOUT) */}
            {createdOrder.type === "PAYOUT" && (
              <div className="p-5 rounded-2xl border border-sky-300 bg-sky-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <span>Customer Bank Account Details & Network Status</span>
                  </div>
                  {["pending", "processing"].includes(createdOrder.status) && (
                    <button
                      type="button"
                      onClick={() => setUpdateQrModalOpen(true)}
                      className="text-xs font-bold text-emerald-900 hover:text-black bg-white border border-emerald-300 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition shadow-xs self-start sm:self-auto"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Update Customer Bank Details</span>
                    </button>
                  )}
                </div>

                {/* Structured Bank Transfer Details Card */}
                <BankTransferCard
                  beneficiaryDetails={createdOrder.beneficiaryDetails}
                  amount={createdOrder.amount}
                  customerName={createdOrder.customerName}
                  customerMobile={createdOrder.customerMobile}
                />

                <div className="bg-white p-3.5 rounded-xl border border-base-200 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      Payout Processing Status
                    </span>
                    <div className="mt-1 flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          createdOrder.status === "completed"
                            ? "badge-completed"
                            : createdOrder.status === "processing"
                            ? "badge-processing animate-pulse"
                            : createdOrder.status === "pending"
                            ? "badge-pending"
                            : "badge-rejected"
                        }`}
                      >
                        {createdOrder.status}
                      </span>
                      <span className="text-[11px] text-gray-600">
                        {createdOrder.status === "pending"
                          ? "Awaiting Admin Processing & QR Network broadcast"
                          : createdOrder.status === "processing"
                          ? "Accepted by QR Provider - IMPS bank transfer in progress"
                          : createdOrder.status === "submitted"
                          ? "Proof submitted by QR Provider - awaiting Admin confirmation"
                          : createdOrder.status === "completed"
                          ? "Bank Transfer Completed & Settled"
                          : "Order Cancelled"}
                      </span>
                    </div>
                  </div>
                </div>

                {createdOrder.status === "pending" && (
                  <div className="pt-1 flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      Need to cancel this payout request before it is processed?
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelling}
                      className="px-3.5 py-1.5 text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-lg transition flex items-center space-x-1"
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
              </div>
            )}

            {/* Shareable Customer Checkout Link (PAYIN Only) */}
            {createdOrder.type === "PAYIN" && (
              <div className="p-3.5 bg-green-50/70 border border-green-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-green-900 uppercase tracking-wider block">
                  Shareable Customer Payment Link
                </span>
                <p className="text-[11px] text-green-800">
                  Send this link to the customer to open the customer checkout page with payment image upload & UTR entry:
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/checkout/${createdOrder.id}`}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-green-300 rounded-lg text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center space-x-1 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                  <a
                    href={`/checkout/${createdOrder.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    title="Open Customer Checkout Page in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:flex-1 py-2 text-xs font-bold btn-primary flex items-center justify-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Another Order</span>
              </button>
              <Link
                href="/admin/orders"
                className="w-full sm:flex-1 py-2 text-xs font-bold btn-secondary text-center"
              >
                Back to Global Orders
              </Link>
              <a
                href={`/checkout/${createdOrder.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto p-2 text-slate-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-center text-xs flex items-center justify-center space-x-1"
                title="Open Public Customer Checkout Page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="sm:hidden">Customer Checkout View</span>
              </a>
            </div>
          </div>
        ) : (
          /* ========================================================
             ORDER CREATION FORM
          ======================================================== */
          <div className="card-theme p-6 sm:p-8 shadow-md border border-base-200 space-y-6">
            {/* Interactive Order Type Selector */}
            <div>
              <label className="block text-xs font-bold text-base-900 mb-2 uppercase tracking-wider">
                Select Order Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("PAYIN")}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col space-y-1 ${orderType === "PAYIN"
                    ? "border-primary bg-emerald-50/60 ring-2 ring-primary/20"
                    : "border-base-200 bg-white hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`p-1.5 rounded-lg ${orderType === "PAYIN" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-xs text-base-900">Deposit (Payin)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Receive funds via dynamic UPI QR code
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType("PAYOUT")}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col space-y-1 ${orderType === "PAYOUT"
                    ? "border-[#8a5d3b] bg-sky-50/60 ring-2 ring-[#8a5d3b]/20"
                    : "border-base-200 bg-white hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`p-1.5 rounded-lg ${orderType === "PAYOUT" ? "bg-[#8a5d3b] text-white" : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-xs text-base-900">Withdrawal (Payout)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Disburse funds to customer bank or UPI
                  </p>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Select Merchant — NAME ONLY as requested */}
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Select Store / Merchant *</span>
                </label>
                {loadingMerchants ? (
                  <div className="text-xs text-slate-500 py-2">Loading merchants...</div>
                ) : (
                  <select
                    required
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Order Amount */}
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1">
                  {orderType === "PAYIN" ? "Deposit Amount (INR) *" : "Withdrawal Amount (INR) *"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-base">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 1000)"
                    className="w-full pl-9 pr-3 py-2.5 border border-base-200 rounded-lg font-bold text-base-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Quick amount suggestion chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Suggestions:</span>
                  {[1000, 5000, 10000, 25000, 50000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        amount === val.toString()
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-[#ffffff] text-base-900 border-base-200 hover:bg-base-100"
                      }`}
                    >
                      ₹{val.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Customer / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Customer Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Customer Email */}
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1">
                  Customer Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* If Withdrawal: Customer Bank Details (IMPS / NEFT / RTGS) */}
              {orderType === "PAYOUT" && (
                <div className="space-y-4 p-4 rounded-xl border border-emerald-300 bg-emerald-50/40">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                    <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                      <Landmark className="w-4 h-4 text-emerald-700" />
                      <span>Customer Bank Transfer Details (IMPS / NEFT)</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/90 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Required for Payout
                    </span>
                  </div>

                  {/* Bank Name with Auto-Suggest */}
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <BankNameInput
                      value={bankName}
                      onChange={setBankName}
                      placeholder="Start typing bank name or acronym (e.g. SBI, HDFC, PNB)"
                      required
                      id="admin-bank-name"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Type acronyms like SBI, PNB, BOB or full name for instant suggestions
                    </p>
                  </div>

                  {/* Account Number & Confirm Account Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-base-900 mb-1">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="9 to 18 digits (e.g. 50100234567890)"
                        maxLength={18}
                        className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-base-900 mb-1">
                        Confirm Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={confirmAccountNumber}
                        onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="Re-enter bank account number"
                        maxLength={18}
                        className={`w-full px-3 py-2 text-xs border rounded-lg bg-white font-mono focus:outline-none focus:ring-2 ${
                          confirmAccountNumber && confirmAccountNumber !== accountNumber
                            ? "border-red-400 focus:ring-red-400"
                            : confirmAccountNumber && confirmAccountNumber === accountNumber
                            ? "border-emerald-500 focus:ring-emerald-500"
                            : "border-base-200 focus:ring-primary"
                        }`}
                        required
                      />
                      {confirmAccountNumber && confirmAccountNumber !== accountNumber && (
                        <p className="text-[10px] text-red-600 mt-1 font-semibold">
                          Account numbers do not match
                        </p>
                      )}
                      {confirmAccountNumber && confirmAccountNumber === accountNumber && (
                        <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Account numbers match</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IFSC Code & Account Holder Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-base-900 mb-1">
                        IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase().trim())}
                        placeholder="11 digits (e.g. HDFC0001234)"
                        maxLength={11}
                        className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        4 letters, '0', then 6 alphanumeric characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-base-900 mb-1">
                        Beneficiary / Account Holder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder={customerName ? `e.g. ${customerName}` : "Name as registered in bank"}
                        className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Account Type
                    </label>
                    <div className="flex items-center space-x-4 pt-1">
                      <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="adminAccountType"
                          checked={accountType === "SAVINGS"}
                          onChange={() => setAccountType("SAVINGS")}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="font-semibold text-gray-800">Savings Account</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="adminAccountType"
                          checked={accountType === "CURRENT"}
                          onChange={() => setAccountType("CURRENT")}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="font-semibold text-gray-800">Current Account</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Reference / Note */}
              <div>
                <label className="block text-xs font-semibold text-base-900 mb-1">
                  Order Note / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Admin Generated Order #01"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 text-xs flex items-center justify-center space-x-2 shadow rounded-lg font-bold transition ${orderType === "PAYIN"
                    ? "btn-primary"
                    : "bg-[#8a5d3b] hover:bg-[#724c30] text-white"
                    }`}
                >
                  <span>
                    {loading
                      ? "Matching QR Provider & Creating Order..."
                      : orderType === "PAYIN"
                        ? "Create Deposit Order (Payin)"
                        : "Create Withdrawal Order (Payout)"}
                  </span>
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <UpdateCustomerQrModal
        order={createdOrder}
        isOpen={updateQrModalOpen}
        onClose={() => setUpdateQrModalOpen(false)}
        onSuccess={(updatedOrder) => {
          setCreatedOrder((prev: any) => ({ ...prev, ...updatedOrder }));
        }}
      />
    </PortalLayout>
  );
}
