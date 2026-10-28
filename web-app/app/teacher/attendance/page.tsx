import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSession } from "@/lib/permissions";
import { getSectionAttendance, getSectionRoster, getTeacherByUserId, getTeacherSections } from "@/lib/queries/teacher";
import { dedupeLatestAttendance } from "@/lib/queries/shared";
import { SectionPicker } from "../section-picker";
import { AttendanceGrid, type AttendanceRosterRow } from "./attendance-grid";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const { section: sectionParam, date: dateParam } = await searchParams;
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);
  const activeSection = currentSections.find((s) => s.id === sectionParam) ?? currentSections[0];

  if (!activeSection) {
    return <div className="text-sm text-muted-foreground">No sections assigned for the current term.</div>;
  }

  const sessionDate = dateParam ?? todayIso();
  const roster = await getSectionRoster(activeSection.id);
  const rawAttendance = await getSectionAttendance(
    activeSection.id,
    roster.map((r) => r.id),
  );
  const current = dedupeLatestAttendance(rawAttendance).filter((a) => a.sessionDate === sessionDate);
  const statusByEnrollment = new Map(current.map((a) => [a.enrollmentId, a.status]));

  const rows: AttendanceRosterRow[] = roster.map((r) => ({
    enrollmentId: r.id,
    studentName: r.student.user.name,
    studentNumber: r.student.studentNumber,
    currentStatus: (statusByEnrollment.get(r.id) as AttendanceRosterRow["currentStatus"]) ?? null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
        <SectionPicker
          basePath="/teacher/attendance"
          value={activeSection.id}
          options={currentSections.map((s) => ({ id: s.id, label: `${s.course.code} Sec. ${s.sectionCode}` }))}
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{activeSection.course.name}</CardTitle>
          <CardDescription>
            {activeSection.course.code} Sec. {activeSection.sectionCode} — {activeSection.term.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AttendanceGrid sectionId={activeSection.id} sessionDate={sessionDate} rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
