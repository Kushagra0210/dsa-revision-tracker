"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProblemAction, updateProblemAction } from "@/app/actions/problems";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { ActionResult } from "@/types";

export type EditableProblem = {
  id: string;
  problemNumber: string;
  title: string;
  platform: string;
  difficulty: string | null;
  topic: string | null;
  url: string | null;
  solutionUrl: string | null;
  notes: string | null;
};

export function ProblemActions({ problem }: { problem: EditableProblem }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await updateProblemAction(prev, formData);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
      return result;
    },
    { ok: false as const, error: "" },
  );

  async function onDelete() {
    if (!confirm("Delete this problem and its entire revision history?")) return;
    const result = await deleteProblemAction(problem.id);
    if (result.ok) {
      router.push("/problems");
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-3 rounded-md border p-4">
      <input type="hidden" name="id" value={problem.id} />
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="edit-number">#</Label>
          <Input id="edit-number" name="problemNumber" defaultValue={problem.problemNumber} required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" name="title" defaultValue={problem.title} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="edit-platform">Platform</Label>
          <Select id="edit-platform" name="platform" defaultValue={problem.platform}>
            <option value="LEETCODE">LeetCode</option>
            <option value="CODEFORCES">Codeforces</option>
            <option value="HACKERRANK">HackerRank</option>
            <option value="GEEKSFORGEEKS">GeeksforGeeks</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="edit-difficulty">Difficulty</Label>
          <Select id="edit-difficulty" name="difficulty" defaultValue={problem.difficulty ?? ""}>
            <option value="">—</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-topic">Topic</Label>
        <Input id="edit-topic" name="topic" defaultValue={problem.topic ?? ""} placeholder="Array" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-url">Problem URL</Label>
        <Input id="edit-url" name="url" type="url" defaultValue={problem.url ?? ""} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-solution">Solution URL</Label>
        <Input id="edit-solution" name="solutionUrl" type="url" defaultValue={problem.solutionUrl ?? ""} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea id="edit-notes" name="notes" defaultValue={problem.notes ?? ""} />
      </div>
      {state.ok === false && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
