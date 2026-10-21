"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Users,
  User,
  UserPlus,
  QrCode,
  Search,
  RefreshCw,
  KeyRound,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Building2,
  Power,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { isValidPhone, normalizePhone } from "@/lib/validation";
import QuickCreateModal from "@/components/users/QuickCreateModal";

export default function AdminOperatorsPage() {
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Pagination
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [stats, setStats] = useState<any>(null);

  // Manage Assigned QRs Modal State
  const [assignModalOperator, setAssignModalOperator] = useState<any>(null);
  const [providerQrs, setProviderQrs] = useState<any[]>([]);
  const [assignSelectedQrIds, setAssignSelectedQrIds] = useState<string[]>([]);
  const [loadingQrs, setLoadingQrs] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Edit Operator Modal State
  const [editModalOperator, setEditModalOperator] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPortalAccess, setEditPortalAccess] = useState(true);
  const [editTransactionAllowed, setEditTransactionAllowed] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset Password Modal State
  const [resetModalOperator, setResetModalOperator] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState("");

  // Status Confirmation Modal State
  const [statusModalOperator, setStatusModalOperator] = useState<any>(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState("");

  // UPI Details Modal State
  const [selectedQrDetails, setSelectedQrDetails] = useState<any>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Action loading tracker
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

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (providerFilter !== "ALL") params.set("providerId", providerFilter);

      const [opsRes, provsRes] = await Promise.all([
        fetch(`/api/qr-provider/operators?${params.toString()}`),
        fetch("/api/admin/users?role=QR_PROVIDER"),
      ]);

      const opsData = await opsRes.json();
      const provsData = await provsRes.json();

      if (!opsRes.ok) throw new Error(opsData.error || "Failed to load operators");
      if (!provsRes.ok) throw new Error(provsData.error || "Failed to load providers");

      setOperators(opsData.operators || []);
      if (opsData.pagination) {
        setPagination(opsData.pagination);
      }
      if (opsData.stats) {
        setStats(opsData.stats);
      }
      setProviders(provsData.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load operator management data");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, providerFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAssignModal = async (op: any) => {
    setAssignModalOperator(op);
    setAssignSelectedQrIds((op.assignedQRCodes || []).map((q: any) => q.id));
    setAssignError("");
    setLoadingQrs(true);

    try {
      const res = await fetch(`/api/qr-provider/qr-codes?providerId=${op.qrProviderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load provider QR codes");
      setProviderQrs(data.qrCodes || []);
    } catch (err: any) {
      setAssignError(err.message || "Failed to load provider QR codes");
    } finally {
      setLoadingQrs(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalOperator) return;

    setSubmittingAssign(true);
    setAssignError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${assignModalOperator.id}/assign-qrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeIds: assignSelectedQrIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update QR assignments");

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

    const cleanPhone = editPhone.trim() ? normalizePhone(editPhone) : "";
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setEditError("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
      return;
    }

    setSubmittingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${editModalOperator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: cleanPhone,
          status: editStatus,
          portalAccess: editPortalAccess,
          transactionAllowed: editTransactionAllowed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update operator");

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
    setResetError("");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalOperator) return;

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }

    setSubmittingReset(true);
    setResetError("");

    try {
      const res = await fetch(`/api/qr-provider/operators/${resetModalOperator.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setSuccess(`Password for "${resetModalOperator.name}" reset successfully!`);
      setResetModalOperator(null);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleOperatorStatus = (op: any) => {
    setStatusModalOperator(op);
    setStatusModalError("");
  };

  const handleDeactivate = (op: any) => {
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
      const res = await fetch(`/api/qr-provider/operators/${statusModalOperator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update operator status");

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

  // Filter calculations
  const filteredOperators = operators;

  const totalActiveQrs =
    operators.reduce((acc, op) => acc + (op.assignedQRCodes?.filter((q: any) => q.isActive).length || 0), 0);
  const activeCount = stats?.active ?? operators.filter((o) => o.status === "ACTIVE").length;
  const inactiveCount = stats?.inactive ?? operators.filter((o) => o.status === "INACTIVE").length;
  const totalCount = stats?.total ?? pagination.total;

  return (
    <PortalLayout
      portal="admin"
      title="Operators Management"
      subtitle="Oversee sub-operators across all QR Providers, supervise QR assignments, and configure permissions"
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
          <button
            onClick={() => setQuickModalOpen(true)}
            className="btn-primary text-xs py-2 px-3.5 flex items-center space-x-1.5 shadow cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Operator</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Operators</span>
            </div>
            <div className="text-2xl font-bold text-base-900">{totalCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all QR Providers</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-emerald-700 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active Operators</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">{activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Operational & accepting</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-red-700 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Inactive</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{inactiveCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Disabled / Suspended</div>
          </div>

          <div className="card-theme p-4 shadow-sm border border-base-200">
            <div className="flex items-center space-x-2 text-base-700 mb-1">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active QRs</span>
            </div>
            <div className="text-2xl font-bold text-base-900">{totalActiveQrs}</div>
            <div className="text-[11px] text-slate-500 mt-1">Live active endpoints</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card-theme p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search operator, email, or provider..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-base-700">Provider:</span>
              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-base-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium max-w-[180px] truncate"
              >
                <option value="ALL">All QR Providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
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
                {search || statusFilter !== "ALL" || providerFilter !== "ALL"
                  ? "No operators match your filter criteria."
                  : "No sub-operators have been registered yet. Click 'Create Operator' to add one."}
              </p>
              {!search && statusFilter === "ALL" && providerFilter === "ALL" && (
                <button
                  onClick={() => setQuickModalOpen(true)}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5 shadow cursor-pointer"
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
                    <th className="py-3 px-4 w-60 max-w-[240px]">Operator</th>
                    <th className="py-3 px-4 w-52 max-w-[210px]">Parent QR Provider</th>
                    <th className="py-3 px-4 min-w-[180px] max-w-[220px]">Active QR</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
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
                        {/* Operator Details */}
                        <td className="py-3.5 px-4 w-60 max-w-[240px]">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 mt-0.5">
                              {op.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 max-w-[180px]">
                              <Link
                                href={`/admin/operators/${op.id}`}
                                className="font-bold text-sm text-base-900 hover:text-primary hover:underline flex items-center space-x-1"
                                title={op.name}
                              >
                                <span className="truncate block">{op.name}</span>
                              </Link>
                              <div className="text-[11px] flex items-center space-x-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className={op.phone ? "font-mono text-gray-700 font-semibold truncate block max-w-[150px]" : "text-gray-400 italic"}>
                                  {op.phone || "No mobile added"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Parent QR Provider */}
                        <td className="py-3.5 px-4 w-52 max-w-[210px]">
                          {op.qrProvider ? (
                            <Link
                              href={`/admin/qr-providers/${op.qrProvider.id}`}
                              className="group block max-w-[180px]"
                              title={`${op.qrProvider.name} (${op.qrProvider.email})`}
                            >
                              <div className="flex items-center space-x-1.5 font-bold text-xs text-base-900 group-hover:text-primary group-hover:underline">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate block flex-1">{op.qrProvider.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate block mt-0.5 font-mono">
                                {op.qrProvider.phone || `ID: ${op.qrProvider.id}`}
                              </div>
                            </Link>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Direct / None</span>
                          )}
                        </td>

                        {/* Active QR Code */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            const activeQr = (op.assignedQRCodes || []).find((q: any) => q.isActive);
                            if (!activeQr) {
                              return (
                                <span className="text-[11px] text-slate-400 italic">
                                  No Active QR
                                </span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedQrDetails({
                                    ...activeQr,
                                    operatorName: op.name,
                                    operatorEmail: op.email,
                                    providerName: op.qrProvider?.name,
                                  })
                                }
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs group cursor-pointer max-w-full"
                                title={`Active UPI: ${activeQr.upiId}`}
                              >
                                <QrCode className="w-3.5 h-3.5 text-emerald-600 transition-transform group-hover:scale-110 shrink-0" />
                                <span className="font-mono font-bold text-xs truncate max-w-[150px]">
                                  {activeQr.upiId}
                                </span>
                              </button>
                            );
                          })()}
                        </td>

                      {/* Status (Read-Only Badge) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-red-50 text-red-800 border-red-300"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span>{op.status}</span>
                        </span>
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
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                op.portalAccess !== false ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
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
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                op.transactionAllowed !== false ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
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
                        <Link
                          href={`/admin/operators/${op.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary-50 border border-primary/20 transition cursor-pointer"
                          title="View Operator Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </Link>
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
                  <p className="text-xs text-base-700 mt-0.5">Active QR &amp; UPI Account Information</p>
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

              {selectedQrDetails.providerName && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#e0f2fe]">
                  <span className="text-base-700 font-medium">QR Provider</span>
                  <span className="font-semibold text-base-900 text-right">
                    {selectedQrDetails.providerName}
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

      {/* Quick Create Operator Modal */}
      <QuickCreateModal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        role="OPERATOR"
        onSuccess={fetchData}
      />
    </PortalLayout>
  );
}
