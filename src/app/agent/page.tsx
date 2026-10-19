"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import { Users, QrCode, Wallet, ArrowRight, RefreshCw, TrendingUp } from "lucide-react";

export default function AgentDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [walletRes, provRes] = await Promise.all([
        fetch("/api/agent/wallet"),
        fetch("/api/agent/qr-providers"),
      ]);

      const walletData = await walletRes.json();
      const provData = await provRes.json();

      if (walletData.success) setWallet(walletData);
      if (provData.success) setProviders(provData.providers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalProviderLiquidity = providers.reduce((sum, p) => sum + p.balance, 0);

  return (
    <PortalLayout
      portal="agent"
      title="Agent & Broker Dashboard"
      subtitle="Monitor your commission earnings, related QR providers, and brokered store activities"
      actions={
        <button
          onClick={fetchData}
          className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-theme p-5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Commission Wallet
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              ₹{wallet?.balance?.toFixed(2) || "0.00"}
            </span>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Accumulated deposit commission earnings
          </span>
        </div>

        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Commission Rate
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-primary">
              {wallet?.commissionPercent || 1.0}%
            </span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Credited on completed transactions
          </span>
        </div>

        <div className="card-theme p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Assigned QR Providers
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-base-900">
              {providers.length}
            </span>
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Total Liquidity: ₹{totalProviderLiquidity.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Related Providers Table */}
      <div className="card-theme overflow-hidden shadow-sm">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-base-900">Related QR Providers</h2>
            <p className="text-xs text-base-700">Liquidity accounts assigned under your agency</p>
          </div>
          <Link
            href="/agent/qr-providers"
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
                <th className="p-3">Provider Name & Email</th>
                <th className="p-3">Telegram ID</th>
                <th className="p-3">Holding Balance</th>
                <th className="p-3">Available Balance</th>
                <th className="p-3">Fee %</th>
                <th className="p-3">Active QRs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No QR providers assigned under your agency yet.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#ffffff] transition">
                    <td className="p-3">
                      <div className="font-bold text-base-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.email}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {p.telegramId || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="p-3 font-bold text-base-900">
                      ₹{p.balance.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-green-700">
                      ₹{p.availableBalance.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-primary">
                      {p.qrProviderFee}%
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-[10px]">
                        {p.qrCodes?.length || 0} QRs
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
