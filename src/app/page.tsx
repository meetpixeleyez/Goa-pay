"use client";

import Link from "next/link";
import { ArrowRight, QrCode, ShieldCheck, Wallet, RefreshCw, Clock, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-10 py-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#f0f7fc] via-[#f8fafc] to-[#f0f7fc] rounded-2xl p-8 sm:p-12 border border-base-200 shadow-sm text-center relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 bg-primary/15 text-[#0c4a6e] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-4 h-4" />
          <span>Dual-UTR Verified UPI Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-base-900 tracking-tight">
          Next-Generation Simple Payment Gateway
        </h1>
        <p className="mt-4 text-base sm:text-lg text-base-700 max-w-2xl mx-auto">
          High-availability payment routing connecting Merchants, QR Providers, Agents, and Customers. Automated exposure reservation with strict dual-key UTR reconciliation.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-600 text-white font-medium px-7 py-3.5 rounded-lg shadow-md transition"
          >
            <span>Access Portal Login</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Role Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Merchant Card */}
        <div className="card-theme p-6 hover:shadow-lg transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-lg bg-primary/20 text-[#0c4a6e] flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-base-900">Merchant Portal</h3>
            <p className="mt-2 text-sm text-base-700">
              Track your deposit orders, monitor wallet balance, view live credit/debit transaction ledger with transparent fee deductions.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/merchant"
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-600"
            >
              <span>Access Merchant Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* QR Provider Card */}
        <div className="card-theme p-6 hover:shadow-lg transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-lg bg-primary/20 text-[#0c4a6e] flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-base-900">QR Provider Portal</h3>
            <p className="mt-2 text-sm text-base-700">
              Real-time exposure management, available balance monitoring, and instant UTR payment receipt matching & verification.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/qr-provider"
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-600"
            >
              <span>Access QR Provider Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Admin Card */}
        <div className="card-theme p-6 hover:shadow-lg transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-lg bg-primary/20 text-[#0c4a6e] flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-base-900">Admin Dashboard</h3>
            <p className="mt-2 text-sm text-base-700">
              Full control: Provision Merchants, Agents & QR Providers, set initial balances, reset passwords, and audit the global multi-party ledger.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-600"
            >
              <span>Access Admin Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Core Mechanism Pillars */}
      <div className="bg-white rounded-xl border border-base-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-base-900 mb-6 text-center">
          Gateway Operating Principles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded bg-base-100 text-primary shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-base-900">Dynamic QR Allocation</h4>
              <p className="text-xs text-base-700 mt-1">
                Assigns active QR providers where <code>order_amount &le; available_balance</code>, locking exposure atomically.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 rounded bg-base-100 text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-base-900">5-Minute TTL Protection</h4>
              <p className="text-xs text-base-700 mt-1">
                Sessions timeout automatically after 5 minutes if unpaid. Reserved exposure is immediately unlocked back to the provider.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2 rounded bg-base-100 text-primary shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-base-900">Strict Dual UTR Match</h4>
              <p className="text-xs text-base-700 mt-1">
                Orders settle only when Customer UTR matches Provider/Admin UTR. Any mismatch rejects with <i>"not valid UTR ID"</i>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
