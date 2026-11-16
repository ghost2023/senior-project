import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "./auth";

export const ROLE_HOME: Record<Role, string> = {
  student: "/student",
  teacher: "/teacher",
  faculty_admin: "/admin",
  admin: "/admin",
};

export function matchesRole(userRole: Role | undefined, expectedRole: Role): boolean {
  if (!userRole) return false;
  if (userRole === expectedRole) return true;
  return (userRole === "admin" || userRole === "faculty_admin") &&
    (expectedRole === "admin" || expectedRole === "faculty_admin");
}
type BackendSession = {
  user: { id: string; name: string; email: string; role?: string; isActive?: boolean };
  session: { id: string; expiresAt: string };
};

export async function getSession(): Promise<BackendSession | null> {
  const requestHeaders = await headers();
  const response = await fetch(
    `${process.env.BACKEND_URL ?? "http://localhost:4000"}/api/v1/session`,
    { headers: { cookie: requestHeaders.get("cookie") ?? "" }, cache: "no-store" },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { session: BackendSession };
  return body.session;
}

export async function requireRolePage(role: Role) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.isActive === false) redirect("/sign-in");

  const userRole = session.user.role as Role | undefined;
  if (!matchesRole(userRole, role)) redirect(userRole ? ROLE_HOME[userRole] : "/sign-in");
  return session;
}
