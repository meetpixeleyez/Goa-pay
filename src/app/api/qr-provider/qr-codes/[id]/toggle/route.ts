import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRCodeService } from "@/server/services/qr-code.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"], { requireWrite: true });
    const updated = await QRCodeService.toggleQRCodeStatus(params.id, session);

    return NextResponse.json({
      success: true,
      qrCode: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
