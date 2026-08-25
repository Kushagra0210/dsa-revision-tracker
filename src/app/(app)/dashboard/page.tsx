import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { requireSession } from "@/app/actions/auth";
import { EmptyState, RevisionRow } from "@/components/dashboard/revision-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDayBounds, todayIsoDate } from "@/lib/scheduling";
import { getRevisionQueue, getUpcomingCount } from "@/services/revisions";
import { getUserPreferences } from "@/services/settings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = (await requireSession()).user.id;
  const [queue, upcoming, preferences] = await Promise.all([
    getRevisionQueue(userId),
    getUpcomingCount(userId),
    getUserPreferences(userId),
  ]);

  const today = todayIsoDate(preferences.timezone);
  const bounds = localDayBounds(today, preferences.timezone);
  const dueTodayCount = queue.due.length;
  const totalToday = dueTodayCount + queue.completedToday;

  const overdueWithDays = queue.overdue.map((item) => {
    const scheduledLocal = new Date(item.scheduledDate);
    const days = Math.max(
      1,
      Math.round((bounds.start.getTime() - scheduledLocal.getTime()) / 86400000),
    );
    return { item, days };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Today&apos;s Revisions</h1>
        <p className="text-sm capitalize text-muted-foreground">
          {new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Overdue" value={queue.overdue.length} tone={queue.overdue.length ? "danger" : undefined} />
        <StatCard label="Due today" value={dueTodayCount} />
        <StatCard label="Completed today" value={`${queue.completedToday}${preferences.dailyGoal ? ` / ${preferences.dailyGoal}` : ""}`} tone={totalToday > 0 ? "success" : undefined} />
        <StatCard label="Upcoming (7d)" value={upcoming.next7Days} muted={`Tomorrow: ${upcoming.tomorrow}`} />
      </div>

      {queue.overdue.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-danger">⚠ Overdue — do these first</h2>
          <div className="flex flex-col gap-2">
            {overdueWithDays.map(({ item, days }) => (
              <RevisionRow key={item.revisionId} item={item} overdueDays={days} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Due Today</h2>
          {dueTodayCount > 0 && <span className="text-xs text-muted-foreground">{dueTodayCount} problems</span>}
        </div>
        {dueTodayCount === 0 && queue.overdue.length === 0 ? (
          <EmptyState
            title="Nothing to revise today 🎉"
            subtitle={
              queue.overdue.length
                ? "Clear your overdue revisions above."
                : 'Press "A" or use Add Problem to register what you solved today.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {queue.due.map((item) => (
              <RevisionRow key={item.revisionId} item={item} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <CardTitle>Coming Up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tomorrow: <span className="font-medium text-foreground">{upcoming.tomorrow}</span> · Next 7
          days:{" "}
          <span className="font-medium text-foreground">{upcoming.next7Days}</span>{" "}
          ·{" "}
          <Link href="/calendar" className="text-primary hover:underline">
            View calendar
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: number | string;
  tone?: "danger" | "success";
  muted?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${
            tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : ""
          }`}
        >
          {value}
        </p>
        {muted && <p className="mt-0.5 text-[11px] text-muted-foreground">{muted}</p>}
      </CardContent>
    </Card>
  );
}
