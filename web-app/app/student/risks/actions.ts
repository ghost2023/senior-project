import { backendMutation } from "@/lib/backend-client";
export async function acknowledgeAlertAction(alertId: string) { await backendMutation("/acknowledge-alert", { alertId }); }
