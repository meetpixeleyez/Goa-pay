"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import {
  ShoppingBag,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Landmark,
} from "lucide-react";
import UpdateCustomerQrModal from "@/components/orders/UpdateCustomerQrModal";
import { getSocketClient } from "@/lib/socket-client";
import { ordersApi } from "@/lib/api/orders.api";

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYIN" | "PAYOUT">("ALL");

  // In-Dashboard Order Modal
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(null);
  const [updatingQrOrder, setUpdatingQrOrder] = useState<any | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getOrders({}, "merchant");
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const socket = getSocketClient();
    const handleUpdate = () => fetchOrders();
    socket.on("payout:completed", handleUpdate);
    socket.on("order:updated", handleUpdate);
    return () => {
      socket.off("payout:completed", handleUpdate);
      socket.off("order:updated", handleUpdate);
    };
  }, []);

  const depositCount = orders.filter((o) => (o.type || "PAYIN") === "PAYIN").length;
  const withdrawalCount = orders.filter((o) => o.type === "PAYOUT").length;

  const filteredOrders = orders.filter((o) => {
    const orderType = o.type || "PAYIN";
    const matchesType = typeFilter === "ALL" || orderType === typeFilter;
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.customerUtr && o.customerUtr.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  // Reset to page 1 on filter or page size changes
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, pageSize]);

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <PortalLayout
      portal="merchant"
      title="Store Orders"
      subtitle="View, filter, and inspect incoming deposits and withdrawal disbursements inside your portal"
      actions={
        <div className="flex items-center space-x-2">
          <Link
            href="/merchant/create-order"
            className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Order</span>
          </Link>
          <button
            onClick={fetchOrders}
            className="btn-secondary text-xs py-2 px-3 flex items-center space-x-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Type Tabs Bar (All vs Deposit vs Withdrawal) */}
      <div className="flex items-center space-x-2 border-b border-base-200 pb-2">
        <button
          onClick={() => setTypeFilter("ALL")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            typeFilter === "ALL"
              ? "bg-[#0f172a] text-white shadow-xs"
              : "bg-[#ffffff] text-gray-700 hover:bg-base-100"
          }`}
        >
          <span>All Orders</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setTypeFilter("PAYIN")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            typeFilter === "PAYIN"
              ? "bg-primary text-white shadow-xs"
              : "bg-[#ffffff] text-emerald-800 hover:bg-emerald-50 border border-emerald-200/60"
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Deposits (Payin)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              typeFilter === "PAYIN" ? "bg-white/20" : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {depositCount}
          </span>
        </button>

        <button
          onClick={() => setTypeFilter("PAYOUT")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            typeFilter === "PAYOUT"
              ? "bg-red-600 text-white shadow-xs"
              : "bg-[#ffffff] text-red-700 hover:bg-red-50 border border-red-200/60"
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Withdrawals (Payout)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              typeFilter === "PAYOUT" ? "bg-white/20" : "bg-red-100 text-red-800"
            }`}
          >
            {withdrawalCount}
          </span>
        </button>
      </div>

      {/* Search and Status Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, Customer, UTR..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-base-200 rounded-lg bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs w-full sm:w-auto">
          {["ALL", "processing", "pending", "completed", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition uppercase text-[10px] ${
                statusFilter === st
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-base-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-theme overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Order Number</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Type</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Customer</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Amount</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">UTR / Reference</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Status</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Created</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs text-right">In-Dashboard View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const isDeposit = (ord.type || "PAYIN") === "PAYIN";
                  return (
                    <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-base-900">
                        {ord.orderNumber}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isDeposit ? "Deposit" : "Withdrawal"}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-base-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-base-900">
                        ₹{ord.amount.toFixed(2)}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                        {isDeposit ? (
                          ord.customerUtr || <span className="text-gray-400 italic">Pending UTR</span>
                        ) : (
                          ord.payoutProofUtr || ord.verifierUtr || (
                            <span className="text-slate-400 italic">Pending Transfer</span>
                          )
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === "completed"
                              ? "badge-completed"
                              : ord.status === "processing"
                              ? "badge-processing animate-pulse"
                              : ord.status === "pending"
                              ? "badge-pending"
                              : "badge-rejected"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isDeposit && (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(ord.id)}
                              className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg inline-flex items-center space-x-1 shadow-xs transition"
                              title="View Customer Bank Account Details"
                            >
                              <Landmark className="w-3 h-3 text-emerald-700" />
                              <span>Bank Details</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(ord.id)}
                            className="btn-secondary py-1.5 px-2.5 text-xs font-semibold inline-flex items-center space-x-1 shadow-xs hover:border-primary"
                            title="View complete checkout and order session inside dashboard"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>View Session</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        {totalItems > 0 && (
          <div className="p-3.5 border-t border-base-200 bg-base-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-base-700">
            <div className="flex items-center space-x-2">
              <span>
                Showing <span className="font-bold text-base-900">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-base-900">{endIndex}</span> of{" "}
                <span className="font-bold text-base-900">{totalItems}</span> orders
              </span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
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

            {/* Pagination Navigation Buttons */}
            {totalPages >= 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage <= 1}
                  className="px-2.5 py-1 rounded border border-base-200 bg-white text-base-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors hover:bg-base-100"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber = i + 1;
                  if (totalPages > 5 && safePage > 3) {
                    pageNumber = safePage - 3 + i;
                    if (pageNumber > totalPages) {
                      pageNumber = totalPages - (4 - i);
                    }
                  }
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-[28px] h-7 px-2 rounded font-bold transition ${
                        safePage === pageNumber
                          ? "bg-primary text-white shadow-xs"
                          : "border border-base-200 bg-white text-base-700 hover:bg-base-100"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2.5 py-1 rounded border border-base-200 bg-white text-base-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors hover:bg-base-100"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-Dashboard Order Details & Checkout Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={fetchOrders}
        portal="merchant"
      />

      {/* Update Customer QR Modal */}
      <UpdateCustomerQrModal
        order={updatingQrOrder}
        isOpen={Boolean(updatingQrOrder)}
        onClose={() => setUpdatingQrOrder(null)}
        onSuccess={() => {
          setUpdatingQrOrder(null);
          fetchOrders();
        }}
      />
    </PortalLayout>
  );
}
