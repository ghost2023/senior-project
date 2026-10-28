import { AppShell } from "@/components/app-shell";
import { requireRolePage } from "@/lib/permissions";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRolePage("teacher");
  return (
    <AppShell role="teacher" userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AppShell>
  );
}
