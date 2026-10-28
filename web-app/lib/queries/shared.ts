import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicTerms } from "@/lib/db/schema";

export async function getCurrentTerm() {
  const [term] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true)).limit(1);
  return term ?? null;
}

export async function getAllTerms() {
  return db.select().from(academicTerms).orderBy(academicTerms.startDate);
}

interface AttendanceRow {
  enrollmentId: string;
  sessionDate: string;
  status: string;
  recordedAt: Date;
}

/**
 * attendance_records is append-only (corrections insert a new row rather
 * than updating in place, per rule #13) — so raw rows can contain more than
 * one entry per (enrollmentId, sessionDate). This keeps only the most
 * recently recorded row per session, which is the "current" status.
 */
export function dedupeLatestAttendance<T extends AttendanceRow>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.enrollmentId}::${row.sessionDate}`;
    const existing = latest.get(key);
    if (!existing || row.recordedAt > existing.recordedAt) latest.set(key, row);
  }
  return Array.from(latest.values());
}
