import { Prisma } from "@/generated/prisma/client";
import { Platform, Difficulty } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import {
  createRevisionSchedule,
  localDayBounds,
  scheduledDateToUtc,
} from "@/lib/scheduling";
import type {
  EffectiveStatus,
  ProblemView,
  RevisionQueueItem,
} from "@/types";

type Db = PrismaClient;

export async function getUserIntervals(userId: string, db: Db = defaultDb): Promise<number[]> {
  const settings = await db.revisionSettings.findUnique({ where: { userId } });
  return settings?.intervals ?? [3, 7, 15, 21, 60, 90];
}

export type CreateProblemParams = {
  userId: string;
  timezone: string;
  problemNumber: string;
  title: string;
  platform?: string;
  difficulty?: string | null;
  topic?: string | null;
  url?: string | null;
  solutionUrl?: string | null;
  notes?: string | null;
};

export type CreateProblemResult =
  | { ok: true; problem: ProblemView }
  | { ok: false; error: "duplicate"; message: string; existingId?: string };

export async function createProblem(
  params: CreateProblemParams,
  db: Db = defaultDb,
): Promise<CreateProblemResult> {
  const intervals = await getUserIntervals(params.userId, db);
  const now = new Date();
  const slots = createRevisionSchedule(now, intervals, params.timezone);

  try {
    const problem = await db.problem.create({
      data: {
        userId: params.userId,
        problemNumber: params.problemNumber,
        title: params.title,
        platform: toPlatformEnum(params.platform),
        difficulty: toDifficultyEnumOrNull(params.difficulty),
        topic: params.topic ?? null,
        url: params.url ?? null,
        solutionUrl: params.solutionUrl ?? null,
        notes: params.notes ?? null,
        tags: [],
        registeredAt: now,
        revisions: {
          create: slots.map((slot) => ({
            revisionNumber: slot.revisionNumber,
            intervalDays: slot.intervalDays,
            scheduledDate: scheduledDateToUtc(slot.scheduledDate, params.timezone),
          })),
        },
      },
      include: { revisions: { orderBy: { revisionNumber: "asc" } } },
    });
    return { ok: true, problem: toProblemView(problem) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.problem.findFirst({
        where: {
          userId: params.userId,
          platform: toPlatformEnum(params.platform),
          problemNumber: params.problemNumber,
        },
        select: { id: true },
      });
      return {
        ok: false,
        error: "duplicate",
        message: `You already registered ${params.platform ?? "this platform"} problem #${params.problemNumber}.`,
        existingId: existing?.id,
      };
    }
    throw error;
  }
}

export type ProblemFilters = {
  search?: string;
  platform?: string;
  difficulty?: string;
  topic?: string;
  status?: string;
  sort?: "registered" | "nextRevision" | "difficulty";
  dir?: "asc" | "desc";
};

export async function getProblems(
  userId: string,
  filters: ProblemFilters,
  db: Db = defaultDb,
): Promise<ProblemView[]> {
  const where: Prisma.ProblemWhereInput = { userId };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { problemNumber: { contains: filters.search, mode: "insensitive" } },
      { topic: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.platform && filters.platform !== "ALL") where.platform = toPlatformEnum(filters.platform);
  if (filters.difficulty && filters.difficulty !== "ALL") where.difficulty = toDifficultyEnumOrNull(filters.difficulty);
  if (filters.topic && filters.topic !== "ALL") where.topic = filters.topic;

  let orderBy: Prisma.ProblemOrderByWithRelationInput;
  switch (filters.sort) {
    case "difficulty":
      orderBy = { difficulty: filters.dir === "desc" ? "desc" : "asc" };
      break;
    case "nextRevision":
      orderBy = { revisions: { _count: filters.dir === "desc" ? "desc" : "asc" } };
      break;
    default:
      orderBy = { registeredAt: filters.dir === "asc" ? "asc" : "desc" };
  }

  const problems = await db.problem.findMany({
    where,
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
    orderBy,
  });

  let views = problems.map(toProblemView);

  if (filters.status && filters.status !== "ALL") {
    const todayBounds = localDayBounds(new Date(), "UTC");
    views = views.filter((problem) => {
      const next = nextRevisionOf(problem);
      switch (filters.status) {
        case "COMPLETED":
          return isCycleComplete(problem);
        case "DUE":
          return next !== null && effectiveStatus(next.status, next.scheduledDate, todayBounds.start, todayBounds.end) === "due_today";
        case "OVERDUE":
          return problem.revisions.some(
            (r) => r.status !== "COMPLETED" && r.scheduledDate < todayBounds.start,
          );
        case "IN_PROGRESS":
          return !isCycleComplete(problem);
        default:
          return true;
      }
    });
  }

  if (filters.sort === "nextRevision") {
    views.sort((a, b) => {
      const an = nextRevisionOf(a)?.scheduledDate.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bn = nextRevisionOf(b)?.scheduledDate.getTime() ?? Number.MAX_SAFE_INTEGER;
      return filters.dir === "desc" ? bn - an : an - bn;
    });
  }

  return views;
}

export async function getProblem(userId: string, id: string, db: Db = defaultDb): Promise<ProblemView | null> {
  const problem = await db.problem.findFirst({
    where: { id, userId },
    include: {
      revisions: { orderBy: { revisionNumber: "asc" } },
    },
  });
  return problem ? toProblemView(problem) : null;
}

export type UpdateProblemParams = {
  id: string;
  title?: string;
  platform?: string;
  difficulty?: string | null;
  topic?: string | null;
  url?: string | null;
  solutionUrl?: string | null;
  notes?: string | null;
  tags?: string[];
};

export async function updateProblem(
  userId: string,
  params: UpdateProblemParams,
  db: Db = defaultDb,
): Promise<ProblemView | null> {
  const existing = await db.problem.findFirst({ where: { id: params.id, userId } });
  if (!existing) return null;

  const updated = await db.problem.update({
    where: { id: existing.id },
    data: {
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.platform !== undefined ? { platform: toPlatformEnum(params.platform) } : {}),
      ...(params.difficulty !== undefined ? { difficulty: toDifficultyEnumOrNull(params.difficulty) } : {}),
      ...(params.topic !== undefined ? { topic: params.topic } : {}),
      ...(params.url !== undefined ? { url: params.url } : {}),
      ...(params.solutionUrl !== undefined ? { solutionUrl: params.solutionUrl } : {}),
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.tags !== undefined ? { tags: params.tags } : {}),
    },
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
  });
  return toProblemView(updated);
}

export async function deleteProblem(userId: string, id: string, db: Db = defaultDb): Promise<boolean> {
  const existing = await db.problem.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return false;
  await db.problem.delete({ where: { id: existing.id } });
  return true;
}

/** Rebuilds pending revision schedules for every problem of the user using their current
 * interval configuration. Completed revisions are preserved. Explicit user action only. */
export async function rescheduleAllProblems(userId: string, timezone: string, db: Db = defaultDb): Promise<number> {
  const intervals = await getUserIntervals(userId, db);
  const problems = await db.problem.findMany({
    where: { userId },
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
  });

  let changed = 0;
  for (const problem of problems) {
    const slots = createRevisionSchedule(problem.registeredAt, intervals, timezone);
    const completedNumbers = new Set(
      problem.revisions.filter((r) => r.status === "COMPLETED").map((r) => r.revisionNumber),
    );
    await db.$transaction(async (tx) => {
      for (const slot of slots) {
        if (completedNumbers.has(slot.revisionNumber)) continue;
        const scheduledDate = scheduledDateToUtc(slot.scheduledDate, timezone);
        await tx.revisionSchedule.upsert({
          where: { problemId_revisionNumber: { problemId: problem.id, revisionNumber: slot.revisionNumber } },
          create: {
            problemId: problem.id,
            revisionNumber: slot.revisionNumber,
            intervalDays: slot.intervalDays,
            scheduledDate,
          },
          update: { intervalDays: slot.intervalDays, scheduledDate },
        });
      }
      // drop pending revisions beyond the new schedule length
      const keepNumbers = new Set(slots.map((s) => s.revisionNumber));
      for (const rev of problem.revisions) {
        if (!keepNumbers.has(rev.revisionNumber) && rev.status !== "COMPLETED") {
          await tx.revisionSchedule.delete({ where: { id: rev.id } });
        }
      }
    });
    changed += 1;
  }
  return changed;
}

// ---------- shared helpers ----------

export function toProblemView(problem: {
  id: string;
  problemNumber: string;
  title: string;
  platform: string;
  url: string | null;
  difficulty: string | null;
  topic: string | null;
  notes: string | null;
  solutionUrl: string | null;
  tags: string[];
  registeredAt: Date;
  revisions: {
    id: string;
    revisionNumber: number;
    intervalDays: number;
    scheduledDate: Date;
    status: string;
    completedAt: Date | null;
    result: string | null;
    notes: string | null;
    timeSpentSec: number | null;
    solutionViewed: boolean;
  }[];
}): ProblemView {
  return { ...problem };
}

export function nextRevisionOf(problem: ProblemView) {
  return problem.revisions.find((r) => r.status !== "COMPLETED" && r.status !== "SKIPPED") ?? null;
}

export function isCycleComplete(problem: ProblemView): boolean {
  return problem.revisions.length > 0 && problem.revisions.every((r) => r.status === "COMPLETED");
}

export function effectiveStatus(
  storedStatus: string,
  scheduledDate: Date,
  todayStart: Date,
  todayEnd: Date,
): EffectiveStatus {
  if (storedStatus === "COMPLETED" || storedStatus === "SKIPPED") return "completed";
  if (scheduledDate < todayStart) return "overdue";
  if (scheduledDate <= todayEnd) return "due_today";
  return "upcoming";
}

export function buildQueueItem(problem: ProblemView, todayStart: Date, todayEnd: Date): RevisionQueueItem | null {
  const next = nextRevisionOf(problem);
  if (!next) return null;
  const status = effectiveStatus(next.status, next.scheduledDate, todayStart, todayEnd);
  if (status === "upcoming" || status === "completed") return null;
  return {
    revisionId: next.id,
    problemId: problem.id,
    problemNumber: problem.problemNumber,
    title: problem.title,
    platform: problem.platform,
    difficulty: problem.difficulty,
    topic: problem.topic,
    url: problem.url,
    solutionUrl: problem.solutionUrl,
    notes: problem.notes,
    revisionNumber: next.revisionNumber,
    totalRevisions: problem.revisions.length,
    intervalDays: next.intervalDays,
    scheduledDate: next.scheduledDate,
    status,
  };
}

function toPlatformEnum(value: string | undefined | null): Platform {
  return (Platform as Record<string, Platform>)[value ?? ""] ?? Platform.LEETCODE;
}

function toDifficultyEnumOrNull(value: string | undefined | null): Difficulty | null {
  if (!value) return null;
  return (Difficulty as Record<string, Difficulty>)[value] ?? null;
}
