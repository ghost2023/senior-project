import { AppShell } from "@/components/app-shell";
import { requireRolePage } from "@/lib/permissions";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRolePage("student");
  return (
    <AppShell role="student" userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AppShell>
  );
}
