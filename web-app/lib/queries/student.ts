/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendServerFetch } from "@/lib/backend-server";
async function query<T>(operation: string, args: Record<string, unknown> = {}) { const result = await backendServerFetch<{ data: T }>("/query", { method: "POST", body: JSON.stringify({ operation, args }) }); return result.data; }
export function getStudentByUserId(_userId: string) { void _userId; return query<any>("student"); }
export function getStudentEnrollments(studentId: string) { return query<any[]>("studentEnrollments", { studentId }); }
export function getAttendanceStats(enrollmentIds: string[]) { return query<Record<string, { present: number; total: number; rate: number }>>("attendanceStats", { enrollmentIds }); }
export function getLatestRiskAssessment(studentId: string) { return query<any>("latestRisk", { studentId }); }
export function getStudentAlerts(studentId: string) { return query<any[]>("studentAlerts", { studentId }); }
export function acknowledgeAlert(alertId: string, _userId: string) { void _userId; return query<void>("acknowledgeAlert", { alertId }); }
export function getStudentRecommendations(studentId: string) { return query<any[]>("studentRecommendations", { studentId }); }
