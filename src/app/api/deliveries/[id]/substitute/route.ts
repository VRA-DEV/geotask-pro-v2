import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { DeliveryService } from "@/lib/services/delivery.service";
import { LogService } from "@/lib/services/log.service";
import { substituteDeliverySchema } from "@/lib/dto/delivery.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * POST /api/deliveries/[id]/substitute — Replace a delivery with history tracking.
 */
const handler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const deliveryId = Number(params?.id);
    if (!deliveryId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await req.json();
    const data = validateDto(substituteDeliverySchema, body);
    const delivery = await DeliveryService.substitute(deliveryId, data, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Delivery",
      entityId: deliveryId,
      afterData: { reason: data.reason, retroactive_date: data.retroactive_date },
      description: `Entrega substituida: ${data.reason}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: delivery, message: "Entrega substituida" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withAuth(handler);
