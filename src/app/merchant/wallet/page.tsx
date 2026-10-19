"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { Wallet, RefreshCw } from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";

export default function MerchantWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/merchant/wallet");
      const data = await res.json();
      if (data.success) setWallet(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <PortalLayout
      portal="merchant"
      title="Merchant Passbook & Ledger"
      subtitle="View your current net balance and complete chronological statement of order deposits and fee deductions"
      actions={
        <button
          onClick={fetchWallet}
          className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Statement</span>
        </button>
      }
    >
      <div className="card-theme p-6 mb-6 border-l-4 border-l-primary flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Current Net Settled Balance
          </span>
          <span className="text-3xl font-extrabold text-base-900 mt-1 block">
            ₹{wallet?.balance?.toFixed(2) || "0.00"}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Calculated after deducting merchant fee & distributed gateway fees
          </span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
      </div>

      <BankStatementTable
        entries={wallet?.entries || []}
        title="Merchant Account Statement"
        subtitle="Passbook format with separate Debit (-DR), Credit (+CR), and chronological running balance"
        walletBalance={wallet?.balance}
        defaultSort="desc"
      />
    </PortalLayout>
  );
}
