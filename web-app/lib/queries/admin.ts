/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendServerFetch } from "@/lib/backend-server";
async function query<T>(operation: string, args: Record<string, unknown> = {}) { const result = await backendServerFetch<{ data: T }>("/query", { method: "POST", body: JSON.stringify({ operation, args }) }); return result.data; }
export function getFacultyAdminByUserId(_userId: string) { void _userId; return query<any>("facultyAdmin"); }
export function getAllDepartments() { return query<any[]>("departments"); }
export function getAllPrograms() { return query<any[]>("programs"); }
export function getAllCourses() { return query<any[]>("courses"); }
export function getAllSections() { return query<any[]>("sections"); }
export function getAllTeachersWithDepartment() { return query<any[]>("teachers"); }
export function getAllUsers() { return query<any[]>("users"); }
export function getAuditLogs(page: number, pageSize = 25) { return query<any>("auditLogs", { page, pageSize }); }
export function getAllMlModels() { return query<any[]>("models"); }
export function getDepartmentSummaries(termId: string) { return query<any[]>("departmentSummaries", { termId }); }
export function getGpaTrendByDepartment() { return query<any[]>("gpaTrend"); }
export function getAttendanceRateByDepartment(termId: string) { return query<any[]>("departmentAttendance", { termId }); }
export function getRiskAssessmentsForReview() { return query<any[]>("riskReview"); }
export function getAlertThresholds() { return query<any[]>("alertThresholds"); }
