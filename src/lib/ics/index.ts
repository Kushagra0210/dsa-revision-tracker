export function buildIcsFeed(
  problems: Array<{
    problemNumber: string;
    title: string;
    platform: string;
    url: string | null;
    topic: string | null;
    difficulty: string | null;
    revisions: Array<{
      scheduledDate: Date;
      revisionNumber: number;
      status: string;
    }>;
  }>,
): string {
  const now = toIcsTimestamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DSA Revision Tracker//Revision Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DSA Revisions",
  ];

  for (const problem of problems) {
    for (const rev of problem.revisions) {
      if (rev.status === "COMPLETED" || rev.status === "SKIPPED") continue;
      const date = rev.scheduledDate.toISOString().slice(0, 10).replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:revision-${problem.platform}-${problem.problemNumber}-r${rev.revisionNumber}@dsa-revision-tracker`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${date}`,
        `SUMMARY:Revise #${problem.problemNumber} — ${escapeIcs(problem.title)} (R${rev.revisionNumber})`,
        `DESCRIPTION:${escapeIcs(
          `${platformLabel(problem.platform)} revision ${rev.revisionNumber}` +
            (problem.topic ? ` · ${problem.topic}` : "") +
            (problem.difficulty ? ` · ${titleCase(problem.difficulty)}` : ""),
        )}`,
        problem.url ? `URL:${problem.url}` : "",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Revision due today: #${problem.problemNumber} ${escapeIcs(problem.title)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function toIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function platformLabel(platform: string): string {
  return platform.charAt(0) + platform.slice(1).toLowerCase();
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
