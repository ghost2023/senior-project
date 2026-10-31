"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RiskFilterBar({
  departments,
  department,
  riskLevel,
}: {
  departments: { code: string; name: string }[];
  department: string;
  riskLevel: string;
}) {
  const router = useRouter();

  function push(dept: string, level: string) {
    const params = new URLSearchParams();
    if (dept !== "all") params.set("department", dept);
    if (level !== "all") params.set("riskLevel", level);
    router.push(`/admin/risk-review${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={department} onValueChange={(v) => push(v ?? "all", riskLevel)}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.code} value={d.code}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={riskLevel} onValueChange={(v) => push(department, v ?? "all")}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk Levels</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="improving">Improving</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="at_risk">At Risk</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
