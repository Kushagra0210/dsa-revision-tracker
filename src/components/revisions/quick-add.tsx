"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addProblemAction } from "@/app/actions/problems";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import type { ActionResult } from "@/types";

type AddResult = ActionResult<{ problemId: string; nextRevisionDate: string | null }>;

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<{ nextRevisionDate: string | null } | null>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [state, formAction, pending] = useActionState<AddResult, FormData>(
    async (prev, formData) => {
      const result = await addProblemAction(prev, formData);
      if (result.ok && result.data) {
        setSaved({ nextRevisionDate: result.data.nextRevisionDate });
        router.refresh();
      }
      return result;
    },
    { ok: false as const, error: "" },
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        setSaved(null);
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => numberRef.current?.focus(), 30);
  }, [open]);

  if (!open) {
    return (
      <Button onClick={() => { setSaved(null); setOpen(true); }}>
        <Plus className="size-4" /> Add Problem
        <kbd className="ml-2 rounded bg-primary-foreground/15 px-1 text-[10px] font-mono">A</kbd>
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg">
        {saved ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Problem Added ✓</p>
            <p className="text-sm text-muted-foreground">
              Next revision:{" "}
              <span className="font-medium text-foreground">{saved.nextRevisionDate ?? "—"}</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setSaved(null); setOpen(false); }}>
                Add another
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold">Quick Add Problem</h2>
            <form action={formAction} className="flex flex-col gap-3">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="qa-number">#</Label>
                  <Input id="qa-number" name="problemNumber" ref={numberRef} placeholder="79" required />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="qa-title">Title</Label>
                  <Input id="qa-title" name="title" placeholder="Word Search" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="qa-platform">Platform</Label>
                  <Select id="qa-platform" name="platform" defaultValue="LEETCODE">
                    <option value="LEETCODE">LeetCode</option>
                    <option value="CODEFORCES">Codeforces</option>
                    <option value="HACKERRANK">HackerRank</option>
                    <option value="GEEKSFORGEEKS">GeeksforGeeks</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="qa-difficulty">Difficulty (optional)</Label>
                  <Select id="qa-difficulty" name="difficulty" defaultValue="">
                    <option value="">—</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Revisions are scheduled automatically at +3/+7/+15/+21/+60/+90 days.
              </div>
              {state.ok === false && <p className="text-xs text-danger">{state.error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
