import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";

export class UserSectorService {
  /**
   * Get sectors linked to a user (multi-sector coordination).
   */
  static async listByUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        sector_id: true,
        sector: { select: { id: true, name: true } },
        role: { select: { name: true } },
      },
    });
    if (!user) throw new NotFoundError("Usuario", userId);

    const additionalSectors = await prisma.userSector.findMany({
      where: { user_id: userId },
      include: { sector: { select: { id: true, name: true } } },
      orderBy: { sector: { name: "asc" } },
    });

    return {
      user_id: user.id,
      user_name: user.name,
      role: user.role.name,
      primary_sector: user.sector,
      additional_sectors: additionalSectors.map((us) => ({
        id: us.id,
        sector_id: us.sector_id,
        sector_name: us.sector.name,
      })),
      all_sector_ids: [
        user.sector_id,
        ...additionalSectors.map((us) => us.sector_id),
      ],
    };
  }

  /**
   * Link a user to an additional sector.
   */
  static async linkSector(userId: number, sectorId: number) {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, sector_id: true, role: { select: { name: true } } },
    });
    if (!user) throw new NotFoundError("Usuario", userId);

    // Validate sector exists
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) throw new NotFoundError("Setor", sectorId);

    // Don't allow linking to primary sector
    if (user.sector_id === sectorId) {
      throw new ValidationError("Este ja e o setor primario do usuario");
    }

    // Check for existing link
    const existing = await prisma.userSector.findUnique({
      where: { user_id_sector_id: { user_id: userId, sector_id: sectorId } },
    });
    if (existing) throw new ConflictError("Usuario ja vinculado a este setor");

    return prisma.userSector.create({
      data: { user_id: userId, sector_id: sectorId },
      include: { sector: { select: { id: true, name: true } } },
    });
  }

  /**
   * Unlink a user from an additional sector.
   */
  static async unlinkSector(userId: number, sectorId: number) {
    const link = await prisma.userSector.findUnique({
      where: { user_id_sector_id: { user_id: userId, sector_id: sectorId } },
    });
    if (!link) throw new NotFoundError("Vinculo usuario-setor", 0);

    await prisma.userSector.delete({
      where: { user_id_sector_id: { user_id: userId, sector_id: sectorId } },
    });

    return { user_id: userId, sector_id: sectorId };
  }

  /**
   * Sync all sectors for a user (replace all links).
   */
  static async syncSectors(userId: number, sectorIds: number[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, sector_id: true },
    });
    if (!user) throw new NotFoundError("Usuario", userId);

    // Filter out primary sector
    const additionalIds = sectorIds.filter((id) => id !== user.sector_id);

    // Validate all sectors exist
    const sectors = await prisma.sector.findMany({
      where: { id: { in: additionalIds } },
      select: { id: true },
    });
    const validIds = new Set(sectors.map((s) => s.id));

    await prisma.$transaction(async (tx) => {
      // Remove all existing links
      await tx.userSector.deleteMany({ where: { user_id: userId } });

      // Create new links
      if (additionalIds.length > 0) {
        await tx.userSector.createMany({
          data: additionalIds
            .filter((id) => validIds.has(id))
            .map((sector_id) => ({ user_id: userId, sector_id })),
        });
      }
    });

    return this.listByUser(userId);
  }

  /**
   * Get all sector IDs that a user has access to.
   * Includes primary + additional sectors.
   */
  static async getUserSectorIds(userId: number): Promise<number[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sector_id: true },
    });
    if (!user) return [];

    const additionalSectors = await prisma.userSector.findMany({
      where: { user_id: userId },
      select: { sector_id: true },
    });

    return [
      user.sector_id,
      ...additionalSectors.map((us) => us.sector_id),
    ];
  }
}
