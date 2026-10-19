/**
 * Comprehensive list of major Indian Banks with official full names,
 * common aliases/acronyms (e.g., SBI, PNB, BOB), and standard 4-letter IFSC prefixes.
 */

export interface BankInfo {
  name: string;
  aliases: string[];
  ifscPrefix: string;
}

export const POPULAR_INDIAN_BANKS: BankInfo[] = [
  { name: "State Bank of India", aliases: ["SBI", "STATE BANK"], ifscPrefix: "SBIN" },
  { name: "HDFC Bank", aliases: ["HDFC"], ifscPrefix: "HDFC" },
  { name: "ICICI Bank", aliases: ["ICICI"], ifscPrefix: "ICIC" },
  { name: "Axis Bank", aliases: ["AXIS", "UTI"], ifscPrefix: "UTIB" },
  { name: "Punjab National Bank", aliases: ["PNB"], ifscPrefix: "PUNB" },
  { name: "Bank of Baroda", aliases: ["BOB", "BARODA"], ifscPrefix: "BARB" },
  { name: "Kotak Mahindra Bank", aliases: ["KOTAK", "KMB"], ifscPrefix: "KKBK" },
  { name: "Canara Bank", aliases: ["CANARA"], ifscPrefix: "CNRB" },
  { name: "Union Bank of India", aliases: ["UBI", "UNION"], ifscPrefix: "UBIN" },
  { name: "Bank of India", aliases: ["BOI"], ifscPrefix: "BKID" },
  { name: "IndusInd Bank", aliases: ["INDUSIND", "INDUS"], ifscPrefix: "INDB" },
  { name: "Yes Bank", aliases: ["YES"], ifscPrefix: "YESB" },
  { name: "IDBI Bank", aliases: ["IDBI"], ifscPrefix: "IBKL" },
  { name: "IDFC FIRST Bank", aliases: ["IDFC", "IDFC FIRST"], ifscPrefix: "IDFB" },
  { name: "Federal Bank", aliases: ["FEDERAL"], ifscPrefix: "FDRL" },
  { name: "Indian Bank", aliases: ["INDIAN"], ifscPrefix: "IDIB" },
  { name: "Central Bank of India", aliases: ["CBI", "CENTRAL"], ifscPrefix: "CBIN" },
  { name: "Bandhan Bank", aliases: ["BANDHAN"], ifscPrefix: "BDBL" },
  { name: "AU Small Finance Bank", aliases: ["AU", "AU BANK"], ifscPrefix: "AUBL" },
  { name: "RBL Bank", aliases: ["RBL", "RATNAKAR"], ifscPrefix: "RATN" },
  { name: "South Indian Bank", aliases: ["SIB", "SOUTH INDIAN"], ifscPrefix: "SIBL" },
  { name: "Indian Overseas Bank", aliases: ["IOB"], ifscPrefix: "IOBA" },
  { name: "UCO Bank", aliases: ["UCO"], ifscPrefix: "UCBA" },
  { name: "Bank of Maharashtra", aliases: ["BOM", "MAHARASHTRA"], ifscPrefix: "MAHB" },
  { name: "Punjab & Sind Bank", aliases: ["PSB", "PUNJAB AND SIND"], ifscPrefix: "PSIB" },
  { name: "Karur Vysya Bank", aliases: ["KVB", "KARUR"], ifscPrefix: "KVBL" },
  { name: "Karnataka Bank", aliases: ["KARNATAKA"], ifscPrefix: "KARB" },
  { name: "City Union Bank", aliases: ["CUB"], ifscPrefix: "CIUB" },
  { name: "Equitas Small Finance Bank", aliases: ["EQUITAS"], ifscPrefix: "ESFB" },
  { name: "Ujjivan Small Finance Bank", aliases: ["UJJIVAN"], ifscPrefix: "UJVN" },
  { name: "Paytm Payments Bank", aliases: ["PAYTM"], ifscPrefix: "PYTM" },
  { name: "Airtel Payments Bank", aliases: ["AIRTEL"], ifscPrefix: "AIRP" },
  { name: "J&K Bank", aliases: ["JKB", "JAMMU AND KASHMIR"], ifscPrefix: "JAKA" },
  { name: "Tamilnad Mercantile Bank", aliases: ["TMB"], ifscPrefix: "TMBL" },
  { name: "Dhanlaxmi Bank", aliases: ["DHANLAXMI"], ifscPrefix: "DLXB" },
  { name: "Standard Chartered Bank", aliases: ["SCB", "STAN CHART"], ifscPrefix: "SCBL" },
  { name: "Citibank", aliases: ["CITI"], ifscPrefix: "CITI" },
  { name: "HSBC Bank", aliases: ["HSBC"], ifscPrefix: "HSBC" },
  { name: "DBS Bank", aliases: ["DBS"], ifscPrefix: "DBSS" },
];

/**
 * Searches the bank list for matching bank full names given a user input query.
 * Matches on full name, individual words, acronyms, and aliases.
 */
export function searchBanks(query: string, limit = 6): BankInfo[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  // First priority: Exact match or starts with query
  const exactStarts: BankInfo[] = [];
  // Second priority: Aliases exact match or start with query (e.g. "sbi", "pnb")
  const aliasStarts: BankInfo[] = [];
  // Third priority: Substring match in full name
  const nameIncludes: BankInfo[] = [];
  // Fourth priority: Substring match in alias
  const aliasIncludes: BankInfo[] = [];

  for (const bank of POPULAR_INDIAN_BANKS) {
    const lowerName = bank.name.toLowerCase();
    const matchesAliasExactOrStart = bank.aliases.some((a) => a.toLowerCase().startsWith(q));
    const matchesAliasIncludes = bank.aliases.some((a) => a.toLowerCase().includes(q));

    if (lowerName.startsWith(q)) {
      exactStarts.push(bank);
    } else if (matchesAliasExactOrStart) {
      aliasStarts.push(bank);
    } else if (lowerName.includes(q)) {
      nameIncludes.push(bank);
    } else if (matchesAliasIncludes) {
      aliasIncludes.push(bank);
    }
  }

  const combined = [
    ...exactStarts,
    ...aliasStarts,
    ...nameIncludes,
    ...aliasIncludes,
  ];

  // Return unique banks up to limit
  const seen = new Set<string>();
  const results: BankInfo[] = [];
  for (const b of combined) {
    if (!seen.has(b.name)) {
      seen.add(b.name);
      results.push(b);
      if (results.length >= limit) break;
    }
  }

  return results;
}
