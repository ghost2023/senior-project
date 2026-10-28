"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconSearch } from "@tabler/icons-react";

export interface RosterRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  studentNumber: string;
  courseName: string;
  courseCode: string;
  sectionCode: string;
}

export function StudentDirectory({ rows }: { rows: RosterRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.studentNumber.includes(q) ||
        r.courseCode.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, ID, or course..."
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Student</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Course</TableHead>
            <TableHead className="pr-6">Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.enrollmentId}>
              <TableCell className="pl-6 font-bold text-sm">{r.name}</TableCell>
              <TableCell className="font-mono text-xs">{r.studentNumber}</TableCell>
              <TableCell className="text-xs">
                {r.courseCode} Sec. {r.sectionCode}
              </TableCell>
              <TableCell className="pr-6 text-xs text-muted-foreground">{r.email}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                No students match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
