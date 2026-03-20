import { NextResponse } from "next/server";
import { withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ContractService } from "@/lib/services/contract.service";
import { LogService } from "@/lib/services/log.service";
import { geoDistributionSchema } from "@/lib/dto/contract.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

const createHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const data = validateDto(geoDistributionSchema, body);
    const dist = await ContractService.addDistribution(contractId, data);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "GeographicDistribution",
      entityId: dist.id,
      afterData: { state: dist.state, city: dist.city, quantity: dist.quantity },
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: dist }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const deleteHandler: AuthenticatedHandler = async (req) => {
  try {
    const distId = Number(req.nextUrl.searchParams.get("distribution_id"));
    if (!distId) return NextResponse.json({ error: "distribution_id obrigatorio" }, { status: 400 });

    await ContractService.deleteDistribution(distId);
    return NextResponse.json({ message: "Distribuicao removida" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withRoles(["Admin", "Gerente"])(createHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(deleteHandler);
