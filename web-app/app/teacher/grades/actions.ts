import { backendMutation } from "@/lib/backend-client";
export async function saveGradesAction(input: { sectionId: string; scores: { enrollmentId: string; assessmentComponentId: string; score: number }[]; correctionReason?: string }) { await backendMutation("/grades", input); }
