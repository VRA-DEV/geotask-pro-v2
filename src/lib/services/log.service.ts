import { prisma } from "@/lib/prisma";

export interface AuditLogInput {
  userId?: number;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "IMPORT";
  entity: string;
  entityId?: number;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LogService {
  /**
   * Creates a detailed audit log entry with before/after snapshots.
   */
  static async audit(input: AuditLogInput) {
    return prisma.auditLog.create({
      data: {
        user_id: input.userId,
        action: input.action,
        entity: input.entity,
        entity_id: input.entityId,
        before_data: input.beforeData ? JSON.parse(JSON.stringify(input.beforeData)) : undefined,
        after_data: input.afterData ? JSON.parse(JSON.stringify(input.afterData)) : undefined,
        description: input.description,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      },
    });
  }

  /**
   * Creates a simple activity log entry (backward compatible with v1).
   */
  static async activity(
    userId: number | null,
    userName: string,
    action: string,
    entity?: string,
    entityId?: number,
    details?: string,
    ipAddress?: string
  ) {
    return prisma.activityLog.create({
      data: {
        user_id: userId,
        user_name: userName,
        action,
        entity,
        entity_id: entityId,
        details,
        ip_address: ipAddress,
      },
    });
  }

  /**
   * Extracts IP address from request headers.
   */
  static getIpAddress(headers: Headers): string {
    return (
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown"
    );
  }

  /**
   * Extracts user agent from request headers.
   */
  static getUserAgent(headers: Headers): string {
    return headers.get("user-agent") || "unknown";
  }

  /**
   * Queries audit logs with filters and pagination.
   */
  static async query(params: {
    userId?: number;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...filters } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.userId) where.user_id = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.created_at = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
