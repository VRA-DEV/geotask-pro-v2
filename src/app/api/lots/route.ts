import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { LotService } from "@/lib/services/lot.service";
import { LogService } from "@/lib/services/log.service";
import { createLotSchema, lotQuerySchema, lotBulkUpdateSchema } from "@/lib/dto/lot.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots — List lots with filters, pagination, and optional CSV/JSON export.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(lotQuerySchema, params);

    // Handle export
    if (query.export) {
      const lots = await LotService.listForExport(query);

      if (query.export === "csv") {
        const csv = LotService.exportToCsv(lots as unknown as Array<Record<string, unknown>>);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="lotes_${Date.now()}.csv"`,
          },
        });
      }

      return NextResponse.json({ data: lots });
    }

    const result = await LotService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/lots — Create a single lot.
 */
const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(createLotSchema, body);
    const lot = await LotService.create(data);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Lot",
      entityId: lot.id,
      afterData: { code: lot.code, contract_id: lot.contract_id },
      description: `Lote criado: ${lot.code}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: lot, message: "Lote criado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PATCH /api/lots — Bulk update lots.
 */
const bulkUpdateHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const input = validateDto(lotBulkUpdateSchema, body);
    const result = await LotService.bulkUpdate(input);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Lot",
      afterData: { lot_ids: input.lot_ids, updated: result.updated },
      description: `${result.updated} lotes atualizados em lote`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: `${result.updated} lotes atualizados` });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente", "Diretor", "Coordenador de Polo", "Coordenador de Setores", "Gestor"])(createHandler);
export const PATCH = withRoles(["Admin", "Gerente"])(bulkUpdateHandler);
