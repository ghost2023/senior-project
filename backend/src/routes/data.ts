import { Router } from "express";
import { requireSession } from "../http.js";
import { db } from "../db.js";
import { alertThresholds, finalGrades } from "../domain/schema.js";
import { inArray } from "drizzle-orm";
import * as student from "../domain/student.js";
import * as teacher from "../domain/teacher.js";
import * as admin from "../domain/admin.js";
import * as shared from "../domain/shared.js";

type Operation = (args: Record<string, unknown>, userId: string) => Promise<unknown>;

const operations: Record<string, Operation> = {
  currentTerm: () => shared.getCurrentTerm(),
  allTerms: () => shared.getAllTerms(),
  student: (_args, userId) => student.getStudentByUserId(userId),
  studentEnrollments: (args) => student.getStudentEnrollments(String(args.studentId)),
  attendanceStats: (args) => student.getAttendanceStats((args.enrollmentIds as string[]) ?? []),
  latestRisk: (args) => student.getLatestRiskAssessment(String(args.studentId)),
  studentAlerts: (args) => student.getStudentAlerts(String(args.studentId)),
  acknowledgeAlert: (args, userId) => student.acknowledgeAlert(String(args.alertId), userId),
  studentRecommendations: (args) => student.getStudentRecommendations(String(args.studentId)),
  teacher: (_args, userId) => teacher.getTeacherByUserId(userId),
  teacherSections: (args) => teacher.getTeacherSections(String(args.teacherId)),
  section: (args) => teacher.getSectionById(String(args.sectionId), String(args.teacherId)),
  sectionRoster: (args) => teacher.getSectionRoster(String(args.sectionId)),
  sectionComponents: (args) => teacher.getSectionAssessmentComponents(String(args.sectionId)),
  sectionGrades: (args) => teacher.getSectionGradeEntries(String(args.sectionId), (args.enrollmentIds as string[]) ?? []),
  sectionAttendance: (args) => teacher.getSectionAttendance(String(args.sectionId), (args.enrollmentIds as string[]) ?? []),
  sectionRisks: (args) => teacher.getSectionRiskAssessments(String(args.sectionId)),
  teacherRisks: (args) => teacher.getRiskAssessmentsForSections((args.sectionIds as string[]) ?? []),
  teacherNotes: (args) => teacher.getTeacherNotesForStudent(String(args.studentId), String(args.teacherId)),
  addTeacherNote: (args) => teacher.addTeacherNote(String(args.studentId), String(args.teacherId), args.sectionId ? String(args.sectionId) : null, String(args.note)),
  sectionSummary: (args) => teacher.getSectionSummary(String(args.sectionId)),
  facultyAdmin: (_args, userId) => admin.getFacultyAdminByUserId(userId),
  departments: () => admin.getAllDepartments(),
  programs: () => admin.getAllPrograms(),
  courses: () => admin.getAllCourses(),
  sections: () => admin.getAllSections(),
  teachers: () => admin.getAllTeachersWithDepartment(),
  users: () => admin.getAllUsers(),
  auditLogs: (args) => admin.getAuditLogs(Number(args.page ?? 1), Number(args.pageSize ?? 25)),
  models: () => admin.getAllMlModels(),
  departmentSummaries: (args) => admin.getDepartmentSummaries(String(args.termId)),
  gpaTrend: () => admin.getGpaTrendByDepartment(),
  departmentAttendance: (args) => admin.getAttendanceRateByDepartment(String(args.termId)),
  riskReview: () => admin.getRiskAssessmentsForReview(),
  alertThresholds: () => db.select().from(alertThresholds),
  finalGrades: (args) => db.select().from(finalGrades).where(inArray(finalGrades.enrollmentId, (args.enrollmentIds as string[]) ?? [])),
};

export const dataRouter = Router();

dataRouter.post("/query", requireSession, async (req, res, next) => {
  try {
    const operation = String(req.body?.operation ?? "");
    const handler = operations[operation];
    if (!handler) {
      res.status(400).json({ error: `Unknown query operation: ${operation}` });
      return;
    }
    const role = (req.session!.user as { role?: string }).role;
    const studentOperations = new Set(["student", "studentEnrollments", "attendanceStats", "latestRisk", "studentAlerts", "studentRecommendations"]);
    const teacherOperations = new Set(["teacher", "teacherSections", "section", "sectionRoster", "sectionComponents", "sectionGrades", "sectionAttendance", "sectionRisks", "teacherRisks", "teacherNotes", "sectionSummary", "finalGrades"]);
    const adminOperations = new Set(["facultyAdmin", "departments", "programs", "courses", "sections", "teachers", "users", "auditLogs", "models", "departmentSummaries", "gpaTrend", "departmentAttendance", "riskReview", "alertThresholds"]);
    const required = studentOperations.has(operation) ? "student" : teacherOperations.has(operation) ? "teacher" : adminOperations.has(operation) ? "faculty_admin" : null;
    const permitted = !required || role === required || ((role === "admin" || role === "faculty_admin") && required === "faculty_admin");
    if (!permitted) { res.status(403).json({ error: `Requires role: ${required}` }); return; }
    const args = (req.body?.args ?? {}) as Record<string, unknown>;
    if (role === "student" && args.studentId) {
      const ownStudent = await student.getStudentByUserId(req.session!.user.id);
      if (!ownStudent || ownStudent.id !== String(args.studentId)) { res.status(403).json({ error: "Not authorized" }); return; }
    }
    const data = await handler(args, req.session!.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
