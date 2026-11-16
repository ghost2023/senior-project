"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { backendMutation } from "@/lib/backend-client";

export function AcknowledgeButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => backendMutation("/acknowledge-alert", { alertId }))}
    >
      {isPending ? "Acknowledging..." : "Acknowledge"}
    </Button>
  );
}
