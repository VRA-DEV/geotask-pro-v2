import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Senha obrigatoria"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
  role_id: z.number().int().positive(),
  sector_id: z.number().int().positive(),
  team_id: z.number().int().optional(),
  client_id: z.number().int().optional(),
  user_type: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL"),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Senha atual obrigatoria"),
  new_password: z.string().min(6, "Nova senha deve ter no minimo 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
