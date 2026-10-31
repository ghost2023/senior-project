"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconUserPlus } from "@tabler/icons-react";
import { createUserAction } from "./actions";

type Role = "student" | "teacher" | "faculty_admin";

interface Department {
  id: string;
  name: string;
}
interface Program {
  id: string;
  name: string;
  departmentId: string;
}

export function CreateUserDialog({ departments, programs }: { departments: Department[]; programs: Program[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    startTransition(async () => {
      try {
        if (role === "teacher") {
          await createUserAction({ role, name, email, password, departmentId, title: String(data.get("title") ?? "") || undefined });
        } else if (role === "student") {
          await createUserAction({
            role,
            name,
            email,
            password,
            programId,
            studentNumber: String(data.get("studentNumber") ?? ""),
            enrollmentYear: Number(data.get("enrollmentYear") ?? new Date().getFullYear()),
          });
        } else {
          await createUserAction({ role, name, email, password });
        }
        setOpen(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="font-bold text-xs uppercase tracking-widest shadow-lg" />}>
        <IconUserPlus size={16} /> Create User
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new user</DialogTitle>
          <DialogDescription>Account credentials are set here; the user can change their password after signing in.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="faculty_admin">Faculty Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full name</label>
            <Input name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <Input name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Temporary password</label>
            <Input name="password" type="password" minLength={8} required />
          </div>

          {role === "teacher" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Department</label>
                <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title (optional)</label>
                <Input name="title" placeholder="Senior Lecturer" />
              </div>
            </>
          )}

          {role === "student" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Program</label>
                <Select value={programId} onValueChange={(v) => setProgramId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student number</label>
                <Input name="studentNumber" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enrollment year</label>
                <Input name="enrollmentYear" type="number" defaultValue={new Date().getFullYear()} required />
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || (role === "teacher" && !departmentId) || (role === "student" && !programId)}
            >
              {isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
