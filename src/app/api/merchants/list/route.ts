import { NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { handleApiError } from "@/server/common/auth-guard";

export async function GET() {
  try {
    const merchants = await MerchantService.getActiveMerchantsList();
    return NextResponse.json({ success: true, merchants });
  } catch (error: any) {
    return handleApiError(error);
  }
}
