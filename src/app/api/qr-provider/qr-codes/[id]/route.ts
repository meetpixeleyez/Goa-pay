import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRCodeService } from "@/server/services/qr-code.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER", "OPERATOR"]);
    const qrCode = await QRCodeService.getQRCodeById(params.id, session);
    return NextResponse.json({ success: true, qrCode });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));

    const updated = await QRCodeService.updateQRCode(params.id, body, session);

    return NextResponse.json({
      success: true,
      message: "QR code updated successfully",
      qrCode: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"], { requireWrite: true });
    await QRCodeService.deleteQRCode(params.id, session);

    return NextResponse.json({
      success: true,
      message: "QR code deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
