import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSession } from "@/lib/permissions";
import {
  getSectionAssessmentComponents,
  getSectionGradeEntries,
  getSectionRoster,
  getTeacherByUserId,
  getTeacherSections,
} from "@/lib/queries/teacher";
import { SectionPicker } from "../section-picker";
import { GradeGrid, type GradeGridComponent, type GradeGridRow } from "./grade-grid";

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: sectionParam } = await searchParams;
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);
  const activeSection = currentSections.find((s) => s.id === sectionParam) ?? currentSections[0];

  if (!activeSection) {
    return <div className="text-sm text-muted-foreground">No sections assigned for the current term.</div>;
  }

  const [components, roster] = await Promise.all([
    getSectionAssessmentComponents(activeSection.id),
    getSectionRoster(activeSection.id),
  ]);
  const entries = await getSectionGradeEntries(
    activeSection.id,
    roster.map((r) => r.id),
  );

  // getSectionGradeEntries orders by enteredAt desc, so the first entry seen
  // per (enrollmentId, componentId) pair is the current (non-superseded) one.
  const latestByEnrollmentComponent = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const byComponent = latestByEnrollmentComponent.get(e.enrollmentId) ?? new Map<string, number>();
    latestByEnrollmentComponent.set(e.enrollmentId, byComponent);
    if (!byComponent.has(e.assessmentComponentId)) {
      byComponent.set(e.assessmentComponentId, Number(e.score));
    }
  }

  const gridComponents: GradeGridComponent[] = components.map((c) => ({
    id: c.id,
    name: c.name,
    weightPct: Number(c.weightPct),
    maxScore: Number(c.maxScore),
  }));

  const gridRows: GradeGridRow[] = roster.map((r) => ({
    enrollmentId: r.id,
    studentName: r.student.user.name,
    studentNumber: r.student.studentNumber,
    scores: Object.fromEntries(components.map((c) => [c.id, latestByEnrollmentComponent.get(r.id)?.get(c.id) ?? null])),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h2 className="text-3xl font-bold tracking-tight">Manage Grades</h2>
        <SectionPicker
          basePath="/teacher/grades"
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
        <CardContent className="p-0 pt-4">
          <GradeGrid sectionId={activeSection.id} components={gridComponents} rows={gridRows} />
        </CardContent>
      </Card>
    </div>
  );
}
