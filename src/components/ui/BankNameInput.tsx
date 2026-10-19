"use client";

import { useState, useRef, useEffect } from "react";
import { Landmark, Check, X, Search } from "lucide-react";
import { searchBanks, POPULAR_INDIAN_BANKS, BankInfo } from "@/lib/banks";

interface BankNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectBank?: (bank: BankInfo) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export default function BankNameInput({
  value,
  onChange,
  onSelectBank,
  placeholder = "e.g. HDFC Bank, State Bank of India, ICICI Bank",
  required = false,
  className = "",
  id = "bank-name-input",
}: BankNameInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<BankInfo[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Quick popular bank shortcuts for instant selection
  const quickPicks = [
    { label: "SBI", name: "State Bank of India" },
    { label: "HDFC", name: "HDFC Bank" },
    { label: "ICICI", name: "ICICI Bank" },
    { label: "Axis", name: "Axis Bank" },
    { label: "PNB", name: "Punjab National Bank" },
    { label: "BOB", name: "Bank of Baroda" },
    { label: "Kotak", name: "Kotak Mahindra Bank" },
  ];

  // Update suggestions whenever value changes
  useEffect(() => {
    if (value && value.trim().length >= 1) {
      const results = searchBanks(value, 7);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
    setHighlightedIndex(-1);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (bank: BankInfo) => {
    onChange(bank.name);
    setIsOpen(false);
    if (onSelectBank) {
      onSelectBank(bank);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Input container */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Landmark className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value && value.trim().length >= 1) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2 text-xs border border-base-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 ${className}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition"
            title="Clear bank name"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-base-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 animate-fadeIn max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-base-100/40 text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
            <span>Bank Suggestions (Click to fill)</span>
            <span>{suggestions.length} found</span>
          </div>

          {suggestions.map((bank, index) => {
            const isSelected = value.toLowerCase() === bank.name.toLowerCase();
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={bank.name}
                type="button"
                onClick={() => handleSelect(bank)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition text-xs ${
                  isHighlighted || isSelected
                    ? "bg-emerald-50/90 text-emerald-950 font-semibold"
                    : "hover:bg-gray-50 text-gray-800"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-100/80 border border-emerald-300 flex items-center justify-center shrink-0">
                    <Landmark className="w-3 h-3 text-emerald-800" />
                  </div>
                  <div>
                    <span className="block font-bold text-base-900">
                      {bank.name}
                    </span>
                    {bank.aliases.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Aliases: {bank.aliases.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="shrink-0 pl-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Pick Chips for 1-click popular banks */}
      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        <span className="text-[10px] font-semibold text-slate-500 mr-1">
          Quick select:
        </span>
        {quickPicks.map((qp) => {
          const isSelected = value.toLowerCase() === qp.name.toLowerCase();
          return (
            <button
              key={qp.label}
              type="button"
              onClick={() => {
                const found = POPULAR_INDIAN_BANKS.find((b) => b.name === qp.name);
                if (found) handleSelect(found);
                else onChange(qp.name);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                isSelected
                  ? "bg-emerald-100 border-emerald-400 text-emerald-900"
                  : "bg-white hover:bg-emerald-50/60 border-gray-200 text-gray-700 hover:border-emerald-300"
              }`}
            >
              {qp.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
