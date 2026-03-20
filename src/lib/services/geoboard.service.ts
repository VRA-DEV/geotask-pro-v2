import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GeoBoard Service — provides data for the Consulta Processual module.
 * Aggregates lot data with geographic coordinates for map display
 * and process status tracking.
 */

interface GeoLot {
  id: number;
  code: string;
  latitude: number;
  longitude: number;
  process_status: string | null;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  beneficiary: string | null;
  contract_number: string | null;
}

interface GeoStats {
  total: number;
  by_status: Array<{ status: string; count: number }>;
  by_category: Array<{ category: string; count: number }>;
  by_city: Array<{ city: string; count: number }>;
  with_coordinates: number;
}

interface GeoFilter {
  contract_id?: number;
  city?: string;
  state?: string;
  neighborhood?: string;
  category?: string;
  process_status?: string;
  search?: string;
}

export class GeoboardService {
  /**
   * Get lots with coordinates for map rendering.
   * Returns lightweight data optimized for Leaflet markers.
   */
  static async getMapData(filter: GeoFilter): Promise<GeoLot[]> {
    const where = this.buildWhere(filter);
    where.latitude = { not: null };
    where.longitude = { not: null };

    const lots = await prisma.lot.findMany({
      where,
      select: {
        id: true,
        code: true,
        latitude: true,
        longitude: true,
        process_status: true,
        category: true,
        city: true,
        neighborhood: true,
        beneficiary: true,
        contract: { select: { number: true } },
      },
      orderBy: { code: "asc" },
    });

    return lots.map((l) => ({
      id: l.id,
      code: l.code,
      latitude: l.latitude!,
      longitude: l.longitude!,
      process_status: l.process_status,
      category: l.category,
      city: l.city,
      neighborhood: l.neighborhood,
      beneficiary: l.beneficiary,
      contract_number: l.contract.number,
    }));
  }

  /**
   * Get aggregated statistics for the dashboard.
   */
  static async getStats(filter: GeoFilter): Promise<GeoStats> {
    const where = this.buildWhere(filter);

    const [total, withCoords, byStatus, byCategory, byCity] = await Promise.all([
      prisma.lot.count({ where }),
      prisma.lot.count({ where: { ...where, latitude: { not: null }, longitude: { not: null } } }),
      prisma.lot.groupBy({ by: ["process_status"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      prisma.lot.groupBy({ by: ["category"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      prisma.lot.groupBy({ by: ["city"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 20 }),
    ]);

    return {
      total,
      with_coordinates: withCoords,
      by_status: byStatus.map((s) => ({ status: s.process_status || "SEM_STATUS", count: s._count.id })),
      by_category: byCategory.map((c) => ({ category: c.category || "SEM_CATEGORIA", count: c._count.id })),
      by_city: byCity.map((c) => ({ city: c.city || "SEM_CIDADE", count: c._count.id })),
    };
  }

  /**
   * Get lot detail for popup/panel display.
   */
  static async getLotDetail(lotId: number) {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        contract: {
          select: {
            id: true, number: true,
            client: { select: { razao_social: true } },
          },
        },
        deliveries: {
          select: { id: true, type: true, delivered_at: true, created_at: true },
          orderBy: { created_at: "desc" },
          take: 5,
        },
        _count: { select: { deliveries: true, lot_executions: true } },
      },
    });

    return lot;
  }

  /**
   * Get available filter options for the map interface.
   */
  static async getFilterOptions(contractId?: number) {
    const where: Prisma.LotWhereInput = { deleted_at: null };
    if (contractId) where.contract_id = contractId;

    const [contracts, cities, statuses, categories] = await Promise.all([
      prisma.contract.findMany({
        where: { deleted_at: null },
        select: { id: true, number: true, client: { select: { razao_social: true } } },
        orderBy: { number: "asc" },
      }),
      prisma.lot.findMany({ where, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
      prisma.lot.findMany({ where, select: { process_status: true }, distinct: ["process_status"] }),
      prisma.lot.findMany({ where, select: { category: true }, distinct: ["category"] }),
    ]);

    return {
      contracts: contracts.map((c) => ({ id: c.id, label: `${c.number} - ${c.client.razao_social}` })),
      cities: cities.map((c) => c.city).filter(Boolean) as string[],
      statuses: statuses.map((s) => s.process_status).filter(Boolean) as string[],
      categories: categories.map((c) => c.category).filter(Boolean) as string[],
    };
  }

  // ============================================================
  // Private
  // ============================================================

  private static buildWhere(filter: GeoFilter): Prisma.LotWhereInput {
    const where: Prisma.LotWhereInput = { deleted_at: null };

    if (filter.contract_id) where.contract_id = filter.contract_id;
    if (filter.city) where.city = { contains: filter.city, mode: "insensitive" };
    if (filter.state) where.state = { equals: filter.state, mode: "insensitive" };
    if (filter.neighborhood) where.neighborhood = { contains: filter.neighborhood, mode: "insensitive" };
    if (filter.category) where.category = filter.category;
    if (filter.process_status) where.process_status = filter.process_status;

    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: "insensitive" } },
        { beneficiary: { contains: filter.search, mode: "insensitive" } },
        { cpf: { contains: filter.search.replace(/\D/g, "") } },
      ];
    }

    return where;
  }
}
