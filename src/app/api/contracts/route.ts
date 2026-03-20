import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ContractService } from "@/lib/services/contract.service";
import { LogService } from "@/lib/services/log.service";
import { createContractSchema, updateContractSchema, contractQuerySchema } from "@/lib/dto/contract.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(contractQuerySchema, params);
    const result = await ContractService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(createContractSchema, body);
    const contract = await ContractService.create(data, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Contract",
      entityId: contract.id,
      afterData: { number: contract.number, client_id: contract.client_id },
      description: `Contrato criado: ${contract.number}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: contract, message: "Contrato criado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const updateHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    const data = validateDto(updateContractSchema, body);
    const { before, after } = await ContractService.update(id, data);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Contract",
      entityId: id,
      beforeData: { number: before.number, status: before.status },
      afterData: { number: after.number, status: after.status },
      description: `Contrato atualizado: ${after.number}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: after });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const deleteHandler: AuthenticatedHandler = async (req) => {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    const contract = await ContractService.delete(id);

    await LogService.audit({
      userId: req.user.userId,
      action: "DELETE",
      entity: "Contract",
      entityId: id,
      beforeData: { number: contract.number },
      description: `Contrato cancelado: ${contract.number}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Contrato cancelado" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(createHandler);
export const PATCH = withRoles(["Admin", "Gerente"])(updateHandler);
export const DELETE = withRoles(["Admin"])(deleteHandler);
