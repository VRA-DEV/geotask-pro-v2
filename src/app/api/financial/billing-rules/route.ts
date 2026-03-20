import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { BillingService } from "@/lib/services/billing.service";
import { LogService } from "@/lib/services/log.service";
import { billingRuleSchema, updateBillingRuleSchema } from "@/lib/dto/financial.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/financial/billing-rules?contract_item_id=X
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const contractItemId = req.nextUrl.searchParams.get("contract_item_id");
    const rules = await BillingService.listRules(contractItemId ? Number(contractItemId) : undefined);
    return NextResponse.json({ data: rules });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/financial/billing-rules — Create a billing rule.
 */
const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(billingRuleSchema, body);
    const rule = await BillingService.createRule(data);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "BillingRule",
      entityId: rule.id,
      afterData: { field: rule.field, contract_item_id: rule.contract_item_id },
      description: `Regra de faturamento criada: ${rule.field}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: rule, message: "Regra criada" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PATCH /api/financial/billing-rules?id=X — Update a billing rule.
 */
const updateHandler: AuthenticatedHandler = async (req) => {
  try {
    const ruleId = Number(req.nextUrl.searchParams.get("id"));
    if (!ruleId) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

    const body = await req.json();
    const data = validateDto(updateBillingRuleSchema, body);
    const rule = await BillingService.updateRule(ruleId, data);

    return NextResponse.json({ data: rule, message: "Regra atualizada" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/financial/billing-rules?id=X — Delete a billing rule.
 */
const deleteHandler: AuthenticatedHandler = async (req) => {
  try {
    const ruleId = Number(req.nextUrl.searchParams.get("id"));
    if (!ruleId) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

    await BillingService.deleteRule(ruleId);
    return NextResponse.json({ message: "Regra removida" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(createHandler);
export const PATCH = withRoles(["Admin", "Gerente"])(updateHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(deleteHandler);
