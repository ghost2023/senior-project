import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assessmentComponents,
  attendanceRecords,
  enrollments,
  finalGrades,
  gradeEntries,
  riskAssessments,
  sections,
  teacherNotes,
  teachers,
} from "@/lib/db/schema";
import { dedupeLatestAttendance } from "./shared";

export async function getTeacherByUserId(userId: string) {
  return db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
    with: { user: true, department: true },
  });
}

export async function getTeacherSections(teacherId: string) {
  return db.query.sections.findMany({
    where: eq(sections.teacherId, teacherId),
    with: { course: true, term: true },
    orderBy: (s, { desc }) => [desc(s.termId)],
  });
}

export async function getSectionById(sectionId: string, teacherId: string) {
  return db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), eq(sections.teacherId, teacherId)),
    with: { course: true, term: true },
  });
}

export async function getSectionRoster(sectionId: string) {
  return db.query.enrollments.findMany({
    where: eq(enrollments.sectionId, sectionId),
    with: { student: { with: { user: true } } },
    orderBy: (e, { asc }) => [asc(e.enrolledAt)],
  });
}

export async function getSectionAssessmentComponents(sectionId: string) {
  return db.select().from(assessmentComponents).where(eq(assessmentComponents.sectionId, sectionId));
}

/** Latest (non-superseded) score per enrollment per component. */
export async function getSectionGradeEntries(sectionId: string, enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return [];
  return db
    .select()
    .from(gradeEntries)
    .where(inArray(gradeEntries.enrollmentId, enrollmentIds))
    .orderBy(desc(gradeEntries.enteredAt));
}

export async function getSectionAttendance(sectionId: string, enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return [];
  return db
    .select()
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.enrollmentId, enrollmentIds))
    .orderBy(desc(attendanceRecords.sessionDate));
}

export async function getSectionRiskAssessments(sectionId: string) {
  return db.query.riskAssessments.findMany({
    where: eq(riskAssessments.sectionId, sectionId),
    orderBy: [desc(riskAssessments.generatedAt)],
    with: { student: { with: { user: true } } },
  });
}

/** Latest cross-course (sectionId IS NULL) risk assessment per student
 * enrolled in any of the given sections. Risk is a student-level construct
 * here — GPA trend/attendance are engineered holistically per term, not per
 * individual course (see services/ml/app/features.py) — so there's no
 * per-section risk_assessments row to filter by directly; this joins
 * through enrollments instead and attaches which of the teacher's sections
 * each flagged student is in, for display. */
export async function getRiskAssessmentsForSections(sectionIds: string[]) {
  if (sectionIds.length === 0) return [];

  const roster = await db.query.enrollments.findMany({
    where: inArray(enrollments.sectionId, sectionIds),
    with: { section: { with: { course: true } } },
  });

  const sectionsByStudent = new Map<string, (typeof roster)[number]["section"][]>();
  for (const e of roster) {
    const list = sectionsByStudent.get(e.studentId) ?? [];
    list.push(e.section);
    sectionsByStudent.set(e.studentId, list);
  }
  const studentIds = [...sectionsByStudent.keys()];
  if (studentIds.length === 0) return [];

  const assessments = await db.query.riskAssessments.findMany({
    where: and(inArray(riskAssessments.studentId, studentIds), isNull(riskAssessments.sectionId)),
    orderBy: [desc(riskAssessments.generatedAt)],
    with: { student: { with: { user: true } } },
  });

  const latestByStudent = new Map<string, (typeof assessments)[number]>();
  for (const a of assessments) {
    if (!latestByStudent.has(a.studentId)) latestByStudent.set(a.studentId, a);
  }

  return [...latestByStudent.values()].map((a) => ({
    ...a,
    sections: sectionsByStudent.get(a.studentId) ?? [],
  }));
}

export async function getTeacherNotesForStudent(studentId: string, teacherId: string) {
  return db.query.teacherNotes.findMany({
    where: and(eq(teacherNotes.studentId, studentId), eq(teacherNotes.teacherId, teacherId)),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
}

export async function addTeacherNote(studentId: string, teacherId: string, sectionId: string | null, note: string) {
  await db.insert(teacherNotes).values({ studentId, teacherId, sectionId, note });
}

export interface SectionSummary {
  rosterCount: number;
  avgGpa: number;
  avgAttendanceRate: number;
  atRiskCount: number;
}

export async function getSectionSummary(sectionId: string): Promise<SectionSummary> {
  const roster = await getSectionRoster(sectionId);
  const enrollmentIds = roster.map((r) => r.id);
  if (enrollmentIds.length === 0) {
    return { rosterCount: 0, avgGpa: 0, avgAttendanceRate: 0, atRiskCount: 0 };
  }

  const [grades, rawAttendance, risks] = await Promise.all([
    db.select().from(finalGrades).where(inArray(finalGrades.enrollmentId, enrollmentIds)),
    getSectionAttendance(sectionId, enrollmentIds),
    getSectionRiskAssessments(sectionId),
  ]);
  const attendance = dedupeLatestAttendance(rawAttendance);

  const avgGpa = grades.length > 0 ? grades.reduce((s, g) => s + Number(g.gpaPoints ?? 0), 0) / grades.length : 0;

  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const avgAttendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  const atRiskCount = risks.filter((r) => r.riskLevel !== "normal" && r.riskLevel !== "improving").length;

  return { rosterCount: roster.length, avgGpa, avgAttendanceRate, atRiskCount };
}
