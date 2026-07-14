import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

export const AUTH_COOKIE_NAME = "quizapp_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const authTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["ORGANIZER", "PARTICIPANT"]),
});

export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must contain at least 16 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify(token, getJwtSecret());
    return authTokenPayloadSchema.parse(result.payload);
  } catch {
    return null;
  }
}
