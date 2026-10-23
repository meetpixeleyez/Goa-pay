"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import BankTransferCard from "@/components/orders/BankTransferCard";
import PayoutFulfillmentModal from "@/components/orders/PayoutFulfillmentModal";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import {
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  CreditCard,
  Search,
  Copy,
  Check,
  Landmark,
  Eye,
  QrCode,
  X,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { parseBankDetails, formatBankDetailsDisplay } from "@/lib/validation";

export default function OperatorAvailableOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [assignedQRCodes, setAssignedQRCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [selectedPayoutOrder, setSelectedPayoutOrder] = useState<any>(null);
  const [inspectOrderId, setInspectOrderId] = useState<number | null>(null);
  const [selectedQrCodeId, setSelectedQrCodeId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/operator/available-orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setAssignedQRCodes(data.assignedQRCodes || []);
        if (data.assignedQRCodes && data.assignedQRCodes.length > 0 && !selectedQrCodeId) {
          setSelectedQrCodeId(data.assignedQRCodes[0].id);
        }
      }
    } catch (e: any) {
      setError("Failed to load available orders");
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket({ role: "OPERATOR" });

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (data: any) => {
      if (!data?.order) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.order.id);
        if (exists) return prev;
        return [data.order, ...prev];
      });
    };

    const handleOrderClaimed = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
    };

    const handleOrderReleased = (data: any) => {
      if (!data?.order) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.order.id);
        if (exists) return prev;
        return [data.order, ...prev];
      });
    };

    const handleOrderCancelled = (data: any) => {
      if (!data?.orderId) return;
      setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
    };

    socket.on("payout:available", handleNewOrder);
    socket.on("payout:claimed", handleOrderClaimed);
    socket.on("payout:released", handleOrderReleased);
    socket.on("payout:cancelled", handleOrderCancelled);

    return () => {
      socket.off("payout:available", handleNewOrder);
      socket.off("payout:claimed", handleOrderClaimed);
      socket.off("payout:released", handleOrderReleased);
      socket.off("payout:cancelled", handleOrderCancelled);
    };
  }, [socket]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAcceptOrder = async (orderId: number) => {
    if (assignedQRCodes.length === 0) {
      setError("You do not have any active assigned QR codes. Contact your QR Provider manager.");
      return;
    }

    setAcceptingId(orderId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/orders/${orderId}/payout/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeId: selectedQrCodeId || assignedQRCodes[0].id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept order");
      }

      setSuccess("Withdrawal order accepted! Complete payout within 5 minutes.");
      if (data.order) {
        setSelectedPayoutOrder(data.order);
      }
      fetchAvailableOrders();
    } catch (err: any) {
      setError(err.message || "Failed to accept order");
      fetchAvailableOrders();
    } finally {
      setAcceptingId(null);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const query = search.toLowerCase();
    const bank = parseBankDetails(ord.beneficiaryDetails);
    return (
      ord.orderNumber.toLowerCase().includes(query) ||
      (bank?.accountHolderName && bank.accountHolderName.toLowerCase().includes(query)) ||
      (bank?.accountNumber && bank.accountNumber.includes(query)) ||
      (ord.merchant?.name && ord.merchant.name.toLowerCase().includes(query)) ||
      (ord.beneficiaryDetails && ord.beneficiaryDetails.toLowerCase().includes(query))
    );
  });

  return (
    <PortalLayout
      portal="operator"
      title="Available Withdrawal Orders"
      subtitle="Broadcasted customer withdrawal requests awaiting fulfillment (First-Come, First-Served)"
      actions={
        <button
          onClick={fetchAvailableOrders}
          className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
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

        {/* Top Control Bar: Active QR Selection & Search */}
        <div className="card-theme p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer, bank..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {/* QR Selection for acceptance */}
          {assignedQRCodes.length > 0 && (
            <div className="flex items-center space-x-2 w-full md:w-auto text-xs">
              <span className="font-semibold text-base-700">Claim with QR:</span>
              <select
                value={selectedQrCodeId}
                onChange={(e) => setSelectedQrCodeId(e.target.value)}
                className="px-2.5 py-1.5 border border-base-200 rounded-lg bg-white font-mono font-bold text-base-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {assignedQRCodes.map((qr) => (
                  <option key={qr.id} value={qr.id}>
                    {qr.upiId} ({qr.bankName || "Bank"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Orders Grid / Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center card-theme">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <span>Checking available withdrawal requests...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2 card-theme">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm text-gray-800">All Payout Orders Claimed</p>
            <p>
              There are currently no broadcasted customer withdrawals in the pool. When an admin broadcasts new payouts, they will immediately appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((ord) => {
              const bankDetails = ord.beneficiaryDetails
                ? parseBankDetails(ord.beneficiaryDetails)
                : null;
              const isClaiming = acceptingId === ord.id;

              return (
                <div
                  key={ord.id}
                  className="card-theme p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition border-l-4 border-l-sky-500"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-base-900">
                        #{ord.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 uppercase">
                        Available in Pool
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="bg-sky-50/60 border border-sky-200/80 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-sky-900 font-semibold">Withdrawal Amount:</span>
                      <span className="text-xl font-extrabold text-base-900">
                        ₹{Number(ord.amount).toFixed(2)}
                      </span>
                    </div>

                    {/* Destination Account Holder & Merchant Info */}
                    <div className="text-xs space-y-1">
                      {bankDetails?.accountHolderName && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Beneficiary:</span>
                          <span className="font-bold text-gray-900">{bankDetails.accountHolderName}</span>
                        </div>
                      )}
                      {ord.merchant?.name && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Store / Merchant:</span>
                          <span className="font-semibold text-gray-800">{ord.merchant.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Customer Bank Card */}
                    {bankDetails && (
                      <div className="pt-2 border-t border-base-200">
                        <span className="text-[10px] font-bold text-base-700 uppercase tracking-wider block mb-1">
                          Destination Bank Account:
                        </span>
                        <div className="p-2.5 bg-white border border-base-200 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Bank:</span>
                            <span className="font-bold text-gray-900">
                              {bankDetails.bankName || "Bank"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Account #:</span>
                            <span className="font-mono font-bold text-blue-900">
                              {bankDetails.accountNumber}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">IFSC:</span>
                            <span className="font-mono font-bold text-gray-800">
                              {bankDetails.ifscCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accept Action */}
                  <div className="pt-3 border-t border-base-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectOrderId(ord.id)}
                      className="p-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-base-200 rounded-lg transition"
                      title="Inspect full details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isClaiming || assignedQRCodes.length === 0}
                      onClick={() => handleAcceptOrder(ord.id)}
                      className="flex-1 btn-primary py-2 px-4 text-xs font-bold shadow flex items-center justify-center space-x-1.5 bg-sky-600 hover:bg-sky-700"
                    >
                      {isClaiming ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept & Pay (5-Min Timer)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAYOUT FULFILLMENT MODAL */}
      {selectedPayoutOrder && (
        <PayoutFulfillmentModal
          order={selectedPayoutOrder}
          isOpen={Boolean(selectedPayoutOrder)}
          onClose={() => setSelectedPayoutOrder(null)}
          onSuccess={() => {
            setSelectedPayoutOrder(null);
            fetchAvailableOrders();
          }}
        />
      )}

      {/* INSPECT DETAILS MODAL */}
      {inspectOrderId && (
        <OrderDetailsModal
          orderId={inspectOrderId}
          isOpen={Boolean(inspectOrderId)}
          onClose={() => setInspectOrderId(null)}
          portal="qr-provider"
        />
      )}
    </PortalLayout>
  );
}
