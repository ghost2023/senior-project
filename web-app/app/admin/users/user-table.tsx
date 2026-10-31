"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconSearch } from "@tabler/icons-react";
import { setUserActiveAction } from "./actions";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  detail: string;
}

const ROLE_LABEL: Record<string, string> = { student: "Student", teacher: "Teacher", faculty_admin: "Faculty Admin" };

export function UserTable({ rows }: { rows: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, query]);

  function toggleActive(row: UserRow) {
    setPendingId(row.id);
    startTransition(async () => {
      await setUserActiveAction({ userId: row.id, isActive: !row.isActive });
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or email..." className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-6 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="pl-6">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8 border">
                    <AvatarFallback className="text-[10px] font-bold uppercase">
                      {r.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{r.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{r.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{ROLE_LABEL[r.role] ?? r.role}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.detail}</TableCell>
              <TableCell>
                <Badge variant={r.isActive ? "outline" : "destructive"} className="font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                  {r.isActive ? "Active" : "Deactivated"}
                </Badge>
              </TableCell>
              <TableCell className="pr-6 text-right">
                <Button
                  variant={r.isActive ? "destructive" : "outline"}
                  size="sm"
                  disabled={isPending && pendingId === r.id}
                  onClick={() => toggleActive(r)}
                >
                  {isPending && pendingId === r.id ? "Saving..." : r.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                No users match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
