import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconSparkles,
  IconAlertTriangle,
  IconTrendingUp,
  IconCalendar,
  IconCreditCard,
  IconMicroscope,
} from "@tabler/icons-react";
import { getSession } from "@/lib/permissions";
import {
  getAttendanceStats,
  getLatestRiskAssessment,
  getStudentAlerts,
  getStudentByUserId,
  getStudentEnrollments,
} from "@/lib/queries/student";
import { cn } from "@/lib/utils";
import { GpaTrendChart } from "./gpa-trend-chart";

const STANDING_THRESHOLDS = [
  { min: 3.5, label: "Distinguished" },
  { min: 3.0, label: "Good Standing" },
  { min: 2.0, label: "Satisfactory" },
  { min: 0, label: "Probation" },
];

function standingFor(gpa: number) {
  return STANDING_THRESHOLDS.find((t) => gpa >= t.min)?.label ?? "Probation";
}

export default async function StudentDashboardPage() {
  const session = await getSession();
  const student = await getStudentByUserId(session!.user.id);
  if (!student) return <div>No student profile found for this account.</div>;

  const enrollments = await getStudentEnrollments(student.id);
  const attendance = await getAttendanceStats(enrollments.map((e) => e.id));
  const latestRisk = await getLatestRiskAssessment(student.id);
  const alerts = await getStudentAlerts(student.id);
  const activeAlerts = alerts.filter((a) => !a.acknowledgedAt);

  const graded = enrollments.filter((e) => e.finalGrade?.gpaPoints != null);
  const totalCredits = graded.reduce((s, e) => s + e.section.course.credits, 0);
  const gpa =
    totalCredits > 0
      ? graded.reduce((s, e) => s + Number(e.finalGrade!.gpaPoints) * e.section.course.credits, 0) / totalCredits
      : 0;

  const currentTermEnrollments = enrollments.filter((e) => e.section.term.isCurrent);
  const currentAttendanceRates = currentTermEnrollments.map((e) => attendance[e.id]?.rate ?? 0);
  const overallAttendanceRate =
    currentAttendanceRates.length > 0
      ? Math.round(currentAttendanceRates.reduce((a, b) => a + b, 0) / currentAttendanceRates.length)
      : 0;

  const completedCredits = enrollments
    .filter((e) => e.status !== "active" && e.finalGrade)
    .reduce((s, e) => s + e.section.course.credits, 0);

  // GPA trend: average gpaPoints weighted by credits, grouped by term.
  const gpaByTerm = new Map<string, { label: string; startDate: string; weighted: number; credits: number }>();
  for (const e of graded) {
    const term = e.section.term;
    const entry = gpaByTerm.get(term.id) ?? { label: term.label, startDate: term.startDate, weighted: 0, credits: 0 };
    entry.weighted += Number(e.finalGrade!.gpaPoints) * e.section.course.credits;
    entry.credits += e.section.course.credits;
    gpaByTerm.set(term.id, entry);
  }
  const gpaTrend = Array.from(gpaByTerm.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((t) => ({ name: t.label, gpa: t.credits > 0 ? Math.round((t.weighted / t.credits) * 100) / 100 : 0 }));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-bold tracking-tight leading-none">
          Welcome back, {session!.user.name.split(" ")[0]}.
        </h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Student ID: {student.studentNumber} — {student.program.name} — {student.program.department.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <IconTrendingUp size={14} /> Current GPA
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono tracking-tighter">{gpa.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(gpa / 4) * 100} className="h-1" />
          </CardContent>
        </Card>

        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <IconCalendar size={14} /> Attendance (Current Term)
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono tracking-tighter">{overallAttendanceRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallAttendanceRate} className="h-1" />
          </CardContent>
        </Card>

        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <IconCreditCard size={14} /> Credits Completed
            </CardDescription>
            <CardTitle className="text-4xl font-bold font-mono tracking-tighter">{completedCredits}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-accent/5 shadow-none border-none">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <IconMicroscope size={14} /> Standing
            </CardDescription>
            <div className="pt-2">
              <Badge variant="secondary" className="font-bold text-xs uppercase tracking-widest px-3 py-1">
                {standingFor(gpa)}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Academic Trajectory</CardTitle>
            <CardDescription className="font-mono text-[10px] uppercase tracking-widest">
              Semester-over-semester GPA
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full px-6 pb-6">
            <GpaTrendChart data={gpaTrend} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader className="pb-6">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary-foreground">
                <IconSparkles size={16} className="text-primary-foreground/80" /> Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {latestRisk ? (
                <>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-primary-foreground/60 tracking-widest mb-1">
                      Risk Level
                    </p>
                    <p className="text-3xl font-bold tracking-tighter capitalize">
                      {latestRisk.riskLevel.replace("_", " ")}
                    </p>
                  </div>
                  {latestRisk.predictedFinalGrade && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-primary-foreground/60 tracking-widest mb-1">
                        Predicted GPA
                      </p>
                      <p className="text-2xl font-bold font-mono">{Number(latestRisk.predictedFinalGrade).toFixed(2)}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-primary-foreground/60">
                  No prediction has been generated yet. Predictions run after the first ML model deployment.
                </p>
              )}
            </CardContent>
          </Card>

          {activeAlerts.length > 0 && (
            <Card className="bg-destructive/10 border-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-destructive uppercase tracking-widest">
                  <IconAlertTriangle size={14} /> Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <ul className="flex flex-col gap-2">
                  {activeAlerts.slice(0, 3).map((a) => (
                    <li key={a.id} className="text-xs text-destructive/80 font-bold flex gap-2">
                      <span className="text-destructive">!!</span> {a.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="border-b px-6 py-6">
          <CardTitle>Curriculum Performance</CardTitle>
          <CardDescription>Individual course benchmarks and engagement — current term</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold uppercase tracking-widest pl-6">Course</TableHead>
                <TableHead className="font-bold uppercase tracking-widest">Attendance</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-right pr-6">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTermEnrollments.map((e) => {
                const rate = attendance[e.id]?.rate ?? 0;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">{e.section.course.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {e.section.course.code} Sec. {e.section.sectionCode} — {e.section.course.credits} Credits
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-bold font-mono", rate < 90 ? "text-destructive" : "text-primary")}>
                          {rate}%
                        </span>
                        <Progress value={rate} className="h-1 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="inline-flex size-8 rounded-lg bg-accent/10 border items-center justify-center font-bold font-mono text-xs">
                        {e.finalGrade?.letterGrade ?? "—"}
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
