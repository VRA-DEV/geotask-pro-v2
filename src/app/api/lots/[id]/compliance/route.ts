import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ComplianceService } from "@/lib/services/compliance.service";
import { LogService } from "@/lib/services/log.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots/[id]/compliance — Get compliance status for a contract.
 * Note: [id] here is the contract_id.
 */
const statusHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const status = await ComplianceService.getStatus(contractId);
    return NextResponse.json({ data: status });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/lots/[id]/compliance — Sync lots from Ecoleta API.
 * Note: [id] here is the contract_id.
 */
const syncHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const neighborhood = body.neighborhood as string | undefined;

    const result = await ComplianceService.syncFromEcoleta(contractId, neighborhood, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Import",
      entityId: result.import_id,
      afterData: result.summary,
      description: `Sync Ecoleta: ${result.summary.total_from_api} lotes (${result.summary.created} novos, ${result.summary.updated} atualizados, ${result.summary.deleted} removidos)`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Sincronizacao concluida" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(statusHandler);
export const POST = withRoles(["Admin", "Gerente"])(syncHandler);
