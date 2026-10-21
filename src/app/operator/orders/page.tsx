"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import ModalPortal from "@/components/common/ModalPortal";
import BankTransferCard from "@/components/orders/BankTransferCard";
import PayoutFulfillmentModal from "@/components/orders/PayoutFulfillmentModal";
import {
  ShoppingBag,
  Eye,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Image as ImageIcon,
  ZoomIn,
  X,
  XCircle,
  QrCode,
  User,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";

export default function OperatorOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYIN" | "PAYOUT">("ALL");

  // Releasing / cancelling assignment state
  const [releasingId, setReleasingId] = useState<number | null>(null);

  // Verification / Submission Modals
  const [selectedPayinOrder, setSelectedPayinOrder] = useState<any>(null);
  const [selectedPayoutOrder, setSelectedPayoutOrder] = useState<any>(null);
  const [verifierUtr, setVerifierUtr] = useState("");
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");

  const [profile, setProfile] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRes = await fetch("/api/operator/orders");
      const data = await ordersRes.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket({ role: "OPERATOR" });

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, ...data.order, status: data.status || o.status } : o))
      );
    };

    const handleNewOrder = () => {
      fetchOrders();
    };

    socket.on("order:updated", handleOrderUpdate);
    socket.on("order:assigned", handleNewOrder);
    socket.on("payin:assigned", handleNewOrder);
    socket.on("payout:claimed", handleNewOrder);
    socket.on("payout:released", handleNewOrder);

    return () => {
      socket.off("order:updated", handleOrderUpdate);
      socket.off("order:assigned", handleNewOrder);
      socket.off("payin:assigned", handleNewOrder);
      socket.off("payout:claimed", handleNewOrder);
      socket.off("payout:released", handleNewOrder);
    };
  }, [socket]);

  // Handle PAYIN Direct Verification
  const handleVerifyDeposit = async (order: any) => {
    if (verifying || !!verifySuccess) return;

    const finalUtr = (verifierUtr || order.customerUtr || "").trim();
    if (!finalUtr) {
      setVerifyError("Customer must submit a UTR first before verification.");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    setVerifySuccess("");

    try {
      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifierUtr: finalUtr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setVerifySuccess(`Deposit order #${order.orderNumber} successfully verified & settled!`);
      setTimeout(() => {
        setSelectedPayinOrder(null);
        setVerifierUtr("");
        setVerifySuccess("");
        setVerifying(false);
        fetchOrders();
      }, 900);
    } catch (err: any) {
      setVerifyError(err.message || "Failed to verify order");
      setVerifying(false);
    }
  };

  // Cancel / Release Payout Assignment
  const handleCancelAssignment = async (orderId: number) => {
    const confirm = window.confirm(
      "Are you sure you want to cancel this payout assignment and return it back to the available pool?"
    );
    if (!confirm) return;

    setReleasingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/payout/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to release order");

      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to release order");
    } finally {
      setReleasingId(null);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const query = search.toLowerCase();
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(query) ||
      ord.customerName.toLowerCase().includes(query) ||
      ord.customerMobile.includes(query) ||
      (ord.customerUtr && ord.customerUtr.toLowerCase().includes(query)) ||
      (ord.verifierUtr && ord.verifierUtr.toLowerCase().includes(query)) ||
      (ord.qrCode?.upiId && ord.qrCode.upiId.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || ord.status === statusFilter.toLowerCase();
    const matchesType = typeFilter === "ALL" || ord.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <PortalLayout
      portal="operator"
      title="Assigned Orders Queue"
      subtitle="Orders routed to your assigned collection QR codes. Verify customer deposits and fulfill withdrawals."
      actions={
        <button
          onClick={fetchOrders}
          className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh Orders</span>
        </button>
      }
    >
      <div className="space-y-6">
        {verifySuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{verifySuccess}</span>
            </div>
            <button onClick={() => setVerifySuccess("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="card-theme p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, name, mobile, UTR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type Filter */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-base-200 text-xs">
              <button
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  typeFilter === "ALL" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter("PAYIN")}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center space-x-1 ${
                  typeFilter === "PAYIN" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Deposits</span>
              </button>
              <button
                onClick={() => setTypeFilter("PAYOUT")}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center space-x-1 ${
                  typeFilter === "PAYOUT" ? "bg-sky-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Payouts</span>
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-base-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card-theme overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <span>Loading orders queue...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-sm text-gray-700">No Orders Match Your Filter</p>
              <p>When customer transactions match your assigned QR codes, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-base-100/60 border-b border-base-200 text-base-700 uppercase text-[10px] tracking-wider font-extrabold">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Customer Info</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Assigned QR Code</th>
                    <th className="p-3">Customer UTR</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60 bg-white">
                  {filteredOrders.map((ord) => {
                    const isDeposit = ord.type === "PAYIN";
                    const isProcessing = ord.status === "processing";

                    return (
                      <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                        <td className="p-3 whitespace-nowrap font-mono font-bold text-base-900">
                          {ord.orderNumber}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDeposit
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {isDeposit ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{ord.type}</span>
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{ord.customerName}</div>
                          <div className="text-[10px] text-slate-500">{ord.customerMobile}</div>
                          {ord.customerScreenshot && (
                            <button
                              type="button"
                              onClick={() => setLightboxImage(ord.customerScreenshot)}
                              className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded mt-1 font-semibold transition"
                            >
                              <ImageIcon className="w-3 h-3 text-emerald-600" />
                              <span>Receipt Proof</span>
                            </button>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-base-900">
                          ₹{Number(ord.amount).toFixed(2)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {ord.qrCode ? (
                            <span className="font-mono text-[10px] text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {ord.qrCode.upiId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">--</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                          {isDeposit ? (
                            ord.customerUtr ? (
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold text-[10px]">
                                {ord.customerUtr}
                              </span>
                            ) : (
                              <span className="text-sky-600 italic text-[10px]">Pending UTR</span>
                            )
                          ) : ord.payoutProofUtr ? (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {ord.payoutProofUtr}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">--</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ord.status === "completed"
                                ? "badge-completed"
                                : ord.status === "submitted"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
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
                          {new Date(ord.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right">
                          {isDeposit ? (
                            // PAYIN Action
                            isProcessing ? (
                              <button
                                onClick={() => {
                                  setSelectedPayinOrder(ord);
                                  setVerifierUtr(ord.customerUtr || "");
                                  setVerifyError("");
                                }}
                                className="btn-primary py-1 px-3 text-xs font-bold shadow rounded-lg inline-flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify UTR</span>
                              </button>
                            ) : ord.status === "pending" ? (
                              <button
                                onClick={() => {
                                  setSelectedPayinOrder(ord);
                                  setVerifierUtr(ord.customerUtr || "");
                                  setVerifyError("");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-3 text-xs font-bold shadow rounded-lg inline-flex items-center space-x-1 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accept / Verify</span>
                              </button>
                            ) : ord.status === "completed" ? (
                              <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )
                          ) : (
                            // PAYOUT Action
                            isProcessing ? (
                              <div className="flex items-center space-x-1.5 justify-end">
                                <button
                                  onClick={() => setSelectedPayoutOrder(ord)}
                                  className="btn-primary py-1 px-2.5 text-xs font-bold shadow rounded-lg inline-flex items-center space-x-1 bg-sky-600 hover:bg-sky-700"
                                >
                                  <span>Submit Proof</span>
                                </button>
                                <button
                                  disabled={releasingId === ord.id}
                                  onClick={() => handleCancelAssignment(ord.id)}
                                  className="py-1 px-2 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition inline-flex items-center space-x-1"
                                  title="Cancel assignment and return to available pool"
                                >
                                  {releasingId === ord.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-red-600" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-600" />
                                  )}
                                  <span>Cancel</span>
                                </button>
                              </div>
                            ) : ord.status === "completed" ? (
                              <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PAYIN VERIFICATION MODAL */}
      {selectedPayinOrder && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-200">
            <div className="flex items-center justify-between pb-4 border-b border-base-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900">Verify Deposit Payment</h3>
                  <p className="text-[11px] text-base-700">
                    Order #{selectedPayinOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayinOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {verifyError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Amount:</span>
                  <span className="font-extrabold text-base text-base-900">
                    ₹{Number(selectedPayinOrder.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-gray-800">
                    {selectedPayinOrder.customerName} ({selectedPayinOrder.customerMobile})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Routing QR Code:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {selectedPayinOrder.qrCode?.upiId}
                  </span>
                </div>
              </div>

              {/* Customer Submitted UTR or Operator Manual Entry */}
              <div>
                <label className="block font-semibold text-base-900 mb-1">
                  Payment UTR / Reference Number:
                </label>
                {selectedPayinOrder.customerUtr ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-mono font-extrabold text-blue-900 text-sm">
                      {selectedPayinOrder.customerUtr}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPayinOrder.customerUtr);
                        setCopiedUtr(true);
                        setTimeout(() => setCopiedUtr(false), 2000);
                      }}
                      className="text-blue-700 hover:text-blue-900 flex items-center space-x-1 font-semibold text-[11px]"
                    >
                      {copiedUtr ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={verifierUtr}
                      onChange={(e) => setVerifierUtr(e.target.value.trim())}
                      placeholder="Enter 12-digit UTR from your bank alert"
                      className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg font-mono font-bold bg-white text-base-900"
                    />
                    <p className="text-[10px] text-slate-500">
                      Customer has not entered UTR yet. Enter the bank UTR to accept and settle this deposit immediately.
                    </p>
                  </div>
                )}
              </div>

              {/* Screenshot Preview */}
              {selectedPayinOrder.customerScreenshot && (
                <div>
                  <label className="block font-semibold text-base-900 mb-1">
                    Customer Payment Screenshot:
                  </label>
                  <div
                    onClick={() => setLightboxImage(selectedPayinOrder.customerScreenshot)}
                    className="relative cursor-pointer group rounded-xl overflow-hidden border border-gray-200 max-h-40 flex items-center justify-center bg-gray-50"
                  >
                    <img
                      src={selectedPayinOrder.customerScreenshot}
                      alt="Proof"
                      className="max-h-40 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-bold space-x-1">
                      <ZoomIn className="w-4 h-4" />
                      <span>Click to Zoom</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-base-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={verifying || !!verifySuccess}
                  onClick={() => setSelectedPayinOrder(null)}
                  className="px-4 py-2 border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifying || !!verifySuccess || (!selectedPayinOrder.customerUtr && !verifierUtr.trim())}
                  onClick={() => handleVerifyDeposit(selectedPayinOrder)}
                  className="btn-primary py-2 px-5 font-semibold flex items-center space-x-1.5 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Verifying & Settling...</span>
                    </>
                  ) : verifySuccess ? (
                    <span className="text-emerald-200 font-bold">✓ Settled Successfully</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Settle Deposit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* PAYOUT FULFILLMENT MODAL */}
      {selectedPayoutOrder && (
        <PayoutFulfillmentModal
          order={selectedPayoutOrder}
          isOpen={Boolean(selectedPayoutOrder)}
          onClose={() => setSelectedPayoutOrder(null)}
          onSuccess={() => {
            setSelectedPayoutOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* LIGHTBOX PREVIEW */}
      {lightboxImage && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={lightboxImage}
                alt="Payment Screenshot"
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </PortalLayout>
  );
}
