import { z } from "zod";

// ============================================================
// Billing Rule DTOs
// ============================================================

export const billingRuleSchema = z.object({
  contract_item_id: z.coerce.number().int().positive("Item obrigatorio"),
  field: z.enum(["CATEGORIA", "STATUS_PROCESSO"], { message: "Campo invalido" }),
  values: z.array(z.string()).min(1, "Pelo menos um valor obrigatorio"),
  active: z.boolean().default(true),
});

export const updateBillingRuleSchema = billingRuleSchema.partial();

// ============================================================
// Invoice / BM DTOs
// ============================================================

export const generateInvoiceSchema = z.object({
  contract_id: z.coerce.number().int().positive("Contrato obrigatorio"),
  contract_item_ids: z.array(z.coerce.number().int().positive()).min(1, "Selecione ao menos um item"),
  filters: z
    .object({
      category: z.string().optional(),
      process_status: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
});

export const invoiceActionSchema = z.object({
  action: z.enum(["FATURAR", "RECUSAR"]),
  nf_number: z.string().optional(),
  reject_reason: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  contract_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["AGUARDANDO", "FATURADO", "RECUSADO"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================
// Payment DTOs
// ============================================================

export const createPaymentSchema = z.object({
  invoice_id: z.coerce.number().int().positive("Invoice obrigatoria"),
  nf_number: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Valor obrigatorio"),
  paid_at: z.coerce.date().optional().nullable(),
});

export const paymentQuerySchema = z.object({
  invoice_id: z.coerce.number().int().positive().optional(),
  contract_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================
// Types
// ============================================================

export type BillingRuleInput = z.infer<typeof billingRuleSchema>;
export type UpdateBillingRuleInput = z.infer<typeof updateBillingRuleSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type InvoiceActionInput = z.infer<typeof invoiceActionSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
