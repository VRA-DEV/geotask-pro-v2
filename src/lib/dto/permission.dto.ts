import { z } from "zod";

const booleanPermissions = z.record(z.string(), z.boolean());

export const permissionsSchema = z.object({
  pages: booleanPermissions,
  tasks: booleanPermissions,
  contracts: booleanPermissions,
  lots: booleanPermissions,
  deliveries: booleanPermissions,
  financial: booleanPermissions,
  settings: booleanPermissions,
});

export const savePermissionsSchema = z.object({
  role_id: z.coerce.number().int().positive("Cargo obrigatorio"),
  permissions: permissionsSchema,
});

export const userSectorLinkSchema = z.object({
  user_id: z.coerce.number().int().positive("Usuario obrigatorio"),
  sector_id: z.coerce.number().int().positive("Setor obrigatorio"),
});

export const userSectorSyncSchema = z.object({
  user_id: z.coerce.number().int().positive("Usuario obrigatorio"),
  sector_ids: z.array(z.coerce.number().int().positive()),
});

export type SavePermissionsInput = z.infer<typeof savePermissionsSchema>;
export type UserSectorLinkInput = z.infer<typeof userSectorLinkSchema>;
export type UserSectorSyncInput = z.infer<typeof userSectorSyncSchema>;
