import { requireRolePage } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRolePage("faculty_admin");

  return (
    <AppShell
      role="faculty_admin"
      userName={session.user.name || "Administrator"}
      userEmail={session.user.email}
    >
      {children}
    </AppShell>
  );
}
