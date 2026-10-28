"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function GpaTrendChart({ data }: { data: { name: string; gpa: number }[] }) {
  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No graded terms yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dy={10} fontWeight="bold" />
        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" domain={[0, 4]} fontWeight="bold" />
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 2 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--card-foreground)",
            fontSize: "11px",
          }}
        />
        <Line
          type="monotone"
          dataKey="gpa"
          stroke="var(--primary)"
          strokeWidth={3}
          dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "var(--primary)", strokeWidth: 4, stroke: "var(--background)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
