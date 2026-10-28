import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  alerts,
  attendanceRecords,
  enrollments,
  recommendations,
  riskAssessments,
  students,
} from "@/lib/db/schema";
import { dedupeLatestAttendance } from "./shared";

export async function getStudentByUserId(userId: string) {
  return db.query.students.findFirst({
    where: eq(students.userId, userId),
    with: {
      user: true,
      program: { with: { department: true } },
    },
  });
}

export async function getStudentEnrollments(studentId: string) {
  return db.query.enrollments.findMany({
    where: eq(enrollments.studentId, studentId),
    with: {
      section: { with: { course: true, term: true, teacher: { with: { user: true } } } },
      finalGrade: true,
    },
    orderBy: (e, { desc }) => [desc(e.enrolledAt)],
  });
}

export interface AttendanceStat {
  present: number;
  total: number;
  rate: number; // 0-100
}

export async function getAttendanceStats(enrollmentIds: string[]): Promise<Record<string, AttendanceStat>> {
  if (enrollmentIds.length === 0) return {};
  const rawRows = await db
    .select()
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.enrollmentId, enrollmentIds));
  const rows = dedupeLatestAttendance(rawRows);

  const stats: Record<string, AttendanceStat> = {};
  for (const id of enrollmentIds) stats[id] = { present: 0, total: 0, rate: 0 };
  for (const row of rows) {
    const s = stats[row.enrollmentId];
    if (!s) continue;
    s.total += 1;
    if (row.status === "present" || row.status === "late") s.present += 1;
  }
  for (const s of Object.values(stats)) {
    s.rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
  }
  return stats;
}

export async function getLatestRiskAssessment(studentId: string) {
  return db.query.riskAssessments.findFirst({
    where: eq(riskAssessments.studentId, studentId),
    orderBy: [desc(riskAssessments.generatedAt)],
    with: { model: true },
  });
}

export async function getStudentAlerts(studentId: string) {
  return db.query.alerts.findMany({
    where: eq(alerts.studentId, studentId),
    orderBy: [desc(alerts.createdAt)],
  });
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  await db
    .update(alerts)
    .set({ acknowledgedAt: new Date(), acknowledgedByUserId: userId })
    .where(eq(alerts.id, alertId));
}

export async function getStudentRecommendations(studentId: string) {
  return db.query.recommendations.findMany({
    where: and(eq(recommendations.studentId, studentId), eq(recommendations.dismissed, false)),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}
