import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRCodeService } from "@/server/services/qr-code.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "OPERATOR"], { requireWrite: true });
    const updated = await QRCodeService.toggleQRCodeStatus(params.id, session);

    return NextResponse.json({
      success: true,
      message: updated.isActive
        ? "QR code activated. All other QR codes paused."
        : "QR code paused.",
      qrCode: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
