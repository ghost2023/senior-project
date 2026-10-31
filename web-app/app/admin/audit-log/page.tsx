import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs } from "@/lib/queries/admin";

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { rows, total, pageSize } = await getAuditLogs(page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">{total} recorded actions (rules #28-30)</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Sensitive Write History</CardTitle>
          <CardDescription>Every grade/attendance correction, user/academic-structure change, and threshold update</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="pr-6">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 text-xs font-bold">
                    {r.actorName}
                    <span className="block text-[10px] font-mono font-normal text-muted-foreground uppercase">{r.actorType}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.resourceType}
                    {r.resourceId ? ` #${r.resourceId.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[10px] font-mono text-muted-foreground">
                    {r.metadata ? JSON.stringify(r.metadata) : "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    No audit records yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" render={<Link href={`/admin/audit-log?page=${page - 1}`} />}>
              Previous
            </Button>
          )}
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          ) : (
            <Button variant="outline" size="sm" render={<Link href={`/admin/audit-log?page=${page + 1}`} />}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
