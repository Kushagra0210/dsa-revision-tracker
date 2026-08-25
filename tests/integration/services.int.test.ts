import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { createRevisionSchedule } from "@/lib/scheduling";
import {
  createProblem,
  deleteProblem,
  getProblem,
  getProblems,
  rescheduleAllProblems,
} from "@/services/problems";
import {
  completeRevision,
  getOverdueRevisions,
  getRevisionForUser,
} from "@/services/revisions";
import { getUserPreferences, updateRevisionSettings } from "@/services/settings";

const TZ = "Asia/Kolkata";

let counter = 0;

async function makeUser(label: string) {
  return prisma.user.create({
    data: {
      email: `test-${label}-${Date.now()}-${counter++}@example.com`,
      passwordHash: "x",
      timezone: TZ,
      revisionSettings: { create: { intervals: [3, 7, 15, 21, 60, 90] } },
    },
    include: { revisionSettings: true },
  });
}

describe("problem & revision services (integration)", () => {
  const createdUserIds: string[] = [];

  async function createUser(label: string) {
    const user = await makeUser(label);
    createdUserIds.push(user.id);
    return user;
  }

  afterEach(async () => {
    await Promise.all(createdUserIds.splice(0).map((id) => prisma.user.delete({ where: { id } })));
  });

  it("generates the full schedule from the user's configured intervals", async () => {
    const user = await createUser("sched");
    const result = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "79",
      title: "Word Search",
      platform: "LEETCODE",
      difficulty: "MEDIUM",
    });
    if (!result.ok) throw new Error(result.message);

    const revisions = await prisma.revisionSchedule.findMany({
      where: { problemId: result.problem.id },
      orderBy: { revisionNumber: "asc" },
    });
    expect(revisions).toHaveLength(6);

    const expected = createRevisionSchedule(
      DateTime.fromJSDate(result.problem.registeredAt).setZone(TZ).toISODate()!,
      [3, 7, 15, 21, 60, 90],
      TZ,
    );
    revisions.forEach((rev, index) => {
      expect(DateTime.fromJSDate(rev.scheduledDate).setZone(TZ).toISODate()).toBe(expected[index].scheduledDate);
      expect(rev.intervalDays).toBe(expected[index].intervalDays);
      expect(rev.status).toBe("SCHEDULED");
    });
  });

  it("prevents duplicate problems per user but allows them across users", async () => {
    const userA = await createUser("dup-a");
    const userB = await createUser("dup-b");

    const first = await createProblem({
      userId: userA.id,
      timezone: TZ,
      problemNumber: "53",
      title: "Maximum Subarray",
    });
    expect(first.ok).toBe(true);

    const duplicate = await createProblem({
      userId: userA.id,
      timezone: TZ,
      problemNumber: "53",
      title: "Maximum Subarray",
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error).toBe("duplicate");

    const other = await createProblem({
      userId: userB.id,
      timezone: TZ,
      problemNumber: "53",
      title: "Maximum Subarray",
    });
    expect(other.ok).toBe(true);
  });

  it("isolates users from each other's data", async () => {
    const owner = await createUser("iso-owner");
    const intruder = await createUser("iso-intruder");

    const created = await createProblem({
      userId: owner.id,
      timezone: TZ,
      problemNumber: "1",
      title: "Two Sum",
    });
    if (!created.ok) throw new Error(created.message);

    expect(await getProblems(intruder.id, {})).toHaveLength(0);
    expect(await getProblem(intruder.id, created.problem.id)).toBeNull();
    expect(await getProblem(owner.id, created.problem.id)).not.toBeNull();

    const revision = created.problem.revisions[0];
    const foreignRevision = await getRevisionForUser(intruder.id, revision.id);
    expect(foreignRevision).toBeNull();

    const completion = await completeRevision(intruder.id, {
      revisionId: revision.id,
      result: "GOOD",
      notes: undefined,
      solutionViewed: false,
    });
    expect(completion.ok).toBe(false);
    if (!completion.ok) expect(completion.error).toBe("UNAUTHORIZED");
  });

  it("completing a revision advances the queue and records history", async () => {
    const user = await createUser("complete");
    const created = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "198",
      title: "House Robber",
      notes: "DP with rolling variables",
    });
    if (!created.ok) throw new Error(created.message);

    const first = await completeRevision(user.id, {
      revisionId: created.problem.revisions[0].id,
      result: "HARD",
      notes: "Forgot the space optimization",
      solutionViewed: true,
    });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.cycleCompleted).toBe(false);

    const stored = await prisma.revisionSchedule.findUniqueOrThrow({
      where: {
        problemId_revisionNumber: {
          problemId: created.problem.id,
          revisionNumber: 1,
        },
      },
    });
    expect(stored.status).toBe("COMPLETED");
    expect(stored.result).toBe("HARD");
    expect(stored.completedAt).not.toBeNull();
    expect(stored.solutionViewed).toBe(true);

    const updatedProblem = await getProblem(user.id, created.problem.id);
    expect(updatedProblem?.revisions[0].status).toBe("COMPLETED");
    expect(updatedProblem?.revisions[1].status).toBe("SCHEDULED");
  });

  it("keeps overdue revisions visible until completed", async () => {
    const user = await createUser("overdue");
    const created = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "5",
      title: "Longest Palindromic Substring",
    });
    if (!created.ok) throw new Error(created.message);

    // force first revision into the past
    const past = new Date(Date.now() - 10 * 86400000);
    await prisma.revisionSchedule.update({
      where: {
        problemId_revisionNumber: {
          problemId: created.problem.id,
          revisionNumber: 1,
        },
      },
      data: { scheduledDate: past },
    });

    const overdue = await getOverdueRevisions(user.id);
    expect(overdue.map((i) => i.revisionId)).toContain(created.problem.revisions[0].id);

    await completeRevision(user.id, {
      revisionId: created.problem.revisions[0].id,
      result: "GOOD",
      notes: undefined,
      solutionViewed: false,
    });
    expect(await getOverdueRevisions(user.id)).toHaveLength(0);
  });

  it("changing settings does not silently alter existing schedules", async () => {
    const user = await createUser("settings");
    const created = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "70",
      title: "Climbing Stairs",
    });
    if (!created.ok) throw new Error(created.message);

    await updateRevisionSettings(user.id, {
      intervals: [1, 3, 7],
      timezone: TZ,
      dailyGoal: 5,
    });

    const preferences = await getUserPreferences(user.id);
    expect(preferences.intervals).toEqual([1, 3, 7]);
    expect(preferences.dailyGoal).toBe(5);

    const untouched = await prisma.revisionSchedule.findMany({
      where: { problemId: created.problem.id },
      orderBy: { revisionNumber: "asc" },
    });
    expect(untouched.map((r) => r.intervalDays)).toEqual([3, 7, 15, 21, 60, 90]);

    const fresh = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "121",
      title: "Best Time to Buy and Sell Stock",
    });
    if (!fresh.ok) throw new Error(fresh.message);
    const freshRevisions = await prisma.revisionSchedule.findMany({
      where: { problemId: fresh.problem.id },
      orderBy: { revisionNumber: "asc" },
    });
    expect(freshRevisions.map((r) => r.intervalDays)).toEqual([1, 3, 7]);

    // explicit opt-in reschedule preserves completed revisions
    await prisma.revisionSchedule.update({
      where: {
        problemId_revisionNumber: {
          problemId: created.problem.id,
          revisionNumber: 1,
        },
      },
      data: { status: "COMPLETED", completedAt: new Date(), result: "EASY" },
    });
    await rescheduleAllProblems(user.id, TZ);

    const rescheduled = await prisma.revisionSchedule.findMany({
      where: { problemId: created.problem.id },
      orderBy: { revisionNumber: "asc" },
    });
    expect(rescheduled.find((r) => r.revisionNumber === 1)?.intervalDays).toBe(3);
    expect(rescheduled.find((r) => r.revisionNumber === 1)?.status).toBe("COMPLETED");
    expect(rescheduled.filter((r) => r.status !== "COMPLETED").map((r) => r.intervalDays)).toEqual([
      3, 7,
    ]);
  });

  it("deleting a problem cascades its revision history", async () => {
    const user = await createUser("delete");
    const created = await createProblem({
      userId: user.id,
      timezone: TZ,
      problemNumber: "206",
      title: "Reverse Linked List",
    });
    if (!created.ok) throw new Error(created.message);

    expect(
      await deleteProblem(user.id, created.problem.id),
    ).toBe(true);
    expect(await prisma.revisionSchedule.count({ where: { problemId: created.problem.id } })).toBe(0);
    expect(await deleteProblem(user.id, created.problem.id)).toBe(false);
  });
});
