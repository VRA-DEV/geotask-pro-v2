import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "./jwt";
import { prisma } from "@/lib/prisma";
import { getPermissions, type AppPermissions } from "@/lib/permissions";

export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload & { permissions?: AppPermissions };
}

export type ApiHandler = (
  req: NextRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse>;

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse>;

/**
 * Extracts and validates the JWT token from a request.
 * Checks Authorization header first, then falls back to cookies.
 */
async function extractUser(req: NextRequest): Promise<TokenPayload | null> {
  // Check Authorization header first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      return await verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  // Fallback to cookie
  const cookieToken = req.cookies.get("geotask_access_token")?.value;
  if (cookieToken) {
    try {
      return await verifyAccessToken(cookieToken);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Guard: requires valid JWT authentication.
 * Injects `user` into the request object.
 */
export function withAuth(handler: AuthenticatedHandler): ApiHandler {
  return async (req: NextRequest, context?: Record<string, unknown>) => {
    const user = await extractUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Autenticacao necessaria" },
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, active: true, deleted_at: true },
    });

    if (!dbUser || !dbUser.active || dbUser.deleted_at) {
      return NextResponse.json(
        { error: "Usuario inativo ou nao encontrado" },
        { status: 403 }
      );
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}

/**
 * Guard: requires authentication + specific roles.
 * Example: withRoles(["Admin", "Gerente"])(handler)
 */
export function withRoles(allowedRoles: string[]) {
  return (handler: AuthenticatedHandler): ApiHandler => {
    return withAuth(async (req: AuthenticatedRequest, context) => {
      if (!allowedRoles.includes(req.user.roleName)) {
        return NextResponse.json(
          { error: "Permissao insuficiente" },
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Guard: requires authentication + user must be INTERNAL type.
 */
export function withInternalOnly(handler: AuthenticatedHandler): ApiHandler {
  return withAuth(async (req: AuthenticatedRequest, context) => {
    if (req.user.userType !== "INTERNAL") {
      return NextResponse.json(
        { error: "Acesso restrito a usuarios internos" },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * Guard: requires authentication + specific permission.
 * Loads permissions from the user's role (JSON or fallback).
 *
 * Usage: withPermission("tasks", "create")(handler)
 *        withPermission("financial", "generate_bm")(handler)
 */
export function withPermission<
  C extends keyof AppPermissions,
  P extends keyof AppPermissions[C],
>(category: C, permission: P) {
  return (handler: AuthenticatedHandler): ApiHandler => {
    return withAuth(async (req: AuthenticatedRequest, context) => {
      // Load role with permissions from DB
      const role = await prisma.role.findUnique({
        where: { id: req.user.roleId },
        select: { name: true, permissions: true },
      });

      if (!role) {
        return NextResponse.json({ error: "Cargo nao encontrado" }, { status: 403 });
      }

      const permissions = getPermissions(role);
      const allowed = permissions[category]?.[permission];

      if (!allowed) {
        return NextResponse.json(
          { error: `Permissao insuficiente: ${String(category)}.${String(permission)}` },
          { status: 403 },
        );
      }

      // Attach permissions to request for downstream use
      (req as AuthenticatedRequest).user.permissions = permissions;
      return handler(req, context);
    });
  };
}

/**
 * Guard: requires authentication + password confirmation for destructive operations.
 */
export function withPasswordConfirmation(handler: AuthenticatedHandler): ApiHandler {
  return withAuth(async (req: AuthenticatedRequest, context) => {
    const body = await req.clone().json().catch(() => ({}));
    const confirmPassword = body?.confirm_password;

    if (!confirmPassword) {
      return NextResponse.json(
        { error: "Senha de confirmacao necessaria" },
        { status: 400 }
      );
    }

    const adminDevPassword = process.env.ADMIN_DEV_PASSWORD;
    if (confirmPassword !== adminDevPassword) {
      return NextResponse.json(
        { error: "Senha de confirmacao incorreta" },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}
