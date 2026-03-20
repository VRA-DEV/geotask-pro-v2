import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ClientService } from "@/lib/services/client.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/consultas/cnpj/[cnpj] — Lookup CNPJ via external API.
 */
const handler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { cnpj: string } | undefined;
    const cnpj = params?.cnpj;
    if (!cnpj) return NextResponse.json({ error: "CNPJ obrigatorio" }, { status: 400 });

    const data = await ClientService.lookupCNPJ(cnpj);
    if (!data) {
      return NextResponse.json({ error: "CNPJ nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
