import { backendMutation } from "@/lib/backend-client";
export async function updateThresholdAction(input: { id: string; minScore: number }) { await backendMutation("/threshold", input); }
