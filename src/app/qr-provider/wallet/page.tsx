"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { Wallet, RefreshCw } from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";

export default function QRProviderWalletPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/qr-provider/stats");
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <PortalLayout
      portal="qr-provider"
      title="QR Provider Passbook & Fee Statement"
      subtitle="Track your fee credits, order deductions, and running ledger transactions"
      actions={
        <button
          onClick={fetchStats}
          className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Statement</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card-theme p-5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Holding Balance
          </span>
          <span className="text-2xl font-extrabold text-base-900 mt-1 block">
            ₹{stats?.balance?.toFixed(2) || "0.00"}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">Total liquidity balance</span>
        </div>

        <div className="card-theme p-5 border-sky-200 bg-sky-50/20">
          <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider block">
            Active Exposure
          </span>
          <span className="text-2xl font-extrabold text-sky-700 mt-1 block">
            ₹{stats?.exposure?.toFixed(2) || "0.00"}
          </span>
          <span className="text-[11px] text-sky-700 mt-1 block">Locked during ongoing checkouts</span>
        </div>

        <div className="card-theme p-5 border-green-200 bg-green-50/20">
          <span className="text-xs font-semibold text-green-800 uppercase tracking-wider block">
            Available Balance
          </span>
          <span className="text-2xl font-extrabold text-green-700 mt-1 block">
            ₹{stats?.availableBalance?.toFixed(2) || "0.00"}
          </span>
          <span className="text-[11px] text-green-700 mt-1 block">Eligible to receive new orders</span>
        </div>
      </div>

      <BankStatementTable
        entries={stats?.entries || []}
        title="QR Provider Account Statement"
        subtitle="Passbook format with Debit (-DR for fulfilled orders) and Credit (+CR for fees earned)"
        walletBalance={stats?.walletBalance}
        defaultSort="desc"
      />
    </PortalLayout>
  );
}
