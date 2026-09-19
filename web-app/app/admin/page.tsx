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
  IconBuildingCommunity,
  IconUsers,
  IconSparkles,
  IconShieldCheckered,
  IconTrendingUp,
  IconChevronRight,
  IconAdjustments,
  IconActivity,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const departments = [
    {
      code: "CS",
      name: "Computer Science",
      facultyHead: "Dr. Amanda Reyes",
      studentsCount: 248,
      teachersCount: 14,
      avgGPA: 3.42,
      attendanceRate: "91.2%",
      atRiskCount: 8,
    },
    {
      code: "EE",
      name: "Electrical Engineering",
      facultyHead: "Mr. Samuel Okafor",
      studentsCount: 184,
      teachersCount: 11,
      avgGPA: 3.28,
      attendanceRate: "89.5%",
      atRiskCount: 12,
    },
    {
      code: "BUS",
      name: "Business Administration",
      facultyHead: "Dr. Rachel Vance",
      studentsCount: 310,
      teachersCount: 16,
      avgGPA: 3.51,
      attendanceRate: "93.0%",
      atRiskCount: 6,
    },
    {
      code: "MATH",
      name: "Mathematics",
      facultyHead: "Dr. Kevin Miller",
      studentsCount: 142,
      teachersCount: 9,
      avgGPA: 3.35,
      attendanceRate: "90.4%",
      atRiskCount: 5,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
            <IconShieldCheckered className="size-3.5" />
            <span>Institutional Governance Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Faculty Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Smart Academic Tracking & Predictive Analytics System (SATPS)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/alert-config"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <IconAdjustments className="size-4" />
            <span>Threshold Config</span>
          </Link>
          <Link
            href="/admin/risk-review"
            className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          >
            <IconActivity className="size-4" />
            <span>Risk Review</span>
          </Link>
        </div>
      </div>

      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Enrolled Students
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconUsers className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">884</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 academic departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Academic Departments
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconBuildingCommunity className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">4</div>
            <p className="text-xs text-muted-foreground mt-1">50 active teaching faculty members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Institutional Retention Rate
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconTrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">94.8%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              +2.3% improvement with early intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ML Models Active
            </CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <IconSparkles className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">XGBoost & BiLSTM</div>
            <p className="text-xs text-muted-foreground mt-1">Version v1.4 • Inference Latency &lt; 85ms</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Academic Departments Overview</CardTitle>
            <CardDescription>Performance metrics, attendance, and risk indexes</CardDescription>
          </div>
          <Link
            href="/admin/academic-structure"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 text-xs font-bold")}
          >
            Structure Settings <IconChevronRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Code</TableHead>
                  <TableHead className="font-bold">Department</TableHead>
                  <TableHead className="font-bold">Department Lead</TableHead>
                  <TableHead className="font-bold text-center">Students</TableHead>
                  <TableHead className="font-bold text-center">Faculty</TableHead>
                  <TableHead className="font-bold text-center">Avg GPA</TableHead>
                  <TableHead className="font-bold text-center">Attendance</TableHead>
                  <TableHead className="font-bold text-center">At-Risk</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.code}>
                    <TableCell className="font-bold text-primary">{dept.code}</TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dept.facultyHead}</TableCell>
                    <TableCell className="text-center font-medium">{dept.studentsCount}</TableCell>
                    <TableCell className="text-center font-medium">{dept.teachersCount}</TableCell>
                    <TableCell className="text-center font-bold">{dept.avgGPA.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-semibold">{dept.attendanceRate}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={dept.atRiskCount > 10 ? "destructive" : "secondary"}
                        className="font-bold"
                      >
                        {dept.atRiskCount} students
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/performance?dept=${dept.code}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}
                      >
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Alert Configuration & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <IconAdjustments className="size-4" />
              <span>Threshold Rules (A-16)</span>
            </div>
            <CardTitle className="text-base">System Alert Sensitivity</CardTitle>
            <CardDescription>Configured cut-offs for automated risk notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">Critical Risk Alert</p>
                <p className="text-[11px] text-muted-foreground">Immediate dean & advisor notification</p>
              </div>
              <Badge variant="destructive" className="font-mono font-bold">
                Score ≥ 0.80
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">At-Risk Flag</p>
                <p className="text-[11px] text-muted-foreground">Course instructor notification</p>
              </div>
              <Badge variant="secondary" className="font-mono font-bold text-amber-600 dark:text-amber-400">
                Score ≥ 0.60
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">Warning Advisory</p>
                <p className="text-[11px] text-muted-foreground">Student portal nudge</p>
              </div>
              <Badge variant="outline" className="font-mono font-bold">
                Score ≥ 0.40
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <IconActivity className="size-4" />
              <span>Operations & Audit</span>
            </div>
            <CardTitle className="text-base">System Administration</CardTitle>
            <CardDescription>Direct shortcuts to platform governance functions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link
              href="/admin/users"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between h-10 text-xs font-bold")}
            >
              <span>Manage Users & Role Assignments</span>
              <IconChevronRight className="size-4" />
            </Link>
            <Link
              href="/admin/models"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between h-10 text-xs font-bold")}
            >
              <span>Predictive ML Model Registry & Metrics</span>
              <IconChevronRight className="size-4" />
            </Link>
            <Link
              href="/admin/audit-log"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between h-10 text-xs font-bold")}
            >
              <span>Compliance & Security Audit Log</span>
              <IconChevronRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
