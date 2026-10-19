import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dispatchWebhook } from "@/lib/webhook-engine";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let merchantId = session.userId;

    if (session.role === "ADMIN" && body.merchantId) {
      merchantId = body.merchantId;
    } else if (session.role !== "MERCHANT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const merchant = await prisma.user.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const targetUrl = body.targetUrl || merchant.webhookUrl;
    if (!targetUrl || !targetUrl.trim()) {
      return NextResponse.json(
        { error: "No webhook URL configured or provided. Please enter a valid URL." },
        { status: 400 }
      );
    }

    const testPayload = {
      test: true,
      message: "This is a test webhook event from Goa-Pay Gateway.",
      merchantId: merchant.id,
      merchantName: merchant.name,
      timestamp: new Date().toISOString(),
    };

    const result = await dispatchWebhook({
      merchantId: merchant.id,
      event: "webhook.test",
      targetUrl: targetUrl.trim(),
      payloadData: testPayload,
    });

    return NextResponse.json({
      success: true,
      message: result?.success
        ? "Test webhook dispatched successfully and acknowledged by your endpoint!"
        : "Test webhook dispatched, but endpoint did not return HTTP 2xx or timed out. Check webhook logs below.",
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to dispatch test webhook" }, { status: 500 });
  }
}
