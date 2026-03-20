import { z } from "zod";

// ============================================================
// Lot DTOs
// ============================================================

export const createLotSchema = z.object({
  contract_id: z.coerce.number().int().positive("Contrato obrigatorio"),
  code: z.string().min(1, "Codigo obrigatorio"),
  external_id: z.string().optional().nullable(),
  beneficiary: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  geometry_wkt: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  process_status: z.string().optional().nullable(),
  area: z.coerce.number().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateLotSchema = createLotSchema.partial().omit({ contract_id: true });

export const lotQuerySchema = z.object({
  contract_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  neighborhood: z.string().optional(),
  category: z.string().optional(),
  process_status: z.string().optional(),
  has_geometry: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  sort_by: z
    .enum(["code", "city", "neighborhood", "created_at", "updated_at", "process_status"])
    .default("code"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
  export: z.enum(["csv", "json"]).optional(),
});

export const lotBulkUpdateSchema = z.object({
  lot_ids: z.array(z.coerce.number().int().positive()).min(1),
  data: updateLotSchema,
});

// ============================================================
// Import DTOs
// ============================================================

export const importAnalyzeSchema = z.object({
  contract_id: z.coerce.number().int().positive("Contrato obrigatorio"),
  neighborhood: z.string().optional(),
});

export const importConfirmSchema = z.object({
  import_id: z.coerce.number().int().positive("Import ID obrigatorio"),
});

export const importQuerySchema = z.object({
  contract_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "ERROR"]).optional(),
  type: z.enum(["SHAPEFILE", "API_ECOLETA"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================
// Compliance DTOs
// ============================================================

export const complianceSyncSchema = z.object({
  contract_id: z.coerce.number().int().positive("Contrato obrigatorio"),
  neighborhood: z.string().optional(),
});

// ============================================================
// Types
// ============================================================

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
export type LotQueryInput = z.infer<typeof lotQuerySchema>;
export type LotBulkUpdateInput = z.infer<typeof lotBulkUpdateSchema>;
export type ImportAnalyzeInput = z.infer<typeof importAnalyzeSchema>;
export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;
export type ImportQueryInput = z.infer<typeof importQuerySchema>;
export type ComplianceSyncInput = z.infer<typeof complianceSyncSchema>;
