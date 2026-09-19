import { redirect } from "next/navigation";
import { ROLE_HOME, getSession } from "@/lib/permissions";
import type { Role } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role as Role | undefined;
  redirect(role ? ROLE_HOME[role] : "/sign-in");
}
