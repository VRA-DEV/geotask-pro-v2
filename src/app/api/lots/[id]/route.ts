import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { LotService } from "@/lib/services/lot.service";
import { LogService } from "@/lib/services/log.service";
import { updateLotSchema } from "@/lib/dto/lot.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots/[id] — Get single lot with deliveries.
 */
const getHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const lot = await LotService.getById(id);
    return NextResponse.json({ data: lot });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PATCH /api/lots/[id] — Update a lot.
 */
const updateHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const data = validateDto(updateLotSchema, body);
    const { before, after } = await LotService.update(id, data);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Lot",
      entityId: id,
      beforeData: before,
      afterData: after,
      description: `Lote atualizado: ${after.code}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: after, message: "Lote atualizado" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/lots/[id] — Soft-delete a lot.
 */
const deleteHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const lot = await LotService.delete(id);

    await LogService.audit({
      userId: req.user.userId,
      action: "DELETE",
      entity: "Lot",
      entityId: id,
      beforeData: lot,
      description: `Lote removido: ${lot.code}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Lote removido" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withRoles(["Admin", "Gerente", "Coordenador de Setores"])(updateHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(deleteHandler);
