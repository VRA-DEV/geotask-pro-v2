import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
];

const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/images"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Skip public paths
  if (PUBLIC_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // Skip API uploads (served statically)
  if (pathname.startsWith("/api/uploads/")) {
    return NextResponse.next();
  }

  // Check for JWT token
  const token =
    request.cookies.get("geotask_access_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Return 401 for API requests
    return NextResponse.json({ error: "Autenticacao necessaria" }, { status: 401 });
  }

  // Verify JWT
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "geotask-pro-v2",
    });

    // Add user info to request headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-id", String(payload.userId));
    response.headers.set("x-user-email", String(payload.email));
    response.headers.set("x-user-role", String(payload.roleName));
    response.headers.set("x-user-type", String(payload.userType));

    return response;
  } catch {
    // Token expired or invalid
    if (!pathname.startsWith("/api/")) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("geotask_access_token");
      response.cookies.delete("geotask_refresh_token");
      return response;
    }

    return NextResponse.json({ error: "Token expirado ou invalido" }, { status: 401 });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
