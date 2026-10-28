"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNoteAction } from "./actions";

export function NoteForm({ studentId, sectionId }: { studentId: string; sectionId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const note = inputRef.current?.value.trim();
        if (!note) return;
        startTransition(async () => {
          await addNoteAction({ studentId, sectionId, note });
          if (inputRef.current) inputRef.current.value = "";
        });
      }}
    >
      <Input ref={inputRef} placeholder="Add a note for future reference..." className="text-xs" />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Add"}
      </Button>
    </form>
  );
}
