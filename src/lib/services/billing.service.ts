import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError, AppError, ConflictError } from "@/lib/errors";
import type {
  BillingRuleInput,
  UpdateBillingRuleInput,
  GenerateInvoiceInput,
  InvoiceActionInput,
  InvoiceQueryInput,
  CreatePaymentInput,
  PaymentQueryInput,
} from "@/lib/dto/financial.dto";

export class BillingService {
  // ============================================================
  // Billing Rules
  // ============================================================

  /**
   * List billing rules for a contract item (or all).
   */
  static async listRules(contractItemId?: number) {
    const where: Prisma.BillingRuleWhereInput = {};
    if (contractItemId) where.contract_item_id = contractItemId;

    return prisma.billingRule.findMany({
      where,
      include: {
        contract_item: {
          select: { id: true, description: true, contract: { select: { id: true, number: true } } },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  /**
   * Create a billing rule.
   */
  static async createRule(data: BillingRuleInput) {
    // Validate contract item exists
    const item = await prisma.contractItem.findUnique({ where: { id: data.contract_item_id } });
    if (!item) throw new NotFoundError("Item de contrato", data.contract_item_id);

    return prisma.billingRule.create({
      data: {
        contract_item_id: data.contract_item_id,
        field: data.field,
        values: data.values as unknown as Prisma.InputJsonValue,
        active: data.active,
      },
      include: {
        contract_item: { select: { id: true, description: true } },
      },
    });
  }

  /**
   * Update a billing rule.
   */
  static async updateRule(id: number, data: UpdateBillingRuleInput) {
    const existing = await prisma.billingRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Regra de faturamento", id);

    return prisma.billingRule.update({
      where: { id },
      data: {
        ...data,
        ...(data.values !== undefined && {
          values: data.values as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  /**
   * Delete a billing rule.
   */
  static async deleteRule(id: number) {
    const existing = await prisma.billingRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Regra de faturamento", id);
    await prisma.billingRule.delete({ where: { id } });
    return existing;
  }

  // ============================================================
  // Invoice (BM) Generation
  // ============================================================

  /**
   * Generate a Boletim de Medição (BM) — select lots matching billing rules
   * for given contract items and create an invoice.
   */
  static async generateInvoice(input: GenerateInvoiceInput, userId: number) {
    const { contract_id, contract_item_ids, filters } = input;

    // Validate contract
    const contract = await prisma.contract.findUnique({
      where: { id: contract_id },
      include: { items: true },
    });
    if (!contract || contract.deleted_at) throw new NotFoundError("Contrato", contract_id);

    // Validate items belong to contract
    const validItemIds = contract.items.map((i) => i.id);
    for (const itemId of contract_item_ids) {
      if (!validItemIds.includes(itemId)) {
        throw new ValidationError(`Item ${itemId} nao pertence ao contrato ${contract_id}`);
      }
    }

    // Get active billing rules for these items
    const rules = await prisma.billingRule.findMany({
      where: {
        contract_item_id: { in: contract_item_ids },
        active: true,
      },
    });

    // Build lot filter based on rules
    const lotWhere: Prisma.LotWhereInput = {
      contract_id,
      deleted_at: null,
    };

    // Apply user filters
    if (filters?.category) lotWhere.category = filters.category;
    if (filters?.process_status) lotWhere.process_status = filters.process_status;
    if (filters?.neighborhood) lotWhere.neighborhood = { contains: filters.neighborhood, mode: "insensitive" };
    if (filters?.city) lotWhere.city = { contains: filters.city, mode: "insensitive" };

    // Apply billing rule filters (OR across rules)
    if (rules.length > 0) {
      const ruleConditions: Prisma.LotWhereInput[] = [];
      for (const rule of rules) {
        const ruleValues = rule.values as string[];
        if (rule.field === "CATEGORIA") {
          ruleConditions.push({ category: { in: ruleValues } });
        } else if (rule.field === "STATUS_PROCESSO") {
          ruleConditions.push({ process_status: { in: ruleValues } });
        }
      }
      if (ruleConditions.length > 0) {
        lotWhere.OR = ruleConditions;
      }
    }

    // Find billable lots (not already billed for these items)
    const lots = await prisma.lot.findMany({
      where: lotWhere,
      select: { id: true, code: true, category: true, process_status: true, city: true, neighborhood: true },
    });

    if (lots.length === 0) {
      throw new ValidationError("Nenhum lote encontrado para os criterios selecionados");
    }

    // Check which lots are already billed for these items
    const alreadyBilled = await prisma.lotItemExecution.findMany({
      where: {
        lot_id: { in: lots.map((l) => l.id) },
        contract_item_id: { in: contract_item_ids },
        billed: true,
      },
      select: { lot_id: true, contract_item_id: true },
    });

    const billedSet = new Set(alreadyBilled.map((b) => `${b.lot_id}-${b.contract_item_id}`));

    // Calculate items and value
    const selectedItems = contract.items.filter((i) => contract_item_ids.includes(i.id));
    const totalValue = lots.length * selectedItems.reduce((sum, item) => sum + Number(item.unit_value || 0), 0);

    // Create invoice and lot executions in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          contract_id,
          status: "AGUARDANDO",
          total_lots: lots.length,
          total_value: totalValue,
          generated_by_id: userId,
          generated_data: {
            contract_item_ids,
            lot_ids: lots.map((l) => l.id),
            filters: filters || {},
            rules_applied: rules.map((r) => r.id),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Create/update lot executions
      for (const lot of lots) {
        for (const itemId of contract_item_ids) {
          const key = `${lot.id}-${itemId}`;
          if (billedSet.has(key)) continue; // Skip already billed

          await tx.lotItemExecution.upsert({
            where: {
              lot_id_contract_item_id: { lot_id: lot.id, contract_item_id: itemId },
            },
            create: {
              lot_id: lot.id,
              contract_item_id: itemId,
              billable: true,
              billed: false,
              invoice_id: inv.id,
            },
            update: {
              billable: true,
              invoice_id: inv.id,
            },
          });
        }
      }

      return inv;
    });

    return prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        contract: { select: { id: true, number: true } },
        generated_by: { select: { id: true, name: true } },
        _count: { select: { lot_executions: true, payments: true } },
      },
    });
  }

  /**
   * List invoices with filters.
   */
  static async listInvoices(query: InvoiceQueryInput) {
    const { contract_id, status, page, limit } = query;
    const where: Prisma.InvoiceWhereInput = {};
    if (contract_id) where.contract_id = contract_id;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          contract: { select: { id: true, number: true, client: { select: { razao_social: true } } } },
          generated_by: { select: { id: true, name: true } },
          billed_by: { select: { id: true, name: true } },
          rejected_by: { select: { id: true, name: true } },
          _count: { select: { lot_executions: true, payments: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /**
   * Get single invoice with details.
   */
  static async getInvoice(id: number) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true, number: true,
            client: { select: { id: true, razao_social: true, cnpj: true } },
            items: { select: { id: true, description: true, unit_value: true } },
          },
        },
        generated_by: { select: { id: true, name: true } },
        billed_by: { select: { id: true, name: true } },
        rejected_by: { select: { id: true, name: true } },
        lot_executions: {
          include: {
            lot: { select: { id: true, code: true, city: true, neighborhood: true, category: true } },
            contract_item: { select: { id: true, description: true, unit_value: true } },
          },
          take: 500,
        },
        payments: {
          include: { confirmed_by: { select: { id: true, name: true } } },
          orderBy: { created_at: "desc" },
        },
      },
    });
    if (!invoice) throw new NotFoundError("Invoice/BM", id);
    return invoice;
  }

  /**
   * Execute action on invoice (FATURAR or RECUSAR).
   */
  static async invoiceAction(id: number, input: InvoiceActionInput, userId: number) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError("Invoice/BM", id);
    if (invoice.status !== "AGUARDANDO") {
      throw new AppError(`BM ja ${invoice.status.toLowerCase()}`, 400);
    }

    if (input.action === "FATURAR") {
      return prisma.$transaction(async (tx) => {
        // Mark all lot executions as billed
        await tx.lotItemExecution.updateMany({
          where: { invoice_id: id },
          data: { billed: true },
        });

        return tx.invoice.update({
          where: { id },
          data: {
            status: "FATURADO",
            number: input.nf_number,
            billed_by_id: userId,
            billed_at: new Date(),
          },
          include: {
            contract: { select: { id: true, number: true } },
            _count: { select: { lot_executions: true } },
          },
        });
      });
    }

    if (input.action === "RECUSAR") {
      if (!input.reject_reason) throw new ValidationError("Motivo de recusa obrigatorio");

      return prisma.$transaction(async (tx) => {
        // Release lot executions
        await tx.lotItemExecution.updateMany({
          where: { invoice_id: id },
          data: { billed: false, invoice_id: null },
        });

        return tx.invoice.update({
          where: { id },
          data: {
            status: "RECUSADO",
            reject_reason: input.reject_reason,
            rejected_by_id: userId,
            rejected_at: new Date(),
          },
          include: {
            contract: { select: { id: true, number: true } },
          },
        });
      });
    }

    throw new ValidationError("Acao invalida");
  }

  // ============================================================
  // Payments
  // ============================================================

  /**
   * Register a payment for an invoice.
   */
  static async createPayment(input: CreatePaymentInput, userId: number) {
    const invoice = await prisma.invoice.findUnique({ where: { id: input.invoice_id } });
    if (!invoice) throw new NotFoundError("Invoice/BM", input.invoice_id);
    if (invoice.status !== "FATURADO") {
      throw new AppError("Pagamento so pode ser registrado em BM faturada", 400);
    }

    return prisma.payment.create({
      data: {
        invoice_id: input.invoice_id,
        nf_number: input.nf_number,
        amount: input.amount,
        paid_at: input.paid_at || new Date(),
        confirmed_by_id: userId,
      },
      include: {
        invoice: { select: { id: true, number: true, contract: { select: { number: true } } } },
        confirmed_by: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * List payments with filters.
   */
  static async listPayments(query: PaymentQueryInput) {
    const { invoice_id, contract_id, page, limit } = query;
    const where: Prisma.PaymentWhereInput = {};
    if (invoice_id) where.invoice_id = invoice_id;
    if (contract_id) where.invoice = { contract_id };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: { id: true, number: true, status: true, contract: { select: { id: true, number: true } } },
          },
          confirmed_by: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ============================================================
  // Dashboard stats
  // ============================================================

  /**
   * Financial summary for a contract.
   */
  static async getContractSummary(contractId: number) {
    const [invoices, payments, lotExecutions] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where: { contract_id: contractId },
        _count: { id: true },
        _sum: { total_value: true },
      }),
      prisma.payment.aggregate({
        where: { invoice: { contract_id: contractId } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.lotItemExecution.count({
        where: {
          lot: { contract_id: contractId },
          billed: true,
        },
      }),
    ]);

    const byStatus = invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = {
          count: inv._count.id,
          total_value: Number(inv._sum.total_value || 0),
        };
        return acc;
      },
      {} as Record<string, { count: number; total_value: number }>,
    );

    return {
      contract_id: contractId,
      invoices: byStatus,
      total_paid: Number(payments._sum.amount || 0),
      total_payments: payments._count.id,
      total_billed_executions: lotExecutions,
    };
  }

  /**
   * Global financial dashboard.
   */
  static async getDashboard() {
    const [invoiceSummary, totalPaid, recentInvoices] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { total_value: true },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.invoice.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
          contract: { select: { number: true, client: { select: { razao_social: true } } } },
          generated_by: { select: { name: true } },
        },
      }),
    ]);

    return {
      summary: invoiceSummary.reduce(
        (acc, inv) => {
          acc[inv.status] = { count: inv._count.id, total: Number(inv._sum.total_value || 0) };
          return acc;
        },
        {} as Record<string, { count: number; total: number }>,
      ),
      total_paid: Number(totalPaid._sum.amount || 0),
      total_payments: totalPaid._count.id,
      recent_invoices: recentInvoices,
    };
  }
}
