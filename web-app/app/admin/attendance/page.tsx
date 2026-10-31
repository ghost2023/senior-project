import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconCalendar, IconUsers, IconBuildingCommunity, IconClipboardCheck } from "@tabler/icons-react";
import { getAttendanceRateByDepartment } from "@/lib/queries/admin";
import { getCurrentTerm } from "@/lib/queries/shared";
import { DepartmentAttendanceChart } from "./department-attendance-chart";

export default async function AdminAttendancePage() {
  const term = await getCurrentTerm();
  const rates = term ? await getAttendanceRateByDepartment(term.id) : [];

  const totalSessions = rates.reduce((s, r) => s + r.sessionCount, 0);
  const overallRate =
    rates.length > 0 && totalSessions > 0
      ? Math.round(rates.reduce((s, r) => s + r.attendance * r.sessionCount, 0) / totalSessions)
      : 0;
  const bestDept = rates.slice().sort((a, b) => b.attendance - a.attendance)[0];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Attendance Audit</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          {term ? term.label : "No current term set"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Institutional Average", value: `${overallRate}%`, icon: IconUsers, sub: "Current Term" },
          { label: "Top Department", value: bestDept?.name ?? "—", icon: IconBuildingCommunity, sub: bestDept ? `${bestDept.attendance}% present` : "—" },
          { label: "Sessions Logged", value: String(totalSessions), icon: IconClipboardCheck, sub: "Current Term" },
          { label: "Departments Tracked", value: String(rates.length), icon: IconCalendar, sub: "Active" },
        ].map((stat, i) => (
          <Card key={i} className="bg-accent/5 shadow-none border-none">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="size-7 rounded-lg bg-background border flex items-center justify-center">
                  <stat.icon size={14} className="text-muted-foreground" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
              <CardTitle className="text-3xl font-bold font-mono tracking-tighter">{stat.value}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{stat.sub}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Attendance Rate by Department</CardTitle>
          <CardDescription>Deduplicated against append-only correction records — current status per session only</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] px-6 pt-8 pb-6">
          <DepartmentAttendanceChart data={rates.map((r) => ({ name: r.name, attendance: r.attendance }))} />
        </CardContent>
      </Card>
    </div>
  );
}
