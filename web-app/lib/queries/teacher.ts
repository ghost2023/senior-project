/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendServerFetch } from "@/lib/backend-server";
async function query<T>(operation: string, args: Record<string, unknown> = {}) { const result = await backendServerFetch<{ data: T }>("/query", { method: "POST", body: JSON.stringify({ operation, args }) }); return result.data; }
export function getTeacherByUserId(_userId: string) { void _userId; return query<any>("teacher"); }
export function getTeacherSections(teacherId: string) { return query<any[]>("teacherSections", { teacherId }); }
export function getSectionById(sectionId: string, teacherId: string) { return query<any>("section", { sectionId, teacherId }); }
export function getSectionRoster(sectionId: string) { return query<any[]>("sectionRoster", { sectionId }); }
export function getSectionAssessmentComponents(sectionId: string) { return query<any[]>("sectionComponents", { sectionId }); }
export function getSectionGradeEntries(sectionId: string, enrollmentIds: string[]) { return query<any[]>("sectionGrades", { sectionId, enrollmentIds }); }
export function getSectionAttendance(sectionId: string, enrollmentIds: string[]) { return query<any[]>("sectionAttendance", { sectionId, enrollmentIds }); }
export function getSectionRiskAssessments(sectionId: string) { return query<any[]>("sectionRisks", { sectionId }); }
export function getRiskAssessmentsForSections(sectionIds: string[]) { return query<any[]>("teacherRisks", { sectionIds }); }
export function getTeacherNotesForStudent(studentId: string, teacherId: string) { return query<any[]>("teacherNotes", { studentId, teacherId }); }
export function getSectionSummary(sectionId: string) { return query<any>("sectionSummary", { sectionId }); }
export function getSectionFinalGrades(enrollmentIds: string[]) { return query<any[]>("finalGrades", { enrollmentIds }); }
export function addTeacherNote(studentId: string, teacherId: string, sectionId: string | null, note: string) { return query<void>("addTeacherNote", { studentId, teacherId, sectionId, note }); }
