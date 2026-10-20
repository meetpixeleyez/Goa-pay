import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRCodeService } from "@/server/services/qr-code.service";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER", "OPERATOR"]);
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    const qrCodes = await QRCodeService.getQRCodes(
      { providerId },
      session
    );

    return NextResponse.json({ success: true, qrCodes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));

    const qrCode = await QRCodeService.createQRCode(body, session);

    return NextResponse.json({
      success: true,
      message: "UPI QR code added successfully",
      qrCode,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
