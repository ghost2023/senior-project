"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { markAttendanceAction } from "./actions";

type Status = "present" | "absent" | "late" | "excused";
const STATUSES: Status[] = ["present", "absent", "late", "excused"];

export interface AttendanceRosterRow {
  enrollmentId: string;
  studentName: string;
  studentNumber: string;
  currentStatus: Status | null;
}

export function AttendanceGrid({
  sectionId,
  sessionDate,
  rows,
}: {
  sectionId: string;
  sessionDate: string;
  rows: AttendanceRosterRow[];
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(rows.map((r) => [r.enrollmentId, r.currentStatus ?? "present"])),
  );
  const [isPending, startTransition] = useTransition();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      await markAttendanceAction({
        sectionId,
        sessionDate,
        marks: rows.map((r) => ({ enrollmentId: r.enrollmentId, status: statuses[r.enrollmentId] })),
      });
      setSavedMessage("Saved.");
    });
  }

  function markAllPresent() {
    setStatuses(Object.fromEntries(rows.map((r) => [r.enrollmentId, "present" as Status])));
    setSavedMessage(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-6 pt-4">
        <Input
          type="date"
          value={sessionDate}
          onChange={(e) => router.push(`?section=${sectionId}&date=${e.target.value}`)}
          className="w-40"
        />
        <Button variant="outline" size="sm" onClick={markAllPresent}>
          Mark All Present
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Student</TableHead>
            <TableHead className="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.enrollmentId}>
              <TableCell className="pl-6">
                <span className="font-bold text-sm">{r.studentName}</span>
                <span className="block text-[10px] font-mono text-muted-foreground">{r.studentNumber}</span>
              </TableCell>
              <TableCell className="pr-6">
                <div className="flex gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatuses((prev) => ({ ...prev, [r.enrollmentId]: s }));
                        setSavedMessage(null);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors",
                        statuses[r.enrollmentId] === s
                          ? s === "present"
                            ? "bg-primary text-primary-foreground border-primary"
                            : s === "absent"
                              ? "bg-destructive text-destructive-foreground border-destructive"
                              : "bg-secondary text-secondary-foreground border-secondary"
                          : "bg-transparent text-muted-foreground border-border hover:bg-accent/10",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-3 px-6 pb-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Attendance"}
        </Button>
        {savedMessage && <span className="text-xs text-muted-foreground">{savedMessage}</span>}
      </div>
    </div>
  );
}
