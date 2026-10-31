import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  academicTerms,
  attendanceRecords,
  auditLogs,
  courses,
  departments,
  enrollments,
  facultyAdmins,
  finalGrades,
  mlModels,
  riskAssessments,
  sections,
  teachers,
  user,
} from "@/lib/db/schema";
import { dedupeLatestAttendance } from "./shared";

export async function getFacultyAdminByUserId(userId: string) {
  return db.query.facultyAdmins.findFirst({
    where: eq(facultyAdmins.userId, userId),
    with: { user: true },
  });
}

export async function getAllDepartments() {
  return db.select().from(departments).orderBy(departments.name);
}

export async function getAllPrograms() {
  return db.query.programs.findMany({
    with: { department: true },
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

export async function getAllCourses() {
  return db.query.courses.findMany({
    with: { department: true },
    orderBy: (c, { asc }) => [asc(c.code)],
  });
}

export async function getAllSections() {
  return db.query.sections.findMany({
    with: {
      course: { with: { department: true } },
      term: true,
      teacher: { with: { user: true } },
    },
    orderBy: (s, { desc }) => [desc(s.termId)],
  });
}

export async function getAllTeachersWithDepartment() {
  return db.query.teachers.findMany({
    with: { user: true, department: true, sections: { with: { term: true } } },
    orderBy: (t, { asc }) => [asc(t.id)],
  });
}

export async function getAllUsers() {
  const rows = await db.select().from(user).orderBy(user.name);
  const [studentRows, teacherRows, adminRows] = await Promise.all([
    db.query.students.findMany({ with: { program: { with: { department: true } } } }),
    db.query.teachers.findMany({ with: { department: true } }),
    db.select().from(facultyAdmins),
  ]);
  const studentByUser = new Map(studentRows.map((s) => [s.userId, s]));
  const teacherByUser = new Map(teacherRows.map((t) => [t.userId, t]));
  const adminByUser = new Map(adminRows.map((a) => [a.userId, a]));
  return rows.map((u) => ({
    ...u,
    student: studentByUser.get(u.id) ?? null,
    teacher: teacherByUser.get(u.id) ?? null,
    facultyAdmin: adminByUser.get(u.id) ?? null,
  }));
}

export async function getAuditLogs(page: number, pageSize = 25) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(auditLogs),
  ]);

  const userIds = [...new Set(rows.map((r) => r.userId).filter((id): id is string => !!id))];
  const users = userIds.length > 0 ? await db.select().from(user).where(inArray(user.id, userIds)) : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return {
    rows: rows.map((r) => ({ ...r, actorName: r.userId ? (userById.get(r.userId)?.name ?? "Unknown user") : "ML Service" })),
    total,
    pageSize,
  };
}

export async function getAllMlModels() {
  return db.select().from(mlModels).orderBy(desc(mlModels.trainedAt));
}

export interface DepartmentSummary {
  department: typeof departments.$inferSelect;
  studentCount: number;
  teacherCount: number;
  avgGpa: number;
  avgAttendanceRate: number;
  atRiskCount: number;
}

/** Faculty-wide, per-department rollups for the current term. */
export async function getDepartmentSummaries(termId: string): Promise<DepartmentSummary[]> {
  const depts = await getAllDepartments();

  return Promise.all(
    depts.map(async (dept): Promise<DepartmentSummary> => {
      const teacherCount = (await db.select().from(teachers).where(eq(teachers.departmentId, dept.id))).length;

      const deptCourses = await db.select().from(courses).where(eq(courses.departmentId, dept.id));
      const courseIds = deptCourses.map((c) => c.id);
      if (courseIds.length === 0) {
        return { department: dept, studentCount: 0, teacherCount, avgGpa: 0, avgAttendanceRate: 0, atRiskCount: 0 };
      }

      const deptSections = await db
        .select()
        .from(sections)
        .where(and(inArray(sections.courseId, courseIds), eq(sections.termId, termId)));
      const sectionIds = deptSections.map((s) => s.id);
      if (sectionIds.length === 0) {
        return { department: dept, studentCount: 0, teacherCount, avgGpa: 0, avgAttendanceRate: 0, atRiskCount: 0 };
      }

      const deptEnrollments = await db.select().from(enrollments).where(inArray(enrollments.sectionId, sectionIds));
      const enrollmentIds = deptEnrollments.map((e) => e.id);
      const studentCount = new Set(deptEnrollments.map((e) => e.studentId)).size;

      const [grades, rawAttendance, risks] = await Promise.all([
        enrollmentIds.length > 0
          ? db.select().from(finalGrades).where(inArray(finalGrades.enrollmentId, enrollmentIds))
          : Promise.resolve([]),
        enrollmentIds.length > 0
          ? db.select().from(attendanceRecords).where(inArray(attendanceRecords.enrollmentId, enrollmentIds))
          : Promise.resolve([]),
        db
          .select()
          .from(riskAssessments)
          .where(and(inArray(riskAssessments.sectionId, sectionIds), eq(riskAssessments.termId, termId))),
      ]);
      const attendance = dedupeLatestAttendance(rawAttendance);

      const avgGpa = grades.length > 0 ? grades.reduce((s, g) => s + Number(g.gpaPoints ?? 0), 0) / grades.length : 0;
      const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
      const avgAttendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
      const atRiskCount = risks.filter((r) => r.riskLevel !== "normal" && r.riskLevel !== "improving").length;

      return { department: dept, studentCount, teacherCount, avgGpa, avgAttendanceRate, atRiskCount };
    }),
  );
}

/** Multi-term, per-department average GPA — one row per term, one column per department code. */
export async function getGpaTrendByDepartment() {
  const [terms, depts] = await Promise.all([
    db.select().from(academicTerms).orderBy(academicTerms.startDate),
    getAllDepartments(),
  ]);

  const rows = await db
    .select({
      gpaPoints: finalGrades.gpaPoints,
      departmentId: courses.departmentId,
      termId: sections.termId,
    })
    .from(finalGrades)
    .innerJoin(enrollments, eq(finalGrades.enrollmentId, enrollments.id))
    .innerJoin(sections, eq(enrollments.sectionId, sections.id))
    .innerJoin(courses, eq(sections.courseId, courses.id));

  return terms.map((term) => {
    const point: Record<string, number | string | null> = { term: term.label };
    for (const dept of depts) {
      const matching = rows.filter((r) => r.termId === term.id && r.departmentId === dept.id && r.gpaPoints != null);
      point[dept.code] = matching.length > 0 ? Math.round((matching.reduce((s, r) => s + Number(r.gpaPoints), 0) / matching.length) * 100) / 100 : null;
    }
    return point;
  });
}

/** Per-department attendance rate for a given term. */
export async function getAttendanceRateByDepartment(termId: string) {
  const depts = await getAllDepartments();

  const rows = await db
    .select({
      status: attendanceRecords.status,
      enrollmentId: attendanceRecords.enrollmentId,
      sessionDate: attendanceRecords.sessionDate,
      recordedAt: attendanceRecords.recordedAt,
      departmentId: courses.departmentId,
    })
    .from(attendanceRecords)
    .innerJoin(enrollments, eq(attendanceRecords.enrollmentId, enrollments.id))
    .innerJoin(sections, eq(enrollments.sectionId, sections.id))
    .innerJoin(courses, eq(sections.courseId, courses.id))
    .where(eq(sections.termId, termId));

  const deduped = dedupeLatestAttendance(rows);

  return depts.map((dept) => {
    const deptRows = deduped.filter((r) => r.departmentId === dept.id);
    const present = deptRows.filter((r) => r.status === "present" || r.status === "late").length;
    return {
      name: dept.code,
      attendance: deptRows.length > 0 ? Math.round((present / deptRows.length) * 100) : 0,
      sessionCount: deptRows.length,
    };
  });
}

export async function getRiskAssessmentsForReview() {
  return db.query.riskAssessments.findMany({
    orderBy: [desc(riskAssessments.generatedAt)],
    with: {
      student: { with: { user: true, program: { with: { department: true } } } },
      section: { with: { course: true } },
      model: true,
    },
    limit: 200,
  });
}
