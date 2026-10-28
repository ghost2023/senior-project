import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconClipboardCheck } from "@tabler/icons-react";
import { getSession } from "@/lib/permissions";
import { getStudentByUserId, getStudentRecommendations } from "@/lib/queries/student";

export default async function StudentRecommendationsPage() {
  const session = await getSession();
  const student = await getStudentByUserId(session!.user.id);
  if (!student) return <div>No student profile found.</div>;

  const recs = await getStudentRecommendations(student.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Recommendations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Suggestions, not directives (rule #24) — generated from your academic evidence.
        </p>
      </div>

      {recs.length === 0 ? (
        <Card className="h-[30vh] flex items-center justify-center border-2 border-dashed bg-accent/5 shadow-none">
          <div className="text-center">
            <IconClipboardCheck className="mx-auto mb-3 text-muted-foreground" size={24} />
            <p className="text-sm font-bold">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              These appear once the predictive engine has analyzed your academic record.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recs.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                {r.category && (
                  <Badge variant="secondary" className="w-fit mb-1 capitalize">
                    {r.category}
                  </Badge>
                )}
                <CardTitle className="text-sm font-medium leading-relaxed">{r.text}</CardTitle>
                <CardDescription className="text-[10px] font-mono uppercase tracking-widest mt-1">
                  {new Date(r.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
