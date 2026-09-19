import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export { user, session, account, verification } from "./auth-schema";

export const riskLevelEnum = pgEnum("risk_level", [
  "normal",
  "warning",
  "at_risk",
  "critical",
  "improving",
]);

export const modelTypeEnum = pgEnum("model_type", ["xgboost", "bilstm"]);

// ---------------------------------------------------------------------------
// Academic structure (A-05..A-08)
// ---------------------------------------------------------------------------

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  name: text("name").notNull(),
  degreeLevel: varchar("degree_level", { length: 32 }),
  isActive: boolean("is_active").default(true).notNull(),
});

export const academicTerms = pgTable("academic_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(), // "Fall 2025"
  academicYear: varchar("academic_year", { length: 9 }).notNull(), // "2025-2026"
  termType: varchar("term_type", { length: 16 }).notNull(), // fall | spring | summer
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),
    code: varchar("code", { length: 16 }).notNull(), // "CS301"
    name: text("name").notNull(),
    credits: integer("credits").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [unique().on(t.departmentId, t.code)],
);

export const sections = pgTable("sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  termId: uuid("term_id")
    .notNull()
    .references(() => academicTerms.id),
  sectionCode: varchar("section_code", { length: 8 }).notNull(), // "A"
  teacherId: uuid("teacher_id").references(() => teachers.id),
  capacity: integer("capacity").default(40).notNull(),
});

// ---------------------------------------------------------------------------
// People (role-specific profile rows, one per better-auth user)
// ---------------------------------------------------------------------------

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  studentNumber: varchar("student_number", { length: 20 }).notNull().unique(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id),
  enrollmentYear: integer("enrollment_year").notNull(),
  currentSemesterNumber: integer("current_semester_number").default(1).notNull(),
  isTransferStudent: boolean("is_transfer_student").default(false).notNull(),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  title: varchar("title", { length: 64 }),
});

export const facultyAdmins = pgTable("faculty_admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id),
    status: varchar("status", { length: 16 }).default("active").notNull(), // active|dropped|completed
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.studentId, t.sectionId)],
);

// ---------------------------------------------------------------------------
// Append-only academic evidence (business rules #10-14, DQ-07)
// ---------------------------------------------------------------------------

export const assessmentComponents = pgTable("assessment_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.id),
  name: text("name").notNull(), // "Quiz 1", "Midterm"
  weightPct: numeric("weight_pct", { precision: 5, scale: 2 }).notNull(),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }).notNull(),
});

// Immutable once created; corrections insert a new row referencing the old
// one via supersedesId — never UPDATE/DELETE (rule #13).
export const gradeEntries = pgTable("grade_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => enrollments.id),
  assessmentComponentId: uuid("assessment_component_id")
    .notNull()
    .references(() => assessmentComponents.id),
  score: numeric("score", { precision: 6, scale: 2 }).notNull(),
  enteredByTeacherId: uuid("entered_by_teacher_id")
    .notNull()
    .references(() => teachers.id),
  enteredAt: timestamp("entered_at").defaultNow().notNull(),
  supersedesId: uuid("supersedes_id"),
  correctionReason: text("correction_reason"),
});

// Read-cache of the current computed grade per enrollment; recomputed after
// every gradeEntries write from apps/web/lib/grading.ts — not a source of
// truth, just avoids recomputing on every read.
export const finalGrades = pgTable("final_grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id").notNull().unique().references(() => enrollments.id),
  weightedTotal: numeric("weighted_total", { precision: 6, scale: 2 }),
  letterGrade: varchar("letter_grade", { length: 4 }),
  gpaPoints: numeric("gpa_points", { precision: 3, scale: 2 }),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
});

// No unique(enrollmentId, sessionDate) constraint: corrections append a new
// row (supersedesId -> previous row) rather than updating in place, per
// business rule #13. The "current" status for a date is the row with no
// later row superseding it (or in practice: most recent recordedAt).
export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => enrollments.id),
  sessionDate: date("session_date").notNull(),
  status: varchar("status", { length: 16 }).notNull(), // present|absent|late|excused
  recordedByTeacherId: uuid("recorded_by_teacher_id")
    .notNull()
    .references(() => teachers.id),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  supersedesId: uuid("supersedes_id"),
});

export const teacherNotes = pgTable("teacher_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id),
  sectionId: uuid("section_id").references(() => sections.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// ML outputs (P-01..P-16, M-01..M-10, rules #15-24)
// ---------------------------------------------------------------------------

export const mlModels = pgTable(
  "ml_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(), // "risk-classifier"
    modelType: modelTypeEnum("model_type").notNull(),
    version: varchar("version", { length: 32 }).notNull(),
    artifactPath: text("artifact_path").notNull(),
    trainedAt: timestamp("trained_at").notNull(),
    metrics: jsonb("metrics"), // {accuracy, precision, recall, f1, ...}
    isActive: boolean("is_active").default(false).notNull(),
  },
  (t) => [unique().on(t.name, t.version)],
);

export const riskAssessments = pgTable("risk_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  sectionId: uuid("section_id").references(() => sections.id), // null = cross-course overall
  termId: uuid("term_id")
    .notNull()
    .references(() => academicTerms.id),
  modelId: uuid("model_id")
    .notNull()
    .references(() => mlModels.id),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).notNull(), // 0..1
  riskLevel: riskLevelEnum("risk_level").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }).notNull(),
  predictedFinalGrade: numeric("predicted_final_grade", { precision: 3, scale: 2 }),
  contributingFactors: jsonb("contributing_factors").notNull(), // [{feature, shapValue, direction}]
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  riskAssessmentId: uuid("risk_assessment_id").references(() => riskAssessments.id),
  text: text("text").notNull(),
  category: varchar("category", { length: 32 }),
  evidenceRefs: jsonb("evidence_refs"), // trace to grade_entries/attendance_records ids (DQ-03)
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alertThresholds = pgTable("alert_thresholds", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: varchar("scope", { length: 16 }).notNull(), // "global" | "department"
  departmentId: uuid("department_id").references(() => departments.id),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  minScore: numeric("min_score", { precision: 5, scale: 4 }).notNull(),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  riskAssessmentId: uuid("risk_assessment_id").references(() => riskAssessments.id),
  severity: riskLevelEnum("severity").notNull(),
  message: text("message").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(true).notNull(), // rule #16
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedByUserId: text("acknowledged_by_user_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const predictionRuns = pgTable("prediction_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelId: uuid("model_id").references(() => mlModels.id),
  trigger: varchar("trigger", { length: 24 }).notNull(), // scheduled|bulk_upload|manual
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  recordsProcessed: integer("records_processed"),
  status: varchar("status", { length: 16 }).notNull(), // running|succeeded|failed
  errorDetail: text("error_detail"),
});

// ---------------------------------------------------------------------------
// Audit log (rules #26, #28-30, SEC-05, A-15)
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id), // null for the ML service actor
  actorType: varchar("actor_type", { length: 16 }).notNull(), // "user" | "ml_service"
  action: varchar("action", { length: 64 }).notNull(), // "grade.create" | "user.deactivate" | ...
  resourceType: varchar("resource_type", { length: 32 }).notNull(),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations (for Drizzle's relational query API)
// ---------------------------------------------------------------------------

export const departmentsRelations = relations(departments, ({ many }) => ({
  programs: many(programs),
  courses: many(courses),
  teachers: many(teachers),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  department: one(departments, { fields: [programs.departmentId], references: [departments.id] }),
  students: many(students),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  department: one(departments, { fields: [courses.departmentId], references: [departments.id] }),
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, { fields: [sections.courseId], references: [courses.id] }),
  term: one(academicTerms, { fields: [sections.termId], references: [academicTerms.id] }),
  teacher: one(teachers, { fields: [sections.teacherId], references: [teachers.id] }),
  enrollments: many(enrollments),
  assessmentComponents: many(assessmentComponents),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(user, { fields: [students.userId], references: [user.id] }),
  program: one(programs, { fields: [students.programId], references: [programs.id] }),
  enrollments: many(enrollments),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(user, { fields: [teachers.userId], references: [user.id] }),
  department: one(departments, { fields: [teachers.departmentId], references: [departments.id] }),
  sections: many(sections),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  student: one(students, { fields: [enrollments.studentId], references: [students.id] }),
  section: one(sections, { fields: [enrollments.sectionId], references: [sections.id] }),
  gradeEntries: many(gradeEntries),
  attendanceRecords: many(attendanceRecords),
  finalGrade: one(finalGrades, { fields: [enrollments.id], references: [finalGrades.enrollmentId] }),
}));

export const gradeEntriesRelations = relations(gradeEntries, ({ one }) => ({
  enrollment: one(enrollments, { fields: [gradeEntries.enrollmentId], references: [enrollments.id] }),
  assessmentComponent: one(assessmentComponents, {
    fields: [gradeEntries.assessmentComponentId],
    references: [assessmentComponents.id],
  }),
  enteredBy: one(teachers, { fields: [gradeEntries.enteredByTeacherId], references: [teachers.id] }),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one, many }) => ({
  student: one(students, { fields: [riskAssessments.studentId], references: [students.id] }),
  section: one(sections, { fields: [riskAssessments.sectionId], references: [sections.id] }),
  term: one(academicTerms, { fields: [riskAssessments.termId], references: [academicTerms.id] }),
  model: one(mlModels, { fields: [riskAssessments.modelId], references: [mlModels.id] }),
  recommendations: many(recommendations),
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  student: one(students, { fields: [alerts.studentId], references: [students.id] }),
  riskAssessment: one(riskAssessments, {
    fields: [alerts.riskAssessmentId],
    references: [riskAssessments.id],
  }),
}));
