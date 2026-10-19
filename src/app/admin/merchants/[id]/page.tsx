"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Store,
  Wallet,
  Settings,
  ShoppingBag,
  ArrowLeft,
  KeyRound,
  Check,
  Save,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Edit3,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Send,
  CreditCard,
  CheckCircle2,
  XCircle,
  Copy,
  Calendar,
  QrCode,
  Upload,
  Trash2,
  PlusCircle,
  X,
} from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";
import MerchantApiSettingsTab from "@/components/merchant/MerchantApiSettingsTab";
import {
  isValidEmail,
  validateName,
  validateAddress,
  isValidUpiId,
  isValidTelegramId,
  normalizeTelegramId,
  isValidPhone,
  normalizePhone,
} from "@/lib/validation";

export default function AdminMerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  // Active Tab: info | wallet | orders | api
  const [activeTab, setActiveTab] = useState<"info" | "wallet" | "orders" | "api">("info");

  // Tab Data States
  const [merchant, setMerchant] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<any[] | null>(null);
  const [brokers, setBrokers] = useState<any[] | null>(null);

  // Tab Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Info Tab Form State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState("");

  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState("");
  const [infoError, setInfoError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [portalAccess, setPortalAccess] = useState(true);
  const [transactionAllowed, setTransactionAllowed] = useState(true);
  const [togglingPortalAccess, setTogglingPortalAccess] = useState(false);
  const [togglingTransactionAllowed, setTogglingTransactionAllowed] = useState(false);

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

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Fee Setting Form State (Separate PAYIN & PAYOUT configs, default 0)
  const [payinMerchantFee, setPayinMerchantFee] = useState("0");
  const [payinQrProviderFee, setPayinQrProviderFee] = useState("0");
  const [payinAgentFee, setPayinAgentFee] = useState("0");
  const [payinBrokerFee, setPayinBrokerFee] = useState("0");

  const [payoutMerchantFee, setPayoutMerchantFee] = useState("0");
  const [payoutQrProviderFee, setPayoutQrProviderFee] = useState("0");
  const [payoutAgentFee, setPayoutAgentFee] = useState("0");
  const [payoutBrokerFee, setPayoutBrokerFee] = useState("0");

  const [brokerId, setBrokerId] = useState("");

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");

  // 1. Initial Fetch: Fetch Merchant Info, Summary metrics, and Brokers list
  const fetchInfoAndSummary = async () => {
    try {
      const [infoRes, sumRes, brokerRes] = await Promise.all([
        fetch(`/api/admin/merchants/${merchantId}?tab=info`),
        fetch(`/api/admin/merchants/${merchantId}?tab=summary`),
        fetch("/api/admin/users?role=BROKER"),
      ]);

      if (infoRes.status === 404) {
        router.push("/admin/merchants");
        return;
      }

      const infoData = await infoRes.json();
      const sumData = await sumRes.json();
      const brokerData = await brokerRes.json();

      if (infoData.success && infoData.merchant) {
        const m = infoData.merchant;
        setMerchant(m);
        setName(m.name || "");
        setPhone(m.phone || "");
        setAddress(m.address || "");
        setTelegramId(m.telegramId || "");
        setUpiId(m.upiId || "");
        setQrCodeUrl(m.qrCodeUrl || "");
        setStatus(m.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
        setPortalAccess(m.portalAccess !== undefined ? m.portalAccess : true);
        setTransactionAllowed(m.transactionAllowed !== undefined ? m.transactionAllowed : true);
        setPayinMerchantFee(m.payinMerchantFee !== undefined ? m.payinMerchantFee.toString() : "0");
        setPayinQrProviderFee(m.payinQrProviderFee !== undefined ? m.payinQrProviderFee.toString() : "0");
        setPayinAgentFee(m.payinAgentFee !== undefined ? m.payinAgentFee.toString() : "0");
        setPayinBrokerFee(m.payinBrokerFee !== undefined ? m.payinBrokerFee.toString() : "0");

        setPayoutMerchantFee(m.payoutMerchantFee !== undefined ? m.payoutMerchantFee.toString() : "0");
        setPayoutQrProviderFee(m.payoutQrProviderFee !== undefined ? m.payoutQrProviderFee.toString() : "0");
        setPayoutAgentFee(m.payoutAgentFee !== undefined ? m.payoutAgentFee.toString() : "0");
        setPayoutBrokerFee(m.payoutBrokerFee !== undefined ? m.payoutBrokerFee.toString() : "0");
        setBrokerId(m.brokerId || "");
      }

      if (sumData.success && sumData.summary) {
        setSummary(sumData.summary);
      }

      if (brokerData.success && brokerData.users) {
        setBrokers(brokerData.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInitial(false);
    }
  };

  // 2. Fetch Wallet on demand when clicking Wallet & Ledger tab
  const fetchWallet = async () => {
    setLoadingWallet(true);
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}?tab=wallet`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletData(data.wallet);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWallet(false);
    }
  };

  // 3. Fetch Orders on demand when clicking Orders tab
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}?tab=orders`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrdersData(data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Handle Tab Switch with on-demand API loading
  const handleTabSwitch = (tab: "info" | "wallet" | "orders" | "api") => {
    setActiveTab(tab);
    if (tab === "wallet" && !walletData) {
      fetchWallet();
    } else if (tab === "orders" && !ordersData) {
      fetchOrders();
    }
  };

  useEffect(() => {
    fetchInfoAndSummary();
  }, [merchantId]);

  // Handle QR Image File Upload
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    setQrUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setQrCodeUrl(data.url);
    } catch (err: any) {
      setQrUploadError(err.message);
    } finally {
      setUploadingQr(false);
    }
  };

  // Cancel edit mode and revert changes
  const handleCancelEdit = () => {
    if (merchant) {
      setName(merchant.name || "");
      setPhone(merchant.phone || "");
      setAddress(merchant.address || "");
      setTelegramId(merchant.telegramId || "");
      setUpiId(merchant.upiId || "");
      setQrCodeUrl(merchant.qrCodeUrl || "");
      setStatus(merchant.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
      setPortalAccess(merchant.portalAccess !== undefined ? merchant.portalAccess : true);
      setTransactionAllowed(merchant.transactionAllowed !== undefined ? merchant.transactionAllowed : true);
      setPayinMerchantFee(merchant.payinMerchantFee !== undefined ? merchant.payinMerchantFee.toString() : "0");
      setPayinQrProviderFee(merchant.payinQrProviderFee !== undefined ? merchant.payinQrProviderFee.toString() : "0");
      setPayinAgentFee(merchant.payinAgentFee !== undefined ? merchant.payinAgentFee.toString() : "0");
      setPayinBrokerFee(merchant.payinBrokerFee !== undefined ? merchant.payinBrokerFee.toString() : "0");

      setPayoutMerchantFee(merchant.payoutMerchantFee !== undefined ? merchant.payoutMerchantFee.toString() : "0");
      setPayoutQrProviderFee(merchant.payoutQrProviderFee !== undefined ? merchant.payoutQrProviderFee.toString() : "0");
      setPayoutAgentFee(merchant.payoutAgentFee !== undefined ? merchant.payoutAgentFee.toString() : "0");
      setPayoutBrokerFee(merchant.payoutBrokerFee !== undefined ? merchant.payoutBrokerFee.toString() : "0");
      setBrokerId(merchant.brokerId || "");
    }
    setQrUploadError("");
    setInfoError("");
    setIsEditing(false);
  };

  // Save Merchant Information, Fee Settings & Status
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoSuccess("");
    setInfoError("");

    const nameCheck = validateName(name, "Store name");
    if (!nameCheck.valid) {
      setInfoError(nameCheck.error || "Store name is required");
      setSavingInfo(false);
      return;
    }

    const cleanPhone = phone.trim() ? normalizePhone(phone) : null;
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setInfoError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      setSavingInfo(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          status,
          portalAccess,
          transactionAllowed,
          payinMerchantFee: parseFloat(payinMerchantFee) || 0.0,
          payoutMerchantFee: parseFloat(payoutMerchantFee) || 0.0,
          payinBrokerFee: brokerId ? (parseFloat(payinBrokerFee) || 0.0) : 0.0,
          payoutBrokerFee: brokerId ? (parseFloat(payoutBrokerFee) || 0.0) : 0.0,
          brokerId: brokerId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update merchant info");

      setInfoSuccess("Merchant details, fee settings, and permissions saved successfully!");
      setIsEditing(false);
      setTimeout(() => setInfoSuccess(""), 3000);
      fetchInfoAndSummary();
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  // Quick Account Status Toggle (Interactive Switch at bottom of section)
  const handleToggleStatus = async () => {
    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (isEditing) {
      setStatus(nextStatus);
      return;
    }
    setTogglingStatus(true);
    setInfoSuccess("");
    setInfoError("");
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update account status");
      setStatus(nextStatus);
      setInfoSuccess(`Merchant status changed to ${nextStatus}`);
      setTimeout(() => setInfoSuccess(""), 2500);
      fetchInfoAndSummary();
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Quick Portal Access Toggle
  const handleTogglePortalAccess = async () => {
    const nextVal = !portalAccess;
    if (isEditing) {
      setPortalAccess(nextVal);
      return;
    }
    setTogglingPortalAccess(true);
    setInfoSuccess("");
    setInfoError("");
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalAccess: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update portal access");
      setPortalAccess(nextVal);
      setInfoSuccess(`Portal access ${nextVal ? "enabled" : "disabled"}`);
      setTimeout(() => setInfoSuccess(""), 2500);
      fetchInfoAndSummary();
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setTogglingPortalAccess(false);
    }
  };

  // Quick Transaction Allowed Toggle
  const handleToggleTransactionAllowed = async () => {
    const nextVal = !transactionAllowed;
    if (isEditing) {
      setTransactionAllowed(nextVal);
      return;
    }
    setTogglingTransactionAllowed(true);
    setInfoSuccess("");
    setInfoError("");
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionAllowed: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update transaction permission");
      setTransactionAllowed(nextVal);
      setInfoSuccess(`Transaction permission ${nextVal ? "enabled" : "disabled"}`);
      setTimeout(() => setInfoSuccess(""), 2500);
      fetchInfoAndSummary();
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setTogglingTransactionAllowed(false);
    }
  };

  // Handle Add Balance (Manual Credit with ACID Ledger Entry)
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
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
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
      await fetchInfoAndSummary();
      if (walletData) {
        fetchWallet();
      }
      setTimeout(() => {
        setShowAddBalanceModal(false);
        setAddAmount("");
        setAddDescription("");
        setAddBalanceSuccess("");
      }, 1200);
    } catch (err: any) {
      setAddBalanceError(err.message);
    } finally {
      setAddingBalance(false);
    }
  };

  // Handle Clear Balance (Manual Debit with ACID Ledger Entry)
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
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
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
      await fetchInfoAndSummary();
      if (walletData) {
        fetchWallet();
      }
      setTimeout(() => {
        setShowClearModal(false);
        setClearAmount("");
        setClearDescription("");
        setClearSuccess("");
      }, 1200);
    } catch (err: any) {
      setClearError(err.message);
    } finally {
      setClearingBalance(false);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetErr("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    setResetErr("");
    setResetMsg("");

    try {
      const res = await fetch(`/api/admin/users/${merchantId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setResetMsg(data.message || "Password updated successfully!");
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword("");
        setResetMsg("");
      }, 1200);
    } catch (err: any) {
      setResetErr(err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loadingInitial || !merchant) {
    return (
      <PortalLayout portal="admin" title="Loading Merchant Profile...">
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-slate-500">Loading merchant details...</p>
        </div>
      </PortalLayout>
    );
  }

  const currentBalance = summary?.balance ?? merchant.wallet?.balance ?? 0.0;
  const completedCount = summary?.completedCount ?? 0;
  const totalOrdersCount = summary?.totalOrdersCount ?? completedCount;

  return (
    <>
      <PortalLayout
        portal="admin"
        title={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-bold">{merchant.name}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 border shadow-2xs ${status === "ACTIVE"
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-red-100 text-red-800 border-red-300"
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
              />
              <span>{status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}</span>
            </span>
          </div>
        }
        subtitle={`Merchant ID: ${merchant.id} • Registered ${new Date(merchant.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex items-center space-x-2">
            <Link
              href="/admin/merchants"
              className="px-3 py-2 text-xs bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Merchants</span>
            </Link>
            <button
              onClick={() => {
                setShowResetModal(true);
                setNewPassword("");
                setResetErr("");
                setResetMsg("");
              }}
              className="px-3 py-2 text-xs border border-gray-300 bg-white rounded-lg hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 shadow-xs transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>
          </div>
        }
      >
        {/* Top Summary Card (Wallet Balance Only) */}
        <div className="mb-4">
          <div className={`card-theme p-4 sm:p-5 border-l-4 ${currentBalance < 0 ? "border-l-red-500" : "border-l-primary"} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Net Wallet Balance
              </span>
              <span className={`text-2xl sm:text-3xl font-extrabold mt-1 block ${currentBalance < 0 ? "text-red-600" : "text-base-900"}`}>
                {currentBalance < 0
                  ? `-₹${Math.abs(currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `₹${currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              <span className="text-[13px] text-slate-500 mt-0.5 block">After all fee deductions</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleTabSwitch("wallet")}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-primary rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-2xs flex items-center space-x-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>View Full Ledger</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation (With on-demand dynamic API loading) */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => handleTabSwitch("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "info"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Info & QR</span>
          </button>

          <button
            onClick={() => handleTabSwitch("wallet")}
            className={`py-2.5 px-4 text-[13px] font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "wallet"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-gray-700"
              }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet & Ledger {walletData ? `(${walletData.entries.length})` : ""}</span>
            {loadingWallet && <RefreshCw className="w-3 h-3 text-primary animate-spin ml-1" />}
          </button>

          <button
            onClick={() => handleTabSwitch("orders")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "orders"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-gray-700"
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders {ordersData ? `(${ordersData.length})` : totalOrdersCount > 0 ? `(${totalOrdersCount})` : ""}</span>
            {loadingOrders && <RefreshCw className="w-3 h-3 text-primary animate-spin ml-1" />}
          </button>

          <button
            onClick={() => handleTabSwitch("api")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "api"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-gray-700"
              }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>API Settings</span>
          </button>
        </div>

        {/* TAB 1: INFO & QR CODE (2-COLUMN RESPONSIVE LAYOUT) */}
        {activeTab === "info" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
            {/* LEFT COLUMN: Merchant Information & Contact (7 cols on LG, 8 cols on XL) */}
            <div className="lg:col-span-7 xl:col-span-8 card-theme shadow-sm border border-slate-200">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <Store className="size-4 text-primary shrink-0" />
                    <h3 className="font-bold text-[15px] sm:text-base text-slate-900 truncate">
                      Merchant Information & Contact
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Store profile details and payment routing settings
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 whitespace-nowrap ${status === "ACTIVE"
                      ? "bg-green-100 text-green-500"
                      : "bg-red-100 text-red-500"
                      }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`}
                    />
                    <span>{status === "ACTIVE" ? "Active" : "Inactive"}</span>
                  </span>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 text-xs bg-white border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:border-primary hover:text-primary-50 transition-all shadow-xs flex items-center space-x-1.5 whitespace-nowrap"
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

              <div className="p-4 sm:p-5">
                {infoSuccess && (
                  <div className="p-3 mb-4 bg-green-100 border border-green-200 text-green-500 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="size-3 shrink-0" />
                    <span className="font-medium">{infoSuccess}</span>
                  </div>
                )}

                {infoError && (
                  <div className="p-3 mb-4 bg-red-100 border border-red-200 text-red-500 text-xs rounded-lg flex items-center space-x-2">
                    <AlertCircle className="size-3 shrink-0" />
                    <span className="font-medium">{infoError}</span>
                  </div>
                )}

                {isEditing && (
                  <div className="p-3 mb-4 bg-blue-100 border border-blue-200 text-blue-500 text-xs rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Unlock className="size-3 shrink-0" />
                      <span>
                        Editing mode active. Update fields below and on the QR card, then click <b>Save Merchant Info & Status</b>.
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

                <form onSubmit={handleSaveInfo} className="space-y-5">
                  {/* Grid of Profile Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3.5 xl:gap-4">
                    {/* Store Name */}
                    <div>
                      <label className="text-[13px] font-semibold text-base-900 mb-1.5 flex items-center space-x-1">
                        <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Store / Business Name <span className="text-red-500">*</span></span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter store name"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <div className="w-full px-3.5 py-2.5 text-xs font-bold text-base-900 bg-gray-50 rounded-lg border border-gray-200 truncate">
                          {name || "--"}
                        </div>
                      )}
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="text-[13px] font-semibold text-base-900 mb-1.5 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Contact Phone <span className="font-normal text-slate-500 text-[11px]">(Indian or International)</span></span>
                      </label>
                      {isEditing ? (
                        <div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 9876543210 or +14155552671"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold font-mono border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">10-digit Indian mobile or International format with country code (e.g. +1...)</p>
                        </div>
                      ) : (
                        <div className="w-full px-3.5 py-2.5 text-xs font-medium font-mono text-gray-800 bg-gray-50 rounded-lg border border-gray-200 truncate">
                          {phone || <span className="text-gray-400 italic">Not Provided</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fee Settings (Only Merchant Fee: Payin and Payout) */}
                  <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-base-900 uppercase tracking-wider block">
                        Merchant Gateway Fees
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-600 font-semibold rounded-full">
                        Store Commission
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Payin Merchant Fee */}
                      <div>
                        <label className="block text-[13px] font-semibold text-base-900 mb-1.5">
                          Payin / Deposit Fee (%)
                        </label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={payinMerchantFee}
                              onChange={(e) => setPayinMerchantFee(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-500">%</span>
                          </div>
                        ) : (
                          <div className="w-full px-3 py-2 text-xs font-bold text-primary bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                            <span>Deposit Fee</span>
                            <span className="text-sm font-extrabold">{payinMerchantFee}%</span>
                          </div>
                        )}
                      </div>

                      {/* Payout Merchant Fee */}
                      <div>
                        <label className="block text-[13px] font-semibold text-base-900 mb-1">
                          Payout / Withdrawal Fee (%)
                        </label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={payoutMerchantFee}
                              onChange={(e) => setPayoutMerchantFee(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-gray-400">%</span>
                          </div>
                        ) : (
                          <div className="w-full px-3 py-2 text-xs font-bold text-orange-600 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                            <span>Withdrawal Fee</span>
                            <span className="text-sm font-extrabold">{payoutMerchantFee}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Broker Assignment & Direct Fees */}
                  <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <span className="text-[13px] font-semibold text-base-900 uppercase tracking-wider block">
                      Assigned Merchant Broker & Fees
                    </span>
                    {isEditing ? (
                      <div className="space-y-3">
                        <select
                          value={brokerId}
                          onChange={(e) => setBrokerId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Direct (No Broker Assigned)</option>
                          {(brokers || []).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.email})
                            </option>
                          ))}
                        </select>
                        {brokerId && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Broker Payin Fee (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={payinBrokerFee}
                                  onChange={(e) => setPayinBrokerFee(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Broker Payout Fee (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={payoutBrokerFee}
                                  onChange={(e) => setPayoutBrokerFee(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-full px-3 py-2 text-xs font-medium text-gray-800 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                          <span>
                            {merchant.broker
                              ? `${merchant.broker.name} (${merchant.broker.email})`
                              : "Direct (No Broker Assigned)"}
                          </span>
                          {merchant.broker && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[11px]">
                                Payin: {payinBrokerFee}%
                              </span>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[11px]">
                                Payout: {payoutBrokerFee}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-[12px] text-gray-400">
                      Broker fees are configured directly on this merchant (different merchants can have custom broker cuts).
                    </p>
                  </div>

                  {/* Account Controls & Permissions (Responsive Grid Switch Tiles) */}
                  <div className="p-4 sm:p-5 rounded-xl border border-base-200 bg-[#ffffff] space-y-3">
                    <span className="text-[13px] font-semibold text-base-900 uppercase tracking-wider block">
                      Account Controls & Permissions
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2.5">
                      {/* Account Status Switch */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-base-100/30 border border-base-200/70 hover:border-base-200 transition">
                        <div className="min-w-0 pr-2">
                          <span className="text-[13px] font-semibold text-base-900 block truncate">Account Status</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-red-500"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider truncate ${status === "ACTIVE" ? "text-green-700" : "text-red-600"
                                }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          disabled={!isEditing && togglingStatus}
                          aria-checked={status === "ACTIVE"}
                          onClick={handleToggleStatus}
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
                      <div className="flex items-center justify-between p-3 rounded-lg bg-base-100/30 border border-base-200/70 hover:border-base-200 transition">
                        <div className="min-w-0 pr-2">
                          <span className="text-[13px] font-semibold text-base-900 block truncate">Portal Access</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${portalAccess ? "bg-green-500" : "bg-gray-400"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold truncate ${portalAccess ? "text-green-700" : "text-slate-500"
                                }`}
                            >
                              {portalAccess ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          disabled={!isEditing && togglingPortalAccess}
                          aria-checked={portalAccess}
                          onClick={handleTogglePortalAccess}
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
                      <div className="flex items-center justify-between p-3 rounded-lg bg-base-100/30 border border-base-200/70 hover:border-base-200 transition">
                        <div className="min-w-0 pr-2">
                          <span className="text-[13px] font-semibold text-base-900 block truncate">Transactions</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${transactionAllowed ? "bg-green-500" : "bg-gray-400"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-bold truncate ${transactionAllowed ? "text-green-700" : "text-slate-500"
                                }`}
                            >
                              {transactionAllowed ? "Allowed" : "Blocked"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          disabled={!isEditing && togglingTransactionAllowed}
                          aria-checked={transactionAllowed}
                          onClick={handleToggleTransactionAllowed}
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

                  {/* Form Action Buttons */}
                  {isEditing ? (
                    <div className="pt-4 border-t border-base-200 flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={savingInfo}
                        className="btn-primary py-2.5 px-5 text-xs flex items-center space-x-2 shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingInfo ? "Saving Changes..." : "Save Merchant Info & Status"}</span>
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
                    <div className="flex items-center justify-between text-[12px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Registered: {new Date(merchant.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: Balance Actions & Store Collection QR Code Card */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              {/* Balance Actions Bar (Above Store QR Code) - Responsive on all screens including 1024px-1440px */}
              <div className="card-theme p-4 sm:p-5 shadow-sm border border-base-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Settled Balance
                    </span>
                    <span className={`text-xl font-extrabold block ${currentBalance < 0 ? "text-red-600" : "text-base-900"}`}>
                      {currentBalance < 0
                        ? `-₹${Math.abs(currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `₹${currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  {currentBalance < 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-200 uppercase">
                      Negative Balance
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
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
                    <span className="truncate">Withdrawal Balance</span>
                  </button>
                </div>
              </div>

              {/* Store Collection QR Code Card (Existing Design Preserved) */}
              <div className="card-theme shadow-sm border border-base-200 flex flex-col">
                <div className="p-4 sm:p-5 flex items-center justify-between pb-3 border-b border-base-200">
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-[16px] text-base-900">Store QR Code</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {qrCodeUrl ? "Configured" : "Not Set"}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-[12px] text-slate-500 mb-3">
                    Official payment collection QR code image for this store.
                  </p>

                  {/* QR Image Frame Display */}
                  <div className="bg-[#ffffff] border border-base-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px] text-center">
                    {qrCodeUrl ? (
                      <div className="space-y-3 w-full flex flex-col items-center">
                        {/* <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs max-w-[220px] aspect-square flex items-center justify-center"> */}
                        <img
                          src={qrCodeUrl}
                          alt={`${name} QR Code`}
                          className="max-h-[400px] max-w-[400px] object-contain rounded"
                        />
                        {/* </div> */}

                        <div className="flex items-center space-x-2 mt-2">
                          <a
                            href={qrCodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center space-x-1"
                          >
                            <span>View Full Image</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 px-4 flex flex-col items-center text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-base-100/60 flex items-center justify-center text-slate-500">
                          <QrCode className="w-8 h-8 text-primary" />
                        </div>
                        <span className="text-xs font-semibold">No QR Code Uploaded</span>
                        <p className="text-[11px] text-slate-500 max-w-[200px]">
                          Upload a QR code image or enter a URL in Edit mode to assign a collection QR for this merchant.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* UPI Identifier Pill */}
                  <div className="mt-4 p-2.5 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 font-semibold text-[12px]">Store UPI ID:</span>
                    <div className="flex items-center space-x-1 font-mono font-bold text-base-900">
                      <span>{upiId || <span className="text-slate-500 italic">None</span>}</span>
                      {upiId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(upiId, "qr_upi")}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
                          title="Copy UPI ID"
                        >
                          {copiedField === "qr_upi" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Edit Controls (Only in Edit Mode) */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-base-200 space-y-3">
                      <span className="text-xs font-bold text-base-900 block">Update QR Code Image</span>

                      {qrUploadError && (
                        <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                          {qrUploadError}
                        </div>
                      )}

                      {/* Upload File Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Upload New Image File (.png, .jpg)
                        </label>
                        <label className="flex items-center justify-center px-3 py-2 text-xs border border-dashed border-primary bg-base-100/20 rounded-lg cursor-pointer hover:bg-base-100/40 transition space-x-1.5">
                          <Upload className="w-3.5 h-3.5 text-primary" />
                          <span>{uploadingQr ? "Uploading..." : "Choose File to Upload"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingQr}
                            onChange={handleQrUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Or Direct Image URL Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Or Enter Image URL
                        </label>
                        <input
                          type="text"
                          value={qrCodeUrl}
                          onChange={(e) => setQrCodeUrl(e.target.value)}
                          placeholder="https://... or /uploads/..."
                          className="w-full px-3 py-1.5 text-xs border border-base-200 rounded-lg font-mono"
                        />
                      </div>

                      {qrCodeUrl && (
                        <button
                          type="button"
                          onClick={() => setQrCodeUrl("")}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center space-x-1 pt-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove QR Code Image</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WALLET & LEDGER (CALLED DYNAMICALLY ON TAB CLICK) */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-base-900">Wallet & Ledger Transactions</h3>
              <button
                onClick={fetchWallet}
                disabled={loadingWallet}
                className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWallet ? "animate-spin" : ""}`} />
                <span>Refresh Statement</span>
              </button>
            </div>

            {loadingWallet ? (
              <div className="card-theme p-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-slate-500">Loading wallet statement from server...</p>
              </div>
            ) : (
              <BankStatementTable
                entries={walletData?.entries || []}
                title={`Statement: ${merchant.name}`}
                subtitle={`Account ID: ${merchant.id} • Registered UPI: ${merchant.upiId || "None"}`}
                walletBalance={walletData?.balance ?? currentBalance}
                defaultSort="desc"
              />
            )}
          </div>
        )}

        {/* TAB 3: ORDERS (CALLED DYNAMICALLY ON TAB CLICK) */}
        {activeTab === "orders" && (
          <div className="card-theme overflow-hidden shadow-sm">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-base-900">Customer Orders for {merchant.name}</h3>
                <p className="text-xs text-base-700">Deposit transactions generated for this store</p>
              </div>
              <button
                onClick={fetchOrders}
                disabled={loadingOrders}
                className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                <span>Refresh Orders</span>
              </button>
            </div>

            {loadingOrders ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-slate-500">Loading merchant orders...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Customer UTR</th>
                      <th className="p-3">Assigned Provider</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created</th>
                      <th className="p-3 text-right">Checkout View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0f2fe]">
                    {!ordersData || ordersData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500">
                          No orders created for this merchant yet.
                        </td>
                      </tr>
                    ) : (
                      ordersData.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                          <td className="p-3 font-mono font-bold text-base-900">
                            {ord.orderNumber}
                          </td>
                          <td className="p-3">
                            <div>{ord.customerName}</div>
                            <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                          </td>
                          <td className="p-3 font-bold text-base-900">
                            ₹{ord.amount.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            {ord.customerUtr || <span className="text-gray-400 italic">None</span>}
                          </td>
                          <td className="p-3 text-[11px]">
                            {ord.qrProvider?.name || "--"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ord.status === "completed"
                                ? "badge-completed"
                                : ord.status === "processing"
                                  ? "badge-processing"
                                  : ord.status === "pending"
                                    ? "badge-pending"
                                    : "badge-rejected"
                                }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(ord.createdAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="p-3 text-right">
                            <Link
                              href={`/checkout/${ord.id}`}
                              target="_blank"
                              className="text-primary hover:underline font-semibold text-xs inline-flex items-center space-x-1"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: API SETTINGS */}
        {activeTab === "api" && (
          <div className="pt-2">
            <MerchantApiSettingsTab merchantId={merchantId} isAdminView={true} />
          </div>
        )}
      </PortalLayout>
      {/* PASSWORD RESET MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <h3 className="font-sembold text-sm">Reset Password</h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-white hover:text-slate-200 text-sm font-sembold"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-base-700">
                Set a new password for merchant: <b>{merchant.email}</b>
              </p>

              {resetErr && <div className="p-2 bg-red-50 text-red-700 text-xs rounded">{resetErr}</div>}
              {resetMsg && <div className="p-2 bg-green-50 text-green-700 text-xs rounded">{resetMsg}</div>}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 text-xs border border-gray-300 rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 btn-primary py-2 text-xs"
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Add Funds to Merchant Wallet</h3>
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
                  Manually credit funds directly into <b>{merchant.name}</b>'s settled wallet.
                </p>
                <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Settled Balance:</span>
                  <span className="font-semibold text-base-900">
                    ₹{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500, 1000, 5000, 10000, 25000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAddAmount(amt.toString())}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition"
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
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="e.g. Manual top-up, Bank transfer settlement"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[12px] text-slate-500 mt-1">
                  This note will be recorded permanently in the multi-party ledger for audit trail.
                </p>
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

      {/* CLEAR BALANCE MODAL (MANUAL WITHDRAWAL / DEDUCTION) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-white">Withdrawal Balance</h3>
                <p className="text-[12px] text-slate-200">Deduct settled funds from merchant wallet</p>
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
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleClearBalance} className="p-5 space-y-4">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-500">Available Settled Balance:</span>
                <span className={`font-extrabold text-sm ${currentBalance < 0 ? "text-red-600" : "text-base-900"}`}>
                  {currentBalance < 0
                    ? `-₹${Math.abs(currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `₹${currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                    Withdraw Amount (₹) *
                  </label>
                  {currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setClearAmount(currentBalance.toString())}
                      className="text-[12px] font-semibold text-primary hover:text-primary-400 underline"
                    >
                      Clear Exact Balance (₹{currentBalance.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    autoFocus
                    value={clearAmount}
                    onChange={(e) => setClearAmount(e.target.value)}
                    placeholder="Enter amount to clear/withdraw"
                    className="w-full pl-7 pr-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500, 1000, 5000, 10000, 25000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setClearAmount(amt.toString())}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-base-100/40 hover:bg-slate-100 text-slate-900 rounded border border-slate-200 transition"
                    >
                      ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                  {currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setClearAmount(currentBalance.toString())}
                      className="px-2 py-0.5 text-[11px] font-bold bg-primary/20 hover:bg-primary/30 text-base-900 rounded border border-primary/40 transition"
                    >
                      All (₹{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 mt-2">
                  Note: You may withdraw more than available balance. Wallet balance can become negative.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-base-900 mb-1.5">
                  Reference Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={clearDescription}
                  onChange={(e) => setClearDescription(e.target.value)}
                  placeholder="e.g. Bank payout issued, settlement withdrawal"
                  className="w-full px-3 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[12px] text-slate-500 mt-1">
                  A debit ledger transaction (MANUAL WITHDRAWAL) will be created for full audit reconciliation.
                </p>
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
                  className="flex-1 btn-primary py-2 text-xs font-bold shadow flex items-center justify-center space-x-1.5"
                >
                  {clearingBalance ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>
                      Clear ₹{parseFloat(clearAmount) > 0 ? parseFloat(clearAmount).toLocaleString("en-IN") : "0"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
