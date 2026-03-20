import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { AppError, NotFoundError, UnauthorizedError } from "@/lib/errors";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: { id: number; name: string; permissions: unknown };
    sector: { id: number; name: string };
    team: { id: number; name: string } | null;
    user_type: string;
    must_change_password: boolean;
  };
}

export class AuthService {
  /**
   * Authenticates a user with email and password.
   * Returns JWT tokens and user data.
   */
  static async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        sector: true,
        team: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Email ou senha incorretos");
    }

    if (!user.active || user.deleted_at) {
      throw new AppError("Usuario inativo. Contate o administrador.", 403);
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError("Email ou senha incorretos");
    }

    // Generate tokens
    const accessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role.name,
      userType: user.user_type,
    });

    const refreshToken = await signRefreshToken({ userId: user.id });

    // Update user with refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refresh_token: refreshToken,
        last_login_at: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions,
        },
        sector: {
          id: user.sector.id,
          name: user.sector.name,
        },
        team: user.team ? { id: user.team.id, name: user.team.name } : null,
        user_type: user.user_type,
        must_change_password: user.must_change_password,
      },
    };
  }

  /**
   * Creates a new user account.
   */
  static async register(data: {
    name: string;
    email: string;
    password: string;
    role_id: number;
    sector_id: number;
    team_id?: number;
    client_id?: number;
    user_type?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError("Email ja cadastrado", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role_id: data.role_id,
        sector_id: data.sector_id,
        team_id: data.team_id,
        client_id: data.client_id,
        user_type: data.user_type || "INTERNAL",
      },
      include: {
        role: true,
        sector: true,
      },
    });

    return user;
  }

  /**
   * Refreshes the access token using a valid refresh token.
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { userId: number };

    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Refresh token invalido ou expirado");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || !user.active || user.deleted_at) {
      throw new UnauthorizedError("Usuario nao encontrado ou inativo");
    }

    // Verify refresh token matches stored one (rotation)
    if (user.refresh_token !== refreshToken) {
      // Token reuse detected - invalidate all tokens
      await prisma.user.update({
        where: { id: user.id },
        data: { refresh_token: null },
      });
      throw new UnauthorizedError("Refresh token reutilizado. Faca login novamente.");
    }

    // Generate new token pair
    const newAccessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role.name,
      userType: user.user_type,
    });

    const newRefreshToken = await signRefreshToken({ userId: user.id });

    // Rotate refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: newRefreshToken },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Gets the current authenticated user's profile.
   */
  static async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        sector: true,
        team: true,
        client: true,
        user_sectors: { include: { sector: true } },
      },
    });

    if (!user) {
      throw new NotFoundError("Usuario");
    }

    // Never expose password hash or refresh token
    const { password_hash: _, refresh_token: __, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Changes user password.
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario");
    }

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError("Senha atual incorreta", 400);
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: newHash,
        must_change_password: false,
      },
    });
  }

  /**
   * Logs out a user by clearing their refresh token.
   */
  static async logout(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
  }
}
