import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { auth } from "../auth.js";
import { requireRole, requireSession } from "../http.js";
import {
  academicTerms, alertThresholds, alerts, assessmentComponents, auditLogs, attendanceRecords,
  courses, departments, facultyAdmins, finalGrades, gradeEntries, programs, sections, students,
  teachers, user,
} from "../domain/schema.js";
import { addTeacherNote, getSectionAssessmentComponents, getSectionGradeEntries, getTeacherByUserId } from "../domain/teacher.js";
import { acknowledgeAlert } from "../domain/student.js";
import { computeFinalGrade } from "../domain/grading.js";

export const mutationRouter = Router();
const body = (req: any) => req.body as Record<string, any>;
const audit = (userId: string, action: string, resourceType: string, resourceId: string, metadata?: unknown) =>
  db.insert(auditLogs).values({ userId, actorType: "user", action, resourceType, resourceId, metadata: metadata ?? null });

mutationRouter.post("/attendance", requireSession, requireRole("teacher"), async (req, res, next) => {
  try {
    const input = z.object({ sectionId: z.string().uuid(), sessionDate: z.string(), marks: z.array(z.object({ enrollmentId: z.string().uuid(), status: z.enum(["present", "absent", "late", "excused"]) })) }).parse(body(req));
    const teacher = await getTeacherByUserId(req.session!.user.id);
    if (!teacher) { res.status(403).json({ error: "No teacher profile" }); return; }
    const [section] = await db.select().from(sections).where(eq(sections.id, input.sectionId));
    if (!section || section.teacherId !== teacher.id) { res.status(403).json({ error: "Not authorized" }); return; }
    for (const mark of input.marks) {
      const existing = await db.select().from(attendanceRecords).where(eq(attendanceRecords.enrollmentId, mark.enrollmentId));
      const current = existing.find((row) => row.sessionDate === input.sessionDate);
      if (current?.status === mark.status) continue;
      await db.insert(attendanceRecords).values({ enrollmentId: mark.enrollmentId, sessionDate: input.sessionDate, status: mark.status, recordedByTeacherId: teacher.id, supersedesId: current?.id });
      await audit(req.session!.user.id, current ? "attendance.correct" : "attendance.create", "attendance_records", mark.enrollmentId, { sessionDate: input.sessionDate, status: mark.status });
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
});

mutationRouter.post("/grades", requireSession, requireRole("teacher"), async (req, res, next) => {
  try {
    const input = z.object({ sectionId: z.string().uuid(), scores: z.array(z.object({ enrollmentId: z.string().uuid(), assessmentComponentId: z.string().uuid(), score: z.number().min(0) })), correctionReason: z.string().optional() }).parse(body(req));
    const teacher = await getTeacherByUserId(req.session!.user.id);
    if (!teacher) { res.status(403).json({ error: "No teacher profile" }); return; }
    const [section] = await db.select().from(sections).where(eq(sections.id, input.sectionId));
    if (!section || section.teacherId !== teacher.id) { res.status(403).json({ error: "Not authorized" }); return; }
    const components = await getSectionAssessmentComponents(input.sectionId);
    const byId = new Map(components.map((component) => [component.id, component]));
    for (const entry of input.scores) {
      const component = byId.get(entry.assessmentComponentId); if (!component) continue;
      const existing = await db.select().from(gradeEntries).where(eq(gradeEntries.enrollmentId, entry.enrollmentId));
      const current = existing.filter((row) => row.assessmentComponentId === entry.assessmentComponentId).sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime())[0];
      if (current && Number(current.score) === entry.score) continue;
      await db.insert(gradeEntries).values({ enrollmentId: entry.enrollmentId, assessmentComponentId: entry.assessmentComponentId, score: String(entry.score), enteredByTeacherId: teacher.id, supersedesId: current?.id, correctionReason: current ? (input.correctionReason ?? "Grade correction") : null });
      await audit(req.session!.user.id, current ? "grade.correct" : "grade.create", "grade_entries", entry.enrollmentId, { assessmentComponentId: entry.assessmentComponentId, score: entry.score });
    }
    for (const enrollmentId of [...new Set(input.scores.map((score) => score.enrollmentId))]) {
      const entries = await getSectionGradeEntries(input.sectionId, [enrollmentId]);
      const latest = new Map<string, (typeof entries)[number]>();
      for (const entry of entries) { const prev = latest.get(entry.assessmentComponentId); if (!prev || entry.enteredAt > prev.enteredAt) latest.set(entry.assessmentComponentId, entry); }
      const result = computeFinalGrade(Array.from(latest.values()).map((entry) => { const component = byId.get(entry.assessmentComponentId)!; return { weightPct: Number(component.weightPct), maxScore: Number(component.maxScore), score: Number(entry.score) }; }));
      if (!result) continue;
      const [current] = await db.select().from(finalGrades).where(eq(finalGrades.enrollmentId, enrollmentId));
      if (current) await db.update(finalGrades).set({ weightedTotal: String(result.weightedTotal), letterGrade: result.letterGrade, gpaPoints: String(result.gpaPoints), computedAt: new Date() }).where(eq(finalGrades.enrollmentId, enrollmentId));
      else await db.insert(finalGrades).values({ enrollmentId, weightedTotal: String(result.weightedTotal), letterGrade: result.letterGrade, gpaPoints: String(result.gpaPoints) });
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
});

mutationRouter.post("/teacher-note", requireSession, requireRole("teacher"), async (req, res, next) => {
  try { const input = z.object({ studentId: z.string().uuid(), sectionId: z.string().uuid().nullable(), note: z.string().min(1).max(2000) }).parse(body(req)); const teacher = await getTeacherByUserId(req.session!.user.id); if (!teacher) { res.status(403).json({ error: "No teacher profile" }); return; } await addTeacherNote(input.studentId, teacher.id, input.sectionId, input.note); res.json({ ok: true }); } catch (error) { next(error); }
});

mutationRouter.post("/acknowledge-alert", requireSession, requireRole("student"), async (req, res, next) => {
  try { const input = z.object({ alertId: z.string().uuid() }).parse(body(req)); const student = await db.query.students.findFirst({ where: eq(students.userId, req.session!.user.id) }); if (!student) { res.status(403).json({ error: "No student profile" }); return; } const alert = await db.query.alerts.findFirst({ where: and(eq(alerts.id, input.alertId), eq(alerts.studentId, student.id)) }); if (!alert) { res.status(404).json({ error: "Alert not found" }); return; } await acknowledgeAlert(input.alertId, req.session!.user.id); res.json({ ok: true }); } catch (error) { next(error); }
});

mutationRouter.post("/threshold", requireSession, requireRole("faculty_admin"), async (req, res, next) => {
  try { const input = z.object({ id: z.string().uuid(), minScore: z.number().min(0).max(1) }).parse(body(req)); await db.update(alertThresholds).set({ minScore: String(input.minScore), updatedByUserId: req.session!.user.id, updatedAt: new Date() }).where(eq(alertThresholds.id, input.id)); await audit(req.session!.user.id, "alert_threshold.update", "alert_thresholds", input.id, { minScore: input.minScore }); res.json({ ok: true }); } catch (error) { next(error); }
});

const structure = {
  department: z.object({ name: z.string().min(1), code: z.string().min(1).max(16) }),
  program: z.object({ departmentId: z.string().uuid(), name: z.string().min(1), degreeLevel: z.string().optional() }),
  course: z.object({ departmentId: z.string().uuid(), code: z.string().min(1).max(16), name: z.string().min(1), credits: z.number().int().min(1).max(12) }),
  term: z.object({ label: z.string().min(1), academicYear: z.string().min(4).max(9), termType: z.enum(["fall", "spring", "summer"]), startDate: z.string(), endDate: z.string(), isCurrent: z.boolean() }),
  section: z.object({ courseId: z.string().uuid(), termId: z.string().uuid(), sectionCode: z.string().min(1).max(8), capacity: z.number().int().min(1).max(500) }),
};
for (const [name, table, schema] of [["department", departments, structure.department], ["program", programs, structure.program], ["course", courses, structure.course], ["term", academicTerms, structure.term], ["section", sections, structure.section]] as const) {
  mutationRouter.post(`/structure/${name}`, requireSession, requireRole("faculty_admin"), async (req, res, next) => {
    try { const input = schema.parse(body(req)); if (name === "term" && (input as { isCurrent?: boolean }).isCurrent) await db.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true)); const [row] = await db.insert(table as any).values(input as any).returning(); await audit(req.session!.user.id, `${name}.create`, name === "term" ? "academic_terms" : `${name}s`, row.id, input); res.status(201).json({ data: row }); } catch (error) { next(error); }
  });
}
mutationRouter.post("/structure/assign-teacher", requireSession, requireRole("faculty_admin"), async (req, res, next) => { try { const input = z.object({ sectionId: z.string().uuid(), teacherId: z.string().uuid().nullable() }).parse(body(req)); await db.update(sections).set({ teacherId: input.teacherId }).where(eq(sections.id, input.sectionId)); await audit(req.session!.user.id, "section.assign_teacher", "sections", input.sectionId, { teacherId: input.teacherId }); res.json({ ok: true }); } catch (error) { next(error); } });

mutationRouter.post("/user/active", requireSession, requireRole("faculty_admin"), async (req, res, next) => { try { const input = z.object({ userId: z.string(), isActive: z.boolean() }).parse(body(req)); await db.update(user).set({ isActive: input.isActive }).where(eq(user.id, input.userId)); await audit(req.session!.user.id, input.isActive ? "user.reactivate" : "user.deactivate", "user", input.userId); res.json({ ok: true }); } catch (error) { next(error); } });

mutationRouter.post("/user", requireSession, requireRole("faculty_admin"), async (req, res, next) => {
  try {
    const input = z.discriminatedUnion("role", [
      z.object({ role: z.literal("teacher"), name: z.string().min(1), email: z.string().email(), password: z.string().min(8), departmentId: z.string().uuid(), title: z.string().optional() }),
      z.object({ role: z.literal("student"), name: z.string().min(1), email: z.string().email(), password: z.string().min(8), programId: z.string().uuid(), studentNumber: z.string().min(1), enrollmentYear: z.number().int().min(2000).max(2100) }),
      z.object({ role: z.literal("faculty_admin"), name: z.string().min(1), email: z.string().email(), password: z.string().min(8) }),
    ]).parse(body(req));
    await auth.api.signUpEmail({ body: { name: input.name, email: input.email, password: input.password } });
    await db.update(user).set({ role: input.role }).where(eq(user.email, input.email));
    const [newUser] = await db.select().from(user).where(eq(user.email, input.email));
    if (input.role === "teacher") await db.insert(teachers).values({ userId: newUser.id, departmentId: input.departmentId, title: input.title });
    else if (input.role === "student") await db.insert(students).values({ userId: newUser.id, studentNumber: input.studentNumber, programId: input.programId, enrollmentYear: input.enrollmentYear });
    else await db.insert(facultyAdmins).values({ userId: newUser.id });
    await audit(req.session!.user.id, "user.create", "user", newUser.id, { role: input.role, email: input.email });
    res.status(201).json({ ok: true });
  } catch (error) { next(error); }
});
