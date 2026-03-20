import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { BillingService } from "@/lib/services/billing.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/financial/dashboard — Financial dashboard stats.
 * Optional ?contract_id=X for contract-specific summary.
 */
const handler: AuthenticatedHandler = async (req) => {
  try {
    const contractId = req.nextUrl.searchParams.get("contract_id");

    if (contractId) {
      const summary = await BillingService.getContractSummary(Number(contractId));
      return NextResponse.json({ data: summary });
    }

    const dashboard = await BillingService.getDashboard();
    return NextResponse.json({ data: dashboard });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
