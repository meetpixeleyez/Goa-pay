"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  Upload,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Trash2,
  ExternalLink,
  RefreshCw,
  Landmark,
  Check,
  CreditCard,
} from "lucide-react";
import { parseBankDetails, validateBankAccountDetails } from "@/lib/validation";
import BankNameInput from "@/components/ui/BankNameInput";

interface UpdateCustomerQrModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedOrder: any) => void;
}

export default function UpdateCustomerQrModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: UpdateCustomerQrModalProps) {
  const isPayout = order?.type === "PAYOUT";

  // Bank fields for PAYOUT
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountType, setAccountType] = useState<"SAVINGS" | "CURRENT">("SAVINGS");

  // QR / UPI fields for PAYIN
  const [customerUpiId, setCustomerUpiId] = useState("");
  const [beneficiaryDetails, setBeneficiaryDetails] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!order) return;
    setError("");
    setSuccess("");

    if (order.type === "PAYOUT") {
      const parsed = parseBankDetails(order.beneficiaryDetails);
      if (parsed) {
        setBankName(parsed.bankName || "");
        setAccountNumber(parsed.accountNumber || "");
        setConfirmAccountNumber(parsed.accountNumber || "");
        setIfscCode(parsed.ifscCode || "");
        setAccountHolderName(parsed.accountHolderName || order.customerName || "");
        setAccountType((parsed.accountType as any) || "SAVINGS");
      } else {
        setBankName("");
        setAccountNumber("");
        setConfirmAccountNumber("");
        setIfscCode("");
        setAccountHolderName(order.customerName || "");
        setAccountType("SAVINGS");
      }
    } else {
      setCustomerUpiId(order.customerUpiId || "");
      setBeneficiaryDetails(order.beneficiaryDetails || "");
      setQrPreview(order.customerQrImage || "");
      setQrFile(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

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
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (isPayout) {
        const bankCheck = validateBankAccountDetails({
          accountNumber,
          confirmAccountNumber,
          ifscCode,
          accountHolderName: accountHolderName.trim() || order.customerName,
          bankName,
        });

        if (!bankCheck.valid) {
          setError(bankCheck.errors[0] || "Invalid bank details");
          setSaving(false);
          return;
        }

        const res = await fetch(`/api/orders/${order.id}/customer-qr`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            accountHolderName: accountHolderName.trim() || order.customerName,
            bankName: bankName.trim(),
            accountType,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update customer bank details");

        setSuccess("Customer bank details updated successfully!");
        if (onSuccess) onSuccess(data.order);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        // PAYIN QR
        let uploadedQrUrl = qrPreview;
        if (qrFile) {
          const formData = new FormData();
          formData.append("file", qrFile);
          const upRes = await fetch("/api/upload", { method: "POST", body: formData });
          const upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData.error || "Failed to upload QR image");
          uploadedQrUrl = upData.url;
        }

        const res = await fetch(`/api/orders/${order.id}/customer-qr`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerQrImage: uploadedQrUrl || null,
            customerUpiId: customerUpiId.trim() || null,
            beneficiaryDetails: beneficiaryDetails.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update customer QR details");

        setSuccess("Customer QR code image and UPI ID updated successfully!");
        if (onSuccess) onSuccess(data.order);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-base-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-base-100/30">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              {isPayout ? <Landmark className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-base-900">
                {isPayout ? "Update Customer Bank Details" : "Update Customer QR & UPI"}
              </h3>
              <p className="text-xs font-mono text-slate-500">#{order.orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          <div className="p-3 bg-base-100/40 rounded-xl space-y-1">
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Customer Name:</span>
              <span className="text-base-900 font-bold">{order.customerName}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Transfer Amount:</span>
              <span className="text-emerald-900 font-extrabold font-mono">₹{order.amount?.toFixed(2)}</span>
            </div>
          </div>

          {isPayout ? (
            /* PAYOUT: BANK DETAILS */
            <div className="space-y-3.5">
              {/* Bank Name with Auto-Suggest */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <BankNameInput
                  value={bankName}
                  onChange={setBankName}
                  placeholder="Start typing bank name or acronym (e.g. SBI, HDFC, PNB)"
                  required
                  id="modal-bank-name"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Type acronyms like SBI, PNB, BOB or full name for instant suggestions
                </p>
              </div>

              {/* Account Number & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="9 to 18 digits"
                    maxLength={18}
                    className="w-full px-3 py-2 border border-base-200 rounded-xl font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Confirm Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Re-enter account number"
                    maxLength={18}
                    className="w-full px-3 py-2 border border-base-200 rounded-xl font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* IFSC & Beneficiary Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase().trim())}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-base-200 rounded-xl font-mono uppercase text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-base-900 mb-1">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Name as in bank"
                    className="w-full px-3 py-2 border border-base-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Account Type
                </label>
                <div className="flex items-center space-x-4 pt-0.5">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="updateAccountType"
                      checked={accountType === "SAVINGS"}
                      onChange={() => setAccountType("SAVINGS")}
                      className="text-primary"
                    />
                    <span>Savings Account</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="updateAccountType"
                      checked={accountType === "CURRENT"}
                      onChange={() => setAccountType("CURRENT")}
                      className="text-primary"
                    />
                    <span>Current Account</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* PAYIN: QR / UPI */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1">
                  Customer UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={customerUpiId}
                  onChange={(e) => setCustomerUpiId(e.target.value.trim())}
                  placeholder="e.g. rahul@okaxis"
                  className="w-full px-3 py-2 border border-base-200 rounded-xl font-mono text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-900">
                  Customer UPI QR Code Image
                </label>

                {!qrPreview ? (
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
                    className={`p-4 border-2 border-dashed rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center space-y-2 ${
                      isDragging
                        ? "border-primary bg-emerald-50/70"
                        : "border-base-200 bg-[#ffffff] hover:bg-emerald-50/40 hover:border-primary"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-primary flex items-center justify-center text-primary shadow-xs">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="btn-primary py-1 px-3 text-xs font-bold inline-flex items-center space-x-1 shadow pointer-events-none">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload QR Code Image</span>
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="p-3 border border-emerald-300 bg-emerald-50/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Attached Image</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setQrFile(null);
                          setQrPreview("");
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="relative rounded-lg overflow-hidden border border-base-200 bg-white flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={qrPreview}
                        alt="Customer QR Preview"
                        className="max-h-40 w-full object-contain rounded"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1 text-xs font-bold text-primary hover:text-primary-600 border border-primary rounded-lg bg-white hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Another QR Image</span>
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2 btn-secondary text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 btn-primary text-xs font-bold shadow rounded-xl flex items-center justify-center space-x-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPayout ? "Save Bank Details" : "Save QR & UPI Details"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
