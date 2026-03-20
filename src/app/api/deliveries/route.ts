import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { DeliveryService } from "@/lib/services/delivery.service";
import { LogService } from "@/lib/services/log.service";
import { createDeliverySchema, createBulkDeliverySchema, deliveryQuerySchema } from "@/lib/dto/delivery.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(deliveryQuerySchema, params);
    const result = await DeliveryService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();

    // Support both single and bulk creation
    if (body.deliveries) {
      const { deliveries } = validateDto(createBulkDeliverySchema, body);
      const result = await DeliveryService.createBulk(deliveries, req.user.userId);

      await LogService.audit({
        userId: req.user.userId,
        action: "CREATE",
        entity: "Delivery",
        afterData: { count: result.length },
        description: `${result.length} entregas registradas`,
        ipAddress: LogService.getIpAddress(req.headers),
      });

      return NextResponse.json({ data: result, message: `${result.length} entregas criadas` }, { status: 201 });
    }

    const data = validateDto(createDeliverySchema, body);
    const delivery = await DeliveryService.create(data, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Delivery",
      entityId: delivery.id,
      afterData: { lot_id: delivery.lot_id, type: delivery.type },
      description: `Entrega registrada: ${delivery.type}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: delivery, message: "Entrega registrada" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withAuth(createHandler);
