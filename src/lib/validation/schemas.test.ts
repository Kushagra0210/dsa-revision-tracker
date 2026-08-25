import { describe, expect, it } from "vitest";
import {
  isValidTimezone,
  revisionSettingsSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

describe("auth schemas", () => {
  it("rejects short passwords and invalid emails", () => {
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "not-an-email", password: "longenough1" }).success).toBe(false);
  });

  it("normalizes emails", () => {
    const result = signUpSchema.parse({ email: "  USER@Example.COM ", password: "password123" });
    expect(result.email).toBe("user@example.com");
    expect(signInSchema.safeParse({ email: "x@y.z", password: "" }).success).toBe(false);
  });
});

describe("revision settings schema", () => {
  it("accepts the default schedule", () => {
    const result = revisionSettingsSchema.safeParse({
      intervals: [3, 7, 15, 21, 60, 90],
      timezone: "Asia/Kolkata",
      dailyGoal: "10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty, zero, or duplicate intervals", () => {
    for (const intervals of ["", "0", "5, 5", "abc"]) {
      expect(
        revisionSettingsSchema.safeParse({ intervals, timezone: "UTC", dailyGoal: 1 }).success,
        `intervals=${intervals}`,
      ).toBe(false);
    }
  });

  it("validates timezone strings", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});
