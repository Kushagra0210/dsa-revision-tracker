import { DateTime, IANAZone } from "luxon";

export const DEFAULT_REVISION_INTERVALS = [3, 7, 15, 21, 60, 90] as const;

export type RevisionSlot = {
  revisionNumber: number;
  intervalDays: number;
  scheduledDate: string;
};

export function validateIntervals(intervals: readonly number[]): number[] {
  if (!intervals.length) throw new Error("At least one revision interval is required");
  if (intervals.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error("Revision intervals must be positive whole days");
  }
  if (new Set(intervals).size !== intervals.length) {
    throw new Error("Revision intervals must be unique");
  }
  return [...intervals].sort((a, b) => a - b);
}

/** Calculates calendar dates from the original registration date in the user's zone.
 * Intervals are always relative to the registration date, never chained between revisions. */
export function createRevisionSchedule(
  registrationDate: string | Date,
  intervals: readonly number[] = DEFAULT_REVISION_INTERVALS,
  timezone = "UTC",
): RevisionSlot[] {
  if (!IANAZone.isValidZone(timezone)) throw new Error("Invalid timezone");
  const base = typeof registrationDate === "string"
    ? DateTime.fromISO(registrationDate, { zone: timezone })
    : DateTime.fromJSDate(registrationDate, { zone: timezone });
  if (!base.isValid) throw new Error("Invalid registration date");

  return validateIntervals(intervals).map((intervalDays, index) => ({
    revisionNumber: index + 1,
    intervalDays,
    scheduledDate: base.startOf("day").plus({ days: intervalDays }).toISODate()!,
  }));
}

export function localDayBounds(date: string | Date, timezone: string) {
  if (!IANAZone.isValidZone(timezone)) throw new Error("Invalid timezone");
  const local = typeof date === "string"
    ? DateTime.fromISO(date, { zone: timezone })
    : DateTime.fromJSDate(date).setZone(timezone);
  if (!local.isValid) throw new Error("Invalid date");
  return { start: local.startOf("day").toUTC().toJSDate(), end: local.endOf("day").toUTC().toJSDate() };
}

export function scheduledDateToUtc(date: string, timezone: string): Date {
  const local = DateTime.fromISO(date, { zone: timezone }).startOf("day");
  if (!local.isValid) throw new Error("Invalid scheduled date or timezone");
  return local.toUTC().toJSDate();
}

/** ISO date string (yyyy-MM-dd) for "now" in the given timezone. */
export function todayIsoDate(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate()!;
}
