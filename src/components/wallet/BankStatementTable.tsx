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
  id: string;
  walletId?: string;
  orderId?: number | string | null;
  type: "CR" | "DR" | string;
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
  wallet?: {
    user?: {
      id?: string;
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
  subtitle = "Chronological record of deposits, deductions, and real-time running balances",
  showOwner = false,
  defaultSort = "desc",
  walletBalance,
}: BankStatementTableProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSort);
  const [filterType, setFilterType] = useState<"ALL" | "CR" | "DR">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Sort and filter entries
  const processedEntries = useMemo(() => {
    let list = [...entries];

    // Filter by CR/DR
    if (filterType !== "ALL") {
      list = list.filter((e) => e.type === filterType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.order?.orderNumber?.toLowerCase().includes(q) ||
          (showOwner && e.wallet?.user?.name?.toLowerCase().includes(q))
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
      if (e.type === "CR") totalCredit += e.amount;
      if (e.type === "DR") totalDebit += e.amount;
    });
    return {
      totalCredit,
      totalDebit,
      netTotal: totalCredit - totalDebit,
      count: entries.length,
    };
  }, [entries]);

  return (
    <div className="card-theme overflow-hidden shadow-sm">
      {/* Header with Title and Quick Stats */}
      <div className="p-4 sm:p-5 border-b border-base-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <h2 className="text-[15px] sm:text-[16px] font-bold text-base-900">{title}</h2>
            </div>
            <p className="text-xs text-base-700 mt-0.5">{subtitle}</p>
          </div>

          {/* Mini Summary Cards */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <div className="px-3.5 py-2 rounded-xl bg-green-50 border border-green-200 shadow-2xs">
              <span className="text-[10px] text-green-700 font-bold block uppercase tracking-wider">Total Credits (+CR)</span>
              <span className="text-xs sm:text-sm font-bold text-green-700">
                +₹{stats.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 shadow-2xs">
              <span className="text-[10px] text-red-700 font-bold block uppercase tracking-wider">Total Debits (-DR)</span>
              <span className="text-xs sm:text-sm font-bold text-red-700">
                -₹{stats.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-primary/15 border border-primary/30 shadow-2xs">
              <span className="text-[10px] text-[#0c4a6e] font-bold block uppercase tracking-wider">Settled Balance</span>
              <span className="text-xs sm:text-sm font-bold text-base-900">
                ₹{(walletBalance !== undefined && entries.length === 0 ? walletBalance : stats.netTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Sort toggle, Filters, and Search */}
        <div className="mt-4 pt-3 border-t border-[#e0f2fe] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {/* Sort Toggle */}
            <div className="inline-flex rounded-lg border border-base-200 p-0.5 bg-[#ffffff]">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition ${sortOrder === "desc"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-base-900"
                  }`}
                title="View newest transactions first"
              >
                <span>Latest First</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition ${sortOrder === "asc"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-base-900"
                  }`}
                title="View in chronological order (Oldest first: 1000 deposit -> 100 fee -> 2100 deposit -> 210 fee)"
              >
                <ArrowUpDown className="w-3 h-3" />
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
                onClick={() => setFilterType("CR")}
                className={`px-2 py-1 rounded text-xs font-semibold ${filterType === "CR" ? "bg-green-100 text-green-800" : "text-slate-500"
                  }`}
              >
                Credits Only
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DR")}
                className={`px-2 py-1 rounded text-xs font-semibold ${filterType === "DR" ? "bg-red-100 text-red-800" : "text-slate-500"
                  }`}
              >
                Debits Only
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
                Debit (-DR)
              </th>
              <th className="p-3 text-right bg-green-50/50 text-green-900 border-r border-base-200/60 min-w-[120px]">
                Credit (+CR)
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
                const isCredit = entry.type === "CR";
                const isDebit = entry.type === "DR";

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
                            {copiedId === entry.id ? (
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
                          {entry.wallet?.user?.name || "System"}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 uppercase text-gray-600 font-mono">
                          {entry.wallet?.user?.role || "USER"}
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

      {/* Footer Statement Note */}
      <div className="p-3 bg-base-100/30 border-t border-base-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-base-700 gap-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Double-entry verified ledger statement. Left: Debits (-DR) | Right: Credits (+CR) | End: Closing Running Balance.</span>
        </div>
        <div className="font-mono text-slate-500">
          Showing {processedEntries.length} of {entries.length} entries
        </div>
      </div>
    </div>
  );
}
