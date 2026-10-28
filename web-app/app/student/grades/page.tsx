import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/permissions";
import { getStudentByUserId, getStudentEnrollments } from "@/lib/queries/student";

export default async function StudentGradesPage() {
  const session = await getSession();
  const student = await getStudentByUserId(session!.user.id);
  if (!student) return <div>No student profile found.</div>;

  const enrollments = await getStudentEnrollments(student.id);
  const byTerm = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    const key = e.section.term.id;
    byTerm.set(key, [...(byTerm.get(key) ?? []), e]);
  }
  const terms = Array.from(byTerm.entries()).sort((a, b) =>
    b[1][0].section.term.startDate.localeCompare(a[1][0].section.term.startDate),
  );

  const gradedCredits = enrollments.filter((e) => e.finalGrade).reduce((s, e) => s + e.section.course.credits, 0);
  const cumulativeGpa =
    gradedCredits > 0
      ? enrollments
          .filter((e) => e.finalGrade)
          .reduce((s, e) => s + Number(e.finalGrade!.gpaPoints) * e.section.course.credits, 0) / gradedCredits
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Grade Ledger</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mt-1">
            Cumulative GPA: {cumulativeGpa.toFixed(2)}
          </p>
        </div>
      </div>

      {terms.map(([termId, rows]) => (
        <Card key={termId}>
          <CardHeader className="border-b">
            <CardTitle>{rows[0].section.term.label}</CardTitle>
            <CardDescription>{rows[0].section.term.academicYear}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Course</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Weighted Total</TableHead>
                  <TableHead className="text-right pr-6">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{e.section.course.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {e.section.course.code} Sec. {e.section.sectionCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.section.teacher?.user.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {e.finalGrade ? `${Number(e.finalGrade.weightedTotal).toFixed(1)}%` : "In progress"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant={e.finalGrade ? "secondary" : "outline"} className="font-mono font-bold">
                        {e.finalGrade?.letterGrade ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
