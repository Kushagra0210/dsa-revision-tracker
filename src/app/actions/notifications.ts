"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/app/actions/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/types";

const prefsSchema = z.object({
  notifyEmail: z.boolean(),
  reminderHour: z.coerce.number().int().min(0).max(23),
});

export async function updateNotificationPrefsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const userId = (await requireSession()).user.id;

  const parsed = prefsSchema.safeParse({
    notifyEmail: formData.get("notifyEmail") === "on" || formData.get("notifyEmail") === "true",
    reminderHour: formData.get("reminderHour"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      notifyEmail: parsed.data.notifyEmail,
      reminderHour: parsed.data.reminderHour,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}
