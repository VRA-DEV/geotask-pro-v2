import { NextResponse } from "next/server";
import { withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { PermissionService } from "@/lib/services/permission.service";
import { LogService } from "@/lib/services/log.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/permissions — Get permission matrix (all roles × all permissions).
 * Optional ?role_id=X for single role.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const roleId = req.nextUrl.searchParams.get("role_id");

    if (roleId) {
      const result = await PermissionService.getRolePermissions(Number(roleId));
      return NextResponse.json({ data: result });
    }

    const matrix = await PermissionService.getPermissionMatrix();
    return NextResponse.json({ data: matrix });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PUT /api/permissions — Save custom permissions for a role.
 * Body: { role_id: number, permissions: AppPermissions }
 */
const saveHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { role_id, permissions } = body;

    if (!role_id || !permissions) {
      return NextResponse.json({ error: "role_id e permissions obrigatorios" }, { status: 400 });
    }

    const result = await PermissionService.saveRolePermissions(Number(role_id), permissions);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Role",
      entityId: Number(role_id),
      afterData: { permissions_updated: true },
      description: `Permissoes do cargo ${result.name} atualizadas`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Permissoes salvas" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/permissions?role_id=X — Reset permissions to defaults.
 */
const resetHandler: AuthenticatedHandler = async (req) => {
  try {
    const roleId = Number(req.nextUrl.searchParams.get("role_id"));
    if (!roleId) return NextResponse.json({ error: "role_id obrigatorio" }, { status: 400 });

    const result = await PermissionService.resetRolePermissions(roleId);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Role",
      entityId: roleId,
      afterData: { permissions_reset: true },
      description: `Permissoes do cargo ${result.name} resetadas para padrao`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Permissoes resetadas para padrao" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withRoles(["Admin"])(listHandler);
export const PUT = withRoles(["Admin"])(saveHandler);
export const DELETE = withRoles(["Admin"])(resetHandler);
