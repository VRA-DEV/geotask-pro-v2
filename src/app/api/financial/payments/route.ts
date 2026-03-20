import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { BillingService } from "@/lib/services/billing.service";
import { LogService } from "@/lib/services/log.service";
import { createPaymentSchema, paymentQuerySchema } from "@/lib/dto/financial.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/financial/payments — List payments.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(paymentQuerySchema, params);
    const result = await BillingService.listPayments(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/financial/payments — Register a payment.
 */
const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const input = validateDto(createPaymentSchema, body);
    const payment = await BillingService.createPayment(input, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Payment",
      entityId: payment.id,
      afterData: { invoice_id: input.invoice_id, amount: input.amount },
      description: `Pagamento registrado: R$ ${Number(input.amount).toFixed(2)}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: payment, message: "Pagamento registrado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(createHandler);
