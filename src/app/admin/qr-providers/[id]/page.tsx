"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  ArrowLeft,
  KeyRound,
  Wallet,
  ShoppingBag,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Send,
  MapPin,
  Calendar,
  Lock,
  Plus,
  ExternalLink,
  ShieldCheck,
  Save,
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  PlusCircle,
  Edit3,
  Users,
  User,
  Eye,
} from "lucide-react";
import {
  isValidEmail,
  validateName,
  validateAddress,
  isValidUpiId,
  isValidTelegramId,
  normalizeIndianPhone,
  normalizeTelegramId,
  isValidPhone,
  normalizePhone,
} from "@/lib/validation";

export default function QRProviderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const providerId = params.id as string;
  const tabParam = searchParams.get("tab");

  const [provider, setProvider] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"info" | "qrcodes" | "operators" | "orders" | "ledger">(
    tabParam === "qrcodes" || tabParam === "operators" || tabParam === "orders" || tabParam === "ledger"
      ? (tabParam as any)
      : "info"
  );

  useEffect(() => {
    if (tabParam && ["info", "qrcodes", "operators", "orders", "ledger"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [payinQrProviderFee, setPayinQrProviderFee] = useState("3.0");
  const [payoutQrProviderFee, setPayoutQrProviderFee] = useState("1.0");
  const [payinAgentFee, setPayinAgentFee] = useState("0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0");
  const [agentId, setAgentId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Balance Action States (Add & Clear Balance Modals)
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addingBalance, setAddingBalance] = useState(false);
  const [addBalanceError, setAddBalanceError] = useState("");
  const [addBalanceSuccess, setAddBalanceSuccess] = useState("");

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearAmount, setClearAmount] = useState("");
  const [clearDescription, setClearDescription] = useState("");
  const [clearingBalance, setClearingBalance] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearSuccess, setClearSuccess] = useState("");

  // Add QR Code modal/inline state
  const [showAddQr, setShowAddQr] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newQrImageUrl, setNewQrImageUrl] = useState("");
  const [uploadingQrImage, setUploadingQrImage] = useState(false);
  const [qrUploadError, setQrUploadError] = useState("");
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [addingQr, setAddingQr] = useState(false);
  const [qrSuccess, setQrSuccess] = useState("");
  const [qrError, setQrError] = useState("");

  // Edit QR Code Modal state
  const [editingQr, setEditingQr] = useState<any>(null);
  const [editUpiId, setEditUpiId] = useState("");
  const [editAccountHolder, setEditAccountHolder] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editQrImageUrl, setEditQrImageUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [updatingQr, setUpdatingQr] = useState(false);
  const [editQrSuccess, setEditQrSuccess] = useState("");
  const [editQrError, setEditQrError] = useState("");
  const [uploadingEditQrImage, setUploadingEditQrImage] = useState(false);
  const [editQrUploadError, setEditQrUploadError] = useState("");
  const editQrFileInputRef = useRef<HTMLInputElement>(null);

  // Individual QR toggling state
  const [togglingQrId, setTogglingQrId] = useState<string | null>(null);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  const fetchProvider = async () => {
    try {
      setLoading(true);
      setError("");
      const [userRes, agentsRes] = await Promise.all([
        fetch(`/api/admin/users/${providerId}`),
        fetch("/api/admin/users?role=AGENT"),
      ]);

      const userData = await userRes.json();
      const agentsData = await agentsRes.json();

      if (!userRes.ok) throw new Error(userData.error || "Failed to load provider profile");

      const u = userData.user;
      setProvider(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setAddress(u.address || "");
      setTelegramId(u.telegramId || "");
      setPayinQrProviderFee((u.payinQrProviderFee ?? u.qrProviderFee ?? 3.0).toString());
      setPayoutQrProviderFee((u.payoutQrProviderFee ?? u.qrProviderFee ?? 1.0).toString());
      setPayinAgentFee((u.payinAgentFee ?? 0).toString());
      setPayoutAgentFee((u.payoutAgentFee ?? 0).toString());
      setAgentId(u.agentId || "");
      setStatus(u.status || "ACTIVE");
      setPortalAccess(u.portalAccess !== undefined ? u.portalAccess : true);
      setTransactionAllowed(u.transactionAllowed !== undefined ? u.transactionAllowed : true);

      if (agentsData.success) {
        setAgents(agentsData.users || []);
      }
    } catch (err: any) {
      setError(err.message || "Unable to fetch QR provider details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (providerId) {
      fetchProvider();
    }
  }, [providerId]);

  // Telegram auto-prefix handler
  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() && !val.startsWith("@")) {
      setTelegramId("@" + val.trim());
    } else {
      setTelegramId(val);
    }
  };

  const handleTelegramBlur = () => {
    if (telegramId.trim() && !telegramId.trim().startsWith("@")) {
      setTelegramId("@" + telegramId.trim());
    }
  };

  // Save updated settings
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const nameCheck = validateName(name, "Provider name");
    if (!nameCheck.valid) {
      setSaveError(nameCheck.error || "Provider name is required");
      setSaving(false);
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setSaveError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      setSaving(false);
      return;
    }

    const payinFeeNum = parseFloat(payinQrProviderFee);
    if (isNaN(payinFeeNum) || payinFeeNum < 0 || payinFeeNum > 100) {
      setSaveError("Payin fee must be a percentage between 0 and 100.");
      setSaving(false);
      return;
    }

    const payoutFeeNum = parseFloat(payoutQrProviderFee);
    if (isNaN(payoutFeeNum) || payoutFeeNum < 0 || payoutFeeNum > 100) {
      setSaveError("Payout fee must be a percentage between 0 and 100.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${providerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          qrProviderFee: payinFeeNum,
          payinQrProviderFee: payinFeeNum,
          payoutQrProviderFee: payoutFeeNum,
          payinAgentFee: agentId ? (parseFloat(payinAgentFee) || 0) : 0,
          payoutAgentFee: agentId ? (parseFloat(payoutAgentFee) || 0) : 0,
          agentId: agentId || null,
          status,
          portalAccess,
          transactionAllowed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update provider");

      setSaveSuccess("QR Provider settings updated successfully!");
      fetchProvider();
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update provider");
    } finally {
      setSaving(false);
    }
  };

  const handleQrImageUpload = async (file: File) => {
    setQrUploadError("");
    setUploadingQrImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload QR image");
      }

      setNewQrImageUrl(data.url);
    } catch (err: any) {
      setQrUploadError(err.message || "Failed to upload image");
    } finally {
      setUploadingQrImage(false);
    }
  };

  // Add QR Code
  const handleAddQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingQr(true);
    setQrSuccess("");
    setQrError("");

    const upi = newUpiId.trim();
    const finalQrUrl =
      newQrImageUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

    try {
      const res = await fetch(`/api/admin/users/${providerId}/qr-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: upi,
          imageUrl: finalQrUrl,
          accountHolderName: newAccountHolder.trim() || null,
          bankName: newBankName.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add QR code");

      setQrSuccess("QR code registered successfully!");
      setShowAddQr(false);
      setNewUpiId("");
      setNewAccountHolder("");
      setNewBankName("");
      setNewQrImageUrl("");
      setQrUploadError("");
      fetchProvider();
      setTimeout(() => setQrSuccess(""), 3500);
    } catch (err: any) {
      setQrError(err.message || "Failed to add QR code");
    } finally {
      setAddingQr(false);
    }
  };

  // Toggle QR Code Status (Active / Inactive)
  const handleToggleQrStatus = async (qrId: string, currentActive: boolean) => {
    try {
      setTogglingQrId(qrId);
      const res = await fetch(`/api/admin/qr-codes/${qrId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update QR code status");

      setProvider((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          qrCodes: prev.qrCodes?.map((q: any) =>
            q.id === qrId
              ? { ...q, isActive: !currentActive, status: !currentActive ? "ACTIVE" : "INACTIVE" }
              : q
          ),
        };
      });

      setQrSuccess(`QR Code ${!currentActive ? "activated" : "deactivated"} successfully!`);
      setTimeout(() => setQrSuccess(""), 3500);
    } catch (err: any) {
      setQrError(err.message || "Failed to toggle QR code status");
      setTimeout(() => setQrError(""), 4000);
    } finally {
      setTogglingQrId(null);
    }
  };

  // Open Edit QR Code Modal
  const handleOpenEditQr = (qr: any) => {
    setEditingQr(qr);
    setEditUpiId(qr.upiId || "");
    setEditAccountHolder(qr.accountHolderName || "");
    setEditBankName(qr.bankName || "");
    setEditQrImageUrl(qr.imageUrl || "");
    setEditIsActive(qr.isActive !== undefined ? qr.isActive : qr.status === "ACTIVE");
    setEditQrSuccess("");
    setEditQrError("");
    setEditQrUploadError("");
  };

  // Upload image in Edit QR modal
  const handleEditQrImageUpload = async (file: File) => {
    setUploadingEditQrImage(true);
    setEditQrUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload QR image");
      setEditQrImageUrl(data.url);
    } catch (err: any) {
      setEditQrUploadError(err.message || "Failed to upload image");
    } finally {
      setUploadingEditQrImage(false);
    }
  };

  // Save changes to edited QR Code
  const handleSaveEditQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;

    const upi = editUpiId.trim();
    if (!upi) {
      setEditQrError("UPI ID (VPA) is required");
      return;
    }

    setUpdatingQr(true);
    setEditQrSuccess("");
    setEditQrError("");

    const finalQrUrl =
      editQrImageUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

    try {
      const res = await fetch(`/api/admin/qr-codes/${editingQr.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: upi,
          imageUrl: finalQrUrl,
          accountHolderName: editAccountHolder.trim() || null,
          bankName: editBankName.trim() || null,
          isActive: editIsActive,
          status: editIsActive ? "ACTIVE" : "INACTIVE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update QR code");

      setEditQrSuccess("QR Code updated successfully!");

      setProvider((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          qrCodes: prev.qrCodes?.map((q: any) =>
            q.id === editingQr.id ? data.qrCode : q
          ),
        };
      });

      setTimeout(() => {
        setEditingQr(null);
        setEditQrSuccess("");
      }, 1200);
    } catch (err: any) {
      setEditQrError(err.message || "Failed to update QR code");
    } finally {
      setUpdatingQr(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetSuccess("");
    setResetError("");

    try {
      const res = await fetch(`/api/admin/users/${providerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetSuccess(data.message || "Password updated successfully!");
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword("");
        setResetSuccess("");
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // Handle Add Balance
  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(addAmount);
    if (isNaN(num) || num <= 0) {
      setAddBalanceError("Please enter a valid amount greater than ₹0");
      return;
    }
    setAddingBalance(true);
    setAddBalanceError("");
    setAddBalanceSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BALANCE",
          amount: num,
          description: addDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add balance");

      setAddBalanceSuccess(data.message || "Balance added successfully!");
      await fetchProvider();
      setTimeout(() => {
        setShowAddBalanceModal(false);
        setAddAmount("");
        setAddDescription("");
        setAddBalanceSuccess("");
      }, 1200);
    } catch (err: any) {
      setAddBalanceError(err.message || "Failed to add balance");
    } finally {
      setAddingBalance(false);
    }
  };

  // Handle Clear Balance (Withdrawal)
  const handleClearBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(clearAmount);
    if (isNaN(num) || num <= 0) {
      setClearError("Please enter a valid amount greater than ₹0");
      return;
    }

    setClearingBalance(true);
    setClearError("");
    setClearSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLEAR_BALANCE",
          amount: num,
          description: clearDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear balance");

      setClearSuccess(data.message || "Balance cleared successfully!");
      await fetchProvider();
      setTimeout(() => {
        setShowClearModal(false);
        setClearAmount("");
        setClearDescription("");
        setClearSuccess("");
      }, 1200);
    } catch (err: any) {
      setClearError(err.message || "Failed to clear balance");
    } finally {
      setClearingBalance(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout portal="admin" title="QR Provider Profile" subtitle="Loading provider information...">
        <div className="card-theme p-12 text-center text-base-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs">Loading QR provider profile, liquidity balance, and QR codes...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !provider) {
    return (
      <PortalLayout portal="admin" title="QR Provider Profile" subtitle="Provider Not Found">
        <div className="card-theme p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-base-900">QR Provider Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested QR provider could not be found."}</p>
          <Link href="/admin/qr-providers" className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to QR Providers</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const qrCodes = provider.qrCodes || [];
  const operators = provider.operators || [];
  const assignedOrders = provider.providerOrders || [];
  const walletEntries = provider.wallet?.entries || [];

  return (
    <PortalLayout
      portal="admin"
      title={provider.name}
      subtitle="Dedicated QR Provider Liquidity Profile, QR Code Management, and Orders"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowResetModal(true);
              setNewPassword("");
              setResetError("");
              setResetSuccess("");
            }}
            className="px-3 py-1.5 border border-base-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
          <Link
            href="/admin/qr-providers"
            className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Providers</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Metadata Card */}
        <div className="card-theme p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="size-12 rounded-xl bg-primary/15 text-slate-700 flex items-center justify-center font-bold text-lg border border-primary/30 shrink-0">
                {provider.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-700">{provider.name}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${provider.status === "ACTIVE"
                      ? "bg-green-50 text-green-500 border-green-200"
                      : "bg-red-50 text-red-500 border-red-200"
                      }`}
                  >
                    {provider.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                    ID: {provider.id}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-base-700 mt-1 flex-wrap gap-y-1">
                  <span className="flex items-center space-x-1">
                    <Mail className="size-3.5 text-slate-400" />
                    <span>{provider.email}</span>
                  </span>
                 {/*  {provider.telegramId && (
                    <span className="flex items-center space-x-1 font-mono text-gray-600">
                      <Send className="w-3.5 h-3.5 text-blue-500" />
                      <span>{provider.telegramId}</span>
                    </span>
                  )} */}
                  {provider.agent && (
                    <span className="flex items-center space-x-1 text-slate-600">
                      <span className="font-semibold text-slate-600">Agent:</span>
                      <span>{provider.agent.name}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Joined {new Date(provider.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchProvider}
                className="p-2 border border-slate-200 rounded-lg text-base-900 hover:bg-primary-50 hover:border-primary-100 hover:text-primary transition"
                title="Refresh Provider Info"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Total Balance</span>
              <div className="size-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                <Wallet className="size-4 fill-primary-500/20" />
              </div>
            </div>
            <div className={`text-xl font-bold ${(provider.balance || 0) < 0 ? "text-red-500" : "text-slate-800"
              }`}>
              {(provider.balance || 0) < 0
                ? `-₹${Math.abs(provider.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `₹${(provider.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <span className="text-[12px] text-slate-500 block">Allocated liquidity pool</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Locked Exposure</span>
              <div className="size-8 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center">
                <Lock className="size-4 fill-orange-500/20" />
              </div>
            </div>
            <div className="text-xl font-bold text-orange-500">
              ₹{(provider.exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[12px] text-slate-700 block">Active pending sessions</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Available Balance</span>
              <div className="size-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                <ShieldCheck className="size-4 fill-primary-500/20" />
              </div>
            </div>
            <div className={`text-xl font-bold ${(provider.availableBalance || 0) < 0 ? "text-red-500" : "text-primary"
              }`}>
              {(provider.availableBalance || 0) < 0
                ? `-₹${Math.abs(provider.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `₹${(provider.availableBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <span className="text-[12px] text-slate-500 block">Ready for incoming deposits</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "info"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Provider Info & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("qrcodes")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "qrcodes"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <QrCode className="size-3.5" />
            <span>UPI QR Codes ({qrCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("operators")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "operators"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operators ({operators.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "orders"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Assigned Orders ({assignedOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "ledger"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet & Ledger ({walletEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: INFO & SETTINGS */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 card-theme p-6 shadow-sm border border-slate-200">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-5">
                <QrCode className="size-5 text-primary" />
                <h3 className="font-bold text-[16px] text-slate-700">Edit QR Provider Profile & Rules</h3>
              </div>

              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-500 text-xs rounded-lg flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-500 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210 or +1 202 555 0199"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Indian 10-digit mobile or International format with country code</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payin Fee Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          required
                          value={payinQrProviderFee}
                          onChange={(e) => setPayinQrProviderFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 font-bold text-xs">%</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Fee earned on customer deposits</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payout Fee Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          required
                          value={payoutQrProviderFee}
                          onChange={(e) => setPayoutQrProviderFee(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 font-bold text-xs">%</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Fee earned on customer withdrawals</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assigned Agent & Direct Commission Fees
                    </label>
                    <select
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Direct (No Agent Assigned)</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.email})
                        </option>
                      ))}
                    </select>

                    {agentId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Agent Payin Fee (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={payinAgentFee}
                              onChange={(e) => setPayinAgentFee(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Cut paid to agent on deposits processed by this QR provider
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Agent Payout Fee (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={payoutAgentFee}
                              onChange={(e) => setPayoutAgentFee(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Cut paid to agent on withdrawals processed by this QR provider
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Different QR providers can have custom agent fee rates for the same agent.
                    </p>
                  </div>

                  {/* Account Controls & Permissions (One-Line Grid Switch Buttons) */}
                  <div className="md:col-span-2 p-4 sm:p-5 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <span className="text-xs font-bold text-base-900 uppercase tracking-wider block pb-2 border-b border-[#e4d8c2]">
                      Account Controls & Permissions
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#e2e8f0]/60">
                      {/* Account Status Switch */}
                      <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-2 sm:pt-0 sm:pr-4">
                        <div>
                          <span className="text-xs font-bold text-base-900 block">Account Status</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full ${status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider ${status === "ACTIVE" ? "text-green-700" : "text-red-600"
                                }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={status === "ACTIVE"}
                          onClick={() => setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${status === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </div>

                      {/* Portal Access Switch */}
                      <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-3 sm:pt-0 sm:px-4">
                        <div>
                          <span className="text-xs font-bold text-base-900 block">Portal Access</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full ${portalAccess ? "bg-green-500" : "bg-gray-400"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold ${portalAccess ? "text-green-700" : "text-slate-500"
                                }`}
                            >
                              {portalAccess ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={portalAccess}
                          onClick={() => setPortalAccess(!portalAccess)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${portalAccess ? "bg-primary" : "bg-gray-300"
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${portalAccess ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </div>

                      {/* Transaction Allowed Switch */}
                      <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-3 sm:pt-0 sm:pl-4">
                        <div>
                          <span className="text-xs font-bold text-base-900 block">Transactions</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full ${transactionAllowed ? "bg-green-500" : "bg-gray-400"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold ${transactionAllowed ? "text-green-700" : "text-slate-500"
                                }`}
                            >
                              {transactionAllowed ? "Allowed" : "Blocked"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={transactionAllowed}
                          onClick={() => setTransactionAllowed(!transactionAllowed)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${transactionAllowed ? "bg-primary" : "bg-gray-300"
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${transactionAllowed ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-base-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Card: Exposure & Safeguards */}
            <div className="lg:col-span-4 space-y-4">
              {/* Wallet Balance Actions Card */}
              <div className="card-theme p-5 shadow-sm border border-base-200">
                <div className="flex items-center justify-between pb-3 border-b border-base-200 mb-4">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-[16px] text-slate-700">Wallet Balance Management</h4>
                  </div>
                  <span className={`text-[11px] font-mono font-bold ${(provider.balance || 0) < 0 ? "text-red-600" : "text-base-900"
                    }`}>
                    {(provider.balance || 0) < 0
                      ? `-₹${Math.abs(provider.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `₹${(provider.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>

                <p className="text-xs text-base-700 mb-4 leading-relaxed">
                  Add liquidity funds or clear balance (withdrawal) from this QR Provider's wallet.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBalanceModal(true);
                      setAddAmount("");
                      setAddDescription("");
                      setAddBalanceError("");
                      setAddBalanceSuccess("");
                    }}
                    className="btn-primary text-xs py-2 px-2 flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer w-full"
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Add Balance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearModal(true);
                      setClearAmount("");
                      setClearDescription("");
                      setClearError("");
                      setClearSuccess("");
                    }}
                    className="px-2 py-2 text-xs bg-white border border-base-200 text-base-900 hover:bg-base-100/60 rounded-lg font-semibold flex items-center justify-center shadow-xs transition cursor-pointer w-full"
                  >
                    <span className="truncate">Clear Balance (Withdrawal)</span>
                  </button>
                </div>
              </div>

              <div className="card-theme p-5 shadow-sm border border-base-200">
                <div className="flex items-center space-x-2 pb-2 border-b border-base-200 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-base-900">Liquidity Safeguards</h4>
                </div>
                <div className="space-y-2.5 text-xs text-base-700">
                  <p>
                    • Available Balance = <b>Balance - Exposure</b>.
                  </p>
                  <p>
                    • Whenever a customer initiates a deposit session, exposure is locked for <b>5 minutes (300s)</b>.
                  </p>
                  <p>
                    • If payment completes via Dual-UTR verification, exposure is deducted from total balance. If session expires or is rejected, exposure is released instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UPI QR CODES */}
        {activeTab === "qrcodes" && (
          <div className="space-y-4">
            <div className="card-theme p-4 shadow-sm border border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Active Collection QR Codes</h3>
                <p className="text-xs text-base-700">UPI payment QR endpoints assigned to {provider.name}</p>
              </div>
              <button
                onClick={() => setShowAddQr(!showAddQr)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddQr ? "Close Form" : "Add New QR Code"}</span>
              </button>
            </div>

            {qrSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{qrSuccess}</span>
              </div>
            )}

            {/* Add QR Code inline form */}
            {showAddQr && (
              <div className="card-theme p-5 shadow-sm border border-base-200 animate-in fade-in duration-200">
                <h4 className="font-bold text-xs text-base-900 mb-3">Register New UPI QR Code</h4>
                {qrError && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {qrError}
                  </div>
                )}
                <form onSubmit={handleAddQr} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">UPI ID (VPA) *</label>
                    <input
                      type="text"
                      required
                      value={newUpiId}
                      onChange={(e) => setNewUpiId(e.target.value)}
                      placeholder="provider.pay@icici"
                      className="w-full px-3 py-1.5 text-xs border border-base-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={newAccountHolder}
                      onChange={(e) => setNewAccountHolder(e.target.value)}
                      placeholder="FastPay Liquidity"
                      className="w-full px-3 py-1.5 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="ICICI Bank"
                      className="w-full px-3 py-1.5 text-xs border border-base-200 rounded-lg"
                    />
                  </div>
                  {/* QR Image Upload Section */}
                  <div className="md:col-span-3 pt-3 border-t border-base-200/60">
                    <label className="block text-xs font-semibold text-base-900 mb-1.5">
                      Upload QR Code Image (or leave empty to auto-generate dynamic UPI QR)
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <input
                        type="file"
                        ref={qrFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleQrImageUpload(file);
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={uploadingQrImage}
                        className="px-3.5 py-2 text-xs bg-white border border-base-200 hover:bg-base-100/40 text-base-900 font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs shrink-0 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>{uploadingQrImage ? "Uploading..." : "Choose QR Image File"}</span>
                      </button>

                      {newQrImageUrl && (
                        <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                          <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <div className="flex items-center space-x-2">
                            <img
                              src={newQrImageUrl}
                              alt="Uploaded QR Preview"
                              className="w-8 h-8 object-contain rounded border border-green-300 bg-white"
                            />
                            <span className="font-mono text-[11px] truncate max-w-xs">{newQrImageUrl}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewQrImageUrl("")}
                            className="text-red-500 hover:text-red-700 ml-1 p-1 hover:bg-red-50 rounded cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {qrUploadError && <span className="text-xs text-red-600">{qrUploadError}</span>}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddQr(false);
                        setNewQrImageUrl("");
                        setQrUploadError("");
                      }}
                      className="px-3 py-1 text-xs border border-base-200 rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingQr}
                      className="btn-primary px-4 py-1 text-xs font-bold"
                    >
                      {addingQr ? "Adding..." : "Save QR Code"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* QR Codes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qrCodes.length === 0 ? (
                <div className="col-span-full card-theme p-8 text-center text-slate-500">
                  No QR codes registered for this provider. Click "Add New QR Code" above.
                </div>
              ) : (
                qrCodes.map((qr: any) => (
                  <div key={qr.id} className="card-theme p-4 shadow-sm border border-base-200 flex flex-col justify-between space-y-3">
                    <div className="flex space-x-3 items-start">
                      <div className="relative group shrink-0">
                        <img
                          src={qr.imageUrl}
                          alt={qr.upiId}
                          className="w-20 h-20 object-contain rounded-lg border border-base-200 bg-white p-1"
                        />
                        <a
                          href={qr.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-[10px] font-semibold"
                          title="View Full Image"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center space-x-1 ${qr.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-slate-500"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${qr.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                            <span>{qr.isActive ? "Active" : "Inactive"}</span>
                          </span>
                        </div>
                        <div className="font-mono text-xs font-bold text-base-900 truncate" title={qr.upiId}>
                          {qr.upiId}
                        </div>
                        <div className="text-[11px] text-base-700 truncate" title={qr.accountHolderName}>
                          {qr.accountHolderName || "Holder Name Not Set"}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate" title={qr.bankName}>
                          {qr.bankName || "Bank Name Not Set"}
                        </div>
                        {qr.operator && (
                          <div className="text-[10px] text-purple-700 font-semibold truncate flex items-center space-x-1 mt-0.5" title={qr.operator.name}>
                            <User className="w-2.5 h-2.5 shrink-0" />
                            <span>Op: {qr.operator.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions: Active/Inactive Switch & Edit Button */}
                    <div className="pt-2.5 border-t border-[#e0f2fe] flex items-center justify-between">
                      {/* Active / Inactive Toggle Switch */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={qr.isActive}
                          disabled={togglingQrId === qr.id}
                          onClick={() => handleToggleQrStatus(qr.id, qr.isActive)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${qr.isActive ? "bg-primary" : "bg-gray-300"
                            } ${togglingQrId === qr.id ? "opacity-50 cursor-wait" : ""}`}
                          title={`Click to ${qr.isActive ? "Deactivate" : "Activate"} this QR Code`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${qr.isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                          />
                        </button>
                        <span className="text-[11px] font-semibold text-gray-600">
                          {qr.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditQr(qr)}
                        className="px-2.5 py-1 text-xs bg-white border border-base-200 text-base-900 hover:bg-base-100/60 rounded-md font-semibold flex items-center space-x-1 shadow-2xs transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-primary" />
                        <span>Edit QR</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: OPERATORS */}
        {activeTab === "operators" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Sub-Operators</h3>
                <p className="text-xs text-base-700">Team members managing QR codes under {provider.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                  {operators.length} {operators.length === 1 ? "Operator" : "Operators"}
                </span>
                <Link
                  href={`/admin/operators/create?providerId=${provider.id}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Operator</span>
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-48 max-w-[200px]">Operator Name</th>
                    <th className="p-3 w-56 max-w-[220px]">Email & Contact</th>
                    <th className="p-3 min-w-[180px] max-w-[240px]">Assigned QR Codes</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 whitespace-nowrap">Permissions</th>
                    <th className="p-3 whitespace-nowrap">Created</th>
                    <th className="p-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {operators.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No operators currently configured for this QR provider.
                      </td>
                    </tr>
                  ) : (
                    operators.map((op: any) => (
                      <tr key={op.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 font-bold text-base-900 w-48 max-w-[200px]">
                          <Link
                            href={`/admin/operators/${op.id}`}
                            className="flex items-center space-x-2 hover:text-primary hover:underline group"
                            title={op.name}
                          >
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition">
                              {op.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate block flex-1">{op.name}</span>
                          </Link>
                        </td>
                        <td className="p-3 w-56 max-w-[220px]">
                          <div className="font-medium text-gray-800 font-mono truncate" title={op.email}>{op.email}</div>
                          {op.phone && <div className="text-[11px] text-slate-500 truncate">{op.phone}</div>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {op.assignedQRCodes && op.assignedQRCodes.length > 0 ? (
                              op.assignedQRCodes.map((q: any) => (
                                <span
                                  key={q.id}
                                  className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-mono text-gray-700"
                                  title={q.upiId}
                                >
                                  {q.upiId}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">No QR codes assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${op.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}
                          >
                            {op.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${op.portalAccess ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"
                                }`}
                            >
                              Portal: {op.portalAccess ? "Yes" : "No"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${op.transactionAllowed ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                                }`}
                            >
                              Txn: {op.transactionAllowed ? "Yes" : "No"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {new Date(op.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/operators/${op.id}`}
                            className="px-2.5 py-1 text-xs bg-primary/15 text-[#0c4a6e] hover:bg-primary/25 rounded-md font-semibold inline-flex items-center space-x-1 border border-primary/30 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Info</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ASSIGNED ORDERS */}
        {activeTab === "orders" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Assigned Orders Stream</h3>
                <p className="text-xs text-base-700">Customer deposit sessions routed to {provider.name}</p>
              </div>
              <span className="text-xs text-base-700">
                Total Orders: <b>{assignedOrders.length}</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Customer UTR</th>
                    <th className="p-3">Verifier UTR</th>
                    <th className="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {assignedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No orders currently assigned to this QR provider.
                      </td>
                    </tr>
                  ) : (
                    assignedOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 font-mono font-bold text-base-900">
                          {o.orderNumber}
                        </td>
                        <td className="p-3 font-medium text-base-900">
                          {o.merchant?.name || "--"}
                        </td>
                        <td className="p-3 text-right font-extrabold text-base-900">
                          ₹{o.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : o.status === "processing"
                                ? "bg-blue-100 text-blue-800"
                                : o.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {o.customerUtr || <span className="text-gray-400 italic">None</span>}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {o.verifierUtr || <span className="text-gray-400 italic">Pending</span>}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {new Date(o.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: WALLET & LEDGER */}
        {activeTab === "ledger" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-base-900">Liquidity Ledger & Fee Statement</h3>
                <p className="text-xs text-base-700">All credit and debit entries for {provider.name}</p>
              </div>
              <div className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${(provider.wallet?.balance ?? provider.balance ?? 0) < 0
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-base-900 bg-primary/15 border-primary/30"
                }`}>
                Wallet Balance: {(provider.wallet?.balance ?? provider.balance ?? 0) < 0
                  ? `-₹${Math.abs(provider.wallet?.balance ?? provider.balance ?? 0).toFixed(2)}`
                  : `₹${(provider.wallet?.balance ?? provider.balance ?? 0).toFixed(2)}`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0f2fe]">
                  {walletEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No ledger transactions recorded in this provider's wallet yet.
                      </td>
                    </tr>
                  ) : (
                    walletEntries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.type === "CR"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}
                          >
                            {entry.type === "CR" ? "+ CREDIT" : "- DEBIT"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">
                          {entry.category || "FEE"}
                        </td>
                        <td className="p-3 font-medium text-base-900">{entry.description}</td>
                        <td
                          className={`p-3 text-right font-extrabold ${entry.type === "CR" ? "text-green-700" : "text-red-700"
                            }`}
                        >
                          {entry.type === "CR" ? "+" : "-"}₹
                          {entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3 text-right font-bold ${entry.balanceAfter < 0 ? "text-red-600" : "text-base-900"}`}>
                          {entry.balanceAfter < 0
                            ? `-₹${Math.abs(entry.balanceAfter).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : `₹${entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="card-theme max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 pb-3 border-b border-base-200 mb-4">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-base-900">Reset Provider Password</h3>
              </div>

              <p className="text-xs text-base-700 mb-4">
                Enter a new password for <b>{provider.name}</b> ({provider.email}).
              </p>

              {resetError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="mb-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
                  {resetSuccess}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-1.5 border border-base-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="btn-primary px-4 py-1.5 text-xs font-semibold shadow-sm"
                  >
                    {resetting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD BALANCE MODAL */}
        {showAddBalanceModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-base-200 overflow-hidden">
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-emerald-100" />
                  <div>
                    <h3 className="font-bold text-sm">Add Balance (Manual Credit)</h3>
                    <p className="text-[11px] text-emerald-100">Deposit liquidity funds into QR Provider wallet</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddBalanceModal(false);
                    setAddAmount("");
                    setAddDescription("");
                    setAddBalanceError("");
                    setAddBalanceSuccess("");
                  }}
                  className="text-white hover:text-gray-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBalance} className="p-5 space-y-4">
                <div className="p-3 bg-base-100/40 border border-base-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-base-700 font-semibold">Current Total Balance:</span>
                  <span className={`font-extrabold text-sm ${(provider?.balance || 0) < 0 ? "text-red-600" : "text-base-900"
                    }`}>
                    {(provider?.balance || 0) < 0
                      ? `-₹${Math.abs(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `₹${(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>

                {addBalanceError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{addBalanceError}</span>
                  </div>
                )}

                {addBalanceSuccess && (
                  <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <span>{addBalanceSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Amount to Add (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.01"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full pl-7 pr-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="e.g. Liquidity top-up via Bank IMPS"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBalanceModal(false);
                      setAddAmount("");
                      setAddDescription("");
                      setAddBalanceError("");
                      setAddBalanceSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingBalance}
                    className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5"
                  >
                    {addingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Crediting...</span>
                      </>
                    ) : (
                      <span>Credit ₹{parseFloat(addAmount) > 0 ? parseFloat(addAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CLEAR BALANCE MODAL (MANUAL WITHDRAWAL) */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-base-200 overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Clear Balance (Withdrawal)</h3>
                  <p className="text-[11px] text-[#f0f7fc]/80">Withdraw liquidity funds from QR Provider wallet</p>
                </div>
                <button
                  onClick={() => {
                    setShowClearModal(false);
                    setClearAmount("");
                    setClearDescription("");
                    setClearError("");
                    setClearSuccess("");
                  }}
                  className="text-white hover:text-gray-300 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleClearBalance} className="p-5 space-y-4">
                <div className="p-3 bg-base-100/40 border border-base-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-base-700 font-semibold">Current Total Balance:</span>
                  <span className={`font-extrabold text-sm ${(provider?.balance || 0) < 0 ? "text-red-600" : "text-base-900"
                    }`}>
                    {(provider?.balance || 0) < 0
                      ? `-₹${Math.abs(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `₹${(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>

                {clearError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{clearError}</span>
                  </div>
                )}

                {clearSuccess && (
                  <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <span>{clearSuccess}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-base-900">
                      Amount to Clear / Withdraw (₹) *
                    </label>
                    {(provider?.balance || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setClearAmount((provider?.balance || 0).toString())}
                        className="text-[11px] font-bold text-primary hover:text-[#527e66] underline"
                      >
                        Clear Exact Balance (₹{(provider?.balance || 0).toFixed(2)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.01"
                      value={clearAmount}
                      onChange={(e) => setClearAmount(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full pl-7 pr-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Note: Admin can withdraw any amount. Wallet balance is allowed to become negative if withdrawal exceeds available funds.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={clearDescription}
                    onChange={(e) => setClearDescription(e.target.value)}
                    placeholder="e.g. Liquidity payout to Provider bank account"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearModal(false);
                      setClearAmount("");
                      setClearDescription("");
                      setClearError("");
                      setClearSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={clearingBalance}
                    className="flex-1 py-2 text-xs font-bold text-white bg-[#0f172a] hover:bg-[#2c3e34] rounded-lg shadow flex items-center justify-center space-x-1.5 transition"
                  >
                    {clearingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Clear ₹{parseFloat(clearAmount) > 0 ? parseFloat(clearAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT QR CODE MODAL */}
        {editingQr && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-base-200 overflow-hidden animate-in fade-in duration-200">
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-sm">Edit QR Code ({editingQr.upiId})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQr(null);
                    setEditQrError("");
                    setEditQrSuccess("");
                  }}
                  className="text-white hover:text-gray-200 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditQr} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
                {editQrError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{editQrError}</span>
                  </div>
                )}

                {editQrSuccess && (
                  <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <span>{editQrSuccess}</span>
                  </div>
                )}

                {/* Status Switch (Active / Inactive) */}
                <div className="p-3 rounded-xl border border-base-200 bg-[#ffffff] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">QR Code Status</span>
                    <p className="text-[11px] text-base-700 mt-0.5">
                      {editIsActive
                        ? "Active: Eligible for dynamic order deposit routing."
                        : "Inactive: Paused from receiving new deposit orders."}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0 ml-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editIsActive}
                      onClick={() => setEditIsActive(!editIsActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editIsActive ? "bg-primary" : "bg-gray-300"
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${editIsActive ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                    <div className="flex items-center space-x-1.5 min-w-[70px]">
                      <span className={`w-2 h-2 rounded-full ${editIsActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${editIsActive ? "text-green-700" : "text-slate-500"}`}>
                        {editIsActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUpiId}
                    onChange={(e) => setEditUpiId(e.target.value)}
                    placeholder="e.g. provider.pay@icici"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={editAccountHolder}
                      onChange={(e) => setEditAccountHolder(e.target.value)}
                      placeholder="e.g. FastPay Liquidity"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-base-900 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      placeholder="e.g. ICICI Bank"
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* QR Image Update */}
                <div className="pt-2 border-t border-base-200">
                  <label className="block text-xs font-semibold text-base-900 mb-1.5">
                    QR Code Image
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="file"
                      ref={editQrFileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditQrImageUpload(file);
                      }}
                      className="hidden"
                    />

                    {editQrImageUrl && (
                      <div className="relative group shrink-0">
                        <img
                          src={editQrImageUrl}
                          alt="QR Preview"
                          className="w-20 h-20 object-contain rounded-lg border border-base-200 bg-white p-1"
                        />
                      </div>
                    )}

                    <div className="space-y-2 flex-1">
                      <button
                        type="button"
                        onClick={() => editQrFileInputRef.current?.click()}
                        disabled={uploadingEditQrImage}
                        className="px-3 py-1.5 text-xs bg-white border border-base-200 hover:bg-base-100/40 text-base-900 font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>{uploadingEditQrImage ? "Uploading..." : "Upload New QR Image"}</span>
                      </button>

                      {editQrImageUrl && (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-slate-500 truncate max-w-[220px]">
                            {editQrImageUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditQrImageUrl("")}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded cursor-pointer"
                            title="Reset to dynamic UPI QR code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {editQrUploadError && (
                        <span className="text-xs text-red-600 block">{editQrUploadError}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-3 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQr(null);
                      setEditQrError("");
                      setEditQrSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingQr}
                    className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-[#57876c] rounded-lg shadow flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    {updatingQr ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
