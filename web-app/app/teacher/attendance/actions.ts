import { backendMutation } from "@/lib/backend-client";
export async function markAttendanceAction(input: { sectionId: string; sessionDate: string; marks: { enrollmentId: string; status: "present" | "absent" | "late" | "excused" }[] }) { await backendMutation("/attendance", input); }
