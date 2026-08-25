import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireSession } from "@/app/actions/auth";
import { Badge } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIsoDate } from "@/lib/scheduling";
import { getCalendarMonth } from "@/services/statistics";
import { getUserTimezone } from "@/services/revisions";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = (await requireSession()).user.id;
  const params = await searchParams;

  const timezone = await getUserTimezone(userId);
  const today = todayIsoDate(timezone);

  const now = new Date(`${today}T12:00:00Z`);
  const year = Number(params.year) || now.getUTCFullYear();
  const month = Number(params.month) || now.getUTCMonth() + 1;

  const calendar = await getCalendarMonth(userId, year, month);
  const selectedDate = typeof params.date === "string" ? params.date : null;
  const selectedDay = calendar.days.find((d) => d.date === selectedDate);

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {MONTHS[month - 1]} {year}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/calendar?year=${prev.year}&month=${prev.month}`}
            className="rounded-md border p-2 hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`/calendar?year=${next.year}&month=${next.month}`}
            className="rounded-md border p-2 hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="p-3">
            <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.days.map((day) => {
                const inMonth = Number(day.date.slice(5, 7)) === month;
                const isToday = day.date === today;
                const hasDue = day.scheduled > 0;
                const allDone = day.completed > 0 && day.scheduled === 0;
                return (
                  <Link
                    key={day.date}
                    href={`/calendar?year=${year}&month=${month}&date=${day.date}`}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted ${
                      inMonth ? "" : "opacity-35"
                    } ${selectedDate === day.date ? "ring-2 ring-ring" : ""} ${
                      isToday ? "border-primary" : ""
                    }`}
                  >
                    <span>{Number(day.date.slice(8))}</span>
                    {(hasDue || day.completed > 0) && (
                      <span
                        className={`absolute bottom-1.5 size-1.5 rounded-full ${
                          hasDue
                            ? allDone
                              ? "bg-success"
                              : "bg-primary"
                            : "bg-success"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary" /> scheduled</span>
              <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-success" /> completed</span>
              <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full border border-primary" /> today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>{selectedDay ? formatLongDate(selectedDay.date) : "Select a date"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDay ? (
              <p className="text-sm text-muted-foreground">Click a date to see its revisions.</p>
            ) : selectedDay.scheduled + selectedDay.completed === 0 ? (
              <p className="text-sm text-muted-foreground">No revisions on this day.</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted-foreground">
                  {selectedDay.completed} completed · {selectedDay.scheduled} scheduled
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {selectedDay.titles.map((title) => (
                    <li key={title} className="truncate rounded px-2 py-1 hover:bg-muted">
                      • {title}
                    </li>
                  ))}
                </ul>
                <Badge className="mt-3">{selectedDay.titles.length} problem{selectedDay.titles.length === 1 ? "" : "s"}</Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
