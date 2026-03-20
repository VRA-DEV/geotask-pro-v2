import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
  role_id: z.number().int().positive("Cargo obrigatorio"),
  sector_id: z.number().int().positive("Setor obrigatorio"),
  team_id: z.number().int().positive().optional().nullable(),
  client_id: z.number().int().positive().optional().nullable(),
  user_type: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role_id: z.number().int().positive().optional(),
  sector_id: z.number().int().positive().optional(),
  team_id: z.number().int().positive().optional().nullable(),
  client_id: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
  user_type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role_id: z.coerce.number().int().optional(),
  sector_id: z.coerce.number().int().optional(),
  team_id: z.coerce.number().int().optional(),
  user_type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
