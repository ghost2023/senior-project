import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllPrograms, getAllUsers, getAllDepartments } from "@/lib/queries/admin";
import { CreateUserDialog } from "./create-user-dialog";
import { UserTable, type UserRow } from "./user-table";

export default async function AdminUsersPage() {
  const [users, departments, programs] = await Promise.all([getAllUsers(), getAllDepartments(), getAllPrograms()]);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    detail: u.teacher
      ? u.teacher.department.name
      : u.student
        ? `${u.student.studentNumber} — Sem. ${u.student.currentSemesterNumber}`
        : u.facultyAdmin
          ? "Faculty Administration"
          : "—",
  }));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{users.length} accounts on record</p>
        </div>
        <CreateUserDialog departments={departments} programs={programs.map((p) => ({ id: p.id, name: p.name, departmentId: p.departmentId }))} />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>Deactivating an account disables sign-in immediately without deleting their records (rule #4)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
