import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllTeachersWithDepartment } from "@/lib/queries/admin";

export default async function AdminFacultyPage() {
  const teachers = await getAllTeachersWithDepartment();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Faculty Registry</h2>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{teachers.length} teachers on record</p>
        </div>
        <Button size="lg" className="font-bold text-xs uppercase tracking-widest shadow-lg" render={<Link href="/admin/users" />}>
          Manage in User Administration
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Teaching Staff</CardTitle>
          <CardDescription>Current section load per teacher, current term</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Faculty Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="pr-6 text-right">Sections (Current Term)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => {
                const currentSections = t.sections.filter((s) => s.term.isCurrent);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="size-9 border">
                          <AvatarFallback className="text-[10px] font-bold uppercase">
                            {t.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-sm tracking-tight">{t.user.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{t.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-muted-foreground">{t.department.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.title ?? "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant={currentSections.length > 0 ? "outline" : "secondary"} className="font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                        {currentSections.length} section{currentSections.length === 1 ? "" : "s"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {teachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                    No teachers on record.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
