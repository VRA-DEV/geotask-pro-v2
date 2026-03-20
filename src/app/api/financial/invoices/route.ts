import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { BillingService } from "@/lib/services/billing.service";
import { LogService } from "@/lib/services/log.service";
import { generateInvoiceSchema, invoiceQuerySchema } from "@/lib/dto/financial.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/financial/invoices — List invoices/BMs.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(invoiceQuerySchema, params);
    const result = await BillingService.listInvoices(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/financial/invoices — Generate a new BM (Boletim de Medicao).
 */
const generateHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const input = validateDto(generateInvoiceSchema, body);
    const invoice = await BillingService.generateInvoice(input, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice?.id,
      afterData: { contract_id: input.contract_id, items: input.contract_item_ids, total_lots: invoice?.total_lots },
      description: `BM gerada: ${invoice?.total_lots} lotes`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: invoice, message: "BM gerada com sucesso" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(generateHandler);
