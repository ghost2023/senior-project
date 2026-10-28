import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSession } from "@/lib/permissions";
import { getSectionRoster, getTeacherByUserId, getTeacherSections } from "@/lib/queries/teacher";
import { StudentDirectory, type RosterRow } from "./student-directory";

export default async function TeacherStudentsPage() {
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);

  const rows: RosterRow[] = [];
  for (const section of currentSections) {
    const roster = await getSectionRoster(section.id);
    for (const r of roster) {
      rows.push({
        enrollmentId: r.id,
        studentId: r.student.id,
        name: r.student.user.name,
        email: r.student.user.email,
        studentNumber: r.student.studentNumber,
        courseName: section.course.name,
        courseCode: section.course.code,
        sectionCode: section.sectionCode,
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold tracking-tight">Student Directory</h2>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>All Students — Current Term</CardTitle>
          <CardDescription>{rows.length} enrolled across {currentSections.length} sections</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <StudentDirectory rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
