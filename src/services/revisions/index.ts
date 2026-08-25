import type { PrismaClient } from "@/generated/prisma/client";
import { DateTime } from "luxon";
import { prisma as defaultDb } from "@/lib/db";
import { localDayBounds, todayIsoDate } from "@/lib/scheduling";
import type { CompleteRevisionInput } from "@/lib/validation/schemas";
import { buildQueueItem } from "@/services/problems";
import type { ProblemView, RevisionQueueItem } from "@/types";

type Db = PrismaClient;

export async function getUserTimezone(userId: string, db: Db = defaultDb): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return user?.timezone ?? "UTC";
}

async function loadQueueProblems(userId: string, db: Db) {
  return db.problem.findMany({
    where: { userId },
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
  });
}

function partition(problems: ProblemView[], timezone: string) {
  const today = todayIsoDate(timezone);
  const bounds = localDayBounds(today, timezone);
  const due: RevisionQueueItem[] = [];
  const overdue: RevisionQueueItem[] = [];

  for (const problem of problems) {
    const item = buildQueueItem(problem, bounds.start, bounds.end);
    if (!item) continue;
    if (item.status === "due_today") due.push(item);
    else overdue.push(item);
  }
  overdue.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  return { today, start: bounds.start, end: bounds.end, due, overdue };
}

export async function getTodayRevisions(userId: string, db: Db = defaultDb): Promise<RevisionQueueItem[]> {
  const problems = await loadQueueProblems(userId, db);
  return partition(problems as unknown as ProblemView[], await getUserTimezone(userId, db)).due;
}

export async function getOverdueRevisions(userId: string, db: Db = defaultDb): Promise<RevisionQueueItem[]> {
  const problems = await loadQueueProblems(userId, db);
  return partition(problems as unknown as ProblemView[], await getUserTimezone(userId, db)).overdue;
}

export async function getRevisionQueue(userId: string, db: Db = defaultDb) {
  const timezone = await getUserTimezone(userId, db);
  const problems = await loadQueueProblems(userId, db);
  const { today, start, end, due, overdue } = partition(problems as unknown as ProblemView[], timezone);
  return { timezone, today, completedToday: countCompletedToday(problems, start, end), due, overdue };
}

export async function getUpcomingRevisions(
  userId: string,
  days = 7,
  db: Db = defaultDb,
): Promise<{ date: string; items: RevisionQueueItem[] }[]> {
  const timezone = await getUserTimezone(userId, db);
  const today = todayIsoDate(timezone);
  const horizon = localDayBounds(today, timezone).end;
  const farFuture = new Date(horizon.getTime() + days * 86400000);

  const problems = await loadQueueProblems(userId, db);
  const buckets = new Map<string, RevisionQueueItem[]>();

  for (const problem of problems) {
    for (const rev of problem.revisions) {
      if (rev.status === "COMPLETED" || rev.status === "SKIPPED") continue;
      if (rev.scheduledDate <= horizon || rev.scheduledDate > farFuture) continue;
      const iso = rev.scheduledDate.toISOString().slice(0, 10);
      const list = buckets.get(iso) ?? [];
      list.push({
        revisionId: rev.id,
        problemId: problem.id,
        problemNumber: problem.problemNumber,
        title: problem.title,
        platform: problem.platform,
        difficulty: problem.difficulty,
        topic: problem.topic,
        url: problem.url,
        solutionUrl: problem.solutionUrl,
        notes: problem.notes,
        revisionNumber: rev.revisionNumber,
        totalRevisions: problem.revisions.length,
        intervalDays: rev.intervalDays,
        scheduledDate: rev.scheduledDate,
        status: "upcoming",
      });
      buckets.set(iso, list);
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}

export async function getUpcomingCount(userId: string, db: Db = defaultDb): Promise<{ tomorrow: number; next7Days: number }> {
  const timezone = await getUserTimezone(userId, db);
  const today = todayIsoDate(timezone);
  const upcoming = await getUpcomingRevisions(userId, 7, db);
  const tomorrowIso = DateTime.fromISO(today, { zone: timezone }).plus({ days: 1 }).toISODate()!;
  return {
    tomorrow: upcoming.find((b) => b.date === tomorrowIso)?.items.length ?? 0,
    next7Days: upcoming.reduce((sum, b) => sum + b.items.length, 0),
  };
}

export async function getRevisionForUser(userId: string, revisionId: string, db: Db = defaultDb) {
  const revision = await db.revisionSchedule.findFirst({
    where: { id: revisionId },
    include: {
      problem: { include: { revisions: { orderBy: { revisionNumber: "asc" } } } },
    },
  });
  if (!revision || revision.problem.userId !== userId) return null;
  return revision;
}

export async function completeRevision(
  userId: string,
  input: CompleteRevisionInput,
  db: Db = defaultDb,
): Promise<{ ok: true; cycleCompleted: boolean } | { ok: false; error: string }> {
  const revision = await db.revisionSchedule.findFirst({
    where: { id: input.revisionId, status: { not: "COMPLETED" } },
    include: { problem: { select: { id: true, userId: true } } },
  });
  if (!revision) return { ok: false, error: "Revision not found" };
  if (revision.problem.userId !== userId) return { ok: false, error: "UNAUTHORIZED" };

  await db.revisionSchedule.update({
    where: { id: revision.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result: input.result,
      notes: input.notes ?? null,
      timeSpentSec: input.timeSpentSec ?? null,
      solutionViewed: input.solutionViewed,
    },
  });

  const remaining = await db.revisionSchedule.count({
    where: { problemId: revision.problemId, status: { notIn: ["COMPLETED", "SKIPPED"] } },
  });

  return { ok: true, cycleCompleted: remaining === 0 };
}

export async function markSolutionViewed(revisionId: string, userId: string, db: Db = defaultDb): Promise<boolean> {
  const revision = await db.revisionSchedule.findFirst({
    where: { id: revisionId },
    include: { problem: { select: { userId: true } } },
  });
  if (!revision || revision.problem.userId !== userId) return false;
  await db.revisionSchedule.update({ where: { id: revisionId }, data: { solutionViewed: true } });
  return true;
}

export async function getRevisionHistory(userId: string, limit = 100, db: Db = defaultDb) {
  return db.revisionSchedule.findMany({
    where: { status: "COMPLETED", problem: { userId } },
    include: { problem: { select: { id: true, title: true, problemNumber: true, platform: true } } },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}

function countCompletedToday(
  problems: { revisions: { status: string; completedAt: Date | null }[] }[],
  start: Date,
  end: Date,
): number {
  let count = 0;
  for (const problem of problems) {
    for (const rev of problem.revisions) {
      if (
        rev.status === "COMPLETED" &&
        rev.completedAt &&
        rev.completedAt >= start &&
        rev.completedAt <= end
      ) {
        count += 1;
      }
    }
  }
  return count;
}
