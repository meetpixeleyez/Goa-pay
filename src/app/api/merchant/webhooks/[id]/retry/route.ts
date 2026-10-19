import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { retryWebhookDelivery } from "@/lib/webhook-engine";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "MERCHANT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await retryWebhookDelivery(params.id);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Webhook delivered successfully upon retry!"
        : "Webhook retry attempt executed, but delivery failed or was rejected by endpoint.",
      delivery: result.delivery,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retry webhook" }, { status: 500 });
  }
}
