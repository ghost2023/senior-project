import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()`.
//
// This is only a coarse, optimistic check (cookie presence, not a verified
// DB session — proxy runs on every request and can't afford a DB round
// trip). The authoritative check is requireRole() in each role route
// group's layout.tsx, which calls auth.api.getSession() server-side.
const PROTECTED_PREFIXES = ["/student", "/teacher", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/admin/:path*"],
};
