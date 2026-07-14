import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

// Kept for environments that run `next start`/`next dev` directly (without
// server.ts). The custom server does not reliably invoke this middleware
// under Turbopack, so server.ts duplicates this same guard at the HTTP layer.

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);

  if (payload) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/quiz/:path*",
    "/join/:path*",
    "/host/:path*",
    "/play/:path*",
    "/history/:path*",
    "/host-history/:path*",
  ],
};
