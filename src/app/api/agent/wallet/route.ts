import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { AgentService } from "@/server/services/agent.service";

export async function GET() {
  try {
    const session = await requireAuth(["AGENT", "ADMIN"]);
    const walletData = await AgentService.getAgentWallet(session.userId, session);

    return NextResponse.json({
      success: true,
      balance: walletData.balance,
      commissionPercent: walletData.commissionPercent,
      entries: walletData.entries,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
