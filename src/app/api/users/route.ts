import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { UserService } from "@/lib/services/user.service";
import { LogService } from "@/lib/services/log.service";
import { createUserSchema, userQuerySchema } from "@/lib/dto/user.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/users — List users with filters and pagination.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(userQuerySchema, params);
    const result = await UserService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/users — Create a new user.
 * Requires Admin role.
 */
const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(createUserSchema, body);
    const user = await UserService.create(data);

    // Audit log
    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      afterData: { name: user.name, email: user.email, role_id: user.role_id },
      description: `Usuario criado: ${user.name} (${user.email})`,
      ipAddress: LogService.getIpAddress(req.headers),
      userAgent: LogService.getUserAgent(req.headers),
    });

    return NextResponse.json({ data: user, message: "Usuario criado com sucesso" }, { status: 201 });
  } catch (error) {
    const { error: message, status, errors } = handleApiError(error);
    return NextResponse.json({ error: message, errors }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin"])(createHandler);
