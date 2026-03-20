import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type { CreateClientInput, UpdateClientInput, ClientQueryInput } from "@/lib/dto/client.dto";

const CLIENT_INCLUDE = {
  _count: { select: { users: true, contracts: true } },
};

export class ClientService {
  static async list(query: ClientQueryInput) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };
    if (search) {
      where.OR = [
        { razao_social: { contains: search, mode: "insensitive" } },
        { nome_fantasia: { contains: search, mode: "insensitive" } },
        { cnpj: { contains: search.replace(/\D/g, "") } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: CLIENT_INCLUDE,
        orderBy: { razao_social: "asc" },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: number) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        ...CLIENT_INCLUDE,
        contracts: {
          where: { deleted_at: null },
          select: { id: true, number: true, status: true, start_date: true, end_date: true },
        },
        users: {
          where: { deleted_at: null },
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
      },
    });
    if (!client || client.deleted_at) throw new NotFoundError("Cliente", id);
    return client;
  }

  static async create(data: CreateClientInput) {
    const existing = await prisma.client.findUnique({ where: { cnpj: data.cnpj } });
    if (existing && !existing.deleted_at) {
      throw new ConflictError("CNPJ ja cadastrado");
    }

    // If was soft-deleted, restore
    if (existing?.deleted_at) {
      const { api_data, ...rest } = data;
      return prisma.client.update({
        where: { id: existing.id },
        data: {
          ...rest,
          deleted_at: null,
          ...(api_data !== undefined && {
            api_data: api_data === null ? Prisma.JsonNull : (api_data as Prisma.InputJsonValue),
          }),
        },
        include: CLIENT_INCLUDE,
      });
    }

    const { api_data, ...rest } = data;
    return prisma.client.create({
      data: {
        ...rest,
        ...(api_data !== undefined && {
          api_data: api_data === null ? Prisma.JsonNull : (api_data as Prisma.InputJsonValue),
        }),
      },
      include: CLIENT_INCLUDE,
    });
  }

  static async update(id: number, data: UpdateClientInput) {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) throw new NotFoundError("Cliente", id);

    if (data.cnpj && data.cnpj !== existing.cnpj) {
      const cnpjTaken = await prisma.client.findUnique({ where: { cnpj: data.cnpj } });
      if (cnpjTaken && cnpjTaken.id !== id) throw new ConflictError("CNPJ ja cadastrado");
    }

    const { api_data: updateApiData, ...updateRest } = data;
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...updateRest,
        ...(updateApiData !== undefined && {
          api_data: updateApiData === null ? Prisma.JsonNull : (updateApiData as Prisma.InputJsonValue),
        }),
      },
      include: CLIENT_INCLUDE,
    });

    return { before: existing, after: updated };
  }

  static async delete(id: number) {
    const existing = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true, users: true } } },
    });
    if (!existing) throw new NotFoundError("Cliente", id);

    await prisma.client.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return existing;
  }

  /**
   * Looks up CNPJ via external API (ReceitaWS).
   */
  static async lookupCNPJ(cnpj: string): Promise<Record<string, unknown> | null> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const baseUrl = process.env.RECEITAWS_URL || "https://receitaws.com.br/v1/cnpj";
    const token = process.env.RECEITAWS_TOKEN;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/${cleanCnpj}`, { headers });
      if (!res.ok) return null;

      const data = await res.json();
      if (data.status === "ERROR") return null;

      return data;
    } catch {
      return null;
    }
  }
}
