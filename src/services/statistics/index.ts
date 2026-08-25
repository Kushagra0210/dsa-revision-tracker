import type { PrismaClient } from "@/generated/prisma/client";
import { DateTime, IANAZone } from "luxon";
import { prisma as defaultDb } from "@/lib/db";
import { localDayBounds, todayIsoDate } from "@/lib/scheduling";
import {
  buildQueueItem,
  isCycleComplete,
} from "@/services/problems";
import { getUserTimezone } from "@/services/revisions";

type Db = PrismaClient;

export type StatisticsResult = {
  totalProblems: number;
  inRevision: number;
  completedCycles: number;
  completedRevisions: number;
  todayCompleted: number;
  todayDueRemaining: number;
  overdueCount: number;
  recall: { FORGOT: number; HARD: number; GOOD: number; EASY: number };
  revisedThisWeek: number;
  revisedThisMonth: number;
  addedThisWeek: number;
  streak: { current: number; longest: number };
};

export async function getStatistics(userId: string, db: Db = defaultDb): Promise<StatisticsResult> {
  const timezone = await getUserTimezone(userId, db);
  const today = todayIsoDate(timezone);
  const bounds = localDayBounds(today, timezone);
  const now = DateTime.now().setZone(timezone);

  const problems = await db.problem.findMany({
    where: { userId },
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
  });

  let totalProblems = 0;
  let inRevision = 0;
  let completedCycles = 0;
  let completedRevisions = 0;
  let todayCompleted = 0;
  let overdueCount = 0;
  let dueRemaining = 0;

  const recall = { FORGOT: 0, HARD: 0, GOOD: 0, EASY: 0 };

  for (const problem of problems) {
    totalProblems += 1;
    if (isCycleComplete(problem as never)) completedCycles += 1;
    else inRevision += 1;

    for (const rev of problem.revisions) {
      if (rev.status === "COMPLETED") {
        completedRevisions += 1;
        if (rev.result && rev.result in recall) {
          recall[rev.result as keyof typeof recall] += 1;
        }
        if (rev.completedAt && rev.completedAt >= bounds.start && rev.completedAt <= bounds.end) {
          todayCompleted += 1;
        }
      } else if (rev.scheduledDate < bounds.start) {
        overdueCount += 1;
      }
    }

    const queueItem = buildQueueItem(problem as never, bounds.start, bounds.end);
    if (queueItem) dueRemaining += 1;
  }

  const weekStart = now.minus({ days: (now.weekday + 6) % 7 }).startOf("day");
  const monthStart = now.startOf("month");
  let revisedThisWeek = 0;
  let revisedThisMonth = 0;
  for (const problem of problems) {
    for (const rev of problem.revisions) {
      if (rev.status !== "COMPLETED" || !rev.completedAt) continue;
      const at = DateTime.fromJSDate(rev.completedAt).setZone(timezone);
      if (at >= weekStart) revisedThisWeek += 1;
      if (at >= monthStart) revisedThisMonth += 1;
    }
  }

  const addedThisWeek = problems.filter(
    (p) => DateTime.fromJSDate(p.registeredAt).setZone(timezone) >= weekStart,
  ).length;

  return {
    totalProblems,
    inRevision,
    completedCycles,
    completedRevisions,
    todayCompleted,
    todayDueRemaining: Math.max(dueRemaining - overdueCount, 0),
    overdueCount,
    recall,
    revisedThisWeek,
    revisedThisMonth,
    addedThisWeek,
    streak: await getStreak(userId, db),
  };
}

/** A day counts toward the streak when the user completes at least one revision that day. */
export async function getStreak(
  userId: string,
  db: Db = defaultDb,
): Promise<{ current: number; longest: number }> {
  const timezone = await getUserTimezone(userId, db);
  if (!IANAZone.isValidZone(timezone)) return { current: 0, longest: 0 };

  const revisions = await db.revisionSchedule.findMany({
    where: { status: "COMPLETED", completedAt: { not: null }, problem: { userId } },
    select: { completedAt: true },
  });

  if (!revisions.length) return { current: 0, longest: 0 };

  const days = new Set(
    revisions.map((r) => DateTime.fromJSDate(r.completedAt!).setZone(timezone).toISODate()!),
  );
  const sorted = [...days].sort();

  // longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = DateTime.fromISO(sorted[i - 1], { zone: timezone });
    const curr = DateTime.fromISO(sorted[i], { zone: timezone });
    run = curr.diff(prev, "days").days === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak: counts back from today (or yesterday if nothing yet today)
  const todayIso = todayIsoDate(timezone);
  let cursor = days.has(todayIso)
    ? DateTime.fromISO(todayIso, { zone: timezone })
    : DateTime.fromISO(todayIso, { zone: timezone }).minus({ days: 1 });
  let current = 0;
  while (days.has(cursor.toISODate()!)) {
    current += 1;
    cursor = cursor.minus({ days: 1 });
  }

  return { current, longest };
}

export async function getCalendarMonth(
  userId: string,
  year: number,
  month: number,
  db: Db = defaultDb,
): Promise<{
  year: number;
  month: number;
  days: {
    date: string;
    scheduled: number;
    completed: number;
    titles: string[];
  }[];
}> {
  const timezone = await getUserTimezone(userId, db);
  const gridStart = DateTime.fromObject({ year, month }, { zone: timezone });
  const first = gridStart.startOf("month");
  const last = gridStart.endOf("month");

  const problems = await db.problem.findMany({
    where: { userId },
    include: { revisions: true },
  });

  const map = new Map<string, { scheduled: number; completed: number; titles: Set<string> }>();

  const bucketFor = (iso: string) => {
    const entry = map.get(iso) ?? { scheduled: 0, completed: 0, titles: new Set<string>() };
    map.set(iso, entry);
    return entry;
  };

  for (const problem of problems) {
    for (const rev of problem.revisions) {
      const localDate = DateTime.fromJSDate(rev.scheduledDate).setZone(timezone);
      if (localDate < first.minus({ days: 6 }) || localDate > last.plus({ days: 6 })) continue;
      const iso = localDate.toISODate()!;
      const entry = bucketFor(iso);
      if (rev.status === "COMPLETED") entry.completed += 1;
      else entry.scheduled += 1;
      entry.titles.add(`${problem.problemNumber}. ${problem.title}`);
    }
  }

  const days: {
    date: string;
    scheduled: number;
    completed: number;
    titles: string[];
  }[] = [];

  // pad to full weeks (start Monday)
  const startOffset = (first.weekday + 6) % 7;
  for (let i = -startOffset; i < first.daysInMonth! + ((last.weekday + 6) % 7 === 6 ? 0 : 7 - ((last.weekday + 6) % 7)); i += 1) {
    const day = first.plus({ days: i });
    const iso = day.toISODate()!;
    const entry = map.get(iso);
    days.push({
      date: iso,
      scheduled: entry?.scheduled ?? 0,
      completed: entry?.completed ?? 0,
      titles: entry ? [...entry.titles] : [],
    });
  }

  return { year, month, days };
}
