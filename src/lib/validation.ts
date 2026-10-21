/**
 * Form and Data Validation Helpers
 * Validates Indian mobile numbers, emails, name lengths, address lengths, and other standard fields.
 */

/**
 * Normalizes a phone number (supports Indian and International formats).
 * Preserves leading '+' for international numbers, strips spaces, hyphens, brackets, dots.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // Indian standard 10-digit
  if (/^[6-9]\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  // Indian with leading 0 (11 digits: 0[6-9]\d{9})
  if (/^0[6-9]\d{9}$/.test(digitsOnly)) {
    return digitsOnly.slice(1);
  }

  // Indian with 91 prefix (12 digits: 91[6-9]\d{9})
  if (/^91[6-9]\d{9}$/.test(digitsOnly)) {
    return digitsOnly.slice(2);
  }

  return digitsOnly;
}

/**
 * Validates whether a phone number is a valid Indian or International phone number.
 * - Indian phone numbers: 10 digits starting with 6, 7, 8, or 9 (with or without +91 / 0 / 91).
 * - International phone numbers: 7 to 15 digits (ITU-T E.164 standard), e.g. +1 202 555 0199, +44 7911 123456, +971 50 123 4567.
 */
export function isValidPhone(phone?: string | null): boolean {
  if (!phone || !phone.trim()) return true; // Optional if not required
  const trimmed = phone.trim();

  // Strip common formatting symbols: spaces, dashes, parentheses, dots
  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, "");

  // International format with '+' prefix: + followed by 7 to 15 digits
  if (cleaned.startsWith("+")) {
    const withoutPlus = cleaned.slice(1);
    return /^\d{7,15}$/.test(withoutPlus);
  }

  // Indian 10-digit mobile (starts with 6-9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  // Indian 11 digits starting with 0 (0[6-9]\d{9})
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  // Indian 12 digits starting with 91 (91[6-9]\d{9})
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  // Generic international digits without leading + (7 to 15 digits)
  if (/^\d{7,15}$/.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Backward-compatible helper for Indian & International phone validation.
 */
export function isValidIndianPhone(phone?: string | null): boolean {
  return isValidPhone(phone);
}

/**
 * Backward-compatible normalization helper.
 */
export function normalizeIndianPhone(phone: string): string {
  return normalizePhone(phone);
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || !email.trim()) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return false;
  // Standard RFC-compliant email regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(trimmed);
}

/**
 * Validates name length and characters.
 * Min 2 chars, Max 60 chars.
 */
export function validateName(name?: string | null, label = "Name"): { valid: boolean; error?: string } {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { valid: false, error: `${label} is required` };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: `${label} must be at least 2 characters long` };
  }
  if (trimmed.length > 60) {
    return { valid: false, error: `${label} cannot exceed 60 characters` };
  }
  return { valid: true };
}

/**
 * Validates Full Name / Username field.
 * Strictly disallows email format (must not contain @).
 * Min 3 chars, Max 60 chars.
 * Allowed characters: letters, numbers, spaces, underscores, hyphens, and dots.
 */
export function validateUsernameOrName(
  input?: string | null,
  label = "Full Name / Username"
): { valid: boolean; error?: string } {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return { valid: false, error: `${label} is required` };
  }
  if (trimmed.includes("@")) {
    return {
      valid: false,
      error: `${label} cannot be an email address. Please enter a person's name or username.`,
    };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: `${label} must be at least 3 characters long` };
  }
  if (trimmed.length > 60) {
    return { valid: false, error: `${label} cannot exceed 60 characters` };
  }
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(trimmed)) {
    return {
      valid: false,
      error: `${label} can only contain letters, numbers, spaces, underscores, and hyphens.`,
    };
  }
  return { valid: true };
}

/**
 * Validates address length.
 * Min 5 chars, Max 250 chars if provided.
 */
export function validateAddress(address?: string | null, required = false): { valid: boolean; error?: string } {
  const trimmed = (address || "").trim();
  if (!trimmed) {
    if (required) return { valid: false, error: "Address is required" };
    return { valid: true };
  }
  if (trimmed.length < 5) {
    return { valid: false, error: "Address must be at least 5 characters long" };
  }
  if (trimmed.length > 250) {
    return { valid: false, error: "Address cannot exceed 250 characters" };
  }
  return { valid: true };
}

/**
 * Validates UPI ID format (e.g. user@bank, provider.pay@icici).
 */
export function isValidUpiId(upiId?: string | null): boolean {
  if (!upiId || !upiId.trim()) return true;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());
}

/**
 * Validates Telegram username (e.g. @username or username, 4-32 characters, alphanumeric + underscore).
 */
export function isValidTelegramId(telegramId?: string | null): boolean {
  if (!telegramId || !telegramId.trim()) return true;
  const handle = telegramId.trim().startsWith("@") ? telegramId.trim().slice(1) : telegramId.trim();
  return /^[a-zA-Z0-9_]{4,32}$/.test(handle);
}

/**
 * Normalizes Telegram ID by auto-prefixing with @ if missing.
 */
export function normalizeTelegramId(telegramId?: string | null): string | null {
  if (!telegramId || !telegramId.trim()) return null;
  const handle = telegramId.trim().startsWith("@") ? telegramId.trim() : "@" + telegramId.trim();
  return handle;
}

/**
 * Comprehensive User Form Validator for backend routes.
 */
export function validateUserData(
  data: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string | null;
    address?: string | null;
    upiId?: string | null;
    initialUpiId?: string | null;
    initialQrImageUrl?: string | null;
    telegramId?: string | null;
    qrProviderFee?: number | string;
    commissionPercent?: number | string;
    payinMerchantFee?: number | string;
    payinQrProviderFee?: number | string;
    payinAgentFee?: number | string;
    payinBrokerFee?: number | string;
    payoutMerchantFee?: number | string;
    payoutQrProviderFee?: number | string;
    payoutAgentFee?: number | string;
    payoutBrokerFee?: number | string;
  },
  options: { isCreate?: boolean; role?: string } = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // QR Provider optional initial QR Code validation during creation
  const targetRole = options.role || (data as any).role;
  if (options.isCreate && targetRole === "QR_PROVIDER") {
    if (data.initialUpiId && data.initialUpiId.trim()) {
      if (!isValidUpiId(data.initialUpiId.trim())) {
        errors.push("Please enter a valid UPI ID (e.g. username@bank)");
      }
    }
  }

  // Name validation
  if (data.name !== undefined || options.isCreate) {
    const nameCheck = validateName(data.name, options.role === "MERCHANT" ? "Store name" : "Name");
    if (!nameCheck.valid && nameCheck.error) errors.push(nameCheck.error);
  }

  // Email validation (optional)
  if (data.email && typeof data.email === "string" && data.email.trim() && !data.email.endsWith(".local") && !data.email.endsWith(".internal")) {
    if (!isValidEmail(data.email)) {
      errors.push("Please enter a valid email address (e.g. user@example.com)");
    }
  }

  // Password validation (creation requires min 6 chars)
  if (options.isCreate) {
    if (!data.password || data.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    } else if (data.password.length > 128) {
      errors.push("Password cannot exceed 128 characters");
    }
  } else if (data.password) {
    if (data.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    } else if (data.password.length > 128) {
      errors.push("Password cannot exceed 128 characters");
    }
  }

  // Phone validation (Indian or International phone)
  if (data.phone !== undefined && data.phone !== null && data.phone.trim() !== "") {
    if (!isValidPhone(data.phone)) {
      errors.push("Please enter a valid phone number (10-digit Indian mobile or International format with country code e.g. +1...)");
    }
  }

  // Address validation
  if (data.address !== undefined && data.address !== null && data.address.trim() !== "") {
    const addressCheck = validateAddress(data.address);
    if (!addressCheck.valid && addressCheck.error) errors.push(addressCheck.error);
  }

  // UPI ID validation
  if (data.upiId !== undefined && data.upiId !== null && data.upiId.trim() !== "") {
    if (!isValidUpiId(data.upiId)) {
      errors.push("Please enter a valid UPI ID (e.g. username@bank)");
    }
  }

  // Telegram ID validation
  if (data.telegramId !== undefined && data.telegramId !== null && data.telegramId.trim() !== "") {
    if (!isValidTelegramId(data.telegramId)) {
      errors.push("Please enter a valid Telegram username (4-32 characters, letters, numbers, and underscores)");
    }
  }

  // Admin manages fee configuration; ensure only that values are numeric if provided
  const feeFields: (number | string | undefined)[] = [
    data.qrProviderFee,
    data.commissionPercent,
    data.payinMerchantFee,
    data.payinQrProviderFee,
    data.payinAgentFee,
    data.payinBrokerFee,
    data.payoutMerchantFee,
    data.payoutQrProviderFee,
    data.payoutAgentFee,
    data.payoutBrokerFee,
  ];

  for (const fee of feeFields) {
    if (fee !== undefined && fee !== null && fee !== "") {
      const parsed = typeof fee === "string" ? parseFloat(fee) : fee;
      if (isNaN(parsed)) {
        errors.push("Fee percentages must be valid numbers");
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Indian Bank Account Number.
 * Standard Indian bank account numbers range from 9 to 18 digits.
 */
export function isValidBankAccount(accountNumber?: string | null): boolean {
  if (!accountNumber || !accountNumber.trim()) return false;
  const cleaned = accountNumber.trim().replace(/[\s\-]/g, "");
  return /^\d{9,18}$/.test(cleaned);
}

/**
 * Validates Indian Financial System Code (IFSC).
 * Format: 4 characters bank code (alphabetic), 5th character '0', followed by 6 alphanumeric characters.
 * Example: HDFC0001234, SBIN0000456, ICIC0000001
 */
export function isValidIfsc(ifsc?: string | null): boolean {
  if (!ifsc || !ifsc.trim()) return false;
  const cleaned = ifsc.trim().toUpperCase();
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned);
}

export interface BankAccountDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName?: string;
  accountType?: "SAVINGS" | "CURRENT" | string;
}

/**
 * Validates complete bank account details for withdrawal / payout fulfillment.
 */
export function validateBankAccountDetails(data: {
  accountNumber?: string | null;
  confirmAccountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const accNo = (data.accountNumber || "").trim().replace(/[\s\-]/g, "");
  if (!accNo) {
    errors.push("Bank account number is required");
  } else if (!/^\d{9,18}$/.test(accNo)) {
    errors.push("Bank account number must be between 9 and 18 numeric digits");
  }

  if (data.confirmAccountNumber !== undefined && data.confirmAccountNumber !== null) {
    const confirmAccNo = data.confirmAccountNumber.trim().replace(/[\s\-]/g, "");
    if (accNo && confirmAccNo !== accNo) {
      errors.push("Bank account numbers do not match");
    }
  }

  const ifsc = (data.ifscCode || "").trim().toUpperCase();
  if (!ifsc) {
    errors.push("IFSC code is required");
  } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    errors.push("Invalid IFSC code format (e.g. HDFC0001234)");
  }

  const holderName = (data.accountHolderName || "").trim();
  if (!holderName) {
    errors.push("Beneficiary / Account holder name is required");
  } else if (holderName.length < 2) {
    errors.push("Account holder name must be at least 2 characters");
  }

  const bankName = (data.bankName || "").trim();
  if (!bankName) {
    errors.push("Bank name is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serializes BankAccountDetails into a structured JSON string for database storage.
 */
export function formatBeneficiaryDetails(data: BankAccountDetails): string {
  return JSON.stringify({
    accountNumber: (data.accountNumber || "").trim().replace(/[\s\-]/g, ""),
    ifscCode: (data.ifscCode || "").trim().toUpperCase(),
    accountHolderName: (data.accountHolderName || "").trim(),
    bankName: (data.bankName || "").trim() || undefined,
    accountType: (data.accountType || "").trim() || "SAVINGS",
  });
}

/**
 * Parses beneficiary details string (supports JSON format and legacy key-value text formats).
 */
export function parseBankDetails(raw?: string | null): BankAccountDetails | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Try parsing JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.accountNumber || parsed.ifscCode || parsed.accountHolderName) {
        return {
          accountNumber: parsed.accountNumber || "",
          ifscCode: (parsed.ifscCode || "").toUpperCase(),
          accountHolderName: parsed.accountHolderName || parsed.beneficiaryName || "",
          bankName: parsed.bankName || "",
          accountType: parsed.accountType || "SAVINGS",
        };
      }
    } catch {
      // Fall through to regex extraction
    }
  }

  // Regex extraction for legacy key-value or pipe/comma separated strings
  // e.g. "A/C: 111122223333, IFSC: SBIN0001234, Name: Rohan Verma"
  // e.g. "Bank: HDFC Bank | A/C: 50100234567890 | IFSC: HDFC0001234 | Name: Rohan Verma"
  const accMatch = trimmed.match(/(?:A\/C|Account|Acc|A\/c|Account Number)[:\s]+([0-9]{9,18})/i) ||
                   trimmed.match(/\b([0-9]{9,18})\b/);
  const ifscMatch = trimmed.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
  const nameMatch = trimmed.match(/(?:Name|Holder|Beneficiary)[:\s]+([^,|]+)/i);
  const bankMatch = trimmed.match(/(?:Bank|Bank Name)[:\s]+([^,|]+)/i);
  const typeMatch = trimmed.match(/(?:Type|Account Type)[:\s]+(SAVINGS|CURRENT)/i);

  if (accMatch || ifscMatch || nameMatch) {
    return {
      accountNumber: accMatch ? accMatch[1].trim() : "",
      ifscCode: ifscMatch ? ifscMatch[1].toUpperCase() : "",
      accountHolderName: nameMatch ? nameMatch[1].trim() : "",
      bankName: bankMatch ? bankMatch[1].trim() : "",
      accountType: typeMatch ? typeMatch[1].toUpperCase() : "SAVINGS",
    };
  }

  // Fallback: if it's just raw text, return it as accountHolderName or accountNumber
  return {
    accountNumber: "",
    ifscCode: "",
    accountHolderName: trimmed,
    bankName: "",
    accountType: "SAVINGS",
  };
}

/**
 * Returns a human-friendly single-line string of bank account details for tables and summaries.
 */
export function formatBankDetailsDisplay(raw?: string | null): string {
  if (!raw || !raw.trim()) return "Not specified";
  const details = parseBankDetails(raw);
  if (!details) return raw;

  if (details.accountNumber && details.ifscCode) {
    const parts: string[] = [];
    if (details.bankName) parts.push(details.bankName);
    parts.push(`A/C: ${details.accountNumber}`);
    parts.push(`IFSC: ${details.ifscCode}`);
    if (details.accountHolderName) parts.push(`Name: ${details.accountHolderName}`);
    if (details.accountType && details.accountType !== "SAVINGS") parts.push(`(${details.accountType})`);
    return parts.join(" | ");
  }

  return raw;
}
