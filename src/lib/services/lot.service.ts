import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type {
  CreateLotInput,
  UpdateLotInput,
  LotQueryInput,
  LotBulkUpdateInput,
} from "@/lib/dto/lot.dto";

const LOT_INCLUDE = {
  contract: { select: { id: true, number: true, client: { select: { id: true, razao_social: true } } } },
  _count: { select: { deliveries: true, import_details: true } },
};

export class LotService {
  /**
   * List lots with advanced filtering, pagination, sorting.
   */
  static async list(query: LotQueryInput) {
    const {
      contract_id,
      search,
      city,
      state,
      neighborhood,
      category,
      process_status,
      has_geometry,
      page,
      limit,
      sort_by,
      sort_order,
    } = query;

    const where: Prisma.LotWhereInput = { deleted_at: null };

    if (contract_id) where.contract_id = contract_id;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { equals: state, mode: "insensitive" };
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    if (category) where.category = category;
    if (process_status) where.process_status = process_status;

    if (has_geometry === "true") where.geometry_wkt = { not: null };
    if (has_geometry === "false") where.geometry_wkt = null;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { beneficiary: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search.replace(/\D/g, "") } },
        { address: { contains: search, mode: "insensitive" } },
        { external_id: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: LOT_INCLUDE,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lot.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List lots for export (no pagination, returns all matching).
   */
  static async listForExport(query: LotQueryInput) {
    const { contract_id, search, city, state, neighborhood, category, process_status, has_geometry, sort_by, sort_order } = query;

    const where: Prisma.LotWhereInput = { deleted_at: null };
    if (contract_id) where.contract_id = contract_id;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { equals: state, mode: "insensitive" };
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    if (category) where.category = category;
    if (process_status) where.process_status = process_status;
    if (has_geometry === "true") where.geometry_wkt = { not: null };
    if (has_geometry === "false") where.geometry_wkt = null;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { beneficiary: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search.replace(/\D/g, "") } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.lot.findMany({
      where,
      include: {
        contract: { select: { number: true, client: { select: { razao_social: true } } } },
      },
      orderBy: { [sort_by]: sort_order },
    });
  }

  /**
   * Get single lot by ID.
   */
  static async getById(id: number) {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        ...LOT_INCLUDE,
        deliveries: {
          include: { contract_item: { select: { id: true, description: true } } },
          orderBy: { created_at: "desc" },
          take: 20,
        },
      },
    });
    if (!lot || lot.deleted_at) throw new NotFoundError("Lote", id);
    return lot;
  }

  /**
   * Create a single lot.
   */
  static async create(data: CreateLotInput) {
    const { metadata, ...rest } = data;
    return prisma.lot.create({
      data: {
        ...rest,
        ...(metadata !== undefined && {
          metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
        }),
      },
      include: LOT_INCLUDE,
    });
  }

  /**
   * Update a lot.
   */
  static async update(id: number, data: UpdateLotInput) {
    const existing = await prisma.lot.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) throw new NotFoundError("Lote", id);

    const { metadata, ...rest } = data;
    const updated = await prisma.lot.update({
      where: { id },
      data: {
        ...rest,
        ...(metadata !== undefined && {
          metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
        }),
      },
      include: LOT_INCLUDE,
    });

    return { before: existing, after: updated };
  }

  /**
   * Soft-delete a lot.
   */
  static async delete(id: number) {
    const existing = await prisma.lot.findUnique({
      where: { id },
      include: { _count: { select: { deliveries: true } } },
    });
    if (!existing || existing.deleted_at) throw new NotFoundError("Lote", id);
    if (existing._count.deliveries > 0) {
      throw new ConflictError("Lote possui entregas vinculadas. Remova primeiro.");
    }

    await prisma.lot.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return existing;
  }

  /**
   * Bulk update lots.
   */
  static async bulkUpdate(input: LotBulkUpdateInput) {
    const { lot_ids, data } = input;
    const { metadata, ...rest } = data;

    const updateData: Prisma.LotUpdateManyMutationInput = { ...rest };
    if (metadata !== undefined) {
      updateData.metadata = metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);
    }

    const result = await prisma.lot.updateMany({
      where: { id: { in: lot_ids }, deleted_at: null },
      data: updateData,
    });

    return { updated: result.count };
  }

  /**
   * Get distinct values for filter dropdowns.
   */
  static async getFilterOptions(contractId?: number) {
    const where: Prisma.LotWhereInput = { deleted_at: null };
    if (contractId) where.contract_id = contractId;

    const [cities, states, neighborhoods, categories, statuses] = await Promise.all([
      prisma.lot.findMany({ where, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
      prisma.lot.findMany({ where, select: { state: true }, distinct: ["state"], orderBy: { state: "asc" } }),
      prisma.lot.findMany({ where, select: { neighborhood: true }, distinct: ["neighborhood"], orderBy: { neighborhood: "asc" } }),
      prisma.lot.findMany({ where, select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
      prisma.lot.findMany({ where, select: { process_status: true }, distinct: ["process_status"], orderBy: { process_status: "asc" } }),
    ]);

    return {
      cities: cities.map((c) => c.city).filter(Boolean) as string[],
      states: states.map((s) => s.state).filter(Boolean) as string[],
      neighborhoods: neighborhoods.map((n) => n.neighborhood).filter(Boolean) as string[],
      categories: categories.map((c) => c.category).filter(Boolean) as string[],
      process_statuses: statuses.map((s) => s.process_status).filter(Boolean) as string[],
    };
  }

  /**
   * Get lot statistics for a contract.
   */
  static async getStats(contractId: number) {
    const where: Prisma.LotWhereInput = { contract_id: contractId, deleted_at: null };

    const [total, withGeometry, byStatus, byCategory] = await Promise.all([
      prisma.lot.count({ where }),
      prisma.lot.count({ where: { ...where, geometry_wkt: { not: null } } }),
      prisma.lot.groupBy({
        by: ["process_status"],
        where,
        _count: { id: true },
      }),
      prisma.lot.groupBy({
        by: ["category"],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      with_geometry: withGeometry,
      without_geometry: total - withGeometry,
      by_status: byStatus.map((s) => ({ status: s.process_status || "SEM_STATUS", count: s._count.id })),
      by_category: byCategory.map((c) => ({ category: c.category || "SEM_CATEGORIA", count: c._count.id })),
    };
  }

  /**
   * Export lots to CSV string.
   */
  static exportToCsv(lots: Array<Record<string, unknown>>): string {
    if (lots.length === 0) return "";

    const headers = [
      "codigo", "id_externo", "beneficiario", "cpf", "endereco",
      "bairro", "cidade", "estado", "cep", "latitude", "longitude",
      "categoria", "status_processo", "area", "contrato",
    ];

    const rows = lots.map((lot) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l = lot as any;
      return [
        l.code, l.external_id || "", l.beneficiary || "", l.cpf || "",
        l.address || "", l.neighborhood || "", l.city || "", l.state || "",
        l.zip_code || "", l.latitude || "", l.longitude || "",
        l.category || "", l.process_status || "", l.area || "",
        l.contract?.number || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}
