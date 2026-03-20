import { NextResponse } from "next/server";
import { withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { LogService } from "@/lib/services/log.service";
import { handleApiError } from "@/lib/errors";

const handler: AuthenticatedHandler = async (req) => {
  try {
    const params = req.nextUrl.searchParams;
    const result = await LogService.query({
      userId: params.get("user_id") ? Number(params.get("user_id")) : undefined,
      entity: params.get("entity") || undefined,
      action: params.get("action") || undefined,
      startDate: params.get("start_date") ? new Date(params.get("start_date")!) : undefined,
      endDate: params.get("end_date") ? new Date(params.get("end_date")!) : undefined,
      page: params.get("page") ? Number(params.get("page")) : 1,
      limit: params.get("limit") ? Number(params.get("limit")) : 50,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withRoles(["Admin"])(handler);
