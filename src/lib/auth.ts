import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME, signAuthToken, verifyAuthToken } from "./auth-token";
import { prisma } from "./db";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: "ORGANIZER" | "PARTICIPANT";
};

const currentUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
} as const;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: currentUserSelect,
  });

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function setAuthCookie(user: CurrentUser) {
  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
