import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { getPermissions, type AppPermissions } from "@/lib/permissions";

export class PermissionService {
  /**
   * Get all roles with their resolved permissions.
   */
  static async listRolesWithPermissions() {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { users: true } } },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      user_count: role._count.users,
      permissions: getPermissions(role),
      has_custom_permissions: role.permissions !== null,
    }));
  }

  /**
   * Get permissions for a specific role.
   */
  static async getRolePermissions(roleId: number): Promise<{ role: string; permissions: AppPermissions }> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundError("Cargo", roleId);

    return {
      role: role.name,
      permissions: getPermissions(role),
    };
  }

  /**
   * Save custom permissions for a role (overrides defaults).
   */
  static async saveRolePermissions(roleId: number, permissions: AppPermissions) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Cargo", roleId);

    return prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: permissions as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, permissions: true },
    });
  }

  /**
   * Reset role permissions to defaults (remove JSON override).
   */
  static async resetRolePermissions(roleId: number) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Cargo", roleId);

    return prisma.role.update({
      where: { id: roleId },
      data: { permissions: Prisma.JsonNull },
      select: { id: true, name: true },
    });
  }

  /**
   * Get the full permission matrix (all roles × all permissions).
   * Used for the Settings UI permission editor.
   */
  static async getPermissionMatrix() {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { users: true } } },
    });

    const matrix = roles.map((role) => {
      const perms = getPermissions(role);
      return {
        role_id: role.id,
        role_name: role.name,
        user_count: role._count.users,
        is_custom: role.permissions !== null,
        permissions: perms,
      };
    });

    // Also return the schema (permission categories and keys)
    const schema = {
      pages: [
        "view_dashboard", "view_tasks", "view_consulta_processual",
        "view_gestao_lotes", "view_gestao_contratos", "view_gestao_financeira",
        "view_settings", "view_logs", "view_all_templates",
      ],
      tasks: [
        "create", "edit_any", "edit_own", "delete", "view_all",
        "view_own_team", "view_own_sector", "view_created_by_me",
        "assign_any", "assign_team", "assign_sector",
        "manage_pauses", "edit_deadline_all",
      ],
      contracts: [
        "create", "edit", "delete", "view_all", "view_linked",
        "manage_items", "manage_distribution", "manage_rules",
      ],
      lots: [
        "import_shp", "confirm_import", "view_all",
        "view_by_contract", "export", "compliance",
      ],
      deliveries: [
        "create", "substitute", "view_all", "view_by_contract",
      ],
      financial: [
        "view_overview", "generate_bm", "approve_bm",
        "reject_bm", "confirm_payment", "export",
      ],
      settings: [
        "manage_users", "manage_roles", "manage_teams",
        "manage_sectors", "manage_task_types", "manage_clients",
        "manage_permissions", "manage_user_sectors",
      ],
    };

    return { matrix, schema };
  }
}
