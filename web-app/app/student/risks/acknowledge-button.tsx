"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acknowledgeAlertAction } from "./actions";

export function AcknowledgeButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => acknowledgeAlertAction(alertId))}
    >
      {isPending ? "Acknowledging..." : "Acknowledge"}
    </Button>
  );
}
