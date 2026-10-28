"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SectionComparisonChart({ data }: { data: { name: string; mean: number }[] }) {
  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No graded sections yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontWeight="bold" />
        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" domain={[0, 100]} />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.1 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--card-foreground)",
            fontSize: "11px",
          }}
        />
        <Bar dataKey="mean" radius={[8, 8, 0, 0]} barSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={`oklch(from var(--primary) l c h / ${1 - i * 0.12})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
