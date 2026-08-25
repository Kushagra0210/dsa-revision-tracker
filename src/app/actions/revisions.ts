"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/app/actions/auth";
import { completeRevisionSchema } from "@/lib/validation/schemas";
import { completeRevision, markSolutionViewed } from "@/services/revisions";
import type { ActionResult } from "@/types";

export async function completeRevisionAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ cycleCompleted: boolean; nextUrl?: string }>> {
  const userId = (await requireSession()).user.id;

  const parsed = completeRevisionSchema.safeParse({
    revisionId: formData.get("revisionId"),
    result: formData.get("result"),
    notes: formData.get("notes") ?? undefined,
    solutionViewed: formData.get("solutionViewed") === "true",
    timeSpentSec: formData.get("timeSpentSec")
      ? Number(formData.get("timeSpentSec"))
      : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await completeRevision(userId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error === "UNAUTHORIZED" ? "Not authorized" : result.error };

  revalidatePath("/dashboard");
  revalidatePath("/problems");
  revalidatePath("/statistics");
  return { ok: true, data: { cycleCompleted: result.cycleCompleted } };
}

export async function markSolutionViewedAction(revisionId: string): Promise<ActionResult> {
  const userId = (await requireSession()).user.id;
  const ok = await markSolutionViewed(revisionId, userId);
  return ok ? { ok: true } : { ok: false, error: "Revision not found" };
}
