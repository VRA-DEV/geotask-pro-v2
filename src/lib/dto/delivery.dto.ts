import { z } from "zod";

export const createDeliverySchema = z.object({
  lot_id: z.number().int().positive("Lote obrigatorio"),
  contract_item_id: z.number().int().positive("Item do contrato obrigatorio"),
  type: z.string().min(1, "Tipo obrigatorio"),
  subtype: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  protocol_number: z.string().optional().nullable(),
  protocol_date: z.string().optional().nullable(),
  delivered_at: z.string().min(1, "Data de entrega obrigatoria"),
});

export const createBulkDeliverySchema = z.object({
  deliveries: z.array(createDeliverySchema).min(1, "Ao menos uma entrega"),
});

export const substituteDeliverySchema = z.object({
  new_url: z.string().optional().nullable(),
  new_link: z.string().optional().nullable(),
  reason: z.string().min(1, "Motivo da substituicao obrigatorio"),
  retroactive_date: z.string().optional().nullable(),
});

export const deliveryQuerySchema = z.object({
  lot_id: z.coerce.number().int().optional(),
  contract_id: z.coerce.number().int().optional(),
  contract_item_id: z.coerce.number().int().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type SubstituteDeliveryInput = z.infer<typeof substituteDeliverySchema>;
export type DeliveryQueryInput = z.infer<typeof deliveryQuerySchema>;
