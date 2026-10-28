"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/permissions";
import { addTeacherNote, getTeacherByUserId } from "@/lib/queries/teacher";

const AddNoteSchema = z.object({
  studentId: z.string().uuid(),
  sectionId: z.string().uuid().nullable(),
  note: z.string().min(1).max(2000),
});

export async function addNoteAction(input: z.infer<typeof AddNoteSchema>) {
  const parsed = AddNoteSchema.parse(input);
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  const teacher = await getTeacherByUserId(session.user.id);
  if (!teacher) throw new Error("No teacher profile");

  await addTeacherNote(parsed.studentId, teacher.id, parsed.sectionId, parsed.note);
  revalidatePath("/teacher/risks");
}
