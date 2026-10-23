import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateUserData, normalizeIndianPhone } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        broker: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        qrProvider: { select: { id: true, name: true, phone: true } },
        auditLogs: {
          where: { action: "OPERATOR_LOGIN" },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ success: true, profile: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN" && session.portalAccess === false) {
      return NextResponse.json(
        { error: "Portal access is in read-only mode. Create, update, and delete operations are not allowed." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { verifyPassword, hashPassword } = await import("@/lib/auth");
    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN" && session.portalAccess === false) {
      return NextResponse.json(
        { error: "Portal access is in read-only mode. Create, update, and delete operations are not allowed." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateUserData(body, { isCreate: false });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, phone, upiId } = body;
    const cleanPhone = phone !== undefined ? (phone ? normalizeIndianPhone(phone) : null) : undefined;

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: cleanPhone,
        upiId: upiId !== undefined ? (upiId ? upiId.trim() : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
