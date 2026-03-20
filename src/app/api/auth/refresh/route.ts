import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError } from "@/lib/errors";
import { setAuthCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const refreshToken =
      req.cookies.get("geotask_refresh_token")?.value ||
      (await req.json().catch(() => ({}))).refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token nao fornecido" },
        { status: 400 }
      );
    }

    const tokens = await AuthService.refresh(refreshToken);

    // Set new cookies
    await setAuthCookies(tokens.accessToken, tokens.refreshToken);

    return NextResponse.json({
      data: { accessToken: tokens.accessToken },
      message: "Token atualizado",
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
