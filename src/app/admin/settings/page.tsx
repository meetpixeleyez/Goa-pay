"use client";

import PortalLayout from "@/components/layout/PortalLayout";
import { Settings, ShieldCheck, Palette, FileText, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <PortalLayout
      portal="admin"
      title="Platform Settings & Rules"
      subtitle="Operating parameters, fee formulas, and system configuration"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fee Rules Card */}
        <div className="card-theme p-6 space-y-4">
          <div className="flex items-center space-x-2 text-primary">
            <Settings className="w-5 h-5" />
            <h2 className="font-bold text-[16px] text-base-900">Settlement Fee Architecture (Option A)</h2>
          </div>
          <div className="text-xs text-base-700 space-y-2 bg-[#ffffff] p-4 rounded-lg border border-base-200">
            <p>
              <b>Merchant Wallet Net:</b> <code>Amount - Total Fees</code>
            </p>
            <p>
              <b>Platform Fee:</b> <code>max(0, Merchant Fee - (Agent Fee + QR Fee + Broker Fee))</code>
            </p>
            <p>
              <b>Total Deductions:</b> <code>Merchant Fee + Agent Fee + QR Fee + Broker Fee + Platform Fee</code>
            </p>
            <p>
              <b>Example (Amount = ₹1000):</b>
              <br />Merchant Fee (5%) = ₹50, Agent (1%) = ₹10, QR Provider (3%) = ₹30, Broker (1%) = ₹10
              <br />Platform Fee = max(0, 50 - (10 + 30 + 10)) = ₹0
              <br />Total Fees = ₹100 &rarr; Merchant receives ₹900 net.
            </p>
          </div>
        </div>

        {/* Brand & Theme Rules */}
        <div className="card-theme p-6 space-y-4">
          <div className="flex items-center space-x-2 text-primary">
            <Palette className="w-5 h-5" />
            <h2 className="font-bold text-[16px] text-base-900">Color Theme Palette</h2>
          </div>
          <div className="text-xs text-base-700 space-y-3">
            <p>
              The application uses centralized CSS variables and Tailwind tokens for global theming:
            </p>
            <div className="flex items-center space-x-3 p-3 bg-white border border-base-200 rounded-lg">
              <div className="w-8 h-8 rounded bg-base-100 border border-base-200 shrink-0"></div>
              <div>
                <span className="font-bold text-base-900 block">Base Background Palette</span>
                <span className="font-mono text-[11px] text-slate-500">#f0f7fc (var(--base-default))</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white border border-base-200 rounded-lg">
              <div className="w-8 h-8 rounded bg-primary shrink-0"></div>
              <div>
                <span className="font-bold text-base-900 block">Primary Accent Palette</span>
                <span className="font-mono text-[11px] text-slate-500">var(--primary-default)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Lifecycle Rules */}
        <div className="card-theme p-6 space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-bold text-[16px] text-base-900">Mandatory Gateway Safeguards</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-base-700">
            <div className="p-3 bg-[#ffffff] rounded border border-base-200">
              <span className="font-bold text-base-900 block mb-1">Dual-UTR Matching</span>
              Order transitions to Completed only when Customer UTR matches Provider/Admin UTR. Any mismatch throws error: <i>"not valid UTR ID"</i>.
            </div>
            <div className="p-3 bg-[#ffffff] rounded border border-base-200">
              <span className="font-bold text-base-900 block mb-1">5-Minute TTL Protection</span>
              Customer sessions expire after 300 seconds. Locked exposure returns to Available Balance automatically.
            </div>
            <div className="p-3 bg-[#ffffff] rounded border border-base-200">
              <span className="font-bold text-base-900 block mb-1">Zero Over-Allocation</span>
              Orders can only be assigned to a QR provider if <code>order_amount &le; available_balance</code>.
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
