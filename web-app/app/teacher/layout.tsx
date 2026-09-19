import { requireRolePage } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRolePage("teacher");

  return (
    <AppShell
      role="teacher"
      userName={session.user.name || "Teacher"}
      userEmail={session.user.email}
    >
      {children}
    </AppShell>
  );
}
