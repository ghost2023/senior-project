/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendServerFetch } from "@/lib/backend-server";

async function query<T>(operation: string, args: Record<string, unknown> = {}) {
  const result = await backendServerFetch<{ data: T }>("/query", { method: "POST", body: JSON.stringify({ operation, args }) });
  return result.data;
}
export function getCurrentTerm() { return query<any>("currentTerm"); }
export function getAllTerms() { return query<any[]>("allTerms"); }
interface AttendanceRow { enrollmentId: string; sessionDate: string; status: string; recordedAt: Date; }
export function dedupeLatestAttendance<T extends AttendanceRow>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) { const key = row.enrollmentId + "::" + row.sessionDate; const existing = latest.get(key); if (!existing || row.recordedAt > existing.recordedAt) latest.set(key, row); }
  return Array.from(latest.values());
}
