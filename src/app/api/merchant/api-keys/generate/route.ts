import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { encryptSecret, generateApiKeyPair, maskSecret } from "@/lib/merchant-api-auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let merchantId = typeof session.userId === "number" ? session.userId : parseInt(session.userId as any, 10);

    if (session.role === "ADMIN" && body.merchantId) {
      merchantId = typeof body.merchantId === "number" ? body.merchantId : parseInt(body.merchantId, 10);
    } else if (session.role !== "MERCHANT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const merchant = await prisma.user.findUnique({
      where: { id: merchantId, role: "MERCHANT" },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Generate new credentials with merchant.id
    const { keyId, apiSecret } = generateApiKeyPair(merchant.id);
    const secretHash = encryptSecret(apiSecret);
    const secretMasked = maskSecret(apiSecret);

    // Create the ApiKey in database
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: merchant.id,
        keyId,
        secretHash,
        secretMasked,
        name: body.name?.trim() || "Production API Key",
        whitelistedIps: body.whitelistedIps?.trim() || null,
        rateLimit: body.rateLimit ? parseInt(body.rateLimit, 10) : 60,
        status: "ACTIVE",
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "GENERATE_API_KEY",
        entity: "ApiKey",
        entityId: String(apiKey.id),
        metadata: JSON.stringify({ keyId, merchantId }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "API Key and Secret generated successfully. Please copy and store your secret now. It will NOT be shown again!",
      apiKey: {
        id: apiKey.id,
        keyId: apiKey.keyId,
        apiSecret, // Plaintext returned ONLY ONCE!
        secretMasked,
        name: apiKey.name,
        status: apiKey.status,
        rateLimit: apiKey.rateLimit,
        whitelistedIps: apiKey.whitelistedIps,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate API Key" }, { status: 500 });
  }
}
