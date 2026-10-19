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

    // Only Admin or the QR Provider themselves can create QR codes
    if (session.role !== "ADMIN" && (session.role !== "QR_PROVIDER" || session.userId !== providerId)) {
      return NextResponse.json(
        { error: "Forbidden: Unauthorized to create QR codes for this provider" },
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

    const qrCode = await prisma.qRCode.create({
      data: {
        providerId,
        upiId,
        imageUrl,
        accountHolderName: accountHolderName || null,
        bankName: bankName || null,
        isActive: true,
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

    if (!session || (session.role !== "ADMIN" && (session.role !== "QR_PROVIDER" || session.userId !== providerId))) {
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

    const existing = await prisma.qRCode.findFirst({
      where: { id: parsedQrCodeId, providerId },
    });

    if (!existing) {
      return NextResponse.json({ error: "QR Code not found for this provider" }, { status: 404 });
    }

    const updateData: any = {};
    if (upiId !== undefined) updateData.upiId = upiId.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName ? accountHolderName.trim() : null;
    if (bankName !== undefined) updateData.bankName = bankName ? bankName.trim() : null;

    if (isActive !== undefined) {
      const activeBool = Boolean(isActive);
      updateData.isActive = activeBool;
      updateData.status = activeBool ? "ACTIVE" : "INACTIVE";
    } else if (status !== undefined) {
      const activeBool = status === "ACTIVE";
      updateData.status = status;
      updateData.isActive = activeBool;
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

