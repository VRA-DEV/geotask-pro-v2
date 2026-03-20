import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from "@/lib/dto/user.dto";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role_id: true,
  sector_id: true,
  team_id: true,
  client_id: true,
  avatar: true,
  active: true,
  must_change_password: true,
  user_type: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  role: true,
  sector: true,
  team: true,
  client: { select: { id: true, cnpj: true, razao_social: true } },
  user_sectors: { include: { sector: true } },
};

export class UserService {
  /**
   * Lists users with filters and pagination.
   */
  static async list(query: UserQueryInput) {
    const { page, limit, search, role_id, sector_id, team_id, user_type, active } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role_id) where.role_id = role_id;
    if (sector_id) where.sector_id = sector_id;
    if (team_id) where.team_id = team_id;
    if (user_type) where.user_type = user_type;
    if (active !== undefined) where.active = active === "true";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets a single user by ID.
   */
  static async getById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user || user.active === false) {
      throw new NotFoundError("Usuario", id);
    }

    return user;
  }

  /**
   * Creates a new user.
   */
  static async create(data: CreateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError("Email ja cadastrado");
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role_id: data.role_id,
        sector_id: data.sector_id,
        team_id: data.team_id ?? undefined,
        client_id: data.client_id ?? undefined,
        user_type: data.user_type,
      },
      select: USER_SELECT,
    });

    return user;
  }

  /**
   * Updates an existing user.
   */
  static async update(id: number, data: UpdateUserInput) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Usuario", id);

    // Check email uniqueness if changing email
    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailTaken) throw new ConflictError("Email ja cadastrado");
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.role_id && { role_id: data.role_id }),
        ...(data.sector_id && { sector_id: data.sector_id }),
        ...(data.team_id !== undefined && { team_id: data.team_id }),
        ...(data.client_id !== undefined && { client_id: data.client_id }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.user_type && { user_type: data.user_type }),
      },
      select: USER_SELECT,
    });

    return { before: existing, after: user };
  }

  /**
   * Soft deletes a user.
   */
  static async delete(id: number) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Usuario", id);

    await prisma.user.update({
      where: { id },
      data: { deleted_at: new Date(), active: false },
    });

    return existing;
  }

  /**
   * Lists all roles.
   */
  static async listRoles() {
    return prisma.role.findMany({ orderBy: { id: "asc" } });
  }

  /**
   * Lists all sectors.
   */
  static async listSectors() {
    return prisma.sector.findMany({ orderBy: { name: "asc" } });
  }

  /**
   * Lists all teams.
   */
  static async listTeams() {
    return prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
  }
}
