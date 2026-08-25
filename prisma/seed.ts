/**
 * Development seed: creates a demo user with realistic revision schedules.
 * Run with: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createRevisionSchedule } from "../src/lib/scheduling";

const TZ = "Asia/Kolkata";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_EMAIL = "dev@dsarevise.app";
const DEMO_PASSWORD = "password123";

type SeedProblem = {
  problemNumber: string;
  title: string;
  platform: string;
  difficulty: string;
  topic: string;
  /** how many days ago the problem was solved & registered */
  solvedDaysAgo: number;
  url?: string;
};

const PROBLEMS: SeedProblem[] = [
  { problemNumber: "1", title: "Two Sum", platform: "LEETCODE", difficulty: "EASY", topic: "Hash Table", solvedDaysAgo: 30, url: "https://leetcode.com/problems/two-sum/" },
  { problemNumber: "121", title: "Best Time to Buy and Sell Stock", platform: "LEETCODE", difficulty: "EASY", topic: "Dynamic Programming", solvedDaysAgo: 22, url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
  { problemNumber: "3", title: "Longest Substring Without Repeating Characters", platform: "LEETCODE", difficulty: "MEDIUM", topic: "Sliding Window", solvedDaysAgo: 16, url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
  { problemNumber: "53", title: "Maximum Subarray", platform: "LEETCODE", difficulty: "MEDIUM", topic: "Dynamic Programming", solvedDaysAgo: 9, url: "https://leetcode.com/problems/maximum-subarray/" },
  { problemNumber: "79", title: "Word Search", platform: "LEETCODE", difficulty: "MEDIUM", topic: "Backtracking", solvedDaysAgo: 4, url: "https://leetcode.com/problems/word-search/" },
  { problemNumber: "198", title: "House Robber", platform: "LEETCODE", difficulty: "MEDIUM", topic: "Dynamic Programming", solvedDaysAgo: 2, url: "https://leetcode.com/problems/house-robber/" },
  { problemNumber: "322", title: "Coin Change", platform: "LEETCODE", difficulty: "MEDIUM", topic: "Dynamic Programming", solvedDaysAgo: 0, url: "https://leetcode.com/problems/coin-change/" },
];

const RESULTS = ["GOOD", "EASY", "HARD", "FORGOT"] as const;

function daysAgoJsDate(days: number): Date {
  const local = new Date();
  const zoned = new Date(local.toLocaleString("en-US", { timeZone: TZ }));
  zoned.setDate(zoned.getDate() - days);
  return zoned;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Dev User",
      passwordHash,
      timezone: TZ,
      dailyGoal: 10,
      revisionSettings: { create: { intervals: [3, 7, 15, 21, 60, 90] } },
    },
  });

  await prisma.problem.deleteMany({ where: { userId: user.id } });

  for (const item of PROBLEMS) {
    const registeredAt = daysAgoJsDate(item.solvedDaysAgo);
    const slots = createRevisionSchedule(registeredAt, [3, 7, 15, 21, 60, 90], TZ);
    const todayLocalMidnight = daysAgoJsDate(0);
    todayLocalMidnight.setHours(23, 59, 59, 999);

    await prisma.problem.create({
      data: {
        userId: user.id,
        problemNumber: item.problemNumber,
        title: item.title,
        platform: item.platform as never,
        difficulty: item.difficulty as never,
        topic: item.topic,
        url: item.url ?? null,
        registeredAt,
        tags: [],
        revisions: {
          create: slots.map((slot, index) => {
            const instant = toUtcInstant(slot.scheduledDate);
            const completed = instant < todayLocalMidnight && item.solvedDaysAgo > 0;
            return {
              revisionNumber: slot.revisionNumber,
              intervalDays: slot.intervalDays,
              scheduledDate: instant,
              ...(completed
                ? {
                    status: "COMPLETED" as const,
                    completedAt: new Date(instant.getTime() + 3600000),
                    result: RESULTS[index % RESULTS.length],
                    notes: index % 3 === 0 ? "Re-derived the approach from scratch." : null,
                  }
                : {}),
            };
          }),
        },
      },
    });
  }

  console.log(`Seeded ${PROBLEMS.length} problems for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
}

function toUtcInstant(isoDate: string): Date {
  // Interpret the calendar date as local midnight in TZ and convert to a UTC instant
  const [y, m, d] = isoDate.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d);
  return new Date(utcGuess - tzOffset(y, m, d));
}

function tzOffset(year: number, month: number, day: number): number {
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  const asTz = new Date(asUtc.toLocaleString("en-US", { timeZone: TZ }));
  return asTz.getTime() - asUtc.getTime();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
