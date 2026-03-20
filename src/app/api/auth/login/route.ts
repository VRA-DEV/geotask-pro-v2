import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { LogService } from "@/lib/services/log.service";
import { loginSchema } from "@/lib/dto/auth.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";
import { setAuthCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = validateDto(loginSchema, body);

    const result = await AuthService.login(data.email, data.password);

    // Set httpOnly cookies
    await setAuthCookies(result.accessToken, result.refreshToken);

    // Log the login
    await LogService.audit({
      userId: result.user.id,
      action: "LOGIN",
      entity: "User",
      entityId: result.user.id,
      description: `Login: ${result.user.email}`,
      ipAddress: LogService.getIpAddress(req.headers),
      userAgent: LogService.getUserAgent(req.headers),
    });

    return NextResponse.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      message: "Login realizado com sucesso",
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
