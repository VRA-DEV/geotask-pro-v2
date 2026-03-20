import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getTaskVisibilityMode, type TaskVisibility } from "@/lib/permissions";
import { UserSectorService } from "./user-sector.service";
import type { TokenPayload } from "@/lib/auth/jwt";

/**
 * VisibilityService — Builds Prisma WHERE clauses for role-based data filtering.
 *
 * Used across all modules to ensure users only see data they're allowed to.
 */
export class VisibilityService {
  /**
   * Build task visibility filter.
   * Returns Prisma WHERE clause that restricts tasks based on user's role.
   */
  static async getTaskFilter(user: TokenPayload): Promise<Prisma.TaskWhereInput> {
    const visibility = getTaskVisibilityMode(user.roleName);

    switch (visibility) {
      case "all":
        return {};

      case "team": {
        const teamId = await this.getUserTeamId(user.userId);
        return {
          OR: [
            ...(teamId ? [{ team_id: teamId }] : []),
            ...(teamId ? [{ responsible: { team_id: teamId } }] : []),
            { responsible_id: user.userId },
            { created_by_id: user.userId },
            { coworkers: { some: { user_id: user.userId } } },
          ],
        };
      }

      case "sectors": {
        const sectorIds = await UserSectorService.getUserSectorIds(user.userId);
        return {
          OR: [
            { sector_id: { in: sectorIds } },
            { responsible_id: user.userId },
            { created_by_id: user.userId },
            { coworkers: { some: { user_id: user.userId } } },
          ],
        };
      }

      case "sector": {
        const sectorId = await this.getUserSectorId(user.userId);
        return {
          OR: [
            ...(sectorId ? [{ sector_id: sectorId }] : []),
            { responsible_id: user.userId },
            { created_by_id: user.userId },
            { coworkers: { some: { user_id: user.userId } } },
          ],
        };
      }

      case "assigned":
        return {
          OR: [
            { responsible_id: user.userId },
            { coworkers: { some: { user_id: user.userId } } },
          ],
        };

      case "contract": {
        const clientId = await this.getUserClientId(user.userId);
        if (!clientId) return { id: -1 }; // No results
        // External users see tasks related to their contracts
        return {
          task_contract: {
            // TaskContract linked to their client via contracts
            id: { gt: 0 }, // placeholder — external users see via contract module
          },
        };
      }

      default:
        return { responsible_id: user.userId };
    }
  }

  /**
   * Build contract visibility filter.
   */
  static async getContractFilter(user: TokenPayload): Promise<Prisma.ContractWhereInput> {
    const isExternal = user.userType === "EXTERNAL";

    if (isExternal) {
      const clientId = await this.getUserClientId(user.userId);
      if (!clientId) return { id: -1 };
      return { client_id: clientId, deleted_at: null };
    }

    // Internal users with "view_all" contracts see everything
    const visibility = getTaskVisibilityMode(user.roleName);
    if (visibility === "all") {
      return { deleted_at: null };
    }

    // Others see all contracts (contract visibility is less granular)
    return { deleted_at: null };
  }

  /**
   * Build lot visibility filter.
   */
  static async getLotFilter(user: TokenPayload): Promise<Prisma.LotWhereInput> {
    const isExternal = user.userType === "EXTERNAL";

    if (isExternal) {
      const clientId = await this.getUserClientId(user.userId);
      if (!clientId) return { id: -1 };
      return {
        contract: { client_id: clientId },
        deleted_at: null,
      };
    }

    return { deleted_at: null };
  }

  /**
   * Build invoice visibility filter.
   */
  static async getInvoiceFilter(user: TokenPayload): Promise<Prisma.InvoiceWhereInput> {
    const isExternal = user.userType === "EXTERNAL";

    if (isExternal) {
      const clientId = await this.getUserClientId(user.userId);
      if (!clientId) return { id: -1 };
      return { contract: { client_id: clientId } };
    }

    return {};
  }

  /**
   * Build user list visibility filter.
   * Admins see all users. Others see users in their team/sector.
   */
  static async getUserFilter(user: TokenPayload): Promise<Prisma.UserWhereInput> {
    const visibility = getTaskVisibilityMode(user.roleName);

    if (visibility === "all") return { deleted_at: null };

    if (visibility === "team") {
      const teamId = await this.getUserTeamId(user.userId);
      return {
        deleted_at: null,
        OR: [
          ...(teamId ? [{ team_id: teamId }] : []),
          { id: user.userId },
        ],
      };
    }

    if (visibility === "sectors") {
      const sectorIds = await UserSectorService.getUserSectorIds(user.userId);
      return {
        deleted_at: null,
        OR: [
          { sector_id: { in: sectorIds } },
          { id: user.userId },
        ],
      };
    }

    if (visibility === "sector") {
      const sectorId = await this.getUserSectorId(user.userId);
      return {
        deleted_at: null,
        OR: [
          ...(sectorId ? [{ sector_id: sectorId }] : []),
          { id: user.userId },
        ],
      };
    }

    // "assigned" and "contract" — see limited users
    return {
      deleted_at: null,
      id: user.userId,
    };
  }

  /**
   * Get assignment options — who can this user assign tasks to?
   */
  static async getAssignableUsers(user: TokenPayload): Promise<Prisma.UserWhereInput> {
    const visibility = getTaskVisibilityMode(user.roleName);

    switch (visibility) {
      case "all":
        return { active: true, deleted_at: null, user_type: "INTERNAL" };

      case "team": {
        const teamId = await this.getUserTeamId(user.userId);
        return {
          active: true,
          deleted_at: null,
          user_type: "INTERNAL",
          ...(teamId ? { team_id: teamId } : {}),
        };
      }

      case "sectors": {
        const sectorIds = await UserSectorService.getUserSectorIds(user.userId);
        return {
          active: true,
          deleted_at: null,
          user_type: "INTERNAL",
          sector_id: { in: sectorIds },
        };
      }

      case "sector": {
        const sectorId = await this.getUserSectorId(user.userId);
        return {
          active: true,
          deleted_at: null,
          user_type: "INTERNAL",
          ...(sectorId ? { sector_id: sectorId } : {}),
        };
      }

      default:
        // Liderado and external — can't assign
        return { id: -1 };
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private static async getUserTeamId(userId: number): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { team_id: true },
    });
    return user?.team_id ?? null;
  }

  private static async getUserSectorId(userId: number): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sector_id: true },
    });
    return user?.sector_id ?? null;
  }

  private static async getUserClientId(userId: number): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { client_id: true },
    });
    return user?.client_id ?? null;
  }
}
