import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, AppError, ValidationError } from "@/lib/errors";

interface EcoletaLot {
  id: string;
  codigo: string;
  beneficiario?: string;
  cpf?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
  categoria?: string;
  status?: string;
  area?: number;
  [key: string]: unknown;
}

interface ComplianceSyncResult {
  import_id: number;
  summary: {
    total_from_api: number;
    created: number;
    updated: number;
    deleted: number;
  };
}

export class ComplianceService {
  /**
   * Sync lots from Ecoleta external API for a contract.
   * Creates an Import record with preview, auto-confirmed.
   */
  static async syncFromEcoleta(
    contractId: number,
    neighborhood: string | undefined,
    userId: number,
  ): Promise<ComplianceSyncResult> {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.deleted_at) throw new NotFoundError("Contrato", contractId);

    const apiUrl = process.env.ECOLETA_API_URL;
    const apiKey = process.env.ECOLETA_API_KEY;
    if (!apiUrl) throw new AppError("ECOLETA_API_URL nao configurado", 500);

    // Fetch data from external API
    const ecoletaLots = await this.fetchFromEcoleta(apiUrl, apiKey, contractId, neighborhood);

    // Get existing lots for comparison
    const existingWhere: Prisma.LotWhereInput = {
      contract_id: contractId,
      deleted_at: null,
    };
    if (neighborhood) {
      existingWhere.neighborhood = { equals: neighborhood, mode: "insensitive" };
    }
    const existingLots = await prisma.lot.findMany({ where: existingWhere });
    const existingMap = new Map(existingLots.map((l) => [l.code, l]));

    // Normalize and compare
    const normalizedLots = ecoletaLots.map((l) => this.normalizeLot(l));
    const normalizedMap = new Map(normalizedLots.map((l) => [l.code as string, l]));

    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    const importDetails: Array<{
      action: string;
      lot_id?: number;
      changes: Prisma.InputJsonValue;
    }> = [];

    // Process creates and updates
    for (const [code, lot] of normalizedMap) {
      const existing = existingMap.get(code);
      if (existing) {
        importDetails.push({
          action: "UPDATE",
          lot_id: existing.id,
          changes: lot as unknown as Prisma.InputJsonValue,
        });
        updatedCount++;
      } else {
        importDetails.push({
          action: "CREATE",
          changes: lot as unknown as Prisma.InputJsonValue,
        });
        createdCount++;
      }
    }

    // Lots in DB but not in API (soft-delete)
    for (const [code, lot] of existingMap) {
      if (!normalizedMap.has(code)) {
        importDetails.push({
          action: "DELETE",
          lot_id: lot.id,
          changes: { code } as Prisma.InputJsonValue,
        });
        deletedCount++;
      }
    }

    // Execute in transaction
    const importRecord = await prisma.$transaction(async (tx) => {
      const imp = await tx.import.create({
        data: {
          type: "API_ECOLETA",
          status: "CONFIRMED",
          contract_id: contractId,
          total_records: ecoletaLots.length,
          created_count: createdCount,
          updated_count: updatedCount,
          deleted_count: deletedCount,
          confirmed_at: new Date(),
          created_by_id: userId,
        },
      });

      // Save details
      if (importDetails.length > 0) {
        await tx.importDetail.createMany({
          data: importDetails.map((d) => ({
            import_id: imp.id,
            lot_id: d.lot_id,
            action: d.action,
            changes: d.changes,
          })),
        });
      }

      // Execute changes
      for (const detail of importDetails) {
        const data = detail.changes as Record<string, unknown>;

        if (detail.action === "CREATE") {
          const { metadata, ...rest } = data;
          await tx.lot.create({
            data: {
              contract_id: contractId,
              code: rest.code as string,
              external_id: rest.external_id as string | undefined,
              beneficiary: rest.beneficiary as string | undefined,
              cpf: rest.cpf as string | undefined,
              address: rest.address as string | undefined,
              neighborhood: rest.neighborhood as string | undefined,
              city: rest.city as string | undefined,
              state: rest.state as string | undefined,
              latitude: rest.latitude as number | undefined,
              longitude: rest.longitude as number | undefined,
              category: rest.category as string | undefined,
              process_status: rest.process_status as string | undefined ?? "ECOLETA",
              area: rest.area as number | undefined,
              ...(metadata !== undefined && {
                metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
              }),
            },
          });
        } else if (detail.action === "UPDATE" && detail.lot_id) {
          const { metadata, code: _code, ...rest } = data;
          await tx.lot.update({
            where: { id: detail.lot_id },
            data: {
              beneficiary: rest.beneficiary as string | undefined,
              cpf: rest.cpf as string | undefined,
              address: rest.address as string | undefined,
              neighborhood: rest.neighborhood as string | undefined,
              city: rest.city as string | undefined,
              state: rest.state as string | undefined,
              latitude: rest.latitude as number | undefined,
              longitude: rest.longitude as number | undefined,
              category: rest.category as string | undefined,
              area: rest.area as number | undefined,
              ...(metadata !== undefined && {
                metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
              }),
            },
          });
        } else if (detail.action === "DELETE" && detail.lot_id) {
          await tx.lot.update({
            where: { id: detail.lot_id },
            data: { deleted_at: new Date() },
          });
        }
      }

      return imp;
    });

    return {
      import_id: importRecord.id,
      summary: {
        total_from_api: ecoletaLots.length,
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
      },
    };
  }

  /**
   * Get compliance status for a contract (lot statistics from Ecoleta).
   */
  static async getStatus(contractId: number) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.deleted_at) throw new NotFoundError("Contrato", contractId);

    const [totalLots, lastSync, syncHistory] = await Promise.all([
      prisma.lot.count({ where: { contract_id: contractId, deleted_at: null } }),
      prisma.import.findFirst({
        where: { contract_id: contractId, type: "API_ECOLETA", status: "CONFIRMED" },
        orderBy: { confirmed_at: "desc" },
        select: { id: true, confirmed_at: true, created_count: true, updated_count: true, deleted_count: true },
      }),
      prisma.import.findMany({
        where: { contract_id: contractId, type: "API_ECOLETA" },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true, status: true, created_at: true, confirmed_at: true,
          total_records: true, created_count: true, updated_count: true, deleted_count: true,
        },
      }),
    ]);

    return {
      contract_id: contractId,
      total_lots: totalLots,
      last_sync: lastSync,
      sync_history: syncHistory,
    };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /**
   * Fetch lots from Ecoleta external API.
   */
  private static async fetchFromEcoleta(
    apiUrl: string,
    apiKey: string | undefined,
    contractId: number,
    neighborhood?: string,
  ): Promise<EcoletaLot[]> {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const url = new URL(`${apiUrl}/lotes`);
      url.searchParams.set("contrato_id", String(contractId));
      if (neighborhood) url.searchParams.set("bairro", neighborhood);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new AppError(`Ecoleta API retornou ${res.status}: ${res.statusText}`, 502);
      }

      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data || json.lotes || [];

      if (!Array.isArray(data)) {
        throw new ValidationError("Resposta da API Ecoleta em formato inesperado");
      }

      return data as EcoletaLot[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Erro ao conectar com API Ecoleta: ${error instanceof Error ? error.message : "desconhecido"}`,
        502,
      );
    }
  }

  /**
   * Normalize an Ecoleta lot to internal format.
   */
  private static normalizeLot(lot: EcoletaLot): Record<string, unknown> {
    const normalize = (val: unknown): string | undefined => {
      if (val === null || val === undefined) return undefined;
      return String(val).trim() || undefined;
    };

    const city = normalize(lot.cidade);
    const neighborhood = normalize(lot.bairro);
    const code = lot.codigo || this.generateCode(city, neighborhood, lot.id);

    return {
      code,
      external_id: lot.id ? String(lot.id) : undefined,
      beneficiary: normalize(lot.beneficiario),
      cpf: normalize(lot.cpf),
      address: normalize(lot.endereco),
      neighborhood,
      city,
      state: normalize(lot.estado),
      latitude: lot.latitude,
      longitude: lot.longitude,
      category: normalize(lot.categoria),
      process_status: normalize(lot.status) || "ECOLETA",
      area: lot.area,
    };
  }

  private static generateCode(city?: string, neighborhood?: string, id?: string): string {
    const norm = (s?: string): string => {
      if (!s) return "";
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    };
    return `${norm(city)}${norm(neighborhood)}${id || Date.now()}`;
  }
}
