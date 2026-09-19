import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconUsers,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconCalendarEvent,
  IconTrendingUp,
  IconChevronRight,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function TeacherDashboardPage() {
  const sections = [
    {
      id: "sec-1",
      courseCode: "CS101",
      courseName: "Introduction to Programming",
      sectionCode: "A",
      studentsCount: 38,
      avgGrade: "84.2%",
      attendanceRate: "92.4%",
      atRiskCount: 2,
    },
    {
      id: "sec-2",
      courseCode: "CS201",
      courseName: "Data Structures",
      sectionCode: "A",
      studentsCount: 36,
      avgGrade: "79.1%",
      attendanceRate: "88.6%",
      atRiskCount: 4,
    },
    {
      id: "sec-3",
      courseCode: "CS301",
      courseName: "Advanced Algorithms",
      sectionCode: "B",
      studentsCount: 32,
      avgGrade: "82.5%",
      attendanceRate: "91.0%",
      atRiskCount: 1,
    },
  ];

  const atRiskStudents = [
    {
      name: "Alex Johnson",
      id: "100001",
      section: "CS301-B",
      riskLevel: "critical",
      riskScore: "0.84",
      factor: "Declining attendance (-28%) and missed quiz 2",
    },
    {
      name: "Daniel Kebede",
      id: "100018",
      section: "CS201-A",
      riskLevel: "at_risk",
      riskScore: "0.68",
      factor: "Consecutive low lab grades (<55%)",
    },
    {
      name: "Sara Tadesse",
      id: "100029",
      section: "CS101-A",
      riskLevel: "warning",
      riskScore: "0.52",
      factor: "Absent 3 sessions in past two weeks",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Teacher Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Instructor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Department of Computer Science • Current Term: Spring 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/attendance"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <IconCalendarEvent className="size-4" />
            <span>Record Attendance</span>
          </Link>
          <Link
            href="/teacher/grades"
            className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          >
            <IconFileSpreadsheet className="size-4" />
            <span>Enter Grades</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assigned Sections
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconFileSpreadsheet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">3</div>
            <p className="text-xs text-muted-foreground mt-1">106 total enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Students
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconUsers className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">106</div>
            <p className="text-xs text-muted-foreground mt-1">Across all 3 course sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Attendance
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconTrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">90.7%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              +1.8% vs department average
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-destructive">
              At-Risk Students
            </CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <IconAlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-destructive">7</div>
            <p className="text-xs text-muted-foreground mt-1">Require academic review / follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Sections Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Current Course Sections</CardTitle>
            <CardDescription>Enrolled roster and performance breakdown</CardDescription>
          </div>
          <Link
            href="/teacher/students"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 text-xs font-bold")}
          >
            View All Students <IconChevronRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Course Code</TableHead>
                  <TableHead className="font-bold">Course Name</TableHead>
                  <TableHead className="font-bold">Section</TableHead>
                  <TableHead className="font-bold text-center">Students</TableHead>
                  <TableHead className="font-bold text-center">Avg Grade</TableHead>
                  <TableHead className="font-bold text-center">Attendance</TableHead>
                  <TableHead className="font-bold text-center">Risk Alerts</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((sec) => (
                  <TableRow key={sec.id}>
                    <TableCell className="font-bold text-primary">{sec.courseCode}</TableCell>
                    <TableCell className="font-medium">{sec.courseName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Sec {sec.sectionCode}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{sec.studentsCount}</TableCell>
                    <TableCell className="text-center font-semibold">{sec.avgGrade}</TableCell>
                    <TableCell className="text-center font-semibold">{sec.attendanceRate}</TableCell>
                    <TableCell className="text-center">
                      {sec.atRiskCount > 0 ? (
                        <Badge variant="destructive" className="font-bold">
                          {sec.atRiskCount} at risk
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600">
                          Clear
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/teacher/grades?section=${sec.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1")}
                      >
                        <span>Grades</span>
                        <IconArrowUpRight className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Early-Warning Risk Review */}
      <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 via-card to-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <IconAlertTriangle className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Predictive Risk Alerts</CardTitle>
              <CardDescription>
                AI Model flagged students with downward trajectory or low engagement
              </CardDescription>
            </div>
          </div>
          <Link
            href="/teacher/risks"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
          >
            Open Risk Review
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atRiskStudents.map((st) => (
              <div
                key={st.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-background gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{st.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{st.id}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {st.section}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{st.factor}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={st.riskLevel === "critical" ? "destructive" : "secondary"}
                    className="capitalize font-bold text-xs"
                  >
                    {st.riskLevel.replace("_", " ")} ({st.riskScore})
                  </Badge>
                  <Link
                    href={`/teacher/students?id=${st.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs h-7")}
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
