import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconShieldCheckered } from "@tabler/icons-react";
import { getSession } from "@/lib/permissions";
import {
  getRiskAssessmentsForSections,
  getTeacherByUserId,
  getTeacherNotesForStudent,
  getTeacherSections,
} from "@/lib/queries/teacher";
import { NoteForm } from "./note-form";

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  at_risk: "destructive",
  warning: "secondary",
  normal: "outline",
  improving: "outline",
};

export default async function TeacherRisksPage() {
  const session = await getSession();
  const teacher = await getTeacherByUserId(session!.user.id);
  if (!teacher) return <div>No teacher profile found.</div>;

  const sections = await getTeacherSections(teacher.id);
  const currentSections = sections.filter((s) => s.term.isCurrent);

  const assessments = await getRiskAssessmentsForSections(currentSections.map((s) => s.id));
  const flagged = assessments.filter((r) => r.riskLevel !== "normal" && r.riskLevel !== "improving");

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold tracking-tight">At-Risk Students</h2>

      {flagged.length === 0 ? (
        <Card className="h-[30vh] flex items-center justify-center border-2 border-dashed bg-accent/5 shadow-none">
          <div className="text-center">
            <IconShieldCheckered className="mx-auto mb-3 text-muted-foreground" size={24} />
            <p className="text-sm font-bold">No at-risk students flagged</p>
            <p className="text-xs text-muted-foreground mt-1">
              This list populates once the predictive engine has run for your sections.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {await Promise.all(
            flagged.map(async (r) => {
              const notes = await getTeacherNotesForStudent(r.student.id, teacher.id);
              return (
                <Card key={r.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={SEVERITY_VARIANT[r.riskLevel] ?? "outline"} className="capitalize">
                          {r.riskLevel.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                          {r.sections.map((s) => `${s.course.code} Sec. ${s.sectionCode}`).join(", ")}
                        </span>
                      </div>
                      <CardTitle className="text-base">{r.student.user.name}</CardTitle>
                      <CardDescription>{r.student.studentNumber}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {notes.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {notes.map((n) => (
                          <li key={n.id} className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                            {n.note}
                            <span className="block text-[9px] uppercase tracking-widest mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <NoteForm studentId={r.student.id} sectionId={r.sections[0]?.id ?? null} />
                  </CardContent>
                </Card>
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}
