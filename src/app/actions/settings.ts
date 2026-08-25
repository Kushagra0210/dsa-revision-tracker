"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/app/actions/auth";
import { revisionSettingsSchema } from "@/lib/validation/schemas";
import { rescheduleAllProblems } from "@/services/problems";
import { getUserPreferences, updateRevisionSettings } from "@/services/settings";
import type { ActionResult } from "@/types";

export async function saveSettingsAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const userId = (await requireSession()).user.id;

  const intervalsRaw = String(formData.get("intervals") ?? "");
  const intervals = intervalsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number);

  const parsed = revisionSettingsSchema.safeParse({
    intervals,
    timezone: formData.get("timezone"),
    dailyGoal: formData.get("dailyGoal"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateRevisionSettings(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save settings" };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Explicit opt-in: rebuilds pending revisions of existing problems with the new intervals. */
export async function rescheduleExistingAction(): Promise<ActionResult<{ problemsUpdated: number }>> {
  const userId = (await requireSession()).user.id;
  const preferences = await getUserPreferences(userId);
  const count = await rescheduleAllProblems(userId, preferences.timezone);
  revalidatePath("/dashboard");
  revalidatePath("/problems");
  revalidatePath("/calendar");
  return { ok: true, data: { problemsUpdated: count } };
}
