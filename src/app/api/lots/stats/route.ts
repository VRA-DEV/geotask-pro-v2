import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { LotService } from "@/lib/services/lot.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots/stats?contract_id=X — Get lot statistics for a contract.
 */
const handler: AuthenticatedHandler = async (req) => {
  try {
    const contractId = Number(req.nextUrl.searchParams.get("contract_id"));
    if (!contractId) return NextResponse.json({ error: "contract_id obrigatorio" }, { status: 400 });

    const stats = await LotService.getStats(contractId);
    return NextResponse.json({ data: stats });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
