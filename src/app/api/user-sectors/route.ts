import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { UserSectorService } from "@/lib/services/user-sector.service";
import { LogService } from "@/lib/services/log.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/user-sectors?user_id=X — Get sectors linked to a user.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const userId = Number(req.nextUrl.searchParams.get("user_id"));
    if (!userId) return NextResponse.json({ error: "user_id obrigatorio" }, { status: 400 });

    const result = await UserSectorService.listByUser(userId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/user-sectors — Link a user to an additional sector.
 * Body: { user_id: number, sector_id: number }
 */
const linkHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { user_id, sector_id } = body;

    if (!user_id || !sector_id) {
      return NextResponse.json({ error: "user_id e sector_id obrigatorios" }, { status: 400 });
    }

    const result = await UserSectorService.linkSector(Number(user_id), Number(sector_id));

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "UserSector",
      entityId: result.id,
      afterData: { user_id, sector_id, sector_name: result.sector.name },
      description: `Usuario vinculado ao setor ${result.sector.name}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Setor vinculado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PUT /api/user-sectors — Sync all sectors for a user (replace all links).
 * Body: { user_id: number, sector_ids: number[] }
 */
const syncHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { user_id, sector_ids } = body;

    if (!user_id || !Array.isArray(sector_ids)) {
      return NextResponse.json({ error: "user_id e sector_ids obrigatorios" }, { status: 400 });
    }

    const result = await UserSectorService.syncSectors(Number(user_id), sector_ids.map(Number));

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "UserSector",
      afterData: { user_id, sector_count: result.additional_sectors.length },
      description: `Setores do usuario sincronizados: ${result.additional_sectors.length} setores adicionais`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Setores sincronizados" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/user-sectors?user_id=X&sector_id=Y — Unlink a sector.
 */
const unlinkHandler: AuthenticatedHandler = async (req) => {
  try {
    const userId = Number(req.nextUrl.searchParams.get("user_id"));
    const sectorId = Number(req.nextUrl.searchParams.get("sector_id"));

    if (!userId || !sectorId) {
      return NextResponse.json({ error: "user_id e sector_id obrigatorios" }, { status: 400 });
    }

    await UserSectorService.unlinkSector(userId, sectorId);

    await LogService.audit({
      userId: req.user.userId,
      action: "DELETE",
      entity: "UserSector",
      afterData: { user_id: userId, sector_id: sectorId },
      description: `Vinculo usuario-setor removido`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Vinculo removido" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(linkHandler);
export const PUT = withRoles(["Admin", "Gerente"])(syncHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(unlinkHandler);
