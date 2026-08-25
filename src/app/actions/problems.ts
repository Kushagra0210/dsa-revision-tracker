"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/app/actions/auth";
import {
  createProblem,
  deleteProblem,
  updateProblem,
} from "@/services/problems";
import { getUserPreferences } from "@/services/settings";
import { createProblemSchema, updateProblemSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/types";

function formToObject(formData: FormData): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") object[key] = value;
  }
  return object;
}

export async function addProblemAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ problemId: string; nextRevisionDate: string | null }>> {
  const userId = (await requireSession()).user.id;

  const parsed = createProblemSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const preferences = await getUserPreferences(userId);
  const result = await createProblem({ userId, timezone: preferences.timezone, ...parsed.data });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/problems");
  const next = result.problem.revisions[0];
  return {
    ok: true,
    data: {
      problemId: result.problem.id,
      nextRevisionDate: next ? next.scheduledDate.toISOString().slice(0, 10) : null,
    },
  };
}

export async function updateProblemAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const userId = (await requireSession()).user.id;
  const id = String(formData.get("id") ?? "");

  const raw = formToObject(formData);
  const tagsRaw = formData.get("tags");
  const parsed = updateProblemSchema.safeParse({
    ...raw,
    tags: typeof tagsRaw === "string" && tagsRaw.trim()
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!id) return { ok: false, error: "Missing problem id" };

  const updated = await updateProblem(userId, { id, ...parsed.data });
  if (!updated) return { ok: false, error: "Problem not found" };

  revalidatePath("/problems");
  revalidatePath(`/problems/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProblemAction(id: string): Promise<ActionResult> {
  const userId = (await requireSession()).user.id;
  const deleted = await deleteProblem(userId, id);
  if (!deleted) return { ok: false, error: "Problem not found" };
  revalidatePath("/problems");
  revalidatePath("/dashboard");
  return { ok: true };
}
