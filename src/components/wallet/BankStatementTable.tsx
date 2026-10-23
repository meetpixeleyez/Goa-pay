"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  Search,
  FileSpreadsheet,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

export interface LedgerItem {
  id: string | number;
  userId?: number;
  walletId?: string | number;
  orderId?: number | string | null;
  type: "CR" | "DR" | "DEPOSIT" | "WITHDRAWAL" | string;
  category?: string | null;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string | Date;
  order?: {
    id?: number | string;
    orderNumber?: string;
    amount?: number;
    status?: string;
  } | null;
  user?: {
    id?: number | string;
    name?: string;
    role?: string;
  } | null;
  wallet?: {
    user?: {
      id?: string | number;
      name?: string;
      email?: string;
      role?: string;
    };
  } | null;
}

interface BankStatementTableProps {
  entries: LedgerItem[];
  title?: string;
  subtitle?: string;
  showOwner?: boolean;
  defaultSort?: "asc" | "desc";
  walletBalance?: number;
}

export default function BankStatementTable({
  entries,
  title = "Bank Passbook Statement",
  subtitle = "Chronological record of deposits, withdrawals, and real-time running balances",
  showOwner = false,
  defaultSort = "desc",
  walletBalance,
}: BankStatementTableProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSort);
  const [filterType, setFilterType] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(String(id));
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Sort and filter entries
  const processedEntries = useMemo(() => {
    let list = [...entries];

    // Filter by Deposit/Withdrawal (or CR/DR)
    if (filterType === "DEPOSIT") {
      list = list.filter((e) => e.type === "DEPOSIT" || e.type === "CR");
    } else if (filterType === "WITHDRAWAL") {
      list = list.filter((e) => e.type === "WITHDRAWAL" || e.type === "DR");
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.order?.orderNumber?.toLowerCase().includes(q) ||
          (showOwner && ((e.user?.name || e.wallet?.user?.name)?.toLowerCase().includes(q)))
      );
    }

    // Sort chronologically (asc = passbook flow, desc = newest first)
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [entries, sortOrder, filterType, searchTerm, showOwner]);

  // Compute totals
  const stats = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    entries.forEach((e) => {
      if (e.type === "DEPOSIT") totalCredit += e.amount;
      if (e.type === "WITHDRAWAL") totalDebit += e.amount;
    });
    return {
      totalCredit,
      totalDebit,
      netCashflow: totalCredit - totalDebit,
      count: entries.length,
    };
  }, [entries]);

  return (
    <div className="bg-white rounded-xl border border-base-200 overflow-hidden shadow-sm">
      {/* Header section */}
      <div className="p-4 sm:p-5 border-b border-base-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-base-900">{title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-base-100 text-slate-700 font-semibold border border-base-200">
                {stats.count} Transactions
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Deposits</div>
              <div className="text-xs font-bold text-green-600 font-mono">
                +₹{stats.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-6 w-px bg-base-200" />
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Withdrawals</div>
              <div className="text-xs font-bold text-red-600 font-mono">
                -₹{stats.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {walletBalance !== undefined && (
              <>
                <div className="h-6 w-px bg-base-200" />
                <div className="text-right pl-1">
                  <div className="text-[10px] text-primary uppercase font-bold">Current Balance</div>
                  <div className="text-xs font-extrabold text-base-900 font-mono">
                    ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-base-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort toggle */}
            <div className="inline-flex rounded-lg border border-base-200 p-0.5 bg-[#ffffff]">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 ${sortOrder === "desc"
                  ? "bg-white text-base-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
                title="Newest transactions at top"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Newest First</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 ${sortOrder === "asc"
                  ? "bg-white text-base-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
                title="Passbook style: oldest at top, running balance updates downward"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Passbook Order (Oldest First)</span>
              </button>
            </div>

            {/* Type filter */}
            <div className="inline-flex rounded-lg border border-base-200 p-0.5 bg-[#ffffff]">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2 py-1 rounded text-xs font-semibold ${filterType === "ALL" ? "bg-white text-base-900 shadow-xs" : "text-slate-500"
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DEPOSIT")}
                className={`px-2 py-1 rounded text-xs font-semibold ${filterType === "DEPOSIT" ? "bg-green-100 text-green-800" : "text-slate-500"
                  }`}
              >
                Deposits (+CR)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("WITHDRAWAL")}
                className={`px-2 py-1 rounded text-xs font-semibold ${filterType === "WITHDRAWAL" ? "bg-red-100 text-red-800" : "text-slate-500"
                  }`}
              >
                Withdrawals (-DR)
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Bank Statement Passbook Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-base-100/70 text-base-900 font-bold border-b border-base-200">
              <th className="p-3 w-12 text-center text-slate-500">#</th>
              <th className="p-3 whitespace-nowrap min-w-[130px]">Date & Time</th>
              <th className="p-3 min-w-[240px]">Transaction Details</th>
              <th className="p-3 whitespace-nowrap min-w-[140px]">Ref / Order #</th>
              {showOwner && <th className="p-3 whitespace-nowrap min-w-[130px]">Account Owner</th>}
              <th className="p-3 text-right bg-red-50/50 text-red-900 border-l border-r border-base-200/60 min-w-[120px]">
                Withdrawal (-DR)
              </th>
              <th className="p-3 text-right bg-green-50/50 text-green-900 border-r border-base-200/60 min-w-[120px]">
                Deposit (+CR)
              </th>
              <th className="p-3 text-right whitespace-nowrap min-w-[130px] font-extrabold">
                Closing Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0f2fe] bg-white">
            {processedEntries.length === 0 ? (
              <tr>
                <td colSpan={showOwner ? 8 : 7} className="p-8 text-center text-slate-500">
                  <div className="max-w-xs mx-auto text-center space-y-1">
                    <p className="font-semibold text-gray-700">No statement transactions found</p>
                    <p className="text-[11px] text-gray-400">
                      {searchTerm
                        ? "Try adjusting your search criteria or clear the filter."
                        : "Completed order deposits and fee deductions will appear here in chronological sequence."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              processedEntries.map((entry, idx) => {
                const isCredit = entry.type === "DEPOSIT";
                const isDebit = entry.type === "WITHDRAWAL";

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-[#ffffff] transition-colors border-b border-[#e0f2fe]"
                  >
                    {/* Index */}
                    <td className="p-3 text-center text-[11px] text-gray-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium text-base-900">
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${isCredit ? "bg-green-500" : "bg-red-500"
                            }`}
                        />
                        <span className="font-semibold text-base-900 text-xs">
                          {entry.description}
                        </span>
                      </div>
                      {entry.category && (
                        <span className="text-[10px] text-gray-400 font-mono uppercase ml-3.5 block">
                          {entry.category.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>

                    {/* Order Reference */}
                    <td className="p-3 whitespace-nowrap">
                      {entry.order?.orderNumber ? (
                        <div className="flex items-center space-x-1 font-mono text-xs text-base-900">
                          <span className="font-bold">{entry.order.orderNumber}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(entry.order!.orderNumber!, entry.id)
                            }
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"
                            title="Copy Order #"
                          >
                            {copiedId === String(entry.id) ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Optional Account Owner */}
                    {showOwner && (
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-base-900">
                          {entry.user?.name || entry.wallet?.user?.name || "System"}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 uppercase text-gray-600 font-mono">
                          {entry.user?.role || entry.wallet?.user?.role || "USER"}
                        </span>
                      </td>
                    )}

                    {/* DEBIT Column (Withdrawal / Fee) */}
                    <td className="p-3 text-right font-mono bg-red-50/20 border-l border-r border-base-200/40 whitespace-nowrap">
                      {isDebit ? (
                        <span className="font-bold text-red-600 text-xs sm:text-sm">
                          -₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-light text-center block">—</span>
                      )}
                    </td>

                    {/* CREDIT Column (Deposit / Earning) */}
                    <td className="p-3 text-right font-mono bg-green-50/20 border-r border-base-200/40 whitespace-nowrap">
                      {isCredit ? (
                        <span className="font-bold text-green-600 text-xs sm:text-sm">
                          +₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-light text-center block">—</span>
                      )}
                    </td>

                    {/* CLOSING BALANCE Column */}
                    <td className="p-3 text-right font-mono font-extrabold text-base-900 text-xs sm:text-sm whitespace-nowrap bg-white">
                      ₹{entry.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
