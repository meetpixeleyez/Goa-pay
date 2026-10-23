"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  Wallet,
  ShoppingBag,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import { parseBankDetails } from "@/lib/validation";

export default function MerchantDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(null);

  const fetchMerchantData = async () => {
    try {
      const [walletRes, ordersRes] = await Promise.all([
        fetch("/api/merchant/wallet"),
        fetch("/api/merchant/orders"),
      ]);

      const walletData = await walletRes.json();
      const ordersData = await ordersRes.json();

      if (walletData.success) setWallet(walletData);
      if (ordersData.success) setOrders(ordersData.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantData();
  }, []);

  const completed = orders.filter((o) => o.status === "completed");
  const processing = orders.filter((o) => o.status === "processing");
  const pending = orders.filter((o) => o.status === "pending");
  const totalSettled = completed.reduce((sum, o) => sum + o.amount, 0);

  return (
    <PortalLayout
      portal="merchant"
      title="Merchant Dashboard"
      subtitle="Monitor your customer deposits, wallet settlements, and order activity"
      actions={
        <Link
          href="/merchant/create-order"
          className="btn-primary text-xs py-2 px-3.5 flex items-center space-x-1.5 shadow"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Create Order</span>
        </Link>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-theme p-5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Wallet Balance
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              ₹{wallet?.balance?.toFixed(2) || "0.00"}
            </span>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Net settled funds after all fee deductions
          </span>
        </div>

        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Settled Volume
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              ₹{totalSettled.toFixed(2)}
            </span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {completed.length} completed customer orders
          </span>
        </div>

        <div className="card-theme p-5 border-sky-200 bg-sky-50/20">
          <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider block">
            Processing
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-sky-700">
              {processing.length}
            </span>
            <Clock className="w-5 h-5 text-sky-600" />
          </div>
          <span className="text-[11px] text-sky-700 mt-1 block">
            UTR submitted, awaiting provider match
          </span>
        </div>

        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Orders
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              {orders.length}
            </span>
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Pending, processing & settled
          </span>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card-theme overflow-hidden shadow-sm">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-base-900">Your Recent Orders</h2>
            <p className="text-xs text-base-700">Customer transactions initiated for your store</p>
          </div>
          <Link
            href="/merchant/orders"
            className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Type</th>
                <th className="p-3">Beneficiary / Source</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Customer UTR</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">In-Dashboard View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {orders.slice(0, 5).map((ord) => {
                const isDeposit = (ord.type || "PAYIN") === "PAYIN";
                const bank = !isDeposit ? parseBankDetails(ord.beneficiaryDetails) : null;
                return (
                  <tr key={ord.id} className="hover:bg-[#ffffff] transition">
                    <td className="p-3 font-mono font-bold text-base-900">
                      {ord.orderNumber}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDeposit
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-sky-100 text-sky-800 border border-sky-200"
                        }`}
                      >
                        {isDeposit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{isDeposit ? "Deposit" : "Withdrawal"}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      {isDeposit ? (
                        <>
                          <div className="font-semibold text-base-900">Direct Deposit</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ord.clientOrderId || "Web Checkout"}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-base-900">{bank?.accountHolderName || "Beneficiary"}</div>
                          <div className="text-[10px] text-slate-500">{bank?.bankName ? `${bank.bankName} • ${bank.accountNumber?.slice(-4)}` : "Bank Account"}</div>
                        </>
                      )}
                    </td>
                    <td className="p-3 font-bold text-base-900">
                      ₹{ord.amount.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {ord.customerUtr || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.status === "completed"
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
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(ord.id)}
                        className="btn-secondary py-1 px-2 text-xs font-semibold inline-flex items-center space-x-1 shadow-xs hover:border-primary"
                        title="View complete session inside dashboard"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-Dashboard Order Details & Checkout Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={fetchMerchantData}
        portal="merchant"
      />
    </PortalLayout>
  );
}
