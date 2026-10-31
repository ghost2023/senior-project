import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconSparkles } from "@tabler/icons-react";
import { getAllMlModels } from "@/lib/queries/admin";
import { RunPredictionsButton } from "./run-predictions-button";

export default async function AdminModelsPage() {
  const models = await getAllMlModels();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ML Models</h2>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2">
            XGBoost and BiLSTM risk classifiers, trained on synthetic seed data
          </p>
        </div>
        <RunPredictionsButton />
      </div>

      {models.length === 0 ? (
        <Card className="h-[40vh] flex items-center justify-center border-2 border-dashed bg-accent/5 shadow-none">
          <div className="text-center max-w-md">
            <IconSparkles className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="text-sm font-bold">No models trained yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              This page will list every trained XGBoost/BiLSTM version with accuracy, precision, recall, and F1 once the ML
              service (<code>services/ml</code>) exists and its training endpoints have been run at least once.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Trained Versions</CardTitle>
            <CardDescription>The active model per type is used for the next prediction run</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Trained</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6 font-bold text-sm">{m.name}</TableCell>
                    <TableCell className="text-xs uppercase font-mono">{m.modelType}</TableCell>
                    <TableCell className="text-xs font-mono">{m.version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.trainedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="pr-6">{m.isActive && <Badge>Active</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
