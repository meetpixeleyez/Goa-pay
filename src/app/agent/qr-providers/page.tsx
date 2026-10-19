"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import { QrCode, RefreshCw } from "lucide-react";
import { agentsApi } from "@/lib/api/agents.api";

export default function AgentQRProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await agentsApi.getAgentProviders();
      if (res.success) setProviders(res.providers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <PortalLayout
      portal="agent"
      title="Assigned QR Providers"
      subtitle="Liquidity accounts connected to your agency earning commissions on processed orders"
      actions={
        <button
          onClick={fetchProviders}
          className="btn-primary text-xs py-2 px-3 flex items-center space-x-1.5 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="card-theme overflow-hidden shadow-sm">
        {/* Desktop Table View (Visible on md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-base-100/60 text-base-900 font-semibold border-b border-base-200">
              <tr>
                <th className="p-3 w-60 max-w-[240px] whitespace-nowrap">Provider Name & Email</th>
                <th className="p-3 whitespace-nowrap">Telegram ID</th>
                <th className="p-3 text-right whitespace-nowrap">Holding Balance</th>
                <th className="p-3 text-right whitespace-nowrap">Reserved Exposure</th>
                <th className="p-3 text-right whitespace-nowrap">Available Balance</th>
                <th className="p-3 text-center whitespace-nowrap">Fee Rate</th>
                <th className="p-3 text-center whitespace-nowrap">Active QR Codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0f2fe]">
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No QR providers assigned under your agency.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#ffffff] transition">
                    <td className="p-3 w-60 max-w-[240px]">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                          {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-base-900 truncate" title={p.name}>{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate" title={p.email}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {p.telegramId ? (
                        <span className="inline-flex items-center space-x-1 text-[#1565c0]">
                          <span>{p.telegramId}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-base-900 font-mono">
                      ₹{p.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-sky-700 font-mono">
                      ₹{p.exposure.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-green-700 font-mono">
                      ₹{p.availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-bold text-primary font-mono">
                      {p.qrProviderFee}%
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-[10px]">
                        {p.qrCodes?.length || 0} active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (Visible on small screens) */}
        <div className="block md:hidden divide-y divide-[#e0f2fe]">
          {providers.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No QR providers assigned under your agency.
            </div>
          ) : (
            providers.map((p) => (
              <div key={p.id} className="p-3.5 space-y-2.5 hover:bg-[#ffffff] transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-base-900 font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
                      {p.name ? p.name.charAt(0).toUpperCase() : "Q"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-base-900 truncate" title={p.name}>
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate" title={p.email}>
                        {p.email}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-[10px] shrink-0">
                    {p.qrCodes?.length || 0} QRs
                  </span>
                </div>

                {/* Financial Balance Summary */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#ffffff] rounded-lg border border-[#e0f2fe] text-[11px] font-mono">
                  <div className="min-w-0">
                    <span className="text-[9px] text-base-700 block uppercase font-sans">Available</span>
                    <span className="font-extrabold text-green-700 truncate block" title={`₹${p.availableBalance.toFixed(2)}`}>
                      ₹{p.availableBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-base-700 block uppercase font-sans">Exposure</span>
                    <span className="font-bold text-sky-700 truncate block" title={`₹${p.exposure.toFixed(2)}`}>
                      ₹{p.exposure.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-base-700 block uppercase font-sans">Holding</span>
                    <span className="font-bold text-base-900 truncate block" title={`₹${p.balance.toFixed(2)}`}>
                      ₹{p.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="text-[11px] text-slate-500 font-mono">
                    {p.telegramId ? (
                      <span className="text-[#1565c0] font-medium">{p.telegramId}</span>
                    ) : (
                      <span className="text-gray-400 italic">No Telegram</span>
                    )}
                  </div>
                  <span className="font-bold text-primary font-mono text-xs">
                    Fee: {p.qrProviderFee}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
