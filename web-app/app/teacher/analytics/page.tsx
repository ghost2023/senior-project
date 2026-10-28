import { inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db } from "@/lib/db";
import { finalGrades } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";
import { getSectionRoster, getTeacherByUserId, getTeacherSections } from "@/lib/queries/teacher";
import { mean, median, stddev } from "@/lib/stats";
import { SectionComparisonChart } from "./comparison-chart";

export default async function TeacherAnalyticsPage() {
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);

  const stats = await Promise.all(
    currentSections.map(async (s) => {
      const roster = await getSectionRoster(s.id);
      const enrollmentIds = roster.map((r) => r.id);
      const grades =
        enrollmentIds.length > 0
          ? await db.select().from(finalGrades).where(inArray(finalGrades.enrollmentId, enrollmentIds))
          : [];
      const totals = grades.map((g) => Number(g.weightedTotal ?? 0)).filter((v) => v > 0);
      return {
        section: s,
        n: totals.length,
        mean: mean(totals),
        median: median(totals),
        stddev: stddev(totals),
      };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold tracking-tight">Section Analytics</h2>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Cross-Section Comparison</CardTitle>
          <CardDescription>Average weighted total by section, current term</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pt-6">
          <SectionComparisonChart
            data={stats.map((s) => ({
              name: `${s.section.course.code}-${s.section.sectionCode}`,
              mean: Math.round(s.mean * 10) / 10,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((s) => (
          <Card key={s.section.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.section.course.name}</CardTitle>
              <CardDescription>
                {s.section.course.code} Sec. {s.section.sectionCode} — {s.n} graded students
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mean</p>
                <p className="text-xl font-bold font-mono">{s.mean.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Median</p>
                <p className="text-xl font-bold font-mono">{s.median.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Std. Dev.</p>
                <p className="text-xl font-bold font-mono">{s.stddev.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
