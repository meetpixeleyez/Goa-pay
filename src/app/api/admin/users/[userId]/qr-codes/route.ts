import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providerId = parseInt(params.userId, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Only Admin or the QR Provider themselves can view
    if (session.role !== "ADMIN" && session.userId !== providerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, qrCodes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providerId = parseInt(params.userId, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const userTarget = await prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, role: true, qrProviderId: true },
    });

    if (!userTarget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only Admin, or parent QR Provider, or operator themselves can create QR codes
    const isOwner = session.userId === providerId;
    const isParentProvider = userTarget.role === "OPERATOR" && session.userId === userTarget.qrProviderId;
    if (session.role !== "ADMIN" && !isOwner && !isParentProvider) {
      return NextResponse.json(
        { error: "Forbidden: Unauthorized to create QR codes for this user" },
        { status: 403 }
      );
    }

    const { upiId, imageUrl, accountHolderName, bankName } = await request.json();

    if (!upiId || !imageUrl) {
      return NextResponse.json(
        { error: "UPI ID and QR Image URL are required" },
        { status: 400 }
      );
    }

    let actualProviderId = providerId;
    let actualOperatorId: number | null = null;
    if (userTarget.role === "OPERATOR") {
      actualProviderId = userTarget.qrProviderId || providerId;
      actualOperatorId = userTarget.id;
    }

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    // If assigned to an operator, deactivate all other QR codes for this operator
    if (actualOperatorId) {
      await prisma.qRCode.updateMany({
        where: { operatorId: actualOperatorId },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    const qrCode = await prisma.qRCode.create({
      data: {
        providerId: actualProviderId,
        operatorId: actualOperatorId,
        upiId,
        imageUrl,
        accountHolderName: accountHolderName || null,
        bankName: bankName || null,
        isActive: true,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, qrCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    const providerId = parseInt(params.userId, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { qrCodeId, upiId, imageUrl, accountHolderName, bankName, isActive, status } = await request.json();

    if (!qrCodeId) {
      return NextResponse.json({ error: "qrCodeId is required" }, { status: 400 });
    }

    const parsedQrCodeId = typeof qrCodeId === "number" ? qrCodeId : parseInt(qrCodeId, 10);
    if (isNaN(parsedQrCodeId)) {
      return NextResponse.json({ error: "Invalid qrCodeId" }, { status: 400 });
    }

    const existing = await prisma.qRCode.findUnique({
      where: { id: parsedQrCodeId },
    });

    if (!existing) {
      return NextResponse.json({ error: "QR Code not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (upiId !== undefined) updateData.upiId = upiId.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName ? accountHolderName.trim() : null;
    if (bankName !== undefined) updateData.bankName = bankName ? bankName.trim() : null;

    let targetIsActive: boolean | undefined = undefined;
    if (isActive !== undefined) {
      targetIsActive = Boolean(isActive);
      updateData.isActive = targetIsActive;
      updateData.status = targetIsActive ? "ACTIVE" : "INACTIVE";
    } else if (status !== undefined) {
      targetIsActive = status === "ACTIVE";
      updateData.status = status;
      updateData.isActive = targetIsActive;
    }

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    // If activating this QR code and it belongs to an operator, deactivate all other QR codes of that operator
    if (existing.operatorId && targetIsActive === true) {
      await prisma.qRCode.updateMany({
        where: {
          operatorId: existing.operatorId,
          id: { not: parsedQrCodeId },
        },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    const updated = await prisma.qRCode.update({
      where: { id: parsedQrCodeId },
      data: updateData,
    });

    return NextResponse.json({ success: true, qrCode: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

