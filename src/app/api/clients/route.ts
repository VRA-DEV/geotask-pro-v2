import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ClientService } from "@/lib/services/client.service";
import { LogService } from "@/lib/services/log.service";
import { createClientSchema, clientQuerySchema } from "@/lib/dto/client.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(clientQuerySchema, params);
    const result = await ClientService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(createClientSchema, body);
    const client = await ClientService.create(data);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      afterData: { cnpj: client.cnpj, razao_social: client.razao_social },
      description: `Cliente criado: ${client.razao_social}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: client, message: "Cliente criado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(createHandler);
