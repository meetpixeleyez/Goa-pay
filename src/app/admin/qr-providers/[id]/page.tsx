"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import ModalPortal from "@/components/common/ModalPortal";
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
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Users,
  User,
  Eye,
  CreditCard,
  X,
  Unlock,
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

  // Tab state (default to Transactions)
  const [activeTab, setActiveTab] = useState<"info" | "operators" | "orders" | "ledger">(
    tabParam === "info" || tabParam === "operators" || tabParam === "orders"
      ? (tabParam as any)
      : "ledger"
  );

  useEffect(() => {
    if (tabParam && ["info", "operators", "orders", "ledger"].includes(tabParam)) {
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
  const [isEditing, setIsEditing] = useState(false);

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

  // Manage Credit States (Add / Deduct Credit Modal)
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditType, setCreditType] = useState<"ADD" | "DEDUCT">("ADD");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [managingCredit, setManagingCredit] = useState(false);
  const [creditError, setCreditError] = useState("");
  const [creditSuccess, setCreditSuccess] = useState("");

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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
    if (provider) {
      setName(provider.name || "");
      setPhone(provider.phone || "");
      setPayinQrProviderFee((provider.payinQrProviderFee ?? provider.qrProviderFee ?? 3.0).toString());
      setPayoutQrProviderFee((provider.payoutQrProviderFee ?? provider.qrProviderFee ?? 1.0).toString());
      setPayinAgentFee((provider.payinAgentFee ?? 0).toString());
      setPayoutAgentFee((provider.payoutAgentFee ?? 0).toString());
      setAgentId(provider.agentId?.toString() || "");
      setStatus(provider.status || "ACTIVE");
      setPortalAccess(provider.portalAccess !== undefined ? provider.portalAccess : true);
      setTransactionAllowed(provider.transactionAllowed !== undefined ? provider.transactionAllowed : true);
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
      setIsEditing(false);
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



  // Handle Add Balance
  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingBalance || addBalanceSuccess) return;

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
        setAddingBalance(false);
      }, 900);
    } catch (err: any) {
      setAddBalanceError(err.message || "Failed to add balance");
      setAddingBalance(false);
    }
  };

  // Handle Clear Balance (Withdrawal)
  const handleClearBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearingBalance || clearSuccess) return;

    const num = parseFloat(clearAmount);
    if (isNaN(num) || num <= 0) {
      setClearError("Please enter a valid amount greater than ₹0");
      return;
    }

    const available = (provider?.balance || 0) - (provider?.exposure || 0);
    if (num > available || (provider?.balance || 0) - num < 0) {
      setClearError(`Cannot withdraw more than available balance (₹${Math.max(0, available).toFixed(2)}). Negative balance is only permitted for Merchants.`);
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
        setClearingBalance(false);
      }, 900);
    } catch (err: any) {
      setClearError(err.message || "Failed to clear balance");
      setClearingBalance(false);
    }
  };

  // Handle Manage Credit (Add or Deduct Credit)
  const handleManageCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (managingCredit || creditSuccess) return;

    const num = parseFloat(creditAmount);
    if (isNaN(num) || num <= 0) {
      setCreditError("Please enter a valid amount greater than ₹0");
      return;
    }

    setManagingCredit(true);
    setCreditError("");
    setCreditSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MANAGE_CREDIT",
          creditType,
          amount: num,
          description: creditDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update credit");

      setCreditSuccess(data.message || `Credit ${creditType === "ADD" ? "added" : "deducted"} successfully!`);
      await fetchProvider();
      setTimeout(() => {
        setShowCreditModal(false);
        setCreditAmount("");
        setCreditDescription("");
        setCreditSuccess("");
        setManagingCredit(false);
      }, 900);
    } catch (err: any) {
      setCreditError(err.message || "Failed to update credit");
      setManagingCredit(false);
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

  // Calculate Credit & Debit totals from wallet entries if not explicitly provided
  const totalCredit =
    provider.totalCredit !== undefined
      ? Number(provider.totalCredit)
      : walletEntries
          .filter((e: any) => e.type === "CR")
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  const totalDebit =
    provider.totalDebit !== undefined
      ? Number(provider.totalDebit)
      : walletEntries
          .filter((e: any) => e.type === "DR")
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  // Strictly enforce the rule: Available Balance = Balance - Exposure
  const calculatedAvailableBalance = Number(
    ((provider.balance || 0) - (provider.exposure || 0)).toFixed(2)
  );

  const getEntryTypeBadge = (entry: any) => {
    const cat = (entry.category || "").toUpperCase();
    const desc = (entry.description || "").toLowerCase();
    const type = (entry.type || "").toUpperCase();

    if (cat === "ADD_CREDIT" || type === "ADD_CREDIT" || desc.includes("credit added") || desc.includes("manual_add_credit")) {
      return {
        label: "+ ADD CREDIT",
        className: "bg-sky-100 text-sky-800",
        amountPrefix: "+",
        amountColor: "text-sky-700",
        displayCategory: "ADD_CREDIT",
      };
    }

    if (cat === "DEDUCT_CREDIT" || type === "DEDUCT_CREDIT" || desc.includes("credit deducted") || desc.includes("manual_deduct_credit")) {
      return {
        label: "- DEDUCT CREDIT",
        className: "bg-amber-100 text-amber-800",
        amountPrefix: "-",
        amountColor: "text-amber-700",
        displayCategory: "DEDUCT_CREDIT",
      };
    }

    if (cat === "DEPOSIT" || cat === "MANUAL_DEPOSIT" || cat === "MANUAL_CREDIT" || desc.includes("deposit")) {
      return {
        label: "+ DEPOSIT",
        className: "bg-green-100 text-green-800",
        amountPrefix: "+",
        amountColor: "text-green-700",
        displayCategory: "DEPOSIT",
      };
    }

    if (cat === "WITHDRAWAL" || cat === "MANUAL_WITHDRAWAL" || cat === "MANUAL_DEBIT" || desc.includes("withdrawal")) {
      return {
        label: "- WITHDRAWAL",
        className: "bg-red-100 text-red-800",
        amountPrefix: "-",
        amountColor: "text-red-700",
        displayCategory: "WITHDRAWAL",
      };
    }

    if (type === "CR") {
      return {
        label: "+ DEPOSIT",
        className: "bg-green-100 text-green-800",
        amountPrefix: "+",
        amountColor: "text-green-700",
        displayCategory: entry.category || "DEPOSIT",
      };
    }

    return {
      label: "- WITHDRAWAL",
      className: "bg-red-100 text-red-800",
      amountPrefix: "-",
      amountColor: "text-red-700",
      displayCategory: entry.category || "WITHDRAWAL",
    };
  };

  return (
    <PortalLayout
      portal="admin"
      title={
        <div className="flex items-center gap-3">
          <div
            className={`size-10 sm:size-11 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg border shrink-0 transition-colors ${
              provider.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
            }`}
          >
            {provider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-800">{provider.name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
              <span>ID: {provider.id}</span>
              {provider.phone && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-slate-400" />
                    <span>{provider.phone}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      }
      actions={
        <Link
          href="/admin/users"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
      }
    >
      <div className="space-y-6">

        {/* Toolbar: Deposit | Withdrawal | Manage Credit (Just above the cards) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Liquidity & Credit Overview
            </span>
            <span className="text-[11px] text-slate-500">
              Manage operational liquidity pool and independent credit line
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddBalanceModal(true);
                setAddAmount("");
                setAddDescription("");
                setAddBalanceError("");
                setAddBalanceSuccess("");
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-600 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Deposit</span>
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
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>- Withdrawal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreditModal(true);
                setCreditAmount("");
                setCreditDescription("");
                setCreditType("ADD");
                setCreditError("");
                setCreditSuccess("");
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Manage Credit</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Balance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Total Balance</span>
              <div className="size-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                <Wallet className="size-4 fill-primary-500/20" />
              </div>
            </div>
            <div
              className={`text-lg sm:text-xl font-bold truncate ${
                (provider.balance || 0) < 0 ? "text-red-500" : "text-slate-800"
              }`}
            >
              {(provider.balance || 0) < 0
                ? `-₹${Math.abs(provider.balance || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : `₹${(provider.balance || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <span className="text-[11px] text-slate-500 block truncate" title="Allocated pool (+ Deposit / - Withdrawal)">
              Allocated liquidity pool
            </span>
          </div>

          {/* Card 2: Available Balance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Available Balance</span>
              <div className="size-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-4 fill-emerald-500/20" />
              </div>
            </div>
            <div
              className={`text-lg sm:text-xl font-bold truncate ${
                calculatedAvailableBalance < 0 ? "text-red-500" : "text-primary"
              }`}
            >
              {calculatedAvailableBalance < 0
                ? `-₹${Math.abs(calculatedAvailableBalance).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : `₹${calculatedAvailableBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium block truncate" title="• Available Balance = Balance - Exposure">
              • Balance - Exposure
            </span>
          </div>

          {/* Card 3: Locked Exposure */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Locked Exposure</span>
              <div className="size-8 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center">
                <Lock className="size-4 fill-orange-500/20" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-orange-500 truncate">
              ₹{(provider.exposure || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <span className="text-[11px] text-slate-700 block truncate" title="Active pending sessions">
              Active pending sessions
            </span>
          </div>

          {/* Card 4: Credit */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Credit</span>
              <div className="size-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CreditCard className="size-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 truncate">
              ₹{(Number(provider.credit || 0)).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block truncate" title="Independent credit line (separate from balance)">
              Assigned credit line
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-200 overflow-x-auto space-x-1">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "ledger"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "orders"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => setActiveTab("operators")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "operators"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operators</span>
          </button>

          <button
            onClick={() => setActiveTab("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "info"
              ? "border-primary text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Provider Info</span>
          </button>
        </div>

        {/* TAB 1: INFO & SETTINGS */}
        {activeTab === "info" && (
          <div className="card-theme p-4 sm:p-5 shadow-sm border border-base-200">
            <div className="flex items-center justify-between pb-3 border-b border-base-200 mb-4 sm:mb-5">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-[16px] text-base-900">QR Provider Information & Contact</h3>
                  <p className="text-xs text-slate-500">Provider profile details and liquidity routing rules</p>
                </div>
              </div>
              <div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition flex items-center space-x-1.5 shadow-xs whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 text-xs bg-sky-100 border border-sky-200 text-sky-500 rounded-lg font-semibold flex items-center space-x-1 whitespace-nowrap">
                    <Unlock className="w-3 h-3" />
                    <span>Editing</span>
                  </span>
                )}
              </div>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {isEditing && (
              <div className="p-3 mb-4 bg-blue-100 border border-blue-200 text-blue-500 text-xs rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Unlock className="size-3 shrink-0" />
                  <span>
                    Editing mode active. Update fields below, then click <b>Save QR Provider Info & Status</b>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline ml-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}

            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Provider Full Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  ) : (
                    <div className="w-full px-3.5 py-2.5 text-xs font-bold text-base-900 bg-gray-50 rounded-lg border border-gray-200 truncate">
                      {name || "--"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-base-900 mb-1">
                    Contact Phone
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 text-xs font-medium font-mono text-gray-800 bg-gray-50 rounded-lg border border-gray-200 truncate">
                      {phone || <span className="text-gray-400 font-mono">e.g. +91 9876543210 or +1 443 456 7890</span>}
                    </div>
                  )}
                </div>

                {/* QR Provider Gateway Fees */}
                <div className="md:col-span-2 p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                  <span className="text-xs font-bold text-base-900 uppercase tracking-wider block pb-2 border-b border-[#e4d8c2]">
                    QR Provider Gateway Fees
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
                          Payin
                        </span>
                        <span>Fee (%)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="100"
                            required
                            value={payinQrProviderFee}
                            placeholder="0.00"
                            onChange={(e) => setPayinQrProviderFee(e.target.value)}
                            className="w-full pl-3.5 pr-8 py-2 text-xs font-mono font-bold bg-sky-50/40 border border-sky-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition"
                          />
                          <span className="absolute right-3 top-2 text-sky-600 font-bold text-xs">%</span>
                        </div>
                      ) : (
                        <div className="w-full px-3.5 py-2.5 text-xs font-bold text-sky-700 bg-sky-50/70 rounded-xl border border-sky-200 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Payin Fee</span>
                          </div>
                          <span className="font-mono text-sm">{payinQrProviderFee || "0"}%</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Payout
                        </span>
                        <span>Fee (%)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="100"
                            required
                            value={payoutQrProviderFee}
                            placeholder="0.00"
                            onChange={(e) => setPayoutQrProviderFee(e.target.value)}
                            className="w-full pl-3.5 pr-8 py-2 text-xs font-mono font-bold bg-amber-50/40 border border-amber-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
                          />
                          <span className="absolute right-3 top-2 text-amber-600 font-bold text-xs">%</span>
                        </div>
                      ) : (
                        <div className="w-full px-3.5 py-2.5 text-xs font-bold text-amber-800 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Payout Fee</span>
                          </div>
                          <span className="font-mono text-sm">{payoutQrProviderFee || "0"}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assigned Agent & Direct Commission Fees */}
                <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-[#ffffff] space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Assigned Agent & Direct Commission Fees
                  </label>
                  {isEditing ? (
                    <>
                      <select
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Direct (No Agent Assigned)</option>
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name} {ag.phone ? `(${ag.phone})` : ""}
                          </option>
                        ))}
                      </select>

                      {agentId && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
                                Payin
                              </span>
                              <span>Agent Fee (%)</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payinAgentFee}
                                placeholder="0.00"
                                onChange={(e) => setPayinAgentFee(e.target.value)}
                                className="w-full pl-3.5 pr-8 py-2 text-xs font-mono font-bold bg-sky-50/40 border border-sky-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition"
                              />
                              <span className="absolute right-3 top-2 text-sky-600 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                Payout
                              </span>
                              <span>Agent Fee (%)</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payoutAgentFee}
                                placeholder="0.00"
                                onChange={(e) => setPayoutAgentFee(e.target.value)}
                                className="w-full pl-3.5 pr-8 py-2 text-xs font-mono font-bold bg-amber-50/40 border border-amber-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
                              />
                              <span className="absolute right-3 top-2 text-amber-600 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold">
                        {(() => {
                          const ag = agents.find((a) => a.id.toString() === agentId?.toString());
                          return ag ? `${ag.name}${ag.phone ? ` (${ag.phone})` : ""}` : "Direct (No Agent Assigned)";
                        })()}
                      </span>
                      {agentId && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            <span>Payin: {payinAgentFee}%</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Payout: {payoutAgentFee}%</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Controls & Permissions */}
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
                            className={`w-2 h-2 rounded-full ${status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                          />
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${status === "ACTIVE" ? "text-green-700" : "text-red-600"}`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        disabled={!isEditing}
                        aria-checked={status === "ACTIVE"}
                        onClick={() => isEditing && setStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                        className={`relative inline-flex h-6 w-11 shrink-0 ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-80"} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                          status === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
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
                            className={`w-2 h-2 rounded-full ${portalAccess ? "bg-green-500" : "bg-gray-400"}`}
                          />
                          <span
                            className={`text-[11px] font-bold ${portalAccess ? "text-green-700" : "text-slate-500"}`}
                          >
                            {portalAccess ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        disabled={!isEditing}
                        aria-checked={portalAccess}
                        onClick={() => isEditing && setPortalAccess(!portalAccess)}
                        className={`relative inline-flex h-6 w-11 shrink-0 ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-80"} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                          portalAccess ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            portalAccess ? "translate-x-5" : "translate-x-0"
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
                            className={`w-2 h-2 rounded-full ${transactionAllowed ? "bg-green-500" : "bg-gray-400"}`}
                          />
                          <span
                            className={`text-[11px] font-bold ${transactionAllowed ? "text-green-700" : "text-slate-500"}`}
                          >
                            {transactionAllowed ? "Allowed" : "Blocked"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        disabled={!isEditing}
                        aria-checked={transactionAllowed}
                        onClick={() => isEditing && setTransactionAllowed(!transactionAllowed)}
                        className={`relative inline-flex h-6 w-11 shrink-0 ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-80"} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                          transactionAllowed ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            transactionAllowed ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              {isEditing ? (
                <div className="pt-4 border-t border-base-200 flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary py-2.5 px-5 text-xs flex items-center space-x-2 shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving Changes..." : "Save QR Provider Info & Status"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[12px] text-slate-500 pt-2 border-t border-base-200">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Registered:{" "}
                      {provider?.createdAt
                        ? new Date(provider.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                        : "--"}
                    </span>
                  </div>
                </div>
              )}
            </form>
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
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                  <tr>
                    <th className="p-3 w-48 max-w-[200px]">Operator Name</th>
                    <th className="p-3 w-56 max-w-[220px]">Contact Phone</th>
                    <th className="p-3 min-w-[180px] max-w-[240px]">Active QR</th>
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
                    operators.map((op: any) => {
                      const activeQr = (op.assignedQRCodes || []).find((q: any) => q.isActive);
                      return (
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
                          <div className={op.phone ? "font-mono font-medium text-gray-800 truncate" : "text-gray-400 italic"}>
                            {op.phone || "No phone added"}
                          </div>
                        </td>
                        <td className="p-3">
                          {activeQr ? (
                            <span
                              className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-bold text-emerald-800 inline-block truncate max-w-[200px]"
                              title={activeQr.upiId}
                            >
                              {activeQr.upiId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">No Active QR</span>
                          )}
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
                      );
                    })
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
            <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-base-900">Transactions</h3>
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
                    walletEntries.map((entry: any) => {
                      const typeBadge = getEntryTypeBadge(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-[#ffffff] transition">
                          <td className="p-3 font-mono text-[11px] text-gray-600">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeBadge.className}`}
                            >
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-gray-600">
                            {typeBadge.displayCategory}
                          </td>
                          <td className="p-3 font-medium text-base-900">{entry.description}</td>
                          <td
                            className={`p-3 text-right font-extrabold ${typeBadge.amountColor}`}
                          >
                            {typeBadge.amountPrefix}₹
                            {entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-3 text-right font-bold ${entry.balanceAfter < 0 ? "text-red-600" : "text-base-900"}`}>
                            {entry.balanceAfter < 0
                              ? `-₹${Math.abs(entry.balanceAfter).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              : `₹${entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* ADD BALANCE / DEPOSIT MODAL */}
        {showAddBalanceModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Add Funds to QR Provider Wallet</h3>
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
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleAddBalance} className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Manually credit funds directly into <b>{provider?.name}</b>'s settled wallet.
                  </p>
                  <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Settled Balance:</span>
                    <span className="font-semibold text-base-900">
                      ₹{(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
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
                  <label className="block text-[12px] font-semibold mb-1.5">
                    Deposit Amount (₹)*
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      autoFocus
                      disabled={addingBalance || !!addBalanceSuccess}
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                  </div>
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[500, 1000, 5000, 10000, 25000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={addingBalance || !!addBalanceSuccess}
                        onClick={() => setAddAmount(amt.toString())}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +₹{amt.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                    Reference Note / Description
                  </label>
                  <input
                    type="text"
                    disabled={addingBalance || !!addBalanceSuccess}
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="e.g. Manual top-up, Bank transfer settlement"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={addingBalance || !!addBalanceSuccess}
                    onClick={() => {
                      setShowAddBalanceModal(false);
                      setAddAmount("");
                      setAddDescription("");
                      setAddBalanceError("");
                      setAddBalanceSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingBalance || !!addBalanceSuccess || !addAmount || parseFloat(addAmount) <= 0}
                    className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Crediting...</span>
                      </>
                    ) : addBalanceSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Credited Successfully</span>
                      </>
                    ) : (
                      <span>Credit ₹{parseFloat(addAmount) > 0 ? parseFloat(addAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </ModalPortal>
        )}

        {/* CLEAR BALANCE / WITHDRAWAL MODAL */}
        {showClearModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MinusCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="font-semibold text-sm">Withdraw Funds from QR Provider Wallet</h3>
                </div>
                <button
                  disabled={clearingBalance || !!clearSuccess}
                  onClick={() => {
                    setShowClearModal(false);
                    setClearAmount("");
                    setClearDescription("");
                    setClearError("");
                    setClearSuccess("");
                  }}
                  className="text-white hover:text-gray-200 text-sm font-bold disabled:opacity-50"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleClearBalance} className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Manually debit funds directly from <b>{provider?.name}</b>'s settled wallet.
                  </p>
                  <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Settled Balance:</span>
                    <span className="font-semibold text-base-900">
                      ₹{(provider?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-semibold text-base-900">
                      Withdrawal Amount (₹)*
                    </label>
                    {(provider?.balance || 0) > 0 && (
                      <button
                        type="button"
                        disabled={clearingBalance || !!clearSuccess}
                        onClick={() => setClearAmount((provider?.balance || 0).toString())}
                        className="text-[12px] font-semibold text-primary hover:text-primary-400 underline disabled:opacity-50"
                      >
                        Clear Exact Balance (₹{(provider?.balance || 0).toFixed(2)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      disabled={clearingBalance || !!clearSuccess}
                      autoFocus
                      value={clearAmount}
                      onChange={(e) => setClearAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                  </div>
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[500, 1000, 5000, 10000, 25000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={clearingBalance || !!clearSuccess}
                        onClick={() => setClearAmount(amt.toString())}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ₹{amt.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                    Reference Note / Description
                  </label>
                  <input
                    type="text"
                    disabled={clearingBalance || !!clearSuccess}
                    value={clearDescription}
                    onChange={(e) => setClearDescription(e.target.value)}
                    placeholder="e.g. Bank payout issued, settlement withdrawal"
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={clearingBalance || !!clearSuccess}
                    onClick={() => {
                      setShowClearModal(false);
                      setClearAmount("");
                      setClearDescription("");
                      setClearError("");
                      setClearSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={clearingBalance || !!clearSuccess || !clearAmount || parseFloat(clearAmount) <= 0}
                    className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {clearingBalance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Debiting...</span>
                      </>
                    ) : clearSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Debited Successfully</span>
                      </>
                    ) : (
                      <span>Debit ₹{parseFloat(clearAmount) > 0 ? parseFloat(clearAmount).toLocaleString("en-IN") : "0"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </ModalPortal>
        )}

        {/* MANAGE CREDIT MODAL */}
        {showCreditModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Manage Credit</h3>
                </div>
                <button
                  disabled={managingCredit || !!creditSuccess}
                  onClick={() => {
                    setShowCreditModal(false);
                    setCreditAmount("");
                    setCreditDescription("");
                    setCreditError("");
                    setCreditSuccess("");
                  }}
                  className="text-white hover:text-gray-200 text-sm font-bold disabled:opacity-50"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleManageCredit} className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Add or deduct separate credit line for <b>{provider?.name}</b>.
                  </p>
                  <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Credit Line:</span>
                    <span className="font-semibold text-base-900">
                      ₹{(Number(provider?.credit || 0)).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {creditError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{creditError}</span>
                  </div>
                )}

                {creditSuccess && (
                  <div className="p-2.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <span>{creditSuccess}</span>
                  </div>
                )}

                {/* Credit Action Selector: Add vs Deduct */}
                <div>
                  <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                    Credit Action *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={managingCredit || !!creditSuccess}
                      onClick={() => setCreditType("ADD")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        creditType === "ADD"
                          ? "bg-primary/10 border-primary text-primary ring-1 ring-primary"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      <span>+ Add Credit</span>
                    </button>
                    <button
                      type="button"
                      disabled={managingCredit || !!creditSuccess}
                      onClick={() => setCreditType("DEDUCT")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        creditType === "DEDUCT"
                          ? "bg-rose-50 border-rose-400 text-rose-700 ring-1 ring-rose-400"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>- Deduct Credit</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                    Amount to {creditType === "ADD" ? "Add" : "Deduct"} (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      autoFocus
                      disabled={managingCredit || !!creditSuccess}
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    />
                  </div>
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[1000, 5000, 10000, 25000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={managingCredit || !!creditSuccess}
                        onClick={() => setCreditAmount(amt.toString())}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creditType === "ADD" ? "+" : "-"}₹{amt.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                    Reference Note / Description
                  </label>
                  <input
                    type="text"
                    disabled={managingCredit || !!creditSuccess}
                    value={creditDescription}
                    onChange={(e) => setCreditDescription(e.target.value)}
                    placeholder={
                      creditType === "ADD"
                        ? "e.g. Approved credit line top-up"
                        : "e.g. Credit adjustment / settlement"
                    }
                    className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={managingCredit || !!creditSuccess}
                    onClick={() => {
                      setShowCreditModal(false);
                      setCreditAmount("");
                      setCreditDescription("");
                      setCreditError("");
                      setCreditSuccess("");
                    }}
                    className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={managingCredit || !!creditSuccess || !creditAmount || parseFloat(creditAmount) <= 0}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      creditType === "ADD"
                        ? "btn-primary"
                        : "bg-rose-600 hover:bg-rose-700 text-white"
                    }`}
                  >
                    {managingCredit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : creditSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Updated Successfully</span>
                      </>
                    ) : (
                      <span>
                        {creditType === "ADD" ? "+ Add" : "- Deduct"} ₹
                        {parseFloat(creditAmount) > 0
                          ? parseFloat(creditAmount).toLocaleString("en-IN")
                          : "0"}{" "}
                        Credit
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </ModalPortal>
        )}


      </div>
    </PortalLayout>
  );
}
