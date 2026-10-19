"use client";

import { useState } from "react";
import {
  Landmark,
  Copy,
  Check,
} from "lucide-react";
import { parseBankDetails, BankAccountDetails } from "@/lib/validation";

interface BankTransferCardProps {
  beneficiaryDetails?: string | null;
  amount?: number;
  customerName?: string;
  customerMobile?: string;
  title?: string;
}

export default function BankTransferCard({
  beneficiaryDetails,
  amount,
  customerName,
  title = "Beneficiary Bank Details",
}: BankTransferCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bank: BankAccountDetails | null = parseBankDetails(beneficiaryDetails);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1500);
  };

  const holderName = bank?.accountHolderName || customerName || "Customer";
  const accNo = bank?.accountNumber || "";
  const ifsc = bank?.ifscCode || "";
  const bankName = bank?.bankName || "Bank Transfer";
  const accType = (bank?.accountType || "SAVINGS").toUpperCase();

  const detailsList = [
    {
      label: "Bank Name",
      value: bankName,
      copyValue: bankName,
      key: "bankName",
      isMono: false,
      badge: `${accType}`,
    },
    {
      label: "Account Number",
      value: accNo || "Not specified",
      copyValue: accNo,
      key: "accNo",
      isMono: true,
      highlight: true,
    },
    {
      label: "IFSC Code",
      value: ifsc || "Not specified",
      copyValue: ifsc,
      key: "ifsc",
      isMono: true,
    },
    {
      label: "Account Holder",
      value: holderName,
      copyValue: holderName,
      key: "name",
      isMono: false,
    },
  ];

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3 space-y-2 text-xs shadow-2xs">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/80">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Landmark className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
          <span className="font-bold text-base-900 text-xs uppercase tracking-wide truncate">
            {title}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
          {accType} ACCOUNT
        </span>
      </div>

      {/* Structured Compact 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {detailsList.map((item) => (
          <div
            key={item.key}
            className={`p-2 rounded-lg border bg-white flex items-center justify-between gap-2 min-w-0 ${
              item.highlight
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-gray-200"
            }`}
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                {item.label}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5 min-w-0">
                <span
                  className={`text-xs text-base-900 truncate font-bold ${
                    item.isMono ? "font-mono tracking-wide" : ""
                  }`}
                  title={item.value}
                >
                  {item.value}
                </span>
                {item.badge && (
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-extrabold shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>

            {item.copyValue && (
              <button
                type="button"
                onClick={() => handleCopy(item.copyValue, item.key)}
                className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 transition shrink-0 border border-transparent hover:border-emerald-200"
                title={`Copy ${item.label}`}
              >
                {copiedKey === item.key ? (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-0.5">
                    <Check className="w-3 h-3" />
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Transfer Amount Row */}
      {amount !== undefined && (
        <div className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 font-medium">Transfer Amount:</span>
            <span className="font-mono font-black text-xs sm:text-sm text-base-900">
              ₹{amount.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(amount.toFixed(2), "amount")}
            className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
          >
            {copiedKey === "amount" ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Amount</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
