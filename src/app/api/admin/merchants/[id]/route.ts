import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { MerchantService } from "@/server/services/merchant.service";
import { validateUserData } from "@/lib/validation";

/**
 * GET /api/admin/merchants/[id]
 * Supports tabs: 'info', 'summary', 'wallet', 'orders', or full details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab");

    const result = await MerchantService.getMerchantById(params.id, tab);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/merchants/[id]
 * Updates merchant profile, permissions, fees, or broker assignment
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const data = await request.json();

    const validation = validateUserData(data, { isCreate: false, role: "MERCHANT" });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const updatedMerchant = await MerchantService.updateMerchant(
      params.id,
      data,
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: "Merchant updated successfully",
      merchant: updatedMerchant,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/merchants/[id]
 * Wallet adjustments: ADD_BALANCE, CLEAR_BALANCE, DEDUCT_BALANCE
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const { action, amount, description } = body;

    if (!["ADD_BALANCE", "CLEAR_BALANCE", "DEDUCT_BALANCE"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Supported: ADD_BALANCE, CLEAR_BALANCE, DEDUCT_BALANCE" },
        { status: 400 }
      );
    }

    const result = await MerchantService.manageMerchantBalance({
      merchantId: params.id,
      action,
      amount,
      description,
      adminUserId: session.userId,
      adminEmail: session.name || "Admin",
    });

    const formattedAmount = Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });

    const message =
      action === "ADD_BALANCE"
        ? `₹${formattedAmount} added successfully`
        : `₹${formattedAmount} cleared successfully`;

    return NextResponse.json({
      success: true,
      message,
      balance: result.newBalance,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
