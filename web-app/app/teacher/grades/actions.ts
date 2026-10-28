"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, gradeEntries, finalGrades, assessmentComponents, sections } from "@/lib/db/schema";
import { computeFinalGrade } from "@/lib/grading";
import { getSession } from "@/lib/permissions";
import { getSectionAssessmentComponents, getSectionGradeEntries, getSectionRoster, getTeacherByUserId } from "@/lib/queries/teacher";

const SaveGradesSchema = z.object({
  sectionId: z.string().uuid(),
  scores: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      assessmentComponentId: z.string().uuid(),
      score: z.number().min(0),
    }),
  ),
  correctionReason: z.string().optional(),
});

export async function saveGradesAction(input: z.infer<typeof SaveGradesSchema>) {
  const parsed = SaveGradesSchema.parse(input);
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const teacher = await getTeacherByUserId(session.user.id);
  if (!teacher) throw new Error("No teacher profile");

  // rule #6/#7: a teacher may only write grades for a section assigned to them.
  const [section] = await db.select().from(sections).where(eq(sections.id, parsed.sectionId));
  if (!section || section.teacherId !== teacher.id) {
    throw new Error("Not authorized to edit grades for this section");
  }

  const components = await getSectionAssessmentComponents(parsed.sectionId);
  const componentById = new Map(components.map((c) => [c.id, c]));

  for (const entry of parsed.scores) {
    const component = componentById.get(entry.assessmentComponentId);
    if (!component) continue;

    // Business rule #13: append-only. Find the current (non-superseded) entry
    // for this enrollment+component, if any, and insert a new row referencing it.
    const existing = await db
      .select()
      .from(gradeEntries)
      .where(eq(gradeEntries.enrollmentId, entry.enrollmentId));
    const currentForComponent = existing
      .filter((e) => e.assessmentComponentId === entry.assessmentComponentId)
      .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime())[0];

    if (currentForComponent && Number(currentForComponent.score) === entry.score) continue; // no change

    await db.insert(gradeEntries).values({
      enrollmentId: entry.enrollmentId,
      assessmentComponentId: entry.assessmentComponentId,
      score: String(entry.score),
      enteredByTeacherId: teacher.id,
      supersedesId: currentForComponent?.id,
      correctionReason: currentForComponent ? (parsed.correctionReason ?? "Grade correction") : null,
    });

    await db.insert(auditLogs).values({
      userId: session.user.id,
      actorType: "user",
      action: currentForComponent ? "grade.correct" : "grade.create",
      resourceType: "grade_entries",
      resourceId: entry.enrollmentId,
      metadata: { assessmentComponentId: entry.assessmentComponentId, score: entry.score },
    });
  }

  // Recompute final grade for every affected enrollment using the shared helper.
  const affectedEnrollmentIds = [...new Set(parsed.scores.map((s) => s.enrollmentId))];
  for (const enrollmentId of affectedEnrollmentIds) {
    const allEntries = await getSectionGradeEntries(parsed.sectionId, [enrollmentId]);
    const latestByComponent = new Map<string, (typeof allEntries)[number]>();
    for (const e of allEntries) {
      const prev = latestByComponent.get(e.assessmentComponentId);
      if (!prev || e.enteredAt > prev.enteredAt) latestByComponent.set(e.assessmentComponentId, e);
    }
    const scored = Array.from(latestByComponent.values()).map((e) => {
      const c = componentById.get(e.assessmentComponentId)!;
      return { weightPct: Number(c.weightPct), maxScore: Number(c.maxScore), score: Number(e.score) };
    });
    const result = computeFinalGrade(scored);
    if (!result) continue;

    const [existingFinal] = await db.select().from(finalGrades).where(eq(finalGrades.enrollmentId, enrollmentId));
    if (existingFinal) {
      await db
        .update(finalGrades)
        .set({
          weightedTotal: String(result.weightedTotal),
          letterGrade: result.letterGrade,
          gpaPoints: String(result.gpaPoints),
          computedAt: new Date(),
        })
        .where(eq(finalGrades.enrollmentId, enrollmentId));
    } else {
      await db.insert(finalGrades).values({
        enrollmentId,
        weightedTotal: String(result.weightedTotal),
        letterGrade: result.letterGrade,
        gpaPoints: String(result.gpaPoints),
      });
    }
  }

  revalidatePath("/teacher/grades");
  revalidatePath("/teacher");
}
