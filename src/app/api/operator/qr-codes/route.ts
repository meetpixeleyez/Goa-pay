import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRCodeService } from "@/server/services/qr-code.service";

export async function GET() {
  try {
    const session = await requireAuth(["ADMIN", "OPERATOR"]);
    const qrCodes = await QRCodeService.getQRCodes({}, session);

    return NextResponse.json({ success: true, qrCodes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "OPERATOR"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));
    const qrCode = await QRCodeService.createQRCode(body, session);

    return NextResponse.json({
      success: true,
      message: "QR code uploaded and activated successfully for your shift.",
      qrCode,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
