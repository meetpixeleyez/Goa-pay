import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OperatorService } from "@/server/services/operator.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));

    const result = await OperatorService.resetPassword(params.id, body.newPassword, session);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
