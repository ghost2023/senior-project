"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceRecords, auditLogs, sections } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";
import { getTeacherByUserId } from "@/lib/queries/teacher";

const MarkAttendanceSchema = z.object({
  sectionId: z.string().uuid(),
  sessionDate: z.string(), // YYYY-MM-DD
  marks: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      status: z.enum(["present", "absent", "late", "excused"]),
    }),
  ),
});

export async function markAttendanceAction(input: z.infer<typeof MarkAttendanceSchema>) {
  const parsed = MarkAttendanceSchema.parse(input);
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const teacher = await getTeacherByUserId(session.user.id);
  if (!teacher) throw new Error("No teacher profile");

  const [section] = await db.select().from(sections).where(eq(sections.id, parsed.sectionId));
  if (!section || section.teacherId !== teacher.id) {
    throw new Error("Not authorized to mark attendance for this section");
  }

  for (const mark of parsed.marks) {
    const existing = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.enrollmentId, mark.enrollmentId));
    const currentForDate = existing.find((e) => e.sessionDate === parsed.sessionDate);

    if (currentForDate && currentForDate.status === mark.status) continue;

    await db.insert(attendanceRecords).values({
      enrollmentId: mark.enrollmentId,
      sessionDate: parsed.sessionDate,
      status: mark.status,
      recordedByTeacherId: teacher.id,
      supersedesId: currentForDate?.id,
    });

    await db.insert(auditLogs).values({
      userId: session.user.id,
      actorType: "user",
      action: currentForDate ? "attendance.correct" : "attendance.create",
      resourceType: "attendance_records",
      resourceId: mark.enrollmentId,
      metadata: { sessionDate: parsed.sessionDate, status: mark.status },
    });
  }

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher");
}
