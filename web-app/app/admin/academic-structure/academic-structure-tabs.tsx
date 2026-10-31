"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  assignTeacherToSectionAction,
  createCourseAction,
  createDepartmentAction,
  createProgramAction,
  createSectionAction,
  createTermAction,
} from "./actions";

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}
interface Program {
  id: string;
  name: string;
  degreeLevel: string | null;
  departmentId: string;
  department: { name: string };
}
interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  departmentId: string;
  department: { name: string };
}
interface Term {
  id: string;
  label: string;
  academicYear: string;
  termType: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}
interface SectionRow {
  id: string;
  sectionCode: string;
  capacity: number;
  courseId: string;
  termId: string;
  teacherId: string | null;
  course: { code: string; name: string };
  term: { label: string };
}
interface TeacherOption {
  id: string;
  name: string;
}

export function AcademicStructureTabs({
  departments,
  programs,
  courses,
  terms,
  sections,
  teachers,
}: {
  departments: Department[];
  programs: Program[];
  courses: Course[];
  terms: Term[];
  sections: SectionRow[];
  teachers: TeacherOption[];
}) {
  return (
    <Tabs defaultValue="departments">
      <TabsList>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="courses">Courses</TabsTrigger>
        <TabsTrigger value="terms">Terms</TabsTrigger>
        <TabsTrigger value="sections">Sections</TabsTrigger>
      </TabsList>

      <TabsContent value="departments" className="pt-6">
        <DepartmentsPanel departments={departments} />
      </TabsContent>
      <TabsContent value="programs" className="pt-6">
        <ProgramsPanel programs={programs} departments={departments} />
      </TabsContent>
      <TabsContent value="courses" className="pt-6">
        <CoursesPanel courses={courses} departments={departments} />
      </TabsContent>
      <TabsContent value="terms" className="pt-6">
        <TermsPanel terms={terms} />
      </TabsContent>
      <TabsContent value="sections" className="pt-6">
        <SectionsPanel sections={sections} courses={courses} terms={terms} teachers={teachers} />
      </TabsContent>
    </Tabs>
  );
}

function DepartmentsPanel({ departments }: { departments: Department[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const data = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await createDepartmentAction({ name: String(data.get("name")), code: String(data.get("code")) });
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create department");
            }
          });
        }}
      >
        <Field label="Name"><Input name="name" required className="w-56" /></Field>
        <Field label="Code"><Input name="code" required className="w-24" maxLength={16} /></Field>
        <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Department"}</Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead className="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="pl-6 font-bold text-sm">{d.name}</TableCell>
              <TableCell className="font-mono text-xs">{d.code}</TableCell>
              <TableCell className="pr-6">
                <Badge variant={d.isActive ? "outline" : "secondary"}>{d.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProgramsPanel({ programs, departments }: { programs: Program[]; departments: Department[] }) {
  const [departmentId, setDepartmentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex items-end gap-3 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const data = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await createProgramAction({
                departmentId,
                name: String(data.get("name")),
                degreeLevel: String(data.get("degreeLevel") ?? "") || undefined,
              });
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create program");
            }
          });
        }}
      >
        <Field label="Department">
          <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Name"><Input name="name" required className="w-56" /></Field>
        <Field label="Degree Level"><Input name="degreeLevel" placeholder="BSc" className="w-28" /></Field>
        <Button type="submit" disabled={isPending || !departmentId}>{isPending ? "Adding..." : "Add Program"}</Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Program</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="pr-6">Degree Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="pl-6 font-bold text-sm">{p.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{p.department.name}</TableCell>
              <TableCell className="pr-6 text-xs">{p.degreeLevel ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CoursesPanel({ courses, departments }: { courses: Course[]; departments: Department[] }) {
  const [departmentId, setDepartmentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex items-end gap-3 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const data = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await createCourseAction({
                departmentId,
                code: String(data.get("code")),
                name: String(data.get("name")),
                credits: Number(data.get("credits")),
              });
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create course");
            }
          });
        }}
      >
        <Field label="Department">
          <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Code"><Input name="code" required className="w-24" placeholder="CS301" /></Field>
        <Field label="Name"><Input name="name" required className="w-56" /></Field>
        <Field label="Credits"><Input name="credits" type="number" required defaultValue={3} className="w-20" /></Field>
        <Button type="submit" disabled={isPending || !departmentId}>{isPending ? "Adding..." : "Add Course"}</Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="pr-6">Credits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="pl-6 font-mono text-xs font-bold">{c.code}</TableCell>
              <TableCell className="text-sm">{c.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.department.name}</TableCell>
              <TableCell className="pr-6 text-xs">{c.credits}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TermsPanel({ terms }: { terms: Term[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [termType, setTermType] = useState<"fall" | "spring" | "summer">("fall");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex items-end gap-3 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const data = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await createTermAction({
                label: String(data.get("label")),
                academicYear: String(data.get("academicYear")),
                termType,
                startDate: String(data.get("startDate")),
                endDate: String(data.get("endDate")),
                isCurrent,
              });
              formRef.current?.reset();
              setIsCurrent(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create term");
            }
          });
        }}
      >
        <Field label="Label"><Input name="label" required placeholder="Fall 2026" className="w-32" /></Field>
        <Field label="Academic Year"><Input name="academicYear" required placeholder="2026-2027" className="w-28" /></Field>
        <Field label="Type">
          <Select value={termType} onValueChange={(v) => setTermType(v as "fall" | "spring" | "summer")}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start"><Input name="startDate" type="date" required className="w-36" /></Field>
        <Field label="End"><Input name="endDate" type="date" required className="w-36" /></Field>
        <Button type="button" variant={isCurrent ? "default" : "outline"} size="sm" onClick={() => setIsCurrent((v) => !v)}>
          {isCurrent ? "Will be current" : "Set as current"}
        </Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Term"}</Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Label</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead className="pr-6">Current</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {terms.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="pl-6 font-bold text-sm">{t.label}</TableCell>
              <TableCell className="text-xs capitalize">{t.termType}</TableCell>
              <TableCell className="text-xs font-mono">{t.startDate}</TableCell>
              <TableCell className="text-xs font-mono">{t.endDate}</TableCell>
              <TableCell className="pr-6">{t.isCurrent && <Badge>Current</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SectionsPanel({
  sections,
  courses,
  terms,
  teachers,
}: {
  sections: SectionRow[];
  courses: Course[];
  terms: Term[];
  teachers: TeacherOption[];
}) {
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex items-end gap-3 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const data = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await createSectionAction({
                courseId,
                termId,
                sectionCode: String(data.get("sectionCode")),
                capacity: Number(data.get("capacity")),
              });
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create section");
            }
          });
        }}
      >
        <Field label="Course">
          <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Term">
          <Select value={termId} onValueChange={(v) => setTermId(v ?? "")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Section"><Input name="sectionCode" required placeholder="A" className="w-16" /></Field>
        <Field label="Capacity"><Input name="capacity" type="number" required defaultValue={40} className="w-20" /></Field>
        <Button type="submit" disabled={isPending || !courseId || !termId}>{isPending ? "Adding..." : "Add Section"}</Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Course</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Sec.</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead className="pr-6">Teacher</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="pl-6 text-xs font-bold">{s.course.code} — {s.course.name}</TableCell>
              <TableCell className="text-xs">{s.term.label}</TableCell>
              <TableCell className="text-xs">{s.sectionCode}</TableCell>
              <TableCell className="text-xs">{s.capacity}</TableCell>
              <TableCell className="pr-6">
                <Select
                  value={s.teacherId ?? "unassigned"}
                  onValueChange={(v) => {
                    setAssigningId(s.id);
                    startTransition(async () => {
                      await assignTeacherToSectionAction({ sectionId: s.id, teacherId: v === "unassigned" ? null : v });
                      setAssigningId(null);
                    });
                  }}
                >
                  <SelectTrigger className="w-44" disabled={isPending && assigningId === s.id}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
