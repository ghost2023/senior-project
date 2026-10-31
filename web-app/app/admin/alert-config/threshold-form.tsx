"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateThresholdAction } from "./actions";

export interface ThresholdRow {
  id: string;
  riskLevel: string;
  minScore: string;
  scope: string;
}

const LEVEL_LABEL: Record<string, string> = { warning: "Warning", at_risk: "At Risk", critical: "Critical" };
const LEVEL_VARIANT: Record<string, "secondary" | "destructive"> = { warning: "secondary", at_risk: "destructive", critical: "destructive" };

export function ThresholdForm({ threshold }: { threshold: ThresholdRow }) {
  const [value, setValue] = useState(String(Math.round(Number(threshold.minScore) * 100)));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const pct = Number(value);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return;
    startTransition(async () => {
      await updateThresholdAction({ id: threshold.id, minScore: pct / 100 });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <Badge variant={LEVEL_VARIANT[threshold.riskLevel] ?? "outline"}>{LEVEL_LABEL[threshold.riskLevel] ?? threshold.riskLevel}</Badge>
        <span className="text-[10px] font-mono uppercase text-muted-foreground">{threshold.scope}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 text-right"
          />
          <span className="text-xs text-muted-foreground">% risk score minimum</span>
        </div>
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
