import { backendMutation } from "@/lib/backend-client";

export async function createUserAction(input: Record<string, unknown>) {
  await backendMutation("/user", input);
}

export async function setUserActiveAction(input: { userId: string; isActive: boolean }) {
  await backendMutation("/user/active", input);
}
