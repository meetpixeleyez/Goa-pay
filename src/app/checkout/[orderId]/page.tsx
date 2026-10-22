"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Copy,
  Check,
  Upload,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  QrCode,
} from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { ordersApi } from "@/lib/api/orders.api";

export default function OrderCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const currentUser = useAppSelector((state) => state.auth.user);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  // Customer Submission Form State
  const [customerUtr, setCustomerUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>("");
  const [submitError, setSubmitError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-redirect effect when order is completed or rejected
  useEffect(() => {
    if (!order) return;

    if (order.status === "completed" && order.successUrl) {
      if (redirectCountdown === null) {
        setRedirectCountdown(5);
        return;
      }
      if (redirectCountdown <= 0) {
        const sep = order.successUrl.includes("?") ? "&" : "?";
        window.location.href = `${order.successUrl}${sep}orderNumber=${encodeURIComponent(order.orderNumber)}&clientOrderId=${encodeURIComponent(order.clientOrderId || "")}&status=completed&amount=${encodeURIComponent(order.amount)}&utr=${encodeURIComponent(order.customerUtr || "")}`;
        return;
      }
      const t = setTimeout(() => setRedirectCountdown((prev) => (prev !== null ? prev - 1 : 0)), 1000);
      return () => clearTimeout(t);
    }

    if (order.status === "rejected" && order.failureUrl) {
      if (redirectCountdown === null) {
        setRedirectCountdown(5);
        return;
      }
      if (redirectCountdown <= 0) {
        const sep = order.failureUrl.includes("?") ? "&" : "?";
        window.location.href = `${order.failureUrl}${sep}orderNumber=${encodeURIComponent(order.orderNumber)}&clientOrderId=${encodeURIComponent(order.clientOrderId || "")}&status=failed&reason=expired`;
        return;
      }
      const t = setTimeout(() => setRedirectCountdown((prev) => (prev !== null ? prev - 1 : 0)), 1000);
      return () => clearTimeout(t);
    }
  }, [order?.status, order?.successUrl, order?.failureUrl, redirectCountdown]);

  const getSuccessRedirectUrl = () => {
    if (!order?.successUrl) return "";
    const sep = order.successUrl.includes("?") ? "&" : "?";
    return `${order.successUrl}${sep}orderNumber=${encodeURIComponent(order.orderNumber)}&clientOrderId=${encodeURIComponent(order.clientOrderId || "")}&status=completed&amount=${encodeURIComponent(order.amount)}&utr=${encodeURIComponent(order.customerUtr || "")}`;
  };

  const getFailureRedirectUrl = () => {
    if (!order?.failureUrl) return "";
    const sep = order.failureUrl.includes("?") ? "&" : "?";
    return `${order.failureUrl}${sep}orderNumber=${encodeURIComponent(order.orderNumber)}&clientOrderId=${encodeURIComponent(order.clientOrderId || "")}&status=failed&reason=expired`;
  };

  // Fetch Order Details
  const fetchOrder = async () => {
    try {
      const res = await ordersApi.getOrderById(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
        setRemainingSeconds((res.order as any).remainingSeconds);
      }
    } catch (err: any) {
      setError(err.message || "Order not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Live polling when processing or pending
  useEffect(() => {
    if (!order) return;
    if (order.status === "completed" || order.status === "rejected") return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 4000);

    return () => clearInterval(interval);
  }, [order?.status]);

  // Tick down timer every 1 second if pending
  useEffect(() => {
    if (order?.status !== "pending") return;
    if (remainingSeconds <= 0) {
      fetchOrder(); // re-fetch to register rejected status on server
      return;
    }

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
  }, [order?.status, remainingSeconds]);

  // Handle File Selection
  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }
    setSubmitError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setScreenshotFile(null);
    setScreenshotPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (order?.qrCode?.upiId) {
      navigator.clipboard.writeText(order.qrCode.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // Copy Amount
  const handleCopyAmount = () => {
    if (order?.amount) {
      navigator.clipboard.writeText(order.amount.toFixed(2));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  // Handle Payment Submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = customerUtr.trim();

    if (!cleanUtr) {
      setSubmitError("Please enter your 12-digit UPI UTR / Transaction Reference number");
      return;
    }

    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      setSubmitError("Please enter a valid 12-digit numeric UPI UTR reference number (e.g. 427812984561)");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      let uploadedScreenshotUrl: string | null = null;
      if (screenshotFile) {
        setSubmitStep("Uploading payment image...");
        const formData = new FormData();
        formData.append("file", screenshotFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload payment image");
        }
        uploadedScreenshotUrl = uploadData.url;
      }

      setSubmitStep("Registering UTR & confirming payment...");

      // 2. Submit payment with UTR and screenshot URL (null if not uploaded)
      await ordersApi.submitPayment(orderId, {
        customerUtr: cleanUtr,
        customerScreenshot: uploadedScreenshotUrl || undefined,
      });

      // Check if logged in as Admin or Merchant, redirect to order listing page
      if (currentUser?.role === "ADMIN") {
        setTimeout(() => {
          router.push("/admin/orders");
        }, 800);
        return;
      } else if (currentUser?.role === "MERCHANT") {
        setTimeout(() => {
          router.push("/merchant/orders");
        }, 800);
        return;
      }

      // Refresh order view for external customer
      await fetchOrder();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
      setSubmitStep("");
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmCancel = window.confirm("Are you sure you want to cancel this order? Any reserved QR provider balance will be released immediately.");
    if (!confirmCancel) return;

    setCancelling(true);
    setSubmitError("");

    try {
      await ordersApi.cancelOrder(orderId);

      setOrder((prev: any) => ({
        ...prev,
        status: "rejected",
      }));

      // Redirect to order listing page if logged in as Admin or Merchant
      if (currentUser?.role === "ADMIN") {
        router.push("/admin/orders");
        return;
      } else if (currentUser?.role === "MERCHANT") {
        router.push("/merchant/orders");
        return;
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-base-700">Loading checkout session...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-12 text-center card-theme p-8 shadow-md border border-base-200">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-base-900">Session Error</h2>
        <p className="text-sm text-base-700 mt-2">{error || "Order not found"}</p>
      </div>
    );
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isDeposit = (order.type || "PAYIN") === "PAYIN";

  return (
    <div className="max-w-xl mx-auto py-6 px-3 sm:px-0">
      <div className="card-theme overflow-hidden shadow-xl border border-base-200 rounded-2xl">
        {/* Header Bar */}
        <div className="bg-primary text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                <ArrowDownLeft className="w-3 h-3" />
                <span>{isDeposit ? "Deposit Order (Payin)" : "Withdrawal Order"}</span>
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1">
              Paying to {order.merchantName}
            </h1>
            <div className="text-xs font-mono text-white/80">#{order.orderNumber}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-white/80 block font-medium">Payable Amount</span>
            <div className="flex items-center justify-end space-x-1.5 mt-0.5">
              <span className="text-2xl font-extrabold tracking-tight">₹{order.amount.toFixed(2)}</span>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
                title="Copy Exact Amount"
              >
                {copiedAmount ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 5-Minute Timer (if pending) */}
        {order.status === "pending" && (
          <div
            className={`p-3 text-center border-b flex items-center justify-center space-x-2 font-mono text-xs sm:text-sm font-bold transition ${
              remainingSeconds < 60
                ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                : remainingSeconds < 180
                ? "bg-sky-50 text-sky-800 border-sky-200"
                : "bg-base-100/60 text-base-900 border-base-200"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Time remaining to complete payment: {formatTimer(remainingSeconds)}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Status: COMPLETED */}
          {order.status === "completed" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-green-800">Deposit Completed!</h2>
              <p className="text-sm text-base-700 max-w-sm mx-auto leading-relaxed">
                Your payment of <b className="text-base-900">₹{order.amount.toFixed(2)}</b> has been successfully verified with matching UTR reference <b className="font-mono text-base-900">{order.customerUtr}</b> and settled.
              </p>

              {order.customerScreenshot && (
                <div className="pt-2">
                  <a
                    href={order.customerScreenshot}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Submitted Payment Proof</span>
                  </a>
                </div>
              )}

              {/* Success Redirect Card & Button */}
              {order.successUrl && (
                <div className="pt-4 max-w-sm mx-auto space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-semibold">
                    {redirectCountdown !== null && redirectCountdown > 0 ? (
                      <span>Redirecting to merchant store in <b className="font-bold">{redirectCountdown}</b> seconds...</span>
                    ) : (
                      <span>Redirecting to merchant store...</span>
                    )}
                  </div>
                  <a
                    href={getSuccessRedirectUrl()}
                    className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition"
                  >
                    <span>Return to Merchant Store</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Status: REJECTED */}
          {order.status === "rejected" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-red-800">Order Timed Out / Expired</h2>
              <p className="text-sm text-base-700 max-w-sm mx-auto leading-relaxed">
                The 5-minute checkout window has expired before payment proof was submitted. The reserved QR code has been released. Please initiate a new deposit if you still wish to pay.
              </p>

              {/* Failure Redirect Card & Button */}
              {order.failureUrl && (
                <div className="pt-4 max-w-sm mx-auto space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold">
                    {redirectCountdown !== null && redirectCountdown > 0 ? (
                      <span>Redirecting to merchant store in <b className="font-bold">{redirectCountdown}</b> seconds...</span>
                    ) : (
                      <span>Redirecting to merchant store...</span>
                    )}
                  </div>
                  <a
                    href={getFailureRedirectUrl()}
                    className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition"
                  >
                    <span>Return to Merchant Store</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Status: PROCESSING (UTR & Proof Image Submitted) */}
          {order.status === "processing" && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-base-900">Verification in Progress</h2>
                <p className="text-xs text-base-700 max-w-md mx-auto mt-1 leading-relaxed">
                  Your payment image proof and UTR reference have been received. The settlement team is verifying the transaction credit in real time.
                </p>
              </div>

              {/* Submitted Details Card */}
              <div className="p-4 bg-[#ffffff] border border-base-200 rounded-xl text-left space-y-3 max-w-md mx-auto text-xs">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-slate-500 font-semibold">Submitted UTR:</span>
                  <span className="font-mono font-bold text-base-900 text-sm">{order.customerUtr}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Deposit Amount:</span>
                  <span className="font-bold text-base-900">₹{order.amount.toFixed(2)}</span>
                </div>

                {order.customerScreenshot && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Uploaded Payment Proof
                    </span>
                    <a
                      href={order.customerScreenshot}
                      target="_blank"
                      rel="noreferrer"
                      className="block relative rounded-lg overflow-hidden border border-base-200 max-h-48 group hover:opacity-95 transition"
                    >
                      <img
                        src={order.customerScreenshot}
                        alt="Uploaded Payment Screenshot"
                        className="w-full h-36 object-contain bg-black/5"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold space-x-1">
                        <ExternalLink className="w-4 h-4" />
                        <span>View Full Image</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3 bg-base-100/40 rounded-xl text-xs text-base-700 flex items-center justify-center space-x-2 max-w-md mx-auto">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Checking confirmation status in real time...</span>
              </div>
            </div>
          )}

          {/* Status: PENDING - Active Checkout Form for Deposit Order */}
          {order.status === "pending" && isDeposit && (
            <>
              {/* Payment Instructions Header */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-blue-900 flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Deposit Instructions</span>
                </span>
                <ol className="list-decimal list-inside text-blue-800 space-y-0.5 pl-1 leading-relaxed">
                  <li>Scan the dynamic UPI QR code below with any UPI app (GPay, PhonePe, Paytm, etc.).</li>
                  <li>Pay the exact amount: <b>₹{order.amount.toFixed(2)}</b>.</li>
                  <li>Enter the 12-digit UTR reference ID and upload your payment receipt image below.</li>
                </ol>
              </div>

              {/* QR Code and Payment Details Card */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-3.5 bg-white rounded-2xl border-2 border-primary shadow-md relative">
                  {order.qrCode?.imageUrl ? (
                    <img
                      src={order.qrCode.imageUrl}
                      alt="Deposit UPI QR Code"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-52 h-52 sm:w-60 sm:h-60 flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs rounded-xl space-y-2">
                      <QrCode className="w-8 h-8 text-gray-300" />
                      <span>QR Image Not Available</span>
                    </div>
                  )}
                </div>

                {order.qrCode?.accountHolderName && (
                  <div className="text-xs font-semibold text-base-900 text-center">
                    Account Name: <span className="font-bold">{order.qrCode.accountHolderName}</span>
                    {order.qrCode.bankName && <span className="text-slate-500"> ({order.qrCode.bankName})</span>}
                  </div>
                )}

                {/* UPI ID with Copy Button */}
                {order.qrCode?.upiId && (
                  <div className="w-full bg-[#ffffff] border border-base-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                        UPI ID / VPA
                      </span>
                      <span className="text-xs font-mono font-bold text-base-900 truncate block mt-0.5">
                        {order.qrCode.upiId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="ml-2 px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-base-200 rounded-lg flex items-center space-x-1.5 shrink-0 transition shadow-xs"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                          <span className="font-semibold text-gray-700">Copy UPI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Submission Form: Upload Payment Image & Enter UTR Number */}
              <div className="pt-5 border-t-2 border-base-200 space-y-5">
                <div className="bg-base-100/60 p-3.5 rounded-xl border border-base-200">
                  <h2 className="text-sm sm:text-base font-bold text-base-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Complete Deposit Confirmation</span>
                  </h2>
                  <p className="text-xs text-base-700 mt-0.5">
                    After transferring <b>₹{order.amount.toFixed(2)}</b>, enter your 12-digit UTR reference and upload the payment proof image below:
                  </p>
                </div>

                {submitError && (
                  <div className="p-3.5 bg-red-50 border-2 border-red-300 text-red-800 text-xs rounded-xl flex items-start space-x-2.5 shadow-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span className="font-semibold leading-relaxed">{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitPayment} className="space-y-5">
                  {/* Step 1: 12-Digit UTR Number */}
                  <div className="p-4 bg-white border-2 border-base-200 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-extrabold">1</span>
                        <span>12-Digit UPI UTR Reference Number *</span>
                      </label>
                      {customerUtr.length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-primary bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {customerUtr.length}/12 digits
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={customerUtr}
                        onChange={(e) => setCustomerUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        placeholder="Enter 12-digit UTR number (e.g. 427812984561)"
                        maxLength={12}
                        className="w-full px-3.5 py-3 text-sm font-mono font-bold border-2 border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:font-normal placeholder:text-gray-400 shadow-inner"
                      />
                    </div>
                    <p className="text-[11px] text-base-700 flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Also named <b>UPI Ref No.</b> or <b>RRN</b> in your Google Pay, PhonePe, Paytm, or banking app receipt.</span>
                    </p>
                  </div>

                  {/* Step 2: Dedicated, Highly Visible Payment Image Upload Section */}
                  <div className="p-4 sm:p-5 bg-white border-2 border-primary rounded-2xl shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-base-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-extrabold">2</span>
                        <span>Upload Payment Proof Image / Screenshot (Optional)</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                        Optional
                      </span>
                    </div>

                    {!screenshotPreview ? (
                      <div className="space-y-3">
                        {/* Prominent Click & Drag-Drop Card */}
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center space-y-3 ${
                            isDragging
                              ? "border-primary bg-emerald-50/80 scale-[1.01]"
                              : "border-primary/70 bg-[#ffffff] hover:bg-emerald-50/40 hover:border-primary"
                          }`}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white border-2 border-primary flex items-center justify-center text-primary shadow-sm">
                            <UploadCloud className="w-7 h-7" />
                          </div>

                          <div className="space-y-1.5">
                            <span className="btn-primary py-2 px-5 text-xs font-bold inline-flex items-center space-x-2 shadow pointer-events-none">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Click Here to Choose Image / Screenshot</span>
                            </span>
                            <p className="text-xs font-semibold text-base-900 pt-1">
                              or drag and drop your receipt image here
                            </p>
                            <p className="text-[11px] text-base-700">
                              Supports: PNG, JPG, JPEG, WEBP (Max 10MB)
                            </p>
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 border-2 border-green-500/50 bg-green-50/30 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-green-800 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Payment Screenshot Attached & Ready</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded"
                            title="Remove Selected Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        {/* Image Preview Box */}
                        <div className="relative rounded-xl overflow-hidden border-2 border-base-200 bg-white flex items-center justify-center p-2 shadow-inner">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Preview"
                            className="max-h-56 w-full object-contain rounded-lg"
                          />
                        </div>

                        {screenshotFile && (
                          <div className="flex items-center justify-between text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-base-200">
                            <span className="truncate max-w-[220px] font-medium">{screenshotFile.name}</span>
                            <span className="font-mono text-slate-500">{(screenshotFile.size / 1024).toFixed(1)} KB</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 text-xs font-bold text-primary hover:text-primary-600 border border-primary rounded-lg bg-white hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose a Different Image</span>
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

                  {/* Action Buttons: Cancel Order & Submit Payment */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelling || submitting}
                      className="w-full sm:w-auto px-5 py-4 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 shadow-xs"
                      title="Cancel this payment order"
                    >
                      {cancelling ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span>{cancelling ? "Cancelling..." : "Cancel Order"}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || cancelling || remainingSeconds <= 0}
                      className="w-full flex-1 btn-primary py-4 flex items-center justify-center space-x-2 shadow-lg text-sm sm:text-base font-bold disabled:opacity-50 transition tracking-wide rounded-xl"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{submitStep || "Uploading & Submitting Payment..."}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Upload Screenshot & Confirm UTR</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* If Payout Order */}
          {order.status === "pending" && !isDeposit && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center mx-auto">
                <ArrowUpRight className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-base-900">Withdrawal Order (Payout)</h2>
              <p className="text-xs text-base-700 max-w-sm mx-auto leading-relaxed">
                This order is a withdrawal disbursement of <b>₹{order.amount.toFixed(2)}</b> to customer. Once verified by the merchant or platform, funds will be released to your registered account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
