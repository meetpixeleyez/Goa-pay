"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import { qrProvidersApi } from "@/lib/api/qr-providers.api";
import {
  Users,
  User,
  UserPlus,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Phone,
  Mail,
  Calendar,
  Layers,
  Lock,
  Eye,
  Power,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export default function QRProviderOperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Operator Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createSelectedQrIds, setCreateSelectedQrIds] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  // Assign QRs Modal State
  const [assignModalOperator, setAssignModalOperator] = useState<any | null>(null);
  const [assignSelectedQrIds, setAssignSelectedQrIds] = useState<string[]>([]);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Edit Operator Modal State
  const [editModalOperator, setEditModalOperator] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPortalAccess, setEditPortalAccess] = useState(true);
  const [editTransactionAllowed, setEditTransactionAllowed] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset Password Modal State
  const [resetModalOperator, setResetModalOperator] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState("");

  // Status Confirmation Modal State
  const [statusModalOperator, setStatusModalOperator] = useState<any | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState("");

  // UPI Details Modal State
  const [selectedQrDetails, setSelectedQrDetails] = useState<any | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Action status tracker
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Debounced search handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [opsData, qrsData] = await Promise.all([
        qrProvidersApi.getOperators({
          page,
          limit,
          search: search.trim() ? search.trim() : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        }),
        qrProvidersApi.getQRCodes(),
      ]);

      if (opsData.success) {
        setOperators(opsData.operators || []);
        if (opsData.pagination) {
          setPagination(opsData.pagination);
        }
        if (opsData.stats) {
          setStats(opsData.stats);
        }
      }

      if (qrsData.success) {
        setQrCodes(qrsData.qrCodes || []);
      }
    } catch (e: any) {
      setError("Failed to load operator management data");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setCreateError("");

    try {
      await qrProvidersApi.createOperator({
        name: createName,
        email: createEmail,
        phone: createPhone,
        password: createPassword,
        qrProviderId: "", // Will be assigned to session user on server
        assignedQrIds: createSelectedQrIds,
      });

      setSuccess(`Operator "${createName}" created successfully!`);
      setShowCreateModal(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      setCreateSelectedQrIds([]);
      fetchData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create operator");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openAssignModal = (op: any) => {
    setAssignModalOperator(op);
    const currentAssigned = op.assignedQRCodes ? op.assignedQRCodes.map((q: any) => q.id) : [];
    setAssignSelectedQrIds(currentAssigned);
    setAssignError("");
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalOperator) return;

    setSubmittingAssign(true);
    setAssignError("");

    try {
      await qrProvidersApi.assignQRCodesToOperator(
        assignModalOperator.id,
        assignSelectedQrIds
      );

      setSuccess(`QR codes assigned to operator "${assignModalOperator.name}" successfully!`);
      setAssignModalOperator(null);
      fetchData();
    } catch (err: any) {
      setAssignError(err.message || "Failed to update QR assignments");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const openEditModal = (op: any) => {
    setEditModalOperator(op);
    setEditName(op.name);
    setEditPhone(op.phone || "");
    setEditStatus(op.status || "ACTIVE");
    setEditPortalAccess(op.portalAccess !== false);
    setEditTransactionAllowed(op.transactionAllowed !== false);
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalOperator) return;

    setSubmittingEdit(true);
    setEditError("");

    try {
      await qrProvidersApi.updateOperator(editModalOperator.id, {
        name: editName,
        phone: editPhone,
        status: editStatus,
        portalAccess: editPortalAccess,
        transactionAllowed: editTransactionAllowed,
      });

      setSuccess(`Operator "${editName}" updated successfully!`);
      setEditModalOperator(null);
      fetchData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update operator");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const openResetModal = (op: any) => {
    setResetModalOperator(op);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalOperator) return;

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }

    setSubmittingReset(true);
    setResetError("");

    try {
      await qrProvidersApi.resetOperatorPassword(resetModalOperator.id, newPassword);

      setSuccess(`Password for "${resetModalOperator.name}" reset successfully!`);
      setResetModalOperator(null);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleDeactivate = (op: any) => {
    setStatusModalOperator(op);
    setStatusModalError("");
  };

  const handleToggleOperatorStatus = (op: any) => {
    setStatusModalOperator(op);
    setStatusModalError("");
  };

  const handleConfirmStatusChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!statusModalOperator) return;

    const nextStatus = statusModalOperator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setSubmittingStatus(true);
      setStatusModalError("");
      await qrProvidersApi.updateOperator(statusModalOperator.id, { status: nextStatus });

      setOperators((prev) =>
        prev.map((o) => (o.id === statusModalOperator.id ? { ...o, status: nextStatus } : o))
      );
      setSuccess(`Operator "${statusModalOperator.name}" status updated to ${nextStatus}.`);
      setStatusModalOperator(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setStatusModalError(err.message || "Failed to update operator status");
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleCopyUpi = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const filteredOperators = operators;
  const totalCount = stats?.total ?? pagination.total;
  const activeCount = stats?.active ?? operators.filter((o) => o.status === "ACTIVE").length;
  const assignedQrsCount = stats?.assignedQrs ?? qrCodes.filter((q) => q.operatorId).length;

  return (
    <PortalLayout
      portal="qr-provider"
      title="Operator Management"
      subtitle="Create shift sub-users, assign collection QR codes, and delegate deposit/withdrawal order fulfillment"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchData()}
            className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
            title="Refresh operators"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/qr-provider/operators/create"
            className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5 shadow"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Operator</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Success / Error Alerts */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-theme p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-[#0c4a6e]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider block">
                Total Operators
              </span>
              <span className="text-xl font-extrabold text-base-900">{totalCount}</span>
            </div>
          </div>

          <div className="card-theme p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider block">
                Active Operators
              </span>
              <span className="text-xl font-extrabold text-emerald-700">
                {activeCount}
              </span>
            </div>
          </div>

          <div className="card-theme p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-base-700 uppercase tracking-wider block">
                Assigned QR Codes
              </span>
              <span className="text-xl font-extrabold text-blue-700">
                {assignedQrsCount} / {qrCodes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="card-theme p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-base-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-base-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Operators Table */}
        <div className="card-theme overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <span>Loading operators...</span>
            </div>
          ) : filteredOperators.length === 0 ? (
            <div className="p-12 text-center text-base-700 text-xs space-y-3">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-semibold text-sm text-base-900">No Operators Found</p>
              <p className="max-w-md mx-auto text-slate-500">
                {search || statusFilter !== "ALL"
                  ? "No operators match your filter criteria."
                  : "You haven't created any operators yet. Click 'Create Operator' to delegate orders to your sub-users."}
              </p>
              {!search && statusFilter === "ALL" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5 shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create First Operator</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 border-b border-base-200 text-base-700 uppercase text-[10px] tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3 px-4 w-64 max-w-[260px]">Operator Details</th>
                    <th className="py-3 px-4 min-w-[180px] max-w-[240px]">Assigned QR Codes</th>
                    <th className="py-3 px-4 whitespace-nowrap">Account Status</th>
                    <th className="py-3 px-4 whitespace-nowrap">Permissions</th>
                    <th className="py-3 px-4 whitespace-nowrap">Created Date</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60 bg-white">
                  {filteredOperators.map((op) => {
                    const assignedList = op.assignedQRCodes || [];
                    const isActive = op.status === "ACTIVE";

                    return (
                      <tr key={op.id} className="hover:bg-base-100/20 transition">
                        {/* Operator Identity */}
                        <td className="py-3.5 px-4 w-64 max-w-[260px]">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 mt-0.5">
                              {op.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 max-w-[190px]">
                              <Link
                                href={`/qr-provider/operators/${op.id}`}
                                className="font-bold text-sm text-base-900 hover:text-primary hover:underline flex items-center space-x-1"
                                title={op.name}
                              >
                                <span className="truncate block">{op.name}</span>
                              </Link>
                              <div
                                className="text-[11px] text-gray-600 flex items-center space-x-1 mt-0.5 font-mono"
                                title={op.email}
                              >
                                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate block flex-1">{op.email}</span>
                              </div>
                              <div className="text-[11px] flex items-center space-x-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className={op.phone ? "font-mono text-gray-700 font-semibold truncate block max-w-[150px]" : "text-gray-400 italic"}>
                                  {op.phone || "No mobile added"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Assigned QR Codes */}
                        <td className="py-3.5 px-4">
                          {assignedList.length === 0 ? (
                            <span className="text-[11px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-semibold inline-flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3 text-sky-500" />
                              <span>0 Assigned (Idle)</span>
                            </span>
                          ) : (
                            <div className="space-y-1 max-w-xs">
                              {/* Clean clickable QR code icons with title=qr.upiId */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {assignedList.slice(0, 4).map((qr: any) => (
                                  <button
                                    key={qr.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedQrDetails({
                                        ...qr,
                                        operatorName: op.name,
                                        operatorEmail: op.email,
                                      })
                                    }
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-primary/15 text-[#0c4a6e] hover:bg-primary hover:text-white border border-primary/30 transition shadow-2xs group cursor-pointer"
                                    title={qr.upiId}
                                  >
                                    <QrCode className="w-4 h-4 transition-transform group-hover:scale-110" />
                                  </button>
                                ))}
                                {assignedList.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => openAssignModal(op)}
                                    className="inline-flex items-center px-1.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition"
                                    title={assignedList.slice(4).map((q: any) => q.upiId).join(", ")}
                                  >
                                    +{assignedList.length - 4} more
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                                <span>{assignedList.length} Total QR{assignedList.length > 1 ? "s" : ""}</span>
                                <span>•</span>
                                <span>{assignedList.filter((q: any) => q.isActive).length} Active</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center space-x-3 mt-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openAssignModal(op)}
                              className="text-[11px] text-[#0c4a6e] font-bold hover:underline flex items-center space-x-1"
                            >
                              <Layers className="w-3 h-3 shrink-0" />
                              <span>Manage QRs</span>
                            </button>
                            <Link
                              href={`/qr-provider/operators/${op.id}`}
                              className="text-[11px] text-primary font-bold hover:underline flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>View Info</span>
                            </Link>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleOperatorStatus(op)}
                            disabled={actionLoadingId === op.id}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-red-50 text-red-800 border-red-300 hover:bg-red-100"
                            }`}
                            title="Click to toggle operator status (Active / Inactive)"
                          >
                            {isActive ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            <span>{op.status}</span>
                          </button>
                        </td>

                        {/* Permissions (Unified to Active / Inactive) */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center space-x-1.5 text-[11px]">
                            <span className="font-semibold text-slate-500">Portal:</span>
                            <span
                              className={`font-bold inline-flex items-center space-x-1 ${
                                op.portalAccess !== false ? "text-emerald-700" : "text-red-600"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${op.portalAccess !== false ? "bg-emerald-500" : "bg-red-500"}`} />
                              <span>{op.portalAccess !== false ? "Active" : "Inactive"}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px]">
                            <span className="font-semibold text-slate-500">Transactions:</span>
                            <span
                              className={`font-bold inline-flex items-center space-x-1 ${
                                op.transactionAllowed !== false ? "text-emerald-700" : "text-red-600"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${op.transactionAllowed !== false ? "bg-emerald-500" : "bg-red-500"}`} />
                              <span>{op.transactionAllowed !== false ? "Active" : "Inactive"}</span>
                            </span>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{new Date(op.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <Link
                              href={`/qr-provider/operators/${op.id}`}
                              className="p-1.5 rounded bg-primary/15 text-[#0c4a6e] hover:bg-primary/30 border border-primary/40 transition"
                              title="View Operator Info & Full Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => openAssignModal(op)}
                              className="p-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              title="Assign / Unassign QR Codes"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openResetModal(op)}
                              className="p-1.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                              title="Reset Operator Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(op)}
                              className="p-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                              title="Edit Operator Settings"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isActive && (
                              <button
                                onClick={() => handleDeactivate(op)}
                                disabled={actionLoadingId === op.id}
                                className="p-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                title="Deactivate Operator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="p-4 border-t border-base-200 bg-base-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-base-700">
              <div className="flex items-center space-x-2">
                <span>
                  Showing <span className="font-bold text-base-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                  <span className="font-bold text-base-900">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  of <span className="font-bold text-base-900">{pagination.total}</span> operators
                </span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="appearance-none bg-white border border-base-200 text-base-700 text-xs py-1 pl-2.5 pr-7 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none text-base-700">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-[11px]">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                  className="px-2.5 py-1 rounded border border-base-200 bg-white text-base-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors hover:bg-base-100"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNumber = i + 1;
                  if (pagination.totalPages > 5 && page > 3) {
                    pageNumber = page - 3 + i;
                    if (pageNumber > pagination.totalPages) {
                      pageNumber = pagination.totalPages - (4 - i);
                    }
                  }
                  if (pageNumber <= 0) pageNumber = 1;

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      className={`w-8 h-8 rounded font-bold flex items-center justify-center transition-colors ${
                        page === pageNumber
                          ? "bg-primary text-white shadow-sm"
                          : "border border-base-200 bg-white hover:bg-base-100 text-base-900"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={page >= pagination.totalPages || loading}
                  className="px-2.5 py-1 rounded border border-base-200 bg-white hover:bg-base-100 text-base-900 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE OPERATOR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-base-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Create New Operator</h3>
                  <p className="text-[11px] text-base-700">
                    Create a sub-user credentials under your QR provider account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-base-900 mb-1">Operator Full Name *</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-base-900 mb-1">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. rahul.operator@example.com"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-base-900 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-base-900 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="•••••••• (Min 6 characters)"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Assign Initial QR Codes */}
              <div>
                <label className="block font-semibold text-base-900 mb-1">
                  Assign Collection QR Codes (Optional)
                </label>
                <p className="text-[11px] text-base-700 mb-2">
                  Select which of your collection QR codes this operator can monitor and fulfill orders for:
                </p>

                {qrCodes.length === 0 ? (
                  <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-lg text-[11px]">
                    You have no collection QR codes created yet. You can assign QR codes later.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto border border-base-200 rounded-lg p-2.5 bg-gray-50">
                    {qrCodes.map((qr) => {
                      const isSelected = createSelectedQrIds.includes(qr.id);
                      return (
                        <label
                          key={qr.id}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                            isSelected
                              ? "bg-white border-primary shadow-sm"
                              : "bg-white border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreateSelectedQrIds([...createSelectedQrIds, qr.id]);
                                } else {
                                  setCreateSelectedQrIds(createSelectedQrIds.filter((id) => id !== qr.id));
                                }
                              }}
                              className="rounded border-base-200 text-primary focus:ring-primary h-4 w-4"
                            />
                            <div>
                              <div className="font-bold text-base-900">{qr.upiId}</div>
                              <div className="text-[10px] text-slate-500">
                                {qr.bankName || "Bank"} &bull; {qr.accountHolderName || "Holder"}
                              </div>
                            </div>
                          </div>
                          {qr.operator && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">
                              Currently: {qr.operator.name}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="btn-primary py-2 px-5 font-semibold flex items-center space-x-1.5 shadow"
                >
                  {submittingCreate ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Operator</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN / UNASSIGN QR CODES MODAL */}
      {assignModalOperator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-200">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Manage Assigned QR Codes</h3>
                  <p className="text-[11px] text-base-700">
                    Operator: <strong className="text-base-900">{assignModalOperator.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOperator(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <p className="text-base-700">
                Select which collection QR codes this operator can access and process orders for. Orders matching these QR codes will appear directly on their dashboard:
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto border border-base-200 rounded-lg p-2.5 bg-gray-50">
                {qrCodes.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">No collection QR codes available.</div>
                ) : (
                  qrCodes.map((qr) => {
                    const isChecked = assignSelectedQrIds.includes(qr.id);
                    const isAssignedToOther = qr.operatorId && qr.operatorId !== assignModalOperator.id;

                    return (
                      <label
                        key={qr.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? "bg-white border-primary shadow-sm"
                            : "bg-white border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignSelectedQrIds([...assignSelectedQrIds, qr.id]);
                              } else {
                                setAssignSelectedQrIds(assignSelectedQrIds.filter((id) => id !== qr.id));
                              }
                            }}
                            className="rounded border-base-200 text-primary focus:ring-primary h-4 w-4"
                          />
                          <div>
                            <div className="font-bold text-base-900">{qr.upiId}</div>
                            <div className="text-[10px] text-slate-500">
                              {qr.bankName || "Bank"} &bull; {qr.accountHolderName || "Holder"}
                            </div>
                          </div>
                        </div>
                        {isAssignedToOther && (
                          <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-semibold">
                            Reassigns from {qr.operator?.name || "Other"}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOperator(null)}
                  className="px-4 py-2 border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="btn-primary py-2 px-5 font-semibold flex items-center space-x-1.5 shadow"
                >
                  {submittingAssign ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Assignments</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OPERATOR MODAL */}
      {editModalOperator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-base-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-5 gap-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center font-bold shrink-0">
                  <Edit2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-base-900 truncate">Edit Operator Settings</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                      Sub-Operator
                    </span>
                  </div>
                  <p className="text-xs text-base-700 mt-0.5 font-medium truncate" title={editModalOperator.email}>
                    Operator: <span className="font-mono text-gray-700 font-semibold">{editModalOperator.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOperator(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Operator Full Name */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Operator"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium text-base-900 transition"
                  />
                </div>
              </div>

              {/* Operator Phone Number */}
              <div>
                <label className="block text-xs font-bold text-base-900 mb-1.5">
                  Mobile Number (10 digits)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium text-base-900 transition"
                  />
                </div>
              </div>

              {/* Login Email (Readonly) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold text-base-900 mb-1.5">
                  Email Address (Login ID)
                </label>
                <div className="relative min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 shrink-0" />
                  <input
                    type="email"
                    disabled
                    value={editModalOperator.email}
                    title={editModalOperator.email}
                    className="w-full min-w-0 pl-10 pr-3.5 py-2.5 text-xs border border-base-200/80 rounded-xl bg-gray-50 text-slate-500 font-mono font-medium cursor-not-allowed select-all truncate"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Login ID cannot be modified once registered.</span>
              </div>

              {/* Account Controls & Permissions Switch Box */}
              <div className="p-4 rounded-xl border border-base-200 bg-[#ffffff] space-y-3.5">
                <span className="text-[11px] font-bold text-base-900 uppercase tracking-wider block pb-2 border-b border-[#e4d8c2]">
                  Account Controls & Permissions
                </span>

                {/* Account Status Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Account Status</span>
                    <span className="text-[10px] text-base-700 block">Active operators can log in and process orders</span>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editStatus === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          editStatus === "ACTIVE" ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {editStatus === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editStatus === "ACTIVE"}
                    onClick={() => setEditStatus(editStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editStatus === "ACTIVE" ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editStatus === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Portal Access Switch */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#e4d8c2]/80">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Portal Access</span>
                    <span className="text-[10px] text-base-700 block">Permit operator login to the operator portal</span>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editPortalAccess ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          editPortalAccess ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editPortalAccess ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editPortalAccess}
                    onClick={() => setEditPortalAccess(!editPortalAccess)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editPortalAccess ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editPortalAccess ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Order Fulfillment / Transaction Handling Switch */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#e4d8c2]/80">
                  <div>
                    <span className="text-xs font-bold text-base-900 block">Orders / Txns</span>
                    <span className="text-[10px] text-base-700 block">Allow verifying UTR deposits & completing payouts</span>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editTransactionAllowed ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          editTransactionAllowed ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editTransactionAllowed ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editTransactionAllowed}
                    onClick={() => setEditTransactionAllowed(!editTransactionAllowed)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                      editTransactionAllowed ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editTransactionAllowed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalOperator(null)}
                  className="px-4 py-2 border border-base-200 rounded-xl text-gray-700 hover:bg-gray-100 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn-primary py-2 px-5 font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow"
                >
                  {submittingEdit ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalOperator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-base-200">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Reset Password</h3>
                  <p className="text-[11px] text-base-700">{resetModalOperator.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOperator(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-base-900 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="•••••••• (Min 6 characters)"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-base-900 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetModalOperator(null)}
                  className="px-4 py-2 border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="btn-primary py-2 px-5 font-semibold flex items-center space-x-1.5 shadow"
                >
                  {submittingReset ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Set Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION POPUP FORM */}
      {statusModalOperator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    statusModalOperator.status === "ACTIVE"
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Confirm Operator Status</h3>
                  <p className="text-xs text-base-700 mt-0.5">Toggle active or inactive state</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalOperator(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusModalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusModalError}</span>
              </div>
            )}

            {/* Content Form */}
            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-base-900">
                  Are you sure you want to active and deactive operator?
                </p>
                <p className="text-xs text-base-700 mt-1">
                  This action will switch the operator status from{" "}
                  <strong className="text-base-900">{statusModalOperator.status}</strong> to{" "}
                  <strong className={statusModalOperator.status === "ACTIVE" ? "text-red-600" : "text-emerald-700"}>
                    {statusModalOperator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                  </strong>.
                </p>
              </div>

              <div className="p-3.5 bg-[#ffffff] border border-base-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-base-700 font-medium">Operator Name:</span>
                  <span className="font-bold text-base-900">{statusModalOperator.name}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-base-700 font-medium shrink-0">Login Email:</span>
                  <span className="font-mono text-gray-600 truncate max-w-[220px]" title={statusModalOperator.email}>
                    {statusModalOperator.email}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Current Status:</span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      statusModalOperator.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <span>{statusModalOperator.status}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: If active then Inactive, if inactive then Active, and one Cancel */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setStatusModalOperator(null)}
                  disabled={submittingStatus}
                  className="px-4 py-2 border border-base-200 text-base-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                {statusModalOperator.status === "ACTIVE" ? (
                  <button
                    type="submit"
                    disabled={submittingStatus}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                  >
                    {submittingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Inactive</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submittingStatus}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                  >
                    {submittingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Active</span>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI ID & QR DETAILS MODAL */}
      {selectedQrDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">UPI ID Details</h3>
                  <p className="text-xs text-base-700 mt-0.5">Assigned QR &amp; UPI Account Information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedQrDetails(null);
                  setCopiedUpi(false);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image Preview if available */}
            {selectedQrDetails.imageUrl && (
              <div className="mb-4 flex flex-col items-center justify-center p-3 bg-[#ffffff] rounded-xl border border-base-200">
                <img
                  src={selectedQrDetails.imageUrl}
                  alt={selectedQrDetails.upiId}
                  className="w-36 h-36 object-contain rounded-lg border border-base-200 bg-white p-2 shadow-xs"
                />
                <a
                  href={selectedQrDetails.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-[11px] text-primary hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>Open full image</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* UPI ID Box with Copy button */}
            <div className="mb-4 p-3.5 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between">
              <div className="min-w-0 mr-2">
                <span className="text-[10px] font-bold text-base-700 uppercase tracking-wider block">
                  UPI ID
                </span>
                <span className="font-mono text-sm font-bold text-base-900 select-all break-all">
                  {selectedQrDetails.upiId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUpi(selectedQrDetails.upiId)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition ${
                  copiedUpi
                    ? "bg-emerald-600 text-white"
                    : "bg-primary text-white hover:bg-[#527d65]"
                }`}
                title="Copy UPI ID"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Key Information Fields */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                <span className="text-base-700 font-medium">Status</span>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                    selectedQrDetails.isActive
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedQrDetails.isActive ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span>{selectedQrDetails.isActive ? "ACTIVE" : "INACTIVE"}</span>
                </span>
              </div>

              {selectedQrDetails.name && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Label / Name</span>
                  <span className="font-semibold text-base-900 text-right">{selectedQrDetails.name}</span>
                </div>
              )}

              {selectedQrDetails.bankName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Bank Name</span>
                  <span className="font-semibold text-base-900 text-right">{selectedQrDetails.bankName}</span>
                </div>
              )}

              {selectedQrDetails.accountHolderName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Account Holder</span>
                  <span className="font-semibold text-base-900 text-right">{selectedQrDetails.accountHolderName}</span>
                </div>
              )}

              {selectedQrDetails.operatorName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">Assigned Operator</span>
                  <span className="font-semibold text-base-900 text-right">
                    {selectedQrDetails.operatorName}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t border-base-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedQrDetails(null);
                  setCopiedUpi(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-base-900 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
