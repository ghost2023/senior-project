import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/permissions";
import { getAttendanceStats, getStudentByUserId, getStudentEnrollments } from "@/lib/queries/student";
import { cn } from "@/lib/utils";

export default async function StudentAttendancePage() {
  const session = await getSession();
  const student = await getStudentByUserId(session!.user.id);
  if (!student) return <div>No student profile found.</div>;

  const enrollments = await getStudentEnrollments(student.id);
  const current = enrollments.filter((e) => e.section.term.isCurrent);
  const attendance = await getAttendanceStats(current.map((e) => e.id));

  const totalPresent = Object.values(attendance).reduce((s, a) => s + a.present, 0);
  const totalSessions = Object.values(attendance).reduce((s, a) => s + a.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold tracking-tight">Attendance Audit — Current Term</h2>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">Sessions Attended</CardDescription>
            <CardTitle className="text-4xl font-bold font-mono">{totalPresent}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">Sessions Missed</CardDescription>
            <CardTitle className="text-4xl font-bold font-mono">{totalSessions - totalPresent}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>By Course</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Course</TableHead>
                <TableHead className="pr-6">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((e) => {
                const stat = attendance[e.id] ?? { present: 0, total: 0, rate: 0 };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="pl-6">
                      <span className="font-bold text-sm">{e.section.course.name}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground uppercase">
                        {e.section.course.code}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-bold font-mono w-10", stat.rate < 90 ? "text-destructive" : "text-primary")}>
                          {stat.rate}%
                        </span>
                        <Progress value={stat.rate} className="h-1 w-32" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {stat.present}/{stat.total}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
