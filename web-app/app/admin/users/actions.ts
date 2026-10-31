"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, facultyAdmins, students, teachers, user } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const CreateUserSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("teacher"),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    departmentId: z.string().uuid(),
    title: z.string().optional(),
  }),
  z.object({
    role: z.literal("student"),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    programId: z.string().uuid(),
    studentNumber: z.string().min(1),
    enrollmentYear: z.number().int().min(2000).max(2100),
  }),
  z.object({
    role: z.literal("faculty_admin"),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
]);

export async function createUserAction(input: z.infer<typeof CreateUserSchema>) {
  const parsed = CreateUserSchema.parse(input);
  const session = await requireRole("faculty_admin");

  // better-auth's `role`/`isActive` additional fields are `input: false` (never
  // client- or API-settable at signup, per rule #2/#3) — signUpEmail creates
  // the base account, then we set the role with a direct write, same pattern
  // lib/db/seed.ts uses.
  await auth.api.signUpEmail({ body: { name: parsed.name, email: parsed.email, password: parsed.password } });
  await db.update(user).set({ role: parsed.role }).where(eq(user.email, parsed.email));
  const [newUser] = await db.select().from(user).where(eq(user.email, parsed.email));

  if (parsed.role === "teacher") {
    await db.insert(teachers).values({ userId: newUser.id, departmentId: parsed.departmentId, title: parsed.title });
  } else if (parsed.role === "student") {
    await db.insert(students).values({
      userId: newUser.id,
      studentNumber: parsed.studentNumber,
      programId: parsed.programId,
      enrollmentYear: parsed.enrollmentYear,
    });
  } else {
    await db.insert(facultyAdmins).values({ userId: newUser.id });
  }

  await db.insert(auditLogs).values({
    userId: session.user.id,
    actorType: "user",
    action: "user.create",
    resourceType: "user",
    resourceId: newUser.id,
    metadata: { role: parsed.role, email: parsed.email },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/faculty");
}

const SetActiveSchema = z.object({ userId: z.string(), isActive: z.boolean() });

export async function setUserActiveAction(input: z.infer<typeof SetActiveSchema>) {
  const parsed = SetActiveSchema.parse(input);
  const session = await requireRole("faculty_admin");

  await db.update(user).set({ isActive: parsed.isActive }).where(eq(user.id, parsed.userId));

  await db.insert(auditLogs).values({
    userId: session.user.id,
    actorType: "user",
    action: parsed.isActive ? "user.reactivate" : "user.deactivate",
    resourceType: "user",
    resourceId: parsed.userId,
    metadata: null,
  });

  revalidatePath("/admin/users");
}
