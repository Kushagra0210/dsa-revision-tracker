import { z } from "zod";

export const platformValues = ["LEETCODE", "CODEFORCES", "HACKERRANK", "GEEKSFORGEEKS", "OTHER"] as const;
export const difficultyValues = ["EASY", "MEDIUM", "HARD"] as const;
export const recallResultValues = ["FORGOT", "HARD", "GOOD", "EASY"] as const;

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

export const signUpSchema = z.object({
  name: optionalString(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const createProblemSchema = z.object({
  problemNumber: z
    .string()
    .trim()
    .min(1, "Problem number is required")
    .max(50, "Problem number is too long"),
  title: z.string().trim().min(1, "Title is required").max(300, "Title is too long"),
  platform: z.enum(platformValues).default("LEETCODE"),
  difficulty: z.enum(difficultyValues).optional(),
  topic: optionalString(80),
  url: optionalUrl,
  solutionUrl: optionalUrl,
  notes: optionalString(5000),
});

export const updateProblemSchema = createProblemSchema.extend({
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const completeRevisionSchema = z.object({
  revisionId: z.string().cuid(),
  result: z.enum(recallResultValues),
  notes: optionalString(2000),
  timeSpentSec: z.number().int().min(0).max(86400).optional(),
  solutionViewed: z.boolean().default(false),
});

/** Payload deliberately contains only metadata visible to the user in their tab. */
export const leetCodeCompanionSchema = z.object({
  problemNumber: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  difficulty: z.enum(difficultyValues).optional(),
  url: z.string().url().max(2048).refine((url) => new URL(url).hostname.endsWith("leetcode.com"), "A LeetCode URL is required"),
  topic: z.string().trim().max(80).optional(),
});

export const revisionSettingsSchema = z.object({
  intervals: z
    .array(z.coerce.number().int("Intervals must be whole days").min(1, "Intervals must be at least 1 day").max(3650))
    .min(1, "At least one interval is required")
    .max(12, "At most 12 intervals"),
  timezone: z.string().trim().min(1).max(64).refine(isValidTimezone, "Invalid timezone"),
  dailyGoal: z.coerce.number().int().min(1, "Goal must be at least 1").max(200),
});

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type CompleteRevisionInput = z.infer<typeof completeRevisionSchema>;
export type RevisionSettingsInput = z.infer<typeof revisionSettingsSchema>;
