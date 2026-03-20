import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type {
  CreateDeliveryInput,
  SubstituteDeliveryInput,
  DeliveryQueryInput,
} from "@/lib/dto/delivery.dto";

const DELIVERY_INCLUDE = {
  lot: { select: { id: true, code: true, beneficiary: true } },
  contract_item: { select: { id: true, description: true, unit: true } },
  created_by: { select: { id: true, name: true } },
  history: {
    include: { replaced_by: { select: { id: true, name: true } } },
    orderBy: { replaced_at: "desc" as const },
  },
};

export class DeliveryService {
  static async list(query: DeliveryQueryInput) {
    const { page, limit, lot_id, contract_id, contract_item_id, type } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (lot_id) where.lot_id = lot_id;
    if (contract_item_id) where.contract_item_id = contract_item_id;
    if (type) where.type = type;
    if (contract_id) {
      where.lot = { contract_id };
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: DELIVERY_INCLUDE,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: number) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: DELIVERY_INCLUDE,
    });
    if (!delivery) throw new NotFoundError("Entrega", id);
    return delivery;
  }

  /**
   * Creates deliveries in bulk (within a transaction).
   */
  static async createBulk(deliveries: CreateDeliveryInput[], userId: number) {
    return prisma.$transaction(
      deliveries.map((d) =>
        prisma.delivery.create({
          data: {
            lot_id: d.lot_id,
            contract_item_id: d.contract_item_id,
            type: d.type,
            subtype: d.subtype,
            file_url: d.file_url,
            link: d.link,
            protocol_number: d.protocol_number,
            protocol_date: d.protocol_date ? new Date(d.protocol_date) : null,
            delivered_at: new Date(d.delivered_at),
            created_by_id: userId,
          },
          include: DELIVERY_INCLUDE,
        })
      )
    );
  }

  /**
   * Creates a single delivery.
   */
  static async create(data: CreateDeliveryInput, userId: number) {
    return prisma.delivery.create({
      data: {
        lot_id: data.lot_id,
        contract_item_id: data.contract_item_id,
        type: data.type,
        subtype: data.subtype,
        file_url: data.file_url,
        link: data.link,
        protocol_number: data.protocol_number,
        protocol_date: data.protocol_date ? new Date(data.protocol_date) : null,
        delivered_at: new Date(data.delivered_at),
        created_by_id: userId,
      },
      include: DELIVERY_INCLUDE,
    });
  }

  /**
   * Substitutes a delivery: saves the old version in history,
   * updates with new data, tracks who/when/why.
   */
  static async substitute(
    deliveryId: number,
    data: SubstituteDeliveryInput,
    userId: number
  ) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundError("Entrega", deliveryId);

    // Save to history
    await prisma.deliveryHistory.create({
      data: {
        delivery_id: deliveryId,
        previous_url: delivery.file_url,
        previous_link: delivery.link,
        new_url: data.new_url || null,
        new_link: data.new_link || null,
        reason: data.reason,
        retroactive_date: data.retroactive_date ? new Date(data.retroactive_date) : null,
        replaced_by_id: userId,
      },
    });

    // Update the delivery
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        ...(data.new_url !== undefined && { file_url: data.new_url }),
        ...(data.new_link !== undefined && { link: data.new_link }),
        ...(data.retroactive_date && { delivered_at: new Date(data.retroactive_date) }),
      },
      include: DELIVERY_INCLUDE,
    });

    return updated;
  }

  /**
   * Gets delivery history (all substitutions).
   */
  static async getHistory(deliveryId: number) {
    return prisma.deliveryHistory.findMany({
      where: { delivery_id: deliveryId },
      include: { replaced_by: { select: { id: true, name: true } } },
      orderBy: { replaced_at: "desc" },
    });
  }

  /**
   * Counts deliveries by lot for a contract.
   */
  static async countByContract(contractId: number) {
    return prisma.delivery.groupBy({
      by: ["lot_id", "type"],
      where: { lot: { contract_id: contractId } },
      _count: true,
    });
  }
}
