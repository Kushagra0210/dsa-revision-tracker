import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import { validateIntervals } from "@/lib/scheduling";
import type { RevisionSettingsInput } from "@/lib/validation/schemas";

type Db = PrismaClient;

export async function getRevisionSettings(userId: string, db: Db = defaultDb) {
  const settings = await db.revisionSettings.findUnique({ where: { userId } });
  if (settings) return settings;
  return db.revisionSettings.create({ data: { userId, intervals: [3, 7, 15, 21, 60, 90] } });
}

export type UserPreferences = {
  intervals: number[];
  timezone: string;
  dailyGoal: number;
};

export async function getUserPreferences(userId: string, db: Db = defaultDb): Promise<UserPreferences> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { revisionSettings: true },
  });
  if (!user) throw new Error("User not found");
  return {
    intervals: user.revisionSettings?.intervals ?? [3, 7, 15, 21, 60, 90],
    timezone: user.timezone,
    dailyGoal: user.dailyGoal,
  };
}

/** Changing settings never silently alters existing schedules; callers may
 * follow up with rescheduleAllProblems() as an explicit user action. */
export async function updateRevisionSettings(
  userId: string,
  input: RevisionSettingsInput,
  db: Db = defaultDb,
): Promise<UserPreferences> {
  const intervals = validateIntervals(input.intervals);
  const settings = await getRevisionSettings(userId, db);
  await db.revisionSettings.update({ where: { id: settings.id }, data: { intervals } });
  const user = await db.user.update({
    where: { id: userId },
    data: { timezone: input.timezone, dailyGoal: input.dailyGoal },
    include: { revisionSettings: true },
  });
  if (!user.revisionSettings) throw new Error("Failed to update settings");
  return {
    intervals: user.revisionSettings.intervals,
    timezone: user.timezone,
    dailyGoal: user.dailyGoal,
  };
}
