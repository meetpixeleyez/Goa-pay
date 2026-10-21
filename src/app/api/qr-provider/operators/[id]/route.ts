import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OperatorService } from "@/server/services/operator.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"]);
    const operator = await OperatorService.getOperatorById(params.id, session);

    return NextResponse.json({
      success: true,
      operator,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["QR_PROVIDER"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));

    const updated = await OperatorService.updateOperator(params.id, body, session);

    return NextResponse.json({
      success: true,
      message: "Operator updated successfully",
      operator: updated,
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
    const session = await requireAuth(["QR_PROVIDER"], { requireWrite: true });
    const result = await OperatorService.deleteOperator(params.id, session);

    return NextResponse.json({
      success: true,
      message: `Operator "${result.name}" has been permanently deleted.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
