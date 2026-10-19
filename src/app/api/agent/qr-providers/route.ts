import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/server/common/auth-guard";
import { AgentService } from "@/server/services/agent.service";

export async function GET() {
  try {
    const session = await requireAuth(["AGENT", "ADMIN"]);
    const providers = await AgentService.getAgentProviders(session.userId, session);

    return NextResponse.json({ success: true, providers });
  } catch (error) {
    return handleApiError(error);
  }
}
