import { describe, expect, it } from "vitest";
import { createRevisionSchedule, localDayBounds, scheduledDateToUtc, todayIsoDate } from "@/lib/scheduling";

describe("specification examples", () => {
  it("25 Aug 2026 produces the exact schedule from the product spec", () => {
    expect(createRevisionSchedule("2026-08-25", [3, 7, 15, 21, 60, 90], "Asia/Kolkata")).toEqual([
      { revisionNumber: 1, intervalDays: 3, scheduledDate: "2026-08-28" },
      { revisionNumber: 2, intervalDays: 7, scheduledDate: "2026-09-01" },
      { revisionNumber: 3, intervalDays: 15, scheduledDate: "2026-09-09" },
      { revisionNumber: 4, intervalDays: 21, scheduledDate: "2026-09-15" },
      { revisionNumber: 5, intervalDays: 60, scheduledDate: "2026-10-24" },
      { revisionNumber: 6, intervalDays: 90, scheduledDate: "2026-11-23" },
    ]);
  });

  it("numbers revisions sequentially starting at 1", () => {
    const slots = createRevisionSchedule("2026-08-25", [1, 2, 3]);
    expect(slots.map((s) => s.revisionNumber)).toEqual([1, 2, 3]);
  });
});

describe("calendar boundaries", () => {
  it("handles month boundaries", () => {
    expect(createRevisionSchedule("2026-01-30", [3], "UTC")[0].scheduledDate).toBe("2026-02-02");
    expect(createRevisionSchedule("2026-08-31", [7], "UTC")[0].scheduledDate).toBe("2026-09-07");
  });

  it("handles year boundaries", () => {
    expect(createRevisionSchedule("2026-12-29", [3], "UTC")[0].scheduledDate).toBe("2027-01-01");
    expect(createRevisionSchedule("2027-12-30", [3], "UTC")[0].scheduledDate).toBe("2028-01-02");
  });

  it("handles leap years", () => {
    expect(createRevisionSchedule("2028-02-27", [2], "UTC")[0].scheduledDate).toBe("2028-02-29");
    expect(createRevisionSchedule("2027-02-27", [2], "UTC")[0].scheduledDate).toBe("2027-03-01");
  });

  it("keeps calendar dates stable across DST transitions", () => {
    // US DST starts 2026-03-08; +1 day must still be the next calendar date locally
    expect(createRevisionSchedule("2026-03-07", [1, 2], "America/New_York").map((s) => s.scheduledDate))
      .toEqual(["2026-03-08", "2026-03-09"]);
    // IST has a positive offset crossing midnight of 2026-11-01 US DST end
    expect(createRevisionSchedule("2026-10-31", [1], "America/Los_Angeles")[0].scheduledDate)
      .toBe("2026-11-01");
  });
});

describe("timezone handling", () => {
  it("computes day bounds in local time", () => {
    const bounds = localDayBounds("2026-08-25", "Asia/Kolkata");
    expect(bounds.start.toISOString()).toBe("2026-08-24T18:30:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-25T18:29:59.999Z");
  });

  it("converts a scheduled local date to UTC midnight-local storage", () => {
    const stored = scheduledDateToUtc("2026-08-28", "Asia/Kolkata");
    expect(stored.toISOString()).toBe("2026-08-27T18:30:00.000Z");
  });

  it("rejects invalid timezones and dates", () => {
    expect(() => createRevisionSchedule("2026-08-25", [3], "Not/AZone")).toThrow();
    expect(() => createRevisionSchedule("garbage", [3], "UTC")).toThrow();
  });

  it("returns today's ISO date for the given zone", () => {
    expect(todayIsoDate("Asia/Kolkata")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
