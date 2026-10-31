import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db } from "@/lib/db";
import { alertThresholds } from "@/lib/db/schema";
import { ThresholdForm } from "./threshold-form";

export default async function AdminAlertConfigPage() {
  const thresholds = await db.select().from(alertThresholds).orderBy(desc(alertThresholds.riskLevel));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Alert Thresholds</h2>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
          Minimum risk score required to trigger each alert severity (A-16, rule #21)
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Global Thresholds</CardTitle>
          <CardDescription>Applied whenever a prediction run evaluates a student&apos;s risk score against these cutoffs</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {thresholds.map((t) => (
            <ThresholdForm key={t.id} threshold={{ id: t.id, riskLevel: t.riskLevel, minScore: t.minScore, scope: t.scope }} />
          ))}
          {thresholds.length === 0 && <p className="p-6 text-sm text-muted-foreground">No thresholds configured.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
