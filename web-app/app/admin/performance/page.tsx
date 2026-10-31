import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllDepartments, getGpaTrendByDepartment, getDepartmentSummaries } from "@/lib/queries/admin";
import { getCurrentTerm } from "@/lib/queries/shared";
import { GpaTrendChart } from "./gpa-trend-chart";

export default async function AdminPerformancePage() {
  const [departments, trend, term] = await Promise.all([getAllDepartments(), getGpaTrendByDepartment(), getCurrentTerm()]);
  const summaries = term ? await getDepartmentSummaries(term.id) : [];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Standardized Performance Stats</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
          Inter-departmental GPA trend across all terms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Inter-Departmental Trajectory</CardTitle>
                <CardDescription>Average GPA per term, computed live from final grades</CardDescription>
              </div>
              <div className="flex items-center gap-4 flex-wrap justify-end">
                {departments.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary" style={{ opacity: 1 - i * 0.18 }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{d.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] px-6 pb-6">
            <GpaTrendChart data={trend} departmentCodes={departments.map((d) => d.code)} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Current Term Standing</h3>
          {summaries
            .slice()
            .sort((a, b) => b.avgGpa - a.avgGpa)
            .map((s) => (
              <Card key={s.department.id} className="bg-accent/5 border-none shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-bold">{s.department.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.studentCount} Students</p>
                    </div>
                    <p className="text-sm font-bold font-mono">{s.avgGpa.toFixed(2)}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          {summaries.length === 0 && <p className="text-sm text-muted-foreground px-2">No current term is set.</p>}
        </div>
      </div>
    </div>
  );
}
