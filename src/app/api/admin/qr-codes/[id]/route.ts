import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const qrCodeId = parseInt(params.id, 10);
    if (isNaN(qrCodeId)) {
      return NextResponse.json({ error: "Invalid QR Code ID" }, { status: 400 });
    }

    const qrCode = await prisma.qRCode.findUnique({
      where: { id: qrCodeId },
      include: {
        provider: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, qrCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "QR_PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const qrCodeId = parseInt(params.id, 10);
    if (isNaN(qrCodeId)) {
      return NextResponse.json({ error: "Invalid QR Code ID" }, { status: 400 });
    }
    const body = await request.json();
    const { upiId, imageUrl, accountHolderName, bankName, isActive, status } = body;

    const existing = await prisma.qRCode.findUnique({
      where: { id: qrCodeId },
    });

    if (!existing) {
      return NextResponse.json({ error: "QR Code not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && existing.providerId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};
    if (upiId !== undefined) {
      if (!upiId.trim()) {
        return NextResponse.json({ error: "UPI ID cannot be empty" }, { status: 400 });
      }
      updateData.upiId = upiId.trim();
    }
    if (imageUrl !== undefined) {
      if (!imageUrl.trim()) {
        return NextResponse.json({ error: "QR Image URL cannot be empty" }, { status: 400 });
      }
      updateData.imageUrl = imageUrl.trim();
    }
    if (accountHolderName !== undefined) {
      updateData.accountHolderName = accountHolderName ? accountHolderName.trim() : null;
    }
    if (bankName !== undefined) {
      updateData.bankName = bankName ? bankName.trim() : null;
    }

    if (isActive !== undefined) {
      const activeBool = Boolean(isActive);
      updateData.isActive = activeBool;
      updateData.status = activeBool ? "ACTIVE" : "INACTIVE";
    } else if (status !== undefined) {
      const activeBool = status === "ACTIVE";
      updateData.status = status;
      updateData.isActive = activeBool;
    }

    if (body.operatorId !== undefined) {
      if (!body.operatorId) {
        updateData.operatorId = null;
      } else {
        const opId = typeof body.operatorId === "number" ? body.operatorId : parseInt(body.operatorId, 10);
        const op = await prisma.user.findFirst({
          where: { id: opId, role: "OPERATOR", qrProviderId: existing.providerId },
        });
        if (!op) {
          return NextResponse.json({ error: "Operator does not belong to this QR provider" }, { status: 400 });
        }
        updateData.operatorId = opId;
      }
    }

    const targetOperatorId = updateData.operatorId !== undefined ? updateData.operatorId : existing.operatorId;
    const targetIsActive = updateData.isActive !== undefined ? updateData.isActive : existing.isActive;

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    if (targetOperatorId && targetIsActive === true) {
      await prisma.qRCode.updateMany({
        where: { operatorId: targetOperatorId, id: { not: qrCodeId } },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    const updated = await prisma.qRCode.update({
      where: { id: qrCodeId },
      data: updateData,
      include: {
        operator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, qrCode: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "QR_PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const qrCodeId = parseInt(params.id, 10);
    if (isNaN(qrCodeId)) {
      return NextResponse.json({ error: "Invalid QR Code ID" }, { status: 400 });
    }

    const qrCode = await prisma.qRCode.findUnique({
      where: { id: qrCodeId },
    });

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && qrCode.providerId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const newActive = !qrCode.isActive;

    // SINGLE ACTIVE QR CODE PER OPERATOR RULE:
    if (newActive && qrCode.operatorId) {
      await prisma.qRCode.updateMany({
        where: { operatorId: qrCode.operatorId, id: { not: qrCodeId } },
        data: { isActive: false, status: "INACTIVE" },
      });
    }

    const updated = await prisma.qRCode.update({
      where: { id: qrCodeId },
      data: {
        isActive: newActive,
        status: newActive ? "ACTIVE" : "INACTIVE",
      },
    });

    return NextResponse.json({ success: true, qrCode: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
