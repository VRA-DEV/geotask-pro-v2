import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError, AppError } from "@/lib/errors";
import type {
  CreateContractInput,
  UpdateContractInput,
  ContractItemInput,
  GeoDistributionInput,
  MeasurementRuleInput,
  ContractQueryInput,
} from "@/lib/dto/contract.dto";

const CONTRACT_INCLUDE = {
  client: { select: { id: true, cnpj: true, razao_social: true, nome_fantasia: true } },
  created_by: { select: { id: true, name: true } },
  items: true,
  distributions: true,
  measurement_rules: { where: { active: true } },
  _count: { select: { lots: true, invoices: true } },
};

export class ContractService {
  // ============================================================
  // CONTRACTS CRUD
  // ============================================================

  static async list(query: ContractQueryInput) {
    const { page, limit, search, client_id, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };
    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { client: { razao_social: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (client_id) where.client_id = client_id;
    if (status) where.status = status;

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: number) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract || contract.deleted_at) throw new NotFoundError("Contrato", id);
    return contract;
  }

  static async create(data: CreateContractInput, userId: number) {
    const existing = await prisma.contract.findUnique({ where: { number: data.number } });
    if (existing) throw new ConflictError("Numero de contrato ja existe");

    return prisma.contract.create({
      data: {
        number: data.number,
        client_id: data.client_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        contracted_quantity: data.contracted_quantity,
        status: data.status,
        created_by_id: userId,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  static async update(id: number, data: UpdateContractInput) {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) throw new NotFoundError("Contrato", id);

    if (data.number && data.number !== existing.number) {
      const numberTaken = await prisma.contract.findUnique({ where: { number: data.number } });
      if (numberTaken) throw new ConflictError("Numero de contrato ja existe");
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        ...(data.number && { number: data.number }),
        ...(data.client_id && { client_id: data.client_id }),
        ...(data.start_date && { start_date: new Date(data.start_date) }),
        ...(data.end_date && { end_date: new Date(data.end_date) }),
        ...(data.contracted_quantity && { contracted_quantity: data.contracted_quantity }),
        ...(data.status && { status: data.status }),
      },
      include: CONTRACT_INCLUDE,
    });

    return { before: existing, after: updated };
  }

  static async delete(id: number) {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Contrato", id);

    await prisma.contract.update({
      where: { id },
      data: { deleted_at: new Date(), status: "CANCELADO" },
    });
    return existing;
  }

  // ============================================================
  // CONTRACT ITEMS
  // ============================================================

  static async addItem(contractId: number, data: ContractItemInput) {
    await this.getById(contractId); // verify exists
    return prisma.contractItem.create({
      data: {
        contract_id: contractId,
        description: data.description,
        unit: data.unit,
        unit_value: data.unit_value,
        quantity: data.quantity,
      },
    });
  }

  static async updateItem(itemId: number, data: Partial<ContractItemInput>) {
    const item = await prisma.contractItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError("Item do Contrato", itemId);

    return prisma.contractItem.update({
      where: { id: itemId },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.unit && { unit: data.unit }),
        ...(data.unit_value !== undefined && { unit_value: data.unit_value }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
      },
    });
  }

  static async deleteItem(itemId: number) {
    const item = await prisma.contractItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError("Item do Contrato", itemId);

    // Check for linked deliveries
    const deliveryCount = await prisma.delivery.count({ where: { contract_item_id: itemId } });
    if (deliveryCount > 0) {
      throw new AppError("Item possui entregas vinculadas e nao pode ser removido", 409);
    }

    await prisma.contractItem.delete({ where: { id: itemId } });
    return item;
  }

  // ============================================================
  // GEOGRAPHIC DISTRIBUTION
  // ============================================================

  static async addDistribution(contractId: number, data: GeoDistributionInput) {
    const contract = await this.getById(contractId);

    // Validate total doesn't exceed contracted quantity
    const currentTotal = contract.distributions.reduce((sum, d) => sum + d.quantity, 0);
    if (currentTotal + data.quantity > contract.contracted_quantity) {
      throw new AppError(
        `Total distribuido (${currentTotal + data.quantity}) excede quantidade contratada (${contract.contracted_quantity})`,
        422
      );
    }

    return prisma.geographicDistribution.create({
      data: { contract_id: contractId, ...data },
    });
  }

  static async deleteDistribution(distributionId: number) {
    const dist = await prisma.geographicDistribution.findUnique({ where: { id: distributionId } });
    if (!dist) throw new NotFoundError("Distribuicao", distributionId);
    await prisma.geographicDistribution.delete({ where: { id: distributionId } });
    return dist;
  }

  // ============================================================
  // MEASUREMENT RULES
  // ============================================================

  static async syncRules(contractId: number, rules: MeasurementRuleInput[]) {
    await this.getById(contractId); // verify exists

    // Deactivate existing rules
    await prisma.measurementRule.updateMany({
      where: { contract_id: contractId },
      data: { active: false },
    });

    // Create new rules
    const created = await Promise.all(
      rules.map((rule) =>
        prisma.measurementRule.create({
          data: {
            contract_id: contractId,
            field: rule.field,
            values: rule.values,
            active: rule.active,
          },
        })
      )
    );

    return created;
  }

  static async listRules(contractId: number) {
    return prisma.measurementRule.findMany({
      where: { contract_id: contractId, active: true },
      orderBy: { created_at: "asc" },
    });
  }
}
