import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError, AppError } from "@/lib/errors";
import type { ImportQueryInput } from "@/lib/dto/lot.dto";
import AdmZip from "adm-zip";
import * as shapefile from "shapefile";
import proj4 from "proj4";

// Register common EPSG projections for Brazilian data
proj4.defs("EPSG:31985", "+proj=utm +zone=25 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:31984", "+proj=utm +zone=24 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:31983", "+proj=utm +zone=23 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:31982", "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:31981", "+proj=utm +zone=21 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

const WGS84 = "EPSG:4326";
const DEFAULT_PROJECTION = "EPSG:31985"; // Maceio/AL default

interface ParsedLot {
  code: string;
  beneficiary?: string;
  cpf?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  geometry_wkt?: string;
  category?: string;
  area?: number;
  metadata?: Record<string, unknown>;
}

interface ImportPreview {
  to_create: ParsedLot[];
  to_update: Array<{ existing_id: number; data: ParsedLot }>;
  to_delete: Array<{ id: number; code: string }>;
  summary: {
    total_in_file: number;
    to_create: number;
    to_update: number;
    to_delete: number;
  };
}

export class ImportService {
  /**
   * Analyze a shapefile ZIP and generate import preview (diff with existing data).
   */
  static async analyzeShapefile(
    fileBuffer: Buffer,
    contractId: number,
    neighborhood?: string,
    userId?: number,
  ): Promise<{ import_id: number; preview: ImportPreview }> {
    // Validate contract exists
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.deleted_at) throw new NotFoundError("Contrato", contractId);

    // Parse ZIP and extract SHP/DBF
    const { features, projection } = await this.parseShapefileZip(fileBuffer);
    if (features.length === 0) throw new ValidationError("Nenhum registro encontrado no shapefile");

    // Normalize features to lots
    const parsedLots = features.map((f) => this.featureToLot(f, projection));

    // Get existing lots for comparison
    const existingWhere: Prisma.LotWhereInput = {
      contract_id: contractId,
      deleted_at: null,
    };
    if (neighborhood) {
      existingWhere.neighborhood = { equals: neighborhood, mode: "insensitive" };
    }
    const existingLots = await prisma.lot.findMany({ where: existingWhere });

    // Generate diff
    const existingMap = new Map(existingLots.map((l) => [l.code, l]));
    const parsedMap = new Map(parsedLots.map((l) => [l.code, l]));

    const toCreate: ParsedLot[] = [];
    const toUpdate: Array<{ existing_id: number; data: ParsedLot }> = [];
    const toDelete: Array<{ id: number; code: string }> = [];

    // Check parsed lots against existing
    for (const [code, lot] of parsedMap) {
      const existing = existingMap.get(code);
      if (existing) {
        toUpdate.push({ existing_id: existing.id, data: lot });
      } else {
        toCreate.push(lot);
      }
    }

    // Check existing lots not in parsed (to delete)
    for (const [code, lot] of existingMap) {
      if (!parsedMap.has(code)) {
        toDelete.push({ id: lot.id, code });
      }
    }

    const preview: ImportPreview = {
      to_create: toCreate,
      to_update: toUpdate,
      to_delete: toDelete,
      summary: {
        total_in_file: parsedLots.length,
        to_create: toCreate.length,
        to_update: toUpdate.length,
        to_delete: toDelete.length,
      },
    };

    // Save import record with preview
    const importRecord = await prisma.$transaction(async (tx) => {
      const imp = await tx.import.create({
        data: {
          type: "SHAPEFILE",
          filename: "upload.zip",
          status: "PENDING",
          contract_id: contractId,
          total_records: parsedLots.length,
          created_count: toCreate.length,
          updated_count: toUpdate.length,
          deleted_count: toDelete.length,
          preview_data: preview as unknown as Prisma.InputJsonValue,
          created_by_id: userId || 0,
        },
      });

      // Save detail records for audit trail
      const details = [
        ...toCreate.map((lot) => ({
          import_id: imp.id,
          action: "CREATE" as const,
          changes: lot as unknown as Prisma.InputJsonValue,
        })),
        ...toUpdate.map((item) => ({
          import_id: imp.id,
          lot_id: item.existing_id,
          action: "UPDATE" as const,
          changes: item.data as unknown as Prisma.InputJsonValue,
        })),
        ...toDelete.map((item) => ({
          import_id: imp.id,
          lot_id: item.id,
          action: "DELETE" as const,
          changes: { code: item.code } as unknown as Prisma.InputJsonValue,
        })),
      ];

      if (details.length > 0) {
        await tx.importDetail.createMany({ data: details });
      }

      return imp;
    });

    return { import_id: importRecord.id, preview };
  }

  /**
   * Confirm and execute a pending import.
   */
  static async confirmImport(importId: number, userId: number) {
    const imp = await prisma.import.findUnique({
      where: { id: importId },
      include: { details: true },
    });
    if (!imp) throw new NotFoundError("Import", importId);
    if (imp.status !== "PENDING") throw new AppError(`Import ja ${imp.status.toLowerCase()}`, 400);
    if (!imp.contract_id) throw new ValidationError("Import sem contrato vinculado");

    const contractId = imp.contract_id;

    await prisma.$transaction(async (tx) => {
      for (const detail of imp.details) {
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
              geometry_wkt: rest.geometry_wkt as string | undefined,
              category: rest.category as string | undefined,
              area: rest.area as number | undefined,
              process_status: "SHPINFO",
              ...(metadata !== undefined && {
                metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
              }),
            },
          });
        } else if (detail.action === "UPDATE" && detail.lot_id) {
          const { metadata, ...rest } = data;
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
              geometry_wkt: rest.geometry_wkt as string | undefined,
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

      // Mark import as confirmed
      await tx.import.update({
        where: { id: importId },
        data: { status: "CONFIRMED", confirmed_at: new Date() },
      });
    });

    return prisma.import.findUnique({
      where: { id: importId },
      include: { created_by: { select: { id: true, name: true } } },
    });
  }

  /**
   * Cancel a pending import.
   */
  static async cancelImport(importId: number) {
    const imp = await prisma.import.findUnique({ where: { id: importId } });
    if (!imp) throw new NotFoundError("Import", importId);
    if (imp.status !== "PENDING") throw new AppError(`Import ja ${imp.status.toLowerCase()}`, 400);

    return prisma.import.update({
      where: { id: importId },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * Get import details.
   */
  static async getById(importId: number) {
    const imp = await prisma.import.findUnique({
      where: { id: importId },
      include: {
        details: { include: { lot: { select: { id: true, code: true } } } },
        created_by: { select: { id: true, name: true } },
      },
    });
    if (!imp) throw new NotFoundError("Import", importId);
    return imp;
  }

  /**
   * List imports with filters.
   */
  static async list(query: ImportQueryInput) {
    const { contract_id, status, type, page, limit } = query;
    const where: Prisma.ImportWhereInput = {};
    if (contract_id) where.contract_id = contract_id;
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      prisma.import.findMany({
        where,
        include: {
          created_by: { select: { id: true, name: true } },
          _count: { select: { details: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.import.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /**
   * Parse shapefile ZIP buffer and extract GeoJSON features.
   */
  private static async parseShapefileZip(
    buffer: Buffer,
  ): Promise<{ features: GeoJSON.Feature[]; projection: string }> {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    let shpBuffer: Buffer | null = null;
    let dbfBuffer: Buffer | null = null;
    let prjContent: string | null = null;

    for (const entry of entries) {
      const name = entry.entryName.toLowerCase();
      if (name.endsWith(".shp")) shpBuffer = entry.getData();
      else if (name.endsWith(".dbf")) dbfBuffer = entry.getData();
      else if (name.endsWith(".prj")) prjContent = entry.getData().toString("utf-8");
    }

    if (!shpBuffer || !dbfBuffer) {
      throw new ValidationError("ZIP deve conter arquivos .shp e .dbf");
    }

    // Detect projection from PRJ
    const projection = this.detectProjection(prjContent);

    // Parse shapefile
    const features: GeoJSON.Feature[] = [];
    try {
      const source = await shapefile.open(shpBuffer, dbfBuffer, { encoding: "utf-8" });
      let result = await source.read();
      while (!result.done) {
        if (result.value) features.push(result.value as GeoJSON.Feature);
        result = await source.read();
      }
    } catch {
      // Fallback to ISO-8859-1 encoding for Brazilian data
      try {
        const source = await shapefile.open(shpBuffer, dbfBuffer, { encoding: "iso-8859-1" });
        let result = await source.read();
        while (!result.done) {
          if (result.value) features.push(result.value as GeoJSON.Feature);
          result = await source.read();
        }
      } catch (e) {
        throw new ValidationError(`Erro ao parsear shapefile: ${e instanceof Error ? e.message : "erro desconhecido"}`);
      }
    }

    return { features, projection };
  }

  /**
   * Detect EPSG projection from PRJ file content.
   */
  private static detectProjection(prjContent: string | null): string {
    if (!prjContent) return DEFAULT_PROJECTION;

    const upper = prjContent.toUpperCase();

    // Check for WGS84 — no conversion needed
    if (upper.includes("WGS") && upper.includes("84") && upper.includes("GEOGCS")) {
      return WGS84;
    }

    // Try to detect UTM zone
    const zoneMatch = upper.match(/ZONE[_\s]*(\d+)/);
    if (zoneMatch) {
      const zone = parseInt(zoneMatch[1]);
      if (zone >= 21 && zone <= 25) {
        return `EPSG:319${80 + zone}`;
      }
    }

    // Check for SIRGAS 2000
    if (upper.includes("SIRGAS") || upper.includes("GRS") || upper.includes("GRS80")) {
      return DEFAULT_PROJECTION;
    }

    return DEFAULT_PROJECTION;
  }

  /**
   * Convert a GeoJSON feature to a ParsedLot.
   */
  private static featureToLot(feature: GeoJSON.Feature, sourceProjection: string): ParsedLot {
    const props = feature.properties || {};

    // Sanitize string values
    const sanitize = (val: unknown): string | undefined => {
      if (val === null || val === undefined) return undefined;
      return String(val).replace(/\u0000/g, "").trim() || undefined;
    };

    // Generate unique lot code
    const city = sanitize(props.cidade || props.CIDADE || props.city);
    const neighborhood = sanitize(props.bairro || props.BAIRRO || props.neighborhood);
    const quadra = sanitize(props.quadra || props.QUADRA || props.block);
    const lote = sanitize(props.lote || props.LOTE || props.lot);
    const code = this.generateLotCode(city, neighborhood, quadra, lote);

    // Extract centroid coordinates
    let latitude: number | undefined;
    let longitude: number | undefined;
    let geometryWkt: string | undefined;

    if (feature.geometry) {
      const centroid = this.getCentroid(feature.geometry, sourceProjection);
      latitude = centroid?.lat;
      longitude = centroid?.lng;
      geometryWkt = this.geometryToWkt(feature.geometry, sourceProjection);
    }

    // Parse area
    let area: number | undefined;
    const rawArea = props.area || props.AREA || props.shape_area || props.SHAPE_AREA;
    if (rawArea !== null && rawArea !== undefined) {
      area = parseFloat(String(rawArea));
      if (isNaN(area)) area = undefined;
    }

    return {
      code,
      beneficiary: sanitize(props.beneficiario || props.BENEFICIARIO || props.nome || props.NOME),
      cpf: sanitize(props.cpf || props.CPF),
      address: sanitize(props.rua || props.RUA || props.endereco || props.ENDERECO || props.address),
      neighborhood,
      city,
      state: sanitize(props.estado || props.ESTADO || props.uf || props.UF || props.state),
      latitude,
      longitude,
      geometry_wkt: geometryWkt,
      category: sanitize(props.categoria || props.CATEGORIA || props.category),
      area,
      metadata: this.extractMetadata(props),
    };
  }

  /**
   * Generate a deterministic unique lot code.
   * Pattern: {CITY}{NEIGHBORHOOD}{QUADRA_PADDED}{LOT_PADDED}
   */
  private static generateLotCode(
    city?: string,
    neighborhood?: string,
    quadra?: string,
    lote?: string,
  ): string {
    const normalize = (s?: string): string => {
      if (!s) return "";
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    };

    const padNum = (s?: string): string => {
      if (!s) return "000";
      const num = parseInt(s.replace(/\D/g, ""));
      return isNaN(num) ? normalize(s).padStart(3, "0") : String(num).padStart(3, "0");
    };

    return `${normalize(city)}${normalize(neighborhood)}${padNum(quadra)}${padNum(lote)}`;
  }

  /**
   * Get centroid of a geometry, converting from source projection to WGS84.
   */
  private static getCentroid(
    geometry: GeoJSON.Geometry,
    sourceProjection: string,
  ): { lat: number; lng: number } | null {
    try {
      const coords = this.extractCoordinates(geometry);
      if (coords.length === 0) return null;

      // Calculate centroid
      let sumX = 0, sumY = 0;
      for (const [x, y] of coords) {
        sumX += x;
        sumY += y;
      }
      const cx = sumX / coords.length;
      const cy = sumY / coords.length;

      // Convert to WGS84 if needed
      if (sourceProjection === WGS84) {
        return { lat: cy, lng: cx };
      }

      const [lng, lat] = proj4(sourceProjection, WGS84, [cx, cy]);
      return { lat, lng };
    } catch {
      return null;
    }
  }

  /**
   * Convert geometry to WKT string.
   */
  private static geometryToWkt(geometry: GeoJSON.Geometry, sourceProjection: string): string | undefined {
    try {
      const convertCoord = (coord: number[]): number[] => {
        if (sourceProjection === WGS84) return coord;
        return proj4(sourceProjection, WGS84, [coord[0], coord[1]]);
      };

      switch (geometry.type) {
        case "Point": {
          const [x, y] = convertCoord(geometry.coordinates);
          return `POINT(${x} ${y})`;
        }
        case "MultiPoint": {
          const pts = geometry.coordinates.map((c) => {
            const [x, y] = convertCoord(c);
            return `${x} ${y}`;
          });
          return `MULTIPOINT(${pts.map((p) => `(${p})`).join(",")})`;
        }
        case "LineString": {
          const pts = geometry.coordinates.map((c) => {
            const [x, y] = convertCoord(c);
            return `${x} ${y}`;
          });
          return `LINESTRING(${pts.join(",")})`;
        }
        case "Polygon": {
          const rings = geometry.coordinates.map((ring) => {
            const pts = ring.map((c) => {
              const [x, y] = convertCoord(c);
              return `${x} ${y}`;
            });
            return `(${pts.join(",")})`;
          });
          return `POLYGON(${rings.join(",")})`;
        }
        case "MultiPolygon": {
          const polys = geometry.coordinates.map((poly) => {
            const rings = poly.map((ring) => {
              const pts = ring.map((c) => {
                const [x, y] = convertCoord(c);
                return `${x} ${y}`;
              });
              return `(${pts.join(",")})`;
            });
            return `(${rings.join(",")})`;
          });
          return `MULTIPOLYGON(${polys.join(",")})`;
        }
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Extract flat array of [x, y] coordinates from any geometry type.
   */
  private static extractCoordinates(geometry: GeoJSON.Geometry): number[][] {
    switch (geometry.type) {
      case "Point":
        return [geometry.coordinates];
      case "MultiPoint":
      case "LineString":
        return geometry.coordinates;
      case "MultiLineString":
      case "Polygon":
        return geometry.coordinates.flat();
      case "MultiPolygon":
        return geometry.coordinates.flat(2);
      case "GeometryCollection":
        return geometry.geometries.flatMap((g) => this.extractCoordinates(g));
      default:
        return [];
    }
  }

  /**
   * Extract remaining properties as metadata.
   */
  private static extractMetadata(props: Record<string, unknown>): Record<string, unknown> | undefined {
    const knownKeys = new Set([
      "cidade", "CIDADE", "city",
      "bairro", "BAIRRO", "neighborhood",
      "quadra", "QUADRA", "block",
      "lote", "LOTE", "lot",
      "beneficiario", "BENEFICIARIO", "nome", "NOME",
      "cpf", "CPF",
      "rua", "RUA", "endereco", "ENDERECO", "address",
      "estado", "ESTADO", "uf", "UF", "state",
      "area", "AREA", "shape_area", "SHAPE_AREA",
      "categoria", "CATEGORIA", "category",
    ]);

    const extra: Record<string, unknown> = {};
    let hasExtra = false;

    for (const [key, value] of Object.entries(props)) {
      if (!knownKeys.has(key) && value !== null && value !== undefined) {
        extra[key] = value;
        hasExtra = true;
      }
    }

    return hasExtra ? extra : undefined;
  }
}
