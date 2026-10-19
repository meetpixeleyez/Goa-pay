import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OperatorService } from "@/server/services/operator.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"]);
    const body = await request.json().catch(() => ({}));

    const qrIds = Array.isArray(body.assignedQrIds)
      ? body.assignedQrIds
      : Array.isArray(body.qrCodeIds)
      ? body.qrCodeIds
      : [];

    const assignedQRs = await OperatorService.assignQRCodes(params.id, qrIds, session);

    return NextResponse.json({
      success: true,
      message: "QR code assignments updated successfully",
      assignedCount: assignedQRs.length,
      assignedQRs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
