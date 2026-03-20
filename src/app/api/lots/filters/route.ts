import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { LotService } from "@/lib/services/lot.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots/filters — Get distinct filter options (cities, states, neighborhoods, etc.)
 */
const handler: AuthenticatedHandler = async (req) => {
  try {
    const contractId = req.nextUrl.searchParams.get("contract_id");
    const filters = await LotService.getFilterOptions(contractId ? Number(contractId) : undefined);
    return NextResponse.json({ data: filters });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
