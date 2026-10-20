import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { OperatorService } from "@/server/services/operator.service";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "QR_PROVIDER"]);
    const { searchParams } = new URL(request.url);

    const providerId = searchParams.get("providerId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const result = await OperatorService.getOperators(
      { providerId, status, search, page, limit },
      session
    );

    return NextResponse.json({
      success: true,
      operators: result.operators,
      pagination: result.pagination,
      stats: {
        total: result.stats.totalOperators,
        active: result.stats.activeOperators,
        inactive: result.stats.inactiveOperators,
        assignedQrs: result.stats.totalAssignedQrs,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["QR_PROVIDER"], { requireWrite: true });
    const body = await request.json().catch(() => ({}));

    const assignedQrIds = Array.isArray(body.assignedQrIds)
      ? body.assignedQrIds
      : Array.isArray(body.qrCodeIds)
      ? body.qrCodeIds
      : [];

    const targetProviderId =
      session.role === "ADMIN"
        ? body.targetProviderId || body.providerId || body.qrProviderId
        : session.userId;

    const operator = await OperatorService.createOperator(
      {
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone,
        qrProviderId: targetProviderId,
        assignedQrIds,
        initialUpiId: body.initialQr?.upiId || body.initialUpiId,
        initialQrImageUrl: body.initialQr?.imageUrl || body.initialQrImageUrl,
        accountHolderName: body.initialQr?.accountHolderName || body.accountHolderName,
        bankName: body.initialQr?.bankName || body.bankName,
      },
      session
    );

    return NextResponse.json({
      success: true,
      message: "Operator created successfully",
      operator,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
