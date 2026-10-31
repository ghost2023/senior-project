import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllCourses, getAllDepartments, getAllPrograms, getAllSections, getAllTeachersWithDepartment } from "@/lib/queries/admin";
import { getAllTerms } from "@/lib/queries/shared";
import { AcademicStructureTabs } from "./academic-structure-tabs";

export default async function AdminAcademicStructurePage() {
  const [departments, programs, courses, terms, sections, teachers] = await Promise.all([
    getAllDepartments(),
    getAllPrograms(),
    getAllCourses(),
    getAllTerms(),
    getAllSections(),
    getAllTeachersWithDepartment(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Academic Structure</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
          Departments, programs, courses, terms and sections (A-05..A-08)
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Master Data</CardTitle>
          <CardDescription>Sections can exist unassigned before a teacher is picked — assign teachers from the Sections tab</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <AcademicStructureTabs
            departments={departments}
            programs={programs}
            courses={courses}
            terms={terms.map((t) => ({ ...t, startDate: String(t.startDate), endDate: String(t.endDate) }))}
            sections={sections.map((s) => ({
              id: s.id,
              sectionCode: s.sectionCode,
              capacity: s.capacity,
              courseId: s.courseId,
              termId: s.termId,
              teacherId: s.teacherId,
              course: { code: s.course.code, name: s.course.name },
              term: { label: s.term.label },
            }))}
            teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
