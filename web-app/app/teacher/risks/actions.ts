import { backendMutation } from "@/lib/backend-client";
export async function addNoteAction(input: { studentId: string; sectionId: string | null; note: string }) { await backendMutation("/teacher-note", input); }
