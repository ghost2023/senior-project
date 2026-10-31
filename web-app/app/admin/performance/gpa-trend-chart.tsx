"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const LINE_OPACITY_STEP = 0.18;

export function GpaTrendChart({
  data,
  departmentCodes,
}: {
  data: Record<string, number | string | null>[];
  departmentCodes: string[];
}) {
  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No terms found.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="term" fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dy={10} fontWeight="bold" />
        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" domain={[0, 4]} fontWeight="bold" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--card-foreground)",
            fontSize: "11px",
          }}
        />
        {departmentCodes.map((code, i) => (
          <Area
            key={code}
            type="monotone"
            dataKey={code}
            stroke={`oklch(from var(--primary) l c h / ${1 - i * LINE_OPACITY_STEP})`}
            strokeWidth={2}
            fillOpacity={0.08}
            fill="var(--primary)"
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
