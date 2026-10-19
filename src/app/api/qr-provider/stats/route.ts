import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { QRProviderService } from "@/server/services/qr-provider.service";

export async function GET() {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"]);
    const stats = await QRProviderService.getQRProviderStats(session.userId);

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
