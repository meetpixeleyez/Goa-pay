"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { Wallet, RefreshCw } from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";
import { agentsApi } from "@/lib/api/agents.api";

export default function AgentWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await agentsApi.getAgentWallet();
      if (res.success) setWallet(res);
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
      portal="agent"
      title="Commission Passbook & Ledger"
      subtitle="Track your commissions earned from related QR provider deposits and brokered merchants"
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
            Accumulated Commission Balance
          </span>
          <span className="text-3xl font-extrabold text-base-900 mt-1 block">
            ₹{wallet?.balance?.toFixed(2) || "0.00"}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Accrued automatically from linked QR provider operations
          </span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/15 text-[#0c4a6e] flex items-center justify-center">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
      </div>

      <BankStatementTable
        entries={wallet?.entries || []}
        title="Agent Commission Statement"
        subtitle="Chronological audit records of credited earnings and running commission balances"
        walletBalance={wallet?.balance}
        defaultSort="desc"
      />
    </PortalLayout>
  );
}
