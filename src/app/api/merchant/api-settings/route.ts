import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateWebhookUrl } from "@/lib/webhook-engine";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const merchantIdParam = url.searchParams.get("merchantId");

    let merchantId = session.userId;
    if (session.role === "ADMIN" && merchantIdParam) {
      merchantId = parseInt(merchantIdParam, 10);
      if (isNaN(merchantId)) {
        return NextResponse.json({ error: "Invalid merchant ID" }, { status: 400 });
      }
    } else if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const merchant = await prisma.user.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        role: true,
        webhookUrl: true,
        defaultSuccessUrl: true,
        defaultFailureUrl: true,
        apiKeys: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            keyId: true,
            name: true,
            secretMasked: true,
            status: true,
            permissions: true,
            whitelistedIps: true,
            rateLimit: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Fetch recent 20 webhook deliveries
    const webhookDeliveries = await prisma.webhookDelivery.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      merchant,
      apiKeys: merchant.apiKeys,
      webhookDeliveries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch API settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let merchantId = session.userId;

    if (session.role === "ADMIN" && body.merchantId) {
      merchantId = typeof body.merchantId === "number" ? body.merchantId : parseInt(body.merchantId, 10);
      if (isNaN(merchantId)) {
        return NextResponse.json({ error: "Invalid merchant ID" }, { status: 400 });
      }
    } else if (session.role !== "MERCHANT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (session.role !== "ADMIN" && session.portalAccess === false) {
      return NextResponse.json(
        { error: "Portal access is in read-only mode. Create, update, and delete operations are not allowed." },
        { status: 403 }
      );
    }

    const { webhookUrl, defaultSuccessUrl, defaultFailureUrl } = body;

    // Validate URL schemes
    if (webhookUrl && webhookUrl.trim()) {
      const check = validateWebhookUrl(webhookUrl.trim());
      if (!check.valid) {
        return NextResponse.json({ error: `Invalid Webhook URL: ${check.error}` }, { status: 400 });
      }
    }
    if (defaultSuccessUrl && defaultSuccessUrl.trim()) {
      const check = validateWebhookUrl(defaultSuccessUrl.trim());
      if (!check.valid) {
        return NextResponse.json({ error: `Invalid Success Redirect URL: ${check.error}` }, { status: 400 });
      }
    }
    if (defaultFailureUrl && defaultFailureUrl.trim()) {
      const check = validateWebhookUrl(defaultFailureUrl.trim());
      if (!check.valid) {
        return NextResponse.json({ error: `Invalid Failure Redirect URL: ${check.error}` }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: merchantId },
      data: {
        webhookUrl: webhookUrl ? webhookUrl.trim() : null,
        defaultSuccessUrl: defaultSuccessUrl ? defaultSuccessUrl.trim() : null,
        defaultFailureUrl: defaultFailureUrl ? defaultFailureUrl.trim() : null,
      },
      select: {
        id: true,
        webhookUrl: true,
        defaultSuccessUrl: true,
        defaultFailureUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "API & redirect settings updated successfully.",
      settings: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update API settings" }, { status: 500 });
  }
}
