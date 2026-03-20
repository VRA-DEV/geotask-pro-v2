import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { GeoboardService } from "@/lib/services/geoboard.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/geoboard — Get map data + stats for Consulta Processual.
 *
 * Query params:
 * - type: "map" | "stats" | "filters" | "detail"
 * - contract_id, city, state, neighborhood, category, process_status, search
 * - lot_id (for type=detail)
 */
const handler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const type = params.type || "map";

    const filter = {
      contract_id: params.contract_id ? Number(params.contract_id) : undefined,
      city: params.city,
      state: params.state,
      neighborhood: params.neighborhood,
      category: params.category,
      process_status: params.process_status,
      search: params.search,
    };

    switch (type) {
      case "map": {
        const data = await GeoboardService.getMapData(filter);
        return NextResponse.json({ data });
      }
      case "stats": {
        const stats = await GeoboardService.getStats(filter);
        return NextResponse.json({ data: stats });
      }
      case "filters": {
        const options = await GeoboardService.getFilterOptions(filter.contract_id);
        return NextResponse.json({ data: options });
      }
      case "detail": {
        const lotId = Number(params.lot_id);
        if (!lotId) return NextResponse.json({ error: "lot_id obrigatorio" }, { status: 400 });
        const detail = await GeoboardService.getLotDetail(lotId);
        if (!detail) return NextResponse.json({ error: "Lote nao encontrado" }, { status: 404 });
        return NextResponse.json({ data: detail });
      }
      default:
        return NextResponse.json({ error: "Tipo invalido. Use: map, stats, filters, detail" }, { status: 400 });
    }
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
