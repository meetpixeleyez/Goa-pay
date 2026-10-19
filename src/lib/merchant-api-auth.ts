import crypto from "crypto";
import prisma from "./prisma";

// AES-256-GCM symmetric encryption for merchant API secrets at rest
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const DEFAULT_KEY = "goapay-master-merchant-enc-key-32b!"; // 32 bytes
const ENCRYPTION_KEY = Buffer.from(
  (process.env.MERCHANT_API_ENCRYPTION_KEY || DEFAULT_KEY).padEnd(32, "0").slice(0, 32),
  "utf-8"
);

// In-memory sliding-window rate limiter per API key (requests per minute)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

/**
 * Encrypts an API Secret with AES-256-GCM
 */
export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted API Secret
 */
export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Masks an API Secret for display in UI (e.g., gpay_live_sec_...4a9f)
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "********";
  return `${secret.slice(0, 8)}...${secret.slice(-4)}`;
}

/**
 * Generates a new API Key ID and API Secret pair
 * Key format: merchantId_random (e.g. 27_686148)
 * Secret format: 64-character hex string (e.g. 1a24d210a8e91256c101d744818f87e48542c9619709f49a2ed1ade95ffffb76)
 */
export function generateApiKeyPair(merchantId: number | string = 1): { keyId: string; apiSecret: string } {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const keyId = `${merchantId}_${randomSuffix}`;
  const apiSecret = crypto.randomBytes(32).toString("hex");
  return { keyId, apiSecret };
}

/**
 * Computes HMAC-SHA256 signature in lowercase hex
 */
export function computeHmacSignature(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/**
 * Constant-time comparison to prevent timing side-channel attacks
 */
export function verifyHmacSignature(secret: string, data: string, providedSignature: string): boolean {
  try {
    const expectedSignature = computeHmacSignature(secret, data);
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const providedBuf = Buffer.from(providedSignature.toLowerCase().trim(), "utf8");
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/**
 * Validates in-memory rate limit for a key
 */
function checkRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(keyId);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(keyId, {
      count: 1,
      resetAt: now + 60 * 1000, // 1 minute window
    });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export interface AuthenticatedMerchantResult {
  merchant: any;
  apiKey: any;
  decryptedSecret: string;
}

export interface AuthErrorResult {
  error: string;
  statusCode: number;
}

/**
 * Authenticates an incoming Merchant REST API request using HMAC-SHA256 headers
 */
export async function authenticateMerchantRequest(
  request: Request
): Promise<AuthenticatedMerchantResult | AuthErrorResult> {
  const keyId = request.headers.get("x-api-key")?.trim();
  const timestampStr = request.headers.get("x-timestamp")?.trim();
  const signature = request.headers.get("x-signature")?.trim();

  if (!keyId || !timestampStr || !signature) {
    return {
      error: "Authentication failed. Required headers missing: 'X-API-KEY', 'X-TIMESTAMP', 'X-SIGNATURE'.",
      statusCode: 401,
    };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return {
      error: "Invalid 'X-TIMESTAMP' header. Must be a valid unix timestamp in seconds.",
      statusCode: 401,
    };
  }

  // Replay Attack Defense: Window must be within ±300 seconds (5 minutes)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestamp) > 300) {
    return {
      error: "Request timestamp is out of acceptable window (±300 seconds). Request rejected to prevent replay attacks.",
      statusCode: 401,
    };
  }

  // Find API Key in database
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyId },
    include: {
      user: {
        include: { broker: true },
      },
    },
  });

  if (!apiKey) {
    return {
      error: "Invalid API Key. Key ID not found.",
      statusCode: 401,
    };
  }

  if (apiKey.status !== "ACTIVE") {
    return {
      error: `API Key is ${apiKey.status.toLowerCase()}. Please contact administrator or generate a new key.`,
      statusCode: 403,
    };
  }

  const merchant = apiKey.user;
  if (!merchant || merchant.role !== "MERCHANT") {
    return {
      error: "Unauthorized. The API key is not associated with an active merchant account.",
      statusCode: 403,
    };
  }

  if (merchant.status !== "ACTIVE") {
    return {
      error: "Merchant account is inactive. Transaction and API access disabled.",
      statusCode: 403,
    };
  }

  if (merchant.transactionAllowed === false) {
    return {
      error: "Transaction processing is disabled for this merchant account.",
      statusCode: 403,
    };
  }

  // IP Whitelisting Check (if configured)
  if (apiKey.whitelistedIps && apiKey.whitelistedIps.trim()) {
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "";
    const allowedIps = apiKey.whitelistedIps.split(",").map((ip) => ip.trim());

    if (rawIp && !allowedIps.includes(rawIp) && !allowedIps.includes("127.0.0.1") && !allowedIps.includes("::1")) {
      return {
        error: `Client IP address '${rawIp}' is not whitelisted for this API Key.`,
        statusCode: 403,
      };
    }
  }

  // Rate Limiting Check
  const isAllowed = checkRateLimit(keyId, apiKey.rateLimit || 60);
  if (!isAllowed) {
    return {
      error: `Rate limit exceeded. Maximum ${apiKey.rateLimit || 60} requests per minute allowed.`,
      statusCode: 429,
    };
  }

  // Decrypt secret to verify HMAC signature
  let decryptedSecret = "";
  try {
    decryptedSecret = decryptSecret(apiKey.secretHash);
  } catch (err: any) {
    return {
      error: "Server error decrypting credentials for signature verification.",
      statusCode: 500,
    };
  }

  // Read raw body
  let rawBody = "";
  try {
    rawBody = await request.clone().text();
  } catch {
    rawBody = "";
  }

  // Format canonical string: `${timestamp}.${METHOD}.${PATH}.${rawBody}`
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const canonicalString = `${timestamp}.${method}.${pathname}.${rawBody}`;

  const isValid = verifyHmacSignature(decryptedSecret, canonicalString, signature);
  if (!isValid) {
    return {
      error: "Invalid HMAC signature. Signature verification failed.",
      statusCode: 401,
    };
  }

  // Update last used timestamp asynchronously
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    merchant,
    apiKey,
    decryptedSecret,
  };
}

/**
 * Creates a signed JSON Response with Goa-Pay X-Signature and X-Timestamp headers
 */
export function createSignedResponse(data: any, secret: string, status = 200): Response {
  const resTimestamp = Math.floor(Date.now() / 1000);
  const bodyString = JSON.stringify(data);
  const canonicalData = `${resTimestamp}.${bodyString}`;
  const responseSignature = computeHmacSignature(secret, canonicalData);

  return new Response(bodyString, {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Signature": responseSignature,
      "X-Timestamp": resTimestamp.toString(),
    },
  });
}
