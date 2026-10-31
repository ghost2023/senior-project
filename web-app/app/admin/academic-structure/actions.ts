"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicTerms, auditLogs, courses, departments, programs, sections } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

async function logAdminAction(userId: string, action: string, resourceType: string, resourceId: string, metadata?: unknown) {
  await db.insert(auditLogs).values({ userId, actorType: "user", action, resourceType, resourceId, metadata: metadata ?? null });
}

const CreateDepartmentSchema = z.object({ name: z.string().min(1), code: z.string().min(1).max(16) });
export async function createDepartmentAction(input: z.infer<typeof CreateDepartmentSchema>) {
  const parsed = CreateDepartmentSchema.parse(input);
  const session = await requireRole("faculty_admin");
  const [row] = await db.insert(departments).values(parsed).returning();
  await logAdminAction(session.user.id, "department.create", "departments", row.id, parsed);
  revalidatePath("/admin/academic-structure");
}

const CreateProgramSchema = z.object({ departmentId: z.string().uuid(), name: z.string().min(1), degreeLevel: z.string().optional() });
export async function createProgramAction(input: z.infer<typeof CreateProgramSchema>) {
  const parsed = CreateProgramSchema.parse(input);
  const session = await requireRole("faculty_admin");
  const [row] = await db.insert(programs).values(parsed).returning();
  await logAdminAction(session.user.id, "program.create", "programs", row.id, parsed);
  revalidatePath("/admin/academic-structure");
}

const CreateCourseSchema = z.object({
  departmentId: z.string().uuid(),
  code: z.string().min(1).max(16),
  name: z.string().min(1),
  credits: z.number().int().min(1).max(12),
});
export async function createCourseAction(input: z.infer<typeof CreateCourseSchema>) {
  const parsed = CreateCourseSchema.parse(input);
  const session = await requireRole("faculty_admin");
  const [row] = await db.insert(courses).values(parsed).returning();
  await logAdminAction(session.user.id, "course.create", "courses", row.id, parsed);
  revalidatePath("/admin/academic-structure");
}

const CreateTermSchema = z.object({
  label: z.string().min(1),
  academicYear: z.string().min(4).max(9),
  termType: z.enum(["fall", "spring", "summer"]),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
});
export async function createTermAction(input: z.infer<typeof CreateTermSchema>) {
  const parsed = CreateTermSchema.parse(input);
  const session = await requireRole("faculty_admin");
  if (parsed.isCurrent) {
    await db.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true));
  }
  const [row] = await db.insert(academicTerms).values(parsed).returning();
  await logAdminAction(session.user.id, "term.create", "academic_terms", row.id, parsed);
  revalidatePath("/admin/academic-structure");
  revalidatePath("/admin");
}

const CreateSectionSchema = z.object({
  courseId: z.string().uuid(),
  termId: z.string().uuid(),
  sectionCode: z.string().min(1).max(8),
  capacity: z.number().int().min(1).max(500),
});
export async function createSectionAction(input: z.infer<typeof CreateSectionSchema>) {
  const parsed = CreateSectionSchema.parse(input);
  const session = await requireRole("faculty_admin");
  const [row] = await db.insert(sections).values(parsed).returning();
  await logAdminAction(session.user.id, "section.create", "sections", row.id, parsed);
  revalidatePath("/admin/academic-structure");
}

const AssignTeacherSchema = z.object({ sectionId: z.string().uuid(), teacherId: z.string().uuid().nullable() });
export async function assignTeacherToSectionAction(input: z.infer<typeof AssignTeacherSchema>) {
  const parsed = AssignTeacherSchema.parse(input);
  const session = await requireRole("faculty_admin");
  await db.update(sections).set({ teacherId: parsed.teacherId }).where(eq(sections.id, parsed.sectionId));
  await logAdminAction(session.user.id, "section.assign_teacher", "sections", parsed.sectionId, { teacherId: parsed.teacherId });
  revalidatePath("/admin/academic-structure");
  revalidatePath("/admin/faculty");
}
