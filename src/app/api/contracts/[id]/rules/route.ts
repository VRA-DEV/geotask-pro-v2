import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ContractService } from "@/lib/services/contract.service";
import { LogService } from "@/lib/services/log.service";
import { measurementRuleSchema } from "@/lib/dto/contract.dto";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";
import { validateDto } from "@/lib/dto/common.dto";

const listHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const rules = await ContractService.listRules(contractId);
    return NextResponse.json({ data: rules });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const syncHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const syncSchema = z.object({ rules: z.array(measurementRuleSchema) });
    const { rules } = validateDto(syncSchema, body);

    const result = await ContractService.syncRules(contractId, rules);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "MeasurementRule",
      entityId: contractId,
      afterData: { rulesCount: result.length },
      description: `Regras de medicao sincronizadas: ${result.length} regras`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(syncHandler);
