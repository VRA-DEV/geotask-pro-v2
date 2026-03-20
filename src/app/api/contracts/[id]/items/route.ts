import { NextRequest, NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ContractService } from "@/lib/services/contract.service";
import { LogService } from "@/lib/services/log.service";
import { contractItemSchema } from "@/lib/dto/contract.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

const createHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const contractId = Number(params?.id);
    if (!contractId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const data = validateDto(contractItemSchema, body);
    const item = await ContractService.addItem(contractId, data);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "ContractItem",
      entityId: item.id,
      afterData: { description: item.description, contractId },
      description: `Item adicionado ao contrato #${contractId}: ${item.description}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const updateHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { item_id, ...fields } = body;
    if (!item_id) return NextResponse.json({ error: "item_id obrigatorio" }, { status: 400 });

    const item = await ContractService.updateItem(item_id, fields);
    return NextResponse.json({ data: item });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const deleteHandler: AuthenticatedHandler = async (req) => {
  try {
    const itemId = Number(req.nextUrl.searchParams.get("item_id"));
    if (!itemId) return NextResponse.json({ error: "item_id obrigatorio" }, { status: 400 });

    const item = await ContractService.deleteItem(itemId);

    await LogService.audit({
      userId: req.user.userId,
      action: "DELETE",
      entity: "ContractItem",
      entityId: itemId,
      beforeData: { description: item.description },
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Item removido" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withRoles(["Admin", "Gerente"])(createHandler);
export const PATCH = withRoles(["Admin", "Gerente"])(updateHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(deleteHandler);
