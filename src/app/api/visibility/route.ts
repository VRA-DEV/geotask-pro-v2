import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { VisibilityService } from "@/lib/services/visibility.service";
import { UserSectorService } from "@/lib/services/user-sector.service";
import { getPermissions, getTaskVisibilityMode, getRoleDisplayName } from "@/lib/permissions";
import { handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/visibility — Get user's visibility context.
 *
 * Returns permissions, visibility mode, assignable users, and sector info.
 * Used by the frontend to determine what the current user can see/do.
 */
const handler: AuthenticatedHandler = async (req) => {
  try {
    const user = req.user;

    // Load role with permissions
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true, permissions: true },
    });

    if (!role) {
      return NextResponse.json({ error: "Cargo nao encontrado" }, { status: 403 });
    }

    const permissions = getPermissions(role);
    const visibility = getTaskVisibilityMode(role.name);
    const displayName = getRoleDisplayName(role.name);

    // Get user's sectors (primary + additional)
    const sectorInfo = await UserSectorService.listByUser(user.userId);

    // Get assignable users for task assignment
    const assignableFilter = await VisibilityService.getAssignableUsers(user);
    const assignableUsers = await prisma.user.findMany({
      where: assignableFilter,
      select: {
        id: true,
        name: true,
        email: true,
        sector: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        role: { select: { name: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json({
      data: {
        user_id: user.userId,
        role_name: role.name,
        role_display_name: displayName,
        user_type: user.userType,
        visibility_mode: visibility,
        permissions,
        sectors: {
          primary: sectorInfo.primary_sector,
          additional: sectorInfo.additional_sectors,
          all_ids: sectorInfo.all_sector_ids,
        },
        assignable_users: assignableUsers,
      },
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
