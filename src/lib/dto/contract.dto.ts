import { z } from "zod";

export const createContractSchema = z.object({
  number: z.string().min(1, "Numero do contrato obrigatorio"),
  client_id: z.number().int().positive("Cliente obrigatorio"),
  start_date: z.string().min(1, "Data de inicio obrigatoria"),
  end_date: z.string().min(1, "Data de fim obrigatoria"),
  contracted_quantity: z.number().int().positive("Quantidade contratada obrigatoria"),
  status: z.string().default("ATIVO"),
});

export const updateContractSchema = z.object({
  number: z.string().min(1).optional(),
  client_id: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  contracted_quantity: z.number().int().positive().optional(),
  status: z.string().optional(),
});

export const contractItemSchema = z.object({
  description: z.string().min(1, "Descricao obrigatoria"),
  unit: z.string().min(1, "Unidade obrigatoria"),
  unit_value: z.number().positive("Valor unitario obrigatorio"),
  quantity: z.number().int().positive("Quantidade obrigatoria"),
});

export const geoDistributionSchema = z.object({
  state: z.string().min(1, "Estado obrigatorio"),
  city: z.string().min(1, "Cidade obrigatoria"),
  nucleus: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantidade obrigatoria"),
});

export const measurementRuleSchema = z.object({
  field: z.string().min(1, "Campo obrigatorio"),
  values: z.array(z.string().min(1)).min(1, "Ao menos um valor obrigatorio"),
  active: z.boolean().default(true),
});

export const contractQuerySchema = z.object({
  search: z.string().optional(),
  client_id: z.coerce.number().int().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ContractItemInput = z.infer<typeof contractItemSchema>;
export type GeoDistributionInput = z.infer<typeof geoDistributionSchema>;
export type MeasurementRuleInput = z.infer<typeof measurementRuleSchema>;
export type ContractQueryInput = z.infer<typeof contractQuerySchema>;
