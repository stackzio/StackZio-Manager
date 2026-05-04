import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets, API auth, and Next internals.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/Logo") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // We use cookie presence as a cheap auth-ish signal at the edge.
  // Authoritative check is done in server components via `auth()`.
  // (Auth.js cookie name varies by env; we just gate-pass everything to RSC.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// PUBLIC_PATHS is referenced by route layouts for clarity.
export { PUBLIC_PATHS };
