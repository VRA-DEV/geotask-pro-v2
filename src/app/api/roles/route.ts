import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { UserService } from "@/lib/services/user.service";
import { handleApiError } from "@/lib/errors";

const handler: AuthenticatedHandler = async () => {
  try {
    const roles = await UserService.listRoles();
    return NextResponse.json({ data: roles });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
