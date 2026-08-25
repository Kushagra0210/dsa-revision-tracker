import { requireSession } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatistics } from "@/services/statistics";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const userId = (await requireSession()).user.id;
  const stats = await getStatistics(userId);

  const totalRecall = stats.recall.FORGOT + stats.recall.HARD + stats.recall.GOOD + stats.recall.EASY;
  const recallRate = totalRecall ? Math.round(((stats.recall.GOOD + stats.recall.EASY) / totalRecall) * 100) : null;
  const forgotRate = totalRecall ? Math.round((stats.recall.FORGOT / totalRecall) * 100) : null;
  const easyRate = totalRecall ? Math.round((stats.recall.EASY / totalRecall) * 100) : null;
  const hardRate = totalRecall ? Math.round((stats.recall.HARD / totalRecall) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Statistics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total problems" value={stats.totalProblems} />
        <Stat label="In revision" value={stats.inRevision} />
        <Stat label="Completed cycles" value={stats.completedCycles} />
        <Stat label="Completed revisions" value={stats.completedRevisions} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revised this week" value={stats.revisedThisWeek} />
        <Stat label="Revised this month" value={stats.revisedThisMonth} />
        <Stat label="Added this week" value={stats.addedThisWeek} />
        <Stat
          label="Streak"
          value={`🔥 ${stats.streak.current}`}
          muted={`Longest: ${stats.streak.longest} days`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Completed" value={stats.todayCompleted} />
          <Metric label="Remaining today" value={stats.todayDueRemaining} />
          <Metric label="Overdue" value={stats.overdueCount} tone={stats.overdueCount ? "danger" : undefined} />
          <Metric label="Goal progress" value={`${stats.todayCompleted}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {recallRate === null ? (
            <p className="text-muted-foreground">Complete some revisions to see retention metrics.</p>
          ) : (
            <>
              <Bar label="Overall recall rate" percent={recallRate} />
              <Bar label="Easy rate" percent={easyRate!} subtle />
              <Bar label="Hard rate" percent={hardRate!} subtle />
              <Bar label="Forgot rate" percent={forgotRate!} danger />
              <p className="text-xs text-muted-foreground">
                Based on {totalRecall} recorded revision{totalRecall === 1 ? "" : "s"}.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: number | string; muted?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {muted && <p className="mt-0.5 text-[11px] text-muted-foreground">{muted}</p>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "danger" }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Bar({ label, percent, danger, subtle }: { label: string; percent: number; danger?: boolean; subtle?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className={subtle ? "text-muted-foreground" : ""}>{label}</span>
        <span className={`font-medium tabular-nums ${danger ? "text-danger" : ""}`}>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${danger ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
