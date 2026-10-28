"use client";

import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveGradesAction } from "./actions";

export interface GradeGridComponent {
  id: string;
  name: string;
  weightPct: number;
  maxScore: number;
}

export interface GradeGridRow {
  enrollmentId: string;
  studentName: string;
  studentNumber: string;
  scores: Record<string, number | null>; // componentId -> score
}

export function GradeGrid({
  sectionId,
  components,
  rows,
}: {
  sectionId: string;
  components: GradeGridComponent[];
  rows: GradeGridRow[];
}) {
  const [scores, setScores] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      init[r.enrollmentId] = {};
      for (const c of components) {
        init[r.enrollmentId][c.id] = r.scores[c.id] != null ? String(r.scores[c.id]) : "";
      }
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const weightedTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    for (const r of rows) {
      const entries = components
        .map((c) => ({ c, v: scores[r.enrollmentId]?.[c.id] }))
        .filter((e) => e.v !== "" && e.v != null);
      if (entries.length === 0) {
        totals[r.enrollmentId] = null;
        continue;
      }
      const totalWeight = entries.reduce((s, e) => s + e.c.weightPct, 0);
      const weightedSum = entries.reduce((s, e) => s + (Number(e.v) / e.c.maxScore) * 100 * e.c.weightPct, 0);
      totals[r.enrollmentId] = totalWeight > 0 ? weightedSum / totalWeight : null;
    }
    return totals;
  }, [scores, rows, components]);

  function setScore(enrollmentId: string, componentId: string, value: string) {
    setScores((prev) => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [componentId]: value } }));
    setSavedMessage(null);
  }

  function handleSave() {
    const payload = {
      sectionId,
      scores: rows.flatMap((r) =>
        components
          .map((c) => ({ enrollmentId: r.enrollmentId, assessmentComponentId: c.id, raw: scores[r.enrollmentId]?.[c.id] }))
          .filter((s) => s.raw !== "" && s.raw != null)
          .map((s) => ({ enrollmentId: s.enrollmentId, assessmentComponentId: s.assessmentComponentId, score: Number(s.raw) })),
      ),
    };
    startTransition(async () => {
      await saveGradesAction(payload);
      setSavedMessage("Saved.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Student</TableHead>
            {components.map((c) => (
              <TableHead key={c.id} className="text-center">
                {c.name}
                <span className="block text-[9px] text-muted-foreground font-normal">{c.weightPct}%</span>
              </TableHead>
            ))}
            <TableHead className="text-right pr-6">Weighted Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.enrollmentId}>
              <TableCell className="pl-6">
                <span className="font-bold text-sm">{r.studentName}</span>
                <span className="block text-[10px] font-mono text-muted-foreground">{r.studentNumber}</span>
              </TableCell>
              {components.map((c) => (
                <TableCell key={c.id} className="text-center">
                  <Input
                    type="number"
                    min={0}
                    max={c.maxScore}
                    className="w-16 text-center mx-auto"
                    value={scores[r.enrollmentId]?.[c.id] ?? ""}
                    onChange={(e) => setScore(r.enrollmentId, c.id, e.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell className="text-right pr-6 font-mono text-sm font-bold">
                {weightedTotals[r.enrollmentId] != null ? weightedTotals[r.enrollmentId]!.toFixed(1) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-3 px-6 pb-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Grades"}
        </Button>
        {savedMessage && <span className="text-xs text-muted-foreground">{savedMessage}</span>}
      </div>
    </div>
  );
}
