import { z } from "zod";

export const createClientSchema = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ invalido")
    .transform((v) => v.replace(/\D/g, "")),
  razao_social: z.string().min(2, "Razao social obrigatoria"),
  nome_fantasia: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  api_data: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();

export const clientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientQueryInput = z.infer<typeof clientQuerySchema>;
