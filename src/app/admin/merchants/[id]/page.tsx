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
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  X,
} from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";
import MerchantApiSettingsTab from "@/components/merchant/MerchantApiSettingsTab";
import ModalPortal from "@/components/common/ModalPortal";
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

  // Active Tab: wallet (Transactions) | orders | info | api
  const [activeTab, setActiveTab] = useState<"info" | "wallet" | "orders" | "api">("wallet");

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
    fetchWallet();
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

    const nameCheck = validateName(name, "Store Name");
    if (!nameCheck.valid) {
      setInfoError(nameCheck.error || "Store Name is required");
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
        setAddingBalance(false);
      }, 900);
    } catch (err: any) {
      setAddBalanceError(err.message);
      setAddingBalance(false);
    }
  };

  // Handle Clear Balance (Manual Debit with ACID Ledger Entry)
  const handleClearBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearingBalance || clearSuccess) return;

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
        setClearingBalance(false);
      }, 900);
    } catch (err: any) {
      setClearError(err.message);
      setClearingBalance(false);
    }
  };

  const getEntryTypeBadge = (entry: any) => {
    const type = (entry.type || "").toUpperCase();
    const cat = (entry.category || "").toUpperCase();

    const isCredit =   
      type === "DEPOSIT" ||
      type === "CREDIT" ||
      cat === "ORDER_CREDIT" ||
      cat === "MANUAL_CREDIT" ||
      cat === "ADD_CREDIT";

    if (isCredit) {
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
          <div className="flex items-center gap-3">
            <div
              className={`size-10 sm:size-11 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg border shrink-0 transition-colors ${
                status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                  : "bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-400/20"
              }`}
            >
              {merchant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold text-slate-800">{merchant.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                <span>ID: {merchant.id}</span>
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
        {/* Top Summary Card (Net Wallet Balance & Settlement Actions) */}
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
                className="btn-primary text-xs py-2 px-4 flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
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
                className="px-4 py-2 text-xs bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold flex items-center justify-center shadow-xs transition cursor-pointer"
              >
                <MinusCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mr-1" />
                <span>- Withdrawal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation (1st Transactions, 2nd Orders, 3rd API Settings, 4th Merchant Info) */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => handleTabSwitch("wallet")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "wallet"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-gray-700"
              }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Transactions</span>
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
            <span>Orders</span>
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

          <button
            onClick={() => handleTabSwitch("info")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 shrink-0 ${activeTab === "info"
              ? "border-primary text-base-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Merchant Info</span>
          </button>
        </div>

        {/* TAB 1: MERCHANT INFO */}
        {activeTab === "info" && (
          <div className="w-full card-theme shadow-sm border border-slate-200">
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
                          placeholder="Enter Store Name"
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
                        <span>Contact Phone</span>
                      </label>
                      {isEditing ? (
                        <div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +91 9876543210 or +1 443 456 7890"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold font-mono border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <div className="w-full px-3.5 py-2.5 text-xs font-medium font-mono text-gray-800 bg-gray-50 rounded-lg border border-gray-200 truncate">
                          {phone || <span className="text-gray-400 font-mono">e.g. +91 9876543210 or +1 443 456 7890</span>}
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Payin Merchant Fee */}
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
                              step="0.01"
                              min="0"
                              value={payinMerchantFee}
                              placeholder="0.00"
                              onChange={(e) => setPayinMerchantFee(e.target.value)}
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
                            <span className="font-mono text-sm">{payinMerchantFee}%</span>
                          </div>
                        )}
                      </div>

                      {/* Payout Merchant Fee */}
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
                              step="0.01"
                              min="0"
                              value={payoutMerchantFee}
                              placeholder="0.00"
                              onChange={(e) => setPayoutMerchantFee(e.target.value)}
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
                            <span className="font-mono text-sm">{payoutMerchantFee}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Broker Assignment & Direct Fees */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#ffffff] space-y-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Assigned Merchant Broker & Fees
                    </span>
                    {isEditing ? (
                      <div className="space-y-3">
                        <select
                          value={brokerId}
                          onChange={(e) => setBrokerId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Direct (No Broker Assigned)</option>
                          {(brokers || []).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.phone ? `(${b.phone})` : ""}
                            </option>
                          ))}
                        </select>
                        {brokerId && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
                                  Payin
                                </span>
                                <span>Broker Fee (%)</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={payinBrokerFee}
                                  onChange={(e) => setPayinBrokerFee(e.target.value)}
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
                                <span>Broker Fee (%)</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={payoutBrokerFee}
                                  onChange={(e) => setPayoutBrokerFee(e.target.value)}
                                  className="w-full pl-3.5 pr-8 py-2 text-xs font-mono font-bold bg-amber-50/40 border border-amber-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
                                />
                                <span className="absolute right-3 top-2 text-amber-600 font-bold text-xs">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                          <span className="font-semibold">
                            {merchant.broker
                              ? `${merchant.broker.name}${merchant.broker.phone ? ` (${merchant.broker.phone})` : ""}`
                              : "Direct (No Broker Assigned)"}
                          </span>
                          {merchant.broker && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                <span>Payin: {merchant.payinBrokerFee ?? payinBrokerFee ?? 0}%</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span>Payout: {merchant.payoutBrokerFee ?? payoutBrokerFee ?? 0}%</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
        )}

        {/* TAB 2: WALLET & LEDGER (CALLED DYNAMICALLY ON TAB CLICK) */}
        {activeTab === "wallet" && (
          <div className="card-theme overflow-hidden shadow-sm border border-base-200">
            <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-base-900">Transactions</h3>
              </div>
            </div>

            {loadingWallet ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-slate-500">Loading wallet statement from server...</p>
              </div>
            ) : (
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
                    {(!walletData?.entries || walletData.entries.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No ledger transactions recorded in this merchant's wallet yet.
                        </td>
                      </tr>
                    ) : (
                      walletData.entries.map((entry: any) => {
                        const typeBadge = getEntryTypeBadge(entry);
                        return (
                          <tr key={entry.id} className="hover:bg-[#ffffff] transition">
                            <td className="p-3 font-mono text-[11px] text-gray-600">
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeBadge.className}`}>
                                {typeBadge.label}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-gray-600">
                              {typeBadge.displayCategory}
                            </td>
                            <td className="p-3 font-medium text-base-900">
                              {entry.description}
                              {entry.order?.orderNumber && (
                                <span className="block text-[10px] text-primary font-mono font-bold mt-0.5">
                                  Order: {entry.order.orderNumber}
                                </span>
                              )}
                            </td>
                            <td className={`p-3 text-right font-extrabold ${typeBadge.amountColor}`}>
                              {typeBadge.amountPrefix}₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-bold text-base-900">
                              ₹{entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDERS (CALLED DYNAMICALLY ON TAB CLICK) */}
        {activeTab === "orders" && (
          <div className="card-theme overflow-hidden shadow-sm">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-base-900">Customer Orders</h3>
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
                      <th className="p-3">Type</th>
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
                        <td colSpan={9} className="p-6 text-center text-slate-500">
                          No orders created for this merchant yet.
                        </td>
                      </tr>
                    ) : (
                      ordersData.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                          <td className="p-3 font-mono font-bold text-base-900">
                            {ord.orderNumber}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                (ord.type || "PAYIN") === "PAYIN"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {(ord.type || "PAYIN") === "PAYIN" ? (
                                <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-rose-700" />
                              )}
                              <span>{(ord.type || "PAYIN") === "PAYIN" ? "Deposit" : "Withdrawal"}</span>
                            </span>
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
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <h3 className="font-semibold text-sm">Reset Password</h3>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-white hover:text-slate-200 text-sm font-semibold"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-5 space-y-4">
                <p className="text-xs text-base-700">
                  Set a new password for merchant: <b>{merchant.name || `Merchant #${merchant.id}`}</b>
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
                    className="flex-1 btn-primary py-2 text-xs font-bold"
                  >
                    {resetting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ADD BALANCE MODAL */}
      {showAddBalanceModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
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

      {/* CLEAR BALANCE MODAL (MANUAL WITHDRAWAL / DEDUCTION) */}
      {showClearModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-4 bg-[#0f172a] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MinusCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="font-semibold text-sm">Withdraw Funds from Merchant Wallet</h3>
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
                    Manually debit funds directly from <b>{merchant.name}</b>'s settled wallet.
                  </p>
                  <div className="mt-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Settled Balance:</span>
                    <span className="font-semibold text-base-900">
                      ₹{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    {currentBalance > 0 && (
                      <button
                        type="button"
                        disabled={clearingBalance || !!clearSuccess}
                        onClick={() => setClearAmount(currentBalance.toString())}
                        className="text-[12px] font-semibold text-primary hover:text-primary-400 underline disabled:opacity-50"
                      >
                        Clear Exact Balance (₹{currentBalance.toFixed(2)})
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

    </>
  );
}
