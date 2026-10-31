import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconShieldCheckered } from "@tabler/icons-react";
import { getAllDepartments, getRiskAssessmentsForReview } from "@/lib/queries/admin";
import { RiskFilterBar } from "./risk-filter-bar";

const RISK_BADGE_VARIANT: Record<string, "outline" | "secondary" | "destructive"> = {
  normal: "outline",
  improving: "outline",
  warning: "secondary",
  at_risk: "destructive",
  critical: "destructive",
};

export default async function AdminRiskReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; riskLevel?: string }>;
}) {
  const { department = "all", riskLevel = "all" } = await searchParams;
  const [departments, assessments] = await Promise.all([getAllDepartments(), getRiskAssessmentsForReview()]);

  const filtered = assessments.filter((a) => {
    const deptMatch = department === "all" || a.student.program.department.code === department;
    const levelMatch = riskLevel === "all" || a.riskLevel === riskLevel;
    return deptMatch && levelMatch;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Faculty-Wide Risk Review</h2>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
            {assessments.length} assessments on record
          </p>
        </div>
        <RiskFilterBar departments={departments} department={department} riskLevel={riskLevel} />
      </div>

      {assessments.length === 0 ? (
        <Card className="h-[40vh] flex items-center justify-center border-2 border-dashed bg-accent/5 shadow-none">
          <div className="text-center max-w-sm">
            <IconShieldCheckered className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="text-sm font-bold">No risk assessments available yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              This table populates once the ML prediction pipeline has been run at least once.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Risk Assessments</CardTitle>
            <CardDescription>Most recent run per student/section, across all departments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="pr-6">Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6 font-bold text-sm">{a.student.user.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.student.program.department.name}</TableCell>
                    <TableCell className="text-xs">{a.section ? a.section.course.code : "Overall"}</TableCell>
                    <TableCell>
                      <Badge variant={RISK_BADGE_VARIANT[a.riskLevel] ?? "outline"} className="capitalize">
                        {a.riskLevel.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{Math.round(Number(a.riskScore) * 100)}%</TableCell>
                    <TableCell className="pr-6 text-xs text-muted-foreground">{new Date(a.generatedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      No assessments match this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
