import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth, type Role } from "./auth";

export const ROLE_HOME: Record<Role, string> = {
  student: "/student",
  teacher: "/teacher",
  faculty_admin: "/admin",
  admin: "/admin",
};

export function matchesRole(userRole: Role | undefined, expectedRole: Role): boolean {
  if (!userRole) return false;
  if (userRole === expectedRole) return true;
  if (
    (userRole === "admin" || userRole === "faculty_admin") &&
    (expectedRole === "admin" || expectedRole === "faculty_admin")
  ) {
    return true;
  }
  return false;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Server Components / route handlers: get the current session or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Route handlers: get the session or throw a 401. */
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Not authenticated");
  return session;
}

/** Route handlers: get the session and assert the role, or throw 401/403. */
export async function requireRole(roles: Role | Role[]) {
  const session = await requireSession();
  // Rule #4: deactivated accounts are disabled, not deleted — re-checked on
  // every authoritative request rather than only at sign-in, since a session
  // cookie issued before deactivation would otherwise remain valid until it
  // expires.
  if ((session.user as { isActive?: boolean }).isActive === false) {
    throw new HttpError(403, "This account has been deactivated");
  }
  const allowed = Array.isArray(roles) ? roles : [roles];
  const role = (session.user as { role?: string }).role as Role | undefined;
  const isMatch = allowed.some((r) => matchesRole(role, r));
  if (!role || !isMatch) {
    throw new HttpError(403, `Requires role: ${allowed.join(" or ")}`);
  }
  return session;
}

/**
 * Server Component / layout guard: redirects to /sign-in if unauthenticated,
 * or to the user's own dashboard if their role doesn't match. This is the
 * authoritative check — proxy.ts only does an optimistic cookie check.
 */
export async function requireRolePage(role: Role) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Rule #4: a deactivated account loses access on its very next request,
  // even if it's still holding a session cookie issued before deactivation.
  if ((session.user as { isActive?: boolean }).isActive === false) {
    redirect("/sign-in");
  }

  const userRole = (session.user as { role?: string }).role as Role | undefined;
  if (!matchesRole(userRole, role)) {
    redirect(userRole ? ROLE_HOME[userRole] : "/sign-in");
  }
  return session;
}

/** Wrap a route handler body so HttpError becomes a proper JSON response. */
export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
