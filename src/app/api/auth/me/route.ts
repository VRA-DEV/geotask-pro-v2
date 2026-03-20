import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/errors";

const handler: AuthenticatedHandler = async (req) => {
  try {
    const user = await AuthService.getProfile(req.user.userId);
    return NextResponse.json({ data: user });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
