"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleExistingAction, saveSettingsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { ActionResult } from "@/types";

export function SettingsForm({
  intervals,
  timezone,
  dailyGoal,
}: {
  intervals: number[];
  timezone: string;
  dailyGoal: number;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveSettingsAction,
    { ok: false as const, error: "" },
  );
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSaved(false);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="intervals">Revision intervals (days, comma-separated)</Label>
        <Input id="intervals" name="intervals" defaultValue={intervals.join(", ")} required />
        <p className="text-[11px] text-muted-foreground">
          Default: 3, 7, 15, 21, 60, 90. New problems use these immediately; existing schedules are untouched.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={timezone} placeholder="Asia/Kolkata" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="dailyGoal">Daily revision goal</Label>
        <Input id="dailyGoal" name="dailyGoal" type="number" min={1} max={200} defaultValue={dailyGoal} />
      </div>
      {state.ok === false && state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.ok && saved && <p className="text-xs text-success">Settings saved ✓</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending} onClick={() => setTimeout(() => setSaved(true), 100)}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

export function RescheduleButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Rebuild the pending revision schedule of every existing problem using your current intervals? Completed revisions are kept.")) {
            return;
          }
          startTransition(async () => {
            const res = await rescheduleExistingAction();
            if (res.ok && res.data) {
              setResult(`Rescheduled ${res.data.problemsUpdated} problem(s) ✓`);
              router.refresh();
            } else if (!res.ok) {
              setResult(res.error);
            }
          });
        }}
      >
        {pending ? "Rescheduling…" : "Apply new intervals to existing problems"}
      </Button>
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
    </div>
  );
}
