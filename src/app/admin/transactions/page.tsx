"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { RefreshCw } from "lucide-react";
import BankStatementTable from "@/components/wallet/BankStatementTable";

export default function AdminTransactionsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/admin/ledger");
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  return (
    <PortalLayout
      portal="admin"
      title="Platform Multi-Party Statement & Ledger"
      subtitle="Complete double-entry accounting records across Merchants, QR Providers, Agents, and Platform"
      actions={
        <button
          onClick={fetchLedger}
          className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Statement</span>
        </button>
      }
    >
      <BankStatementTable
        entries={entries}
        title="Global Platform Audit Statement"
        subtitle="Consolidated bank-grade statement showing all Debits (-DR) and Credits (+CR) with running balances"
        showOwner={true}
        defaultSort="desc"
      />
    </PortalLayout>
  );
}
