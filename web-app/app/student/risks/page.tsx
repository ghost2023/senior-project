import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconAlertTriangle } from "@tabler/icons-react";
import { getSession } from "@/lib/permissions";
import { getStudentAlerts, getStudentByUserId } from "@/lib/queries/student";
import { AcknowledgeButton } from "./acknowledge-button";

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  at_risk: "destructive",
  warning: "secondary",
  normal: "outline",
  improving: "outline",
};

export default async function StudentRisksPage() {
  const session = await getSession();
  const student = await getStudentByUserId(session!.user.id);
  if (!student) return <div>No student profile found.</div>;

  const alerts = await getStudentAlerts(student.id);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-3xl font-bold tracking-tight">Risk Alerts</h2>

      {alerts.length === 0 ? (
        <Card className="h-[30vh] flex items-center justify-center border-2 border-dashed bg-accent/5 shadow-none">
          <div className="text-center">
            <IconAlertTriangle className="mx-auto mb-3 text-muted-foreground" size={24} />
            <p className="text-sm font-bold">No alerts</p>
            <p className="text-xs text-muted-foreground mt-1">You&apos;re not currently flagged for any academic risk.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {alerts.map((a) => (
            <Card key={a.id} className={a.acknowledgedAt ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={SEVERITY_VARIANT[a.severity] ?? "outline"} className="capitalize">
                      {a.severity.replace("_", " ")}
                    </Badge>
                    {a.isSystemGenerated && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                        System-generated
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base">{a.message}</CardTitle>
                  <CardDescription className="mt-1">{new Date(a.createdAt).toLocaleString()}</CardDescription>
                </div>
                {!a.acknowledgedAt && <AcknowledgeButton alertId={a.id} />}
              </CardHeader>
              {a.acknowledgedAt && (
                <CardContent className="pt-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                    Acknowledged {new Date(a.acknowledgedAt).toLocaleString()}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
