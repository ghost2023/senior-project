"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/permissions";
import { acknowledgeAlert } from "@/lib/queries/student";
import { db } from "@/lib/db";
import { alerts, students } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function acknowledgeAlertAction(alertId: string) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id));
  if (!student) throw new Error("No student profile");

  // Ownership check (rule #5): a student may only acknowledge their own alerts.
  const [alert] = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.id, alertId), eq(alerts.studentId, student.id)));
  if (!alert) throw new Error("Alert not found");

  await acknowledgeAlert(alertId, session.user.id);
  revalidatePath("/student/risks");
  revalidatePath("/student");
}
