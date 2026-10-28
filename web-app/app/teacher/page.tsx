import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconUsers, IconTrendingUp, IconCalendar, IconAlertTriangle } from "@tabler/icons-react";
import { getSession } from "@/lib/permissions";
import { getSectionSummary, getTeacherByUserId, getTeacherSections } from "@/lib/queries/teacher";

export default async function TeacherDashboardPage() {
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);
  const summaries = await Promise.all(currentSections.map((s) => getSectionSummary(s.id)));

  const totalStudents = summaries.reduce((s, x) => s + x.rosterCount, 0);
  const avgGpa =
    summaries.length > 0 ? summaries.reduce((s, x) => s + x.avgGpa, 0) / summaries.filter((x) => x.avgGpa > 0).length || 0 : 0;
  const avgAttendance =
    summaries.length > 0 ? Math.round(summaries.reduce((s, x) => s + x.avgAttendanceRate, 0) / summaries.length) : 0;
  const totalAtRisk = summaries.reduce((s, x) => s + x.atRiskCount, 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-4xl font-bold tracking-tight leading-none">Class Overview</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
          {teacher.user.name} — {teacher.department.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <IconUsers size={14} /> Students (Current Term)
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono">{totalStudents}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <IconTrendingUp size={14} /> Avg. GPA
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono">{avgGpa.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <IconCalendar size={14} /> Avg. Attendance
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono">{avgAttendance}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/10 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-destructive">
              <IconAlertTriangle size={14} /> At-Risk Students
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono text-destructive">{totalAtRisk}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Assigned Sections — Current Term</CardTitle>
          <CardDescription>Select a section to manage grades or attendance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {currentSections.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No sections assigned for the current term.</p>
          )}
          {currentSections.map((s, i) => {
            const summary = summaries[i];
            return (
              <Link
                key={s.id}
                href={`/teacher/grades?section=${s.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/5 transition-colors"
              >
                <div>
                  <p className="font-bold text-sm">{s.course.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">
                    {s.course.code} Sec. {s.sectionCode} — {summary.rosterCount} students
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono">GPA {summary.avgGpa.toFixed(2)}</span>
                  <span className="text-xs font-mono">{summary.avgAttendanceRate}% attend.</span>
                  {summary.atRiskCount > 0 && (
                    <Badge variant="destructive">{summary.atRiskCount} at risk</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
