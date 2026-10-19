import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeyId = parseInt(params.id, 10);
    if (isNaN(apiKeyId)) {
      return NextResponse.json({ error: "Invalid API Key ID" }, { status: 400 });
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: { user: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API Key not found" }, { status: 404 });
    }

    // Permission check
    if (session.role !== "ADMIN" && (session.role !== "MERCHANT" || session.userId !== apiKey.userId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const newStatus =
      body.status || (apiKey.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");

    const updated = await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      message: `API Key status updated to ${newStatus}`,
      apiKey: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update API key status" }, { status: 500 });
  }
}
