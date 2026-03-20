import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface TokenPayload extends JWTPayload {
  userId: number;
  email: string;
  roleId: number;
  roleName: string;
  userType: string;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-change-me"
);

const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "15m";
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

export async function signAccessToken(payload: Omit<TokenPayload, "iat" | "exp" | "iss">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .setIssuer("geotask-pro-v2")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: { userId: number }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRATION)
    .setIssuer("geotask-pro-v2")
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: "geotask-pro-v2",
  });
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ userId: number }> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET, {
    issuer: "geotask-pro-v2",
  });
  return payload as { userId: number };
}
