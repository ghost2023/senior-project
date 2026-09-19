import { requireRolePage } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRolePage("student");

  return (
    <AppShell
      role="student"
      userName={session.user.name || "Student"}
      userEmail={session.user.email}
    >
      {children}
    </AppShell>
  );
}
