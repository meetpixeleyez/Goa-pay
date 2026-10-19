"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  Clock,
  Copy,
  Check,
  Upload,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowUpRight,
  Trash2,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  XCircle,
  CreditCard,
  User,
  Phone,
  ShieldCheck,
  Send,
  Download,
  Landmark,
} from "lucide-react";
import BankTransferCard from "@/components/orders/BankTransferCard";

interface PayoutFulfillmentModalProps {
  order: any;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PayoutFulfillmentModal({
  order,
  isOpen = true,
  onClose,
  onSuccess,
}: PayoutFulfillmentModalProps) {
  if (!isOpen) return null;
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedBeneficiary, setCopiedBeneficiary] = useState(false);

  // Remaining time in seconds (5-minute countdown)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  // Form submission state
  const [payoutProofUtr, setPayoutProofUtr] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize countdown from order expiresAt or 300s
  useEffect(() => {
    if (!order) return;
    if (order.expiresAt) {
      const diff = Math.max(
        0,
        Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(diff > 0 ? diff : 0);
    } else {
      setRemainingSeconds(300);
    }
    setPayoutProofUtr(order.payoutProofUtr || "");
    setProofFile(null);
    setProofPreview(order.payoutProofImage || "");
    setError("");
    setSuccess("");
  }, [order, isOpen]);

  // 1-second interval countdown
  useEffect(() => {
    if (!isOpen || !order || order.status !== "processing") return;
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
  }, [isOpen, order?.status, remainingSeconds]);

  if (!isOpen || !order) return null;

  const handleCopyUpi = () => {
    const upi = order.customerUpiId || (order.beneficiaryDetails?.includes("@") ? order.beneficiaryDetails : "");
    if (upi) {
      navigator.clipboard.writeText(upi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleCopyAmount = () => {
    if (order.amount) {
      navigator.clipboard.writeText(order.amount.toFixed(2));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const handleCopyBeneficiary = () => {
    if (order.beneficiaryDetails) {
      navigator.clipboard.writeText(order.beneficiaryDetails);
      setCopiedBeneficiary(true);
      setTimeout(() => setCopiedBeneficiary(false), 2000);
    }
  };

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }
    setError("");
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = payoutProofUtr.trim();

    if (!cleanUtr) {
      setError("Please enter the 12-digit UTR transfer reference ID");
      return;
    }

    if (cleanUtr.length < 6) {
      setError("UTR reference is too short. Please provide a valid transfer reference number.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let uploadedScreenshotUrl = order.payoutProofImage || "";
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Failed to upload payment proof image");
        uploadedScreenshotUrl = upData.url;
      }

      const res = await fetch(`/api/orders/${order.id}/payout/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utr: cleanUtr,
          screenshotUrl: uploadedScreenshotUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payout proof");

      setSuccess("Payment confirmed and order completed successfully! Wallet accounts settled.");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit payout proof");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAssignment = async () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order assignment? The order will be released back to the available pool for another QR provider."
    );
    if (!confirmCancel) return;

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/orders/${order.id}/payout/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel assignment");

      setSuccess("Order assignment cancelled and returned to the pool.");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to cancel assignment");
    } finally {
      setCancelling(false);
    }
  };

  // Determine UPI ID and QR code to display
  const customerUpiId =
    order.customerUpiId ||
    (order.beneficiaryDetails && order.beneficiaryDetails.includes("@") && !order.beneficiaryDetails.includes(" ")
      ? order.beneficiaryDetails.trim()
      : null);

  const qrImageUrl =
    order.customerQrImage ||
    (customerUpiId
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          `upi://pay?pa=${customerUpiId}&pn=${encodeURIComponent(order.customerName || "Customer")}&am=${order.amount}&cu=INR`
        )}`
      : null);

  const timerMins = Math.floor(remainingSeconds / 60);
  const timerSecs = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl border-2 border-sky-400 overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-sky-700 via-sky-800 to-sky-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="p-1.5 sm:p-2 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-sky-200" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <h3 className="font-extrabold text-xs sm:text-base text-white truncate">
                  Payout Fulfillment - Order Accepted
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-sky-400 text-sky-950 shrink-0">
                  Processing
                </span>
              </div>
              <p className="text-[11px] font-mono text-sky-200/90 truncate">#{order.orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition shrink-0 ml-1.5"
            title="Close popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Minute Fulfillment Timer Banner */}
        <div
          className={`px-3.5 sm:px-4 py-2 border-b flex items-center justify-between text-xs font-mono font-bold transition ${
            remainingSeconds < 60
              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
              : remainingSeconds < 180
              ? "bg-sky-50 text-sky-900 border-sky-200"
              : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            <Clock className="w-4 h-4 animate-spin text-sky-700 shrink-0" />
            <span className="font-sans font-semibold text-[11px] truncate">Fulfillment Countdown:</span>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-xs sm:text-sm font-extrabold">
              {String(timerMins).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
            </span>
            <span className="font-sans text-[10px] text-slate-500 font-normal hidden sm:inline">(5 min window)</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 text-red-800 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-green-50 border-2 border-green-300 text-green-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {/* Amount and Fee Earning Header (Responsive 1-Col on mobile, 2-Col on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#ffffff] border border-base-200 rounded-xl text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Disbursement Amount to Transfer
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-base-900">
                  ₹{order.amount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="p-1 text-slate-500 hover:text-primary hover:bg-gray-100 rounded transition"
                  title="Copy Amount"
                >
                  {copiedAmount ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Your Commission Earning
              </span>
              <div className="text-lg font-extrabold text-emerald-700 flex items-center space-x-1 mt-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>+₹{(order.qrProviderFee || 0).toFixed(2)}</span>
              </div>
              <span className="text-[9px] text-gray-400 block">Credited to wallet upon completion</span>
            </div>
          </div>

          {/* CUSTOMER RECIPIENT BANK ACCOUNT TRANSFER CARD */}
          <BankTransferCard
            beneficiaryDetails={order.beneficiaryDetails}
            amount={order.amount}
            customerName={order.customerName}
            customerMobile={order.customerMobile}
            title="Customer Bank Account (Send Transfer Here)"
          />

          {/* PAYMENT PROOF SUBMISSION FORM */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-primary bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Upload Payment Proof & Enter Transfer UTR</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  After sending ₹{order.amount.toFixed(2)} to customer, upload the receipt screenshot:
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-4">
              {/* Step 1: 12-Digit UTR */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  12-Digit Bank / UPI Transfer Reference UTR *
                </label>
                <input
                  type="text"
                  required
                  value={payoutProofUtr}
                  onChange={(e) => setPayoutProofUtr(e.target.value.trim())}
                  placeholder="e.g. 427812984561 (From GPay, PhonePe, Paytm, or NetBanking)"
                  maxLength={24}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold border-2 border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>

              {/* Step 2: Upload Proof Image Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-base-900">
                  Upload Transfer Proof Screenshot / Receipt *
                </label>

                {!proofPreview ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 border-2 border-dashed rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center space-y-2 ${
                      isDragging
                        ? "border-primary bg-emerald-50/70"
                        : "border-primary/70 bg-[#ffffff] hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-primary flex items-center justify-center text-primary shadow-xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="btn-primary py-1.5 px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow pointer-events-none">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Payment Screenshot</span>
                    </span>
                    <p className="text-[11px] text-base-700">
                      Click to choose image or drag & drop (PNG, JPG, JPEG, WEBP - Max 10MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="p-3 border-2 border-green-500/50 bg-green-50/30 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-800 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span>Payment Proof Screenshot Attached</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="relative rounded-lg overflow-hidden border border-base-200 bg-white flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={proofPreview}
                        alt="Transfer Proof Preview"
                        className="max-h-48 w-full object-contain rounded"
                      />
                    </div>

                    {proofFile && (
                      <div className="flex items-center justify-between text-xs text-gray-700 bg-white p-2 rounded-lg border border-base-200">
                        <span className="truncate max-w-[220px] font-medium">{proofFile.name}</span>
                        <span className="font-mono text-slate-500">{(proofFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 text-xs font-bold text-primary hover:text-primary-600 border border-primary rounded-lg bg-white hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Different Screenshot</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons: Cancel Assignment & Submit Proof */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAssignment}
                  disabled={cancelling || submitting}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0"
                  title="Cancel this assignment and return order back to the pool"
                >
                  {cancelling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span>{cancelling ? "Releasing..." : "Cancel Assignment"}</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || cancelling}
                  className="w-full flex-1 btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md rounded-xl transition"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming Payment & Settling...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm Payment & Complete Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
