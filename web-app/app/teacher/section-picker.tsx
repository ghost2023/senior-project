"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SectionOption {
  id: string;
  label: string;
}

export function SectionPicker({
  basePath,
  options,
  value,
}: {
  basePath: string;
  options: SectionOption[];
  value: string;
}) {
  const router = useRouter();
  return (
    <Select value={value} onValueChange={(v) => router.push(`${basePath}?section=${v}`)}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a section" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
