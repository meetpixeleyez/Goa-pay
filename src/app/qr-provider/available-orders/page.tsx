"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalLayout from "@/components/layout/PortalLayout";
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
  ShieldCheck,
  TrendingUp,
  Search,
  Copy,
  Check,
  Wifi,
  Landmark,
  Eye,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { parseBankDetails, formatBankDetailsDisplay } from "@/lib/validation";

export default function QRAvailableOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [selectedPayoutOrder, setSelectedPayoutOrder] = useState<any>(null);
  const [inspectOrderId, setInspectOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/qr-provider/orders?available=true");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e: any) {
      setError("Failed to load available orders");
    } finally {
      setLoading(false);
    }
  };

  const { socket, isConnected } = useSocket({ role: "QR_PROVIDER" });

  // Initial load once on component mount
  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  // Real-Time Socket.IO Order Event Tracking (Eliminates repeated polling & API hammering)
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (data: any) => {
      if (!data?.order) return;
      setOrders((prev) => {
        // Prevent duplicate if already present
        const exists = prev.some((o) => o.id === data.order.id);
        if (exists) return prev;
        return [data.order, ...prev];
      });
    };

    const handleOrderClaimed = (data: any) => {
      if (!data?.orderId) return;
      // Instantly remove order when claimed by any QR provider
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
    setAcceptingId(orderId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/orders/${orderId}/payout/accept`, {
        method: "POST",
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
    return (
      ord.orderNumber.toLowerCase().includes(query) ||
      ord.customerName.toLowerCase().includes(query) ||
      ord.customerMobile.includes(query) ||
      (ord.merchant?.name && ord.merchant.name.toLowerCase().includes(query)) ||
      (ord.beneficiaryDetails && ord.beneficiaryDetails.toLowerCase().includes(query))
    );
  });

  return (
    <PortalLayout
      portal="qr-provider"
      title="Available Withdrawal Orders"
      subtitle="Broadcasted customer withdrawal requests awaiting QR Provider payout fulfillment (First-Come, First-Served)"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAvailableOrders}
            className="btn-secondary text-xs py-2 px-3 flex items-center space-x-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Search Header */}
      <div className="card-theme p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, merchant, bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-theme text-xs pl-9 w-full"
          />
        </div>
        <div className="text-xs text-base-700 flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Orders must be completed within <b>5 minutes</b> of acceptance</span>
        </div>
      </div>

      {/* Orders Table Format */}
      <div className="card-theme overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[400px]">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Order Number</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Merchant</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Customer</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Payout Amount</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Est. Fee Earning</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs">Beneficiary Account Details</th>
                <th className="p-3 sticky top-0 z-10 bg-base-100 text-base-900 font-bold border-b border-base-200 whitespace-nowrap shadow-2xs text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Scanning for available broadcasted withdrawal requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-200">
                        <ArrowUpRight className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-base-900">No Available Payout Orders</h4>
                      <p className="text-xs text-base-700">
                        {orders.length === 0
                          ? "There are currently no broadcasted customer withdrawal requests awaiting assignment in the pool."
                          : "No orders matched your search query."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                    {/* Order Number */}
                    <td className="p-3 whitespace-nowrap align-top">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectOrderId(ord.id)}
                          className="font-mono font-bold text-base-900 hover:text-primary hover:underline flex items-center space-x-1 transition text-left"
                          title="Click to inspect order details"
                        >
                          <span>#{ord.orderNumber}</span>
                          <Eye className="w-3 h-3 text-gray-400 hover:text-primary" />
                        </button>
                      </div>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 mt-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>Withdrawal</span>
                      </span>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Merchant */}
                    <td className="p-3 whitespace-nowrap align-top">
                      <div className="font-semibold text-base-900">
                        {ord.merchant?.name || "--"}
                      </div>
                      {ord.merchant?.phone && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {ord.merchant.phone}
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="p-3 whitespace-nowrap align-top">
                      <div className="font-semibold text-base-900">
                        {ord.customerName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ord.customerMobile}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-3 whitespace-nowrap align-top">
                      <div className="text-base font-black text-base-900">
                        ₹{ord.amount.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">Disbursement</span>
                    </td>

                    {/* Estimated Earning */}
                    <td className="p-3 whitespace-nowrap align-top">
                      {ord.qrProviderFee > 0 ? (
                        <div className="text-emerald-700 font-bold flex items-center space-x-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+₹{ord.qrProviderFee.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium">Standard rate</span>
                      )}
                      <span className="text-[10px] text-gray-400 block mt-0.5">Credited on verify</span>
                    </td>

                    {/* Beneficiary Details: Bank Name & Account Number ONLY */}
                    <td className="p-3 align-top max-w-[200px]">
                      {(() => {
                        const bank = parseBankDetails(ord.beneficiaryDetails);
                        if (!bank || (!bank.bankName && !bank.accountNumber)) {
                          return <span className="text-gray-400 italic text-[11px]">No bank details</span>;
                        }
                        const bankName = bank.bankName || "Bank Transfer";
                        const accNumber = bank.accountNumber;

                        return (
                          <div className="space-y-1">
                            {/* Bank Name (with icon and truncation) */}
                            <div className="flex items-center space-x-1.5 text-xs text-base-900" title={bankName}>
                              <Landmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="font-bold truncate max-w-[150px]">
                                {bankName}
                              </span>
                            </div>

                            {/* Account Number (compact with copy) */}
                            {accNumber ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] text-slate-500 font-semibold shrink-0">A/C:</span>
                                <code
                                  className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded font-mono font-bold text-base-900 text-[11px] truncate max-w-[120px]"
                                  title={accNumber}
                                >
                                  {accNumber}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(accNumber, `acc-${ord.id}`)}
                                  className="p-1 text-gray-400 hover:text-emerald-800 rounded hover:bg-gray-100 transition shrink-0"
                                  title="Copy Account Number"
                                >
                                  {copiedId === `acc-${ord.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Action */}
                    <td className="p-3 whitespace-nowrap align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleAcceptOrder(ord.id)}
                        disabled={acceptingId === ord.id}
                        className="btn-primary py-2 px-3 text-xs font-bold inline-flex items-center space-x-1.5 shadow rounded-lg transition"
                      >
                        {acceptingId === ord.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Claiming...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                          </>
                        )}
                      </button>
                      <div className="text-[9px] text-gray-400 mt-1">
                        5 min countdown
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Fulfillment Popup Screen with Customer QR & Proof Upload */}
      {selectedPayoutOrder && (
        <PayoutFulfillmentModal
          order={selectedPayoutOrder}
          isOpen={Boolean(selectedPayoutOrder)}
          onClose={() => {
            setSelectedPayoutOrder(null);
            fetchAvailableOrders();
          }}
          onSuccess={() => {
            fetchAvailableOrders();
          }}
        />
      )}

      {/* Full Order Details / Inspect View Modal */}
      {inspectOrderId && (
        <OrderDetailsModal
          orderId={inspectOrderId}
          isOpen={Boolean(inspectOrderId)}
          onClose={() => setInspectOrderId(null)}
          onOrderUpdated={fetchAvailableOrders}
          portal="qr-provider"
        />
      )}
    </PortalLayout>
  );
}
