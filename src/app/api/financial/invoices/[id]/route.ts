import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { BillingService } from "@/lib/services/billing.service";
import { LogService } from "@/lib/services/log.service";
import { invoiceActionSchema } from "@/lib/dto/financial.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/financial/invoices/[id] — Get invoice/BM details.
 */
const getHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const invoice = await BillingService.getInvoice(id);
    return NextResponse.json({ data: invoice });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PATCH /api/financial/invoices/[id] — Execute action (FATURAR or RECUSAR).
 */
const actionHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const input = validateDto(invoiceActionSchema, body);
    const invoice = await BillingService.invoiceAction(id, input, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      afterData: { action: input.action, nf_number: input.nf_number, reject_reason: input.reject_reason },
      description: `BM #${id} ${input.action === "FATURAR" ? "faturada" : "recusada"}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({
      data: invoice,
      message: input.action === "FATURAR" ? "BM faturada" : "BM recusada",
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withRoles(["Admin", "Gerente"])(actionHandler);
