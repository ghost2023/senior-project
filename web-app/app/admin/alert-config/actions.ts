"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertThresholds, auditLogs } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const UpdateThresholdSchema = z.object({ id: z.string().uuid(), minScore: z.number().min(0).max(1) });

export async function updateThresholdAction(input: z.infer<typeof UpdateThresholdSchema>) {
  const parsed = UpdateThresholdSchema.parse(input);
  const session = await requireRole("faculty_admin");

  await db
    .update(alertThresholds)
    .set({ minScore: String(parsed.minScore), updatedByUserId: session.user.id, updatedAt: new Date() })
    .where(eq(alertThresholds.id, parsed.id));

  await db.insert(auditLogs).values({
    userId: session.user.id,
    actorType: "user",
    action: "alert_threshold.update",
    resourceType: "alert_thresholds",
    resourceId: parsed.id,
    metadata: { minScore: parsed.minScore },
  });

  revalidatePath("/admin/alert-config");
}
