import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/app/actions/auth";
import { ProblemFilters } from "@/components/problems/problem-filters";
import { Badge } from "@/components/ui/field";
import { EmptyState } from "@/components/dashboard/revision-list";
import { localDayBounds, todayIsoDate } from "@/lib/scheduling";
import { getProblems, nextRevisionOf } from "@/services/problems";
import { getUserTimezone } from "@/services/revisions";

export const dynamic = "force-dynamic";

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = (await requireSession()).user.id;
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const [timezone, problems] = await Promise.all([
    getUserTimezone(userId),
    getProblems(userId, {
      search: single("q"),
      platform: single("platform"),
      difficulty: single("difficulty"),
      topic: single("topic"),
      status: single("status"),
      sort: (single("sort") as "registered" | "nextRevision" | "difficulty") ?? "registered",
    }),
  ]);

  const today = todayIsoDate(timezone);
  const bounds = localDayBounds(today, timezone);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">My Problems</h1>
      <Suspense>
        <ProblemFilters />
      </Suspense>

      {problems.length === 0 ? (
        <EmptyState
          title="No problems found"
          subtitle='Register what you solve with the "Add Problem" button or press A.'
        />
      ) : (
        <div className="flex flex-col gap-2">
          {problems.map((problem) => {
            const next = nextRevisionOf(problem);
            const completed = problem.revisions.filter((r) => r.status === "COMPLETED").length;
            const total = problem.revisions.length;
            const isComplete = !next;
            const overdue =
              next && next.scheduledDate < bounds.start
                ? Math.max(1, Math.round((bounds.start.getTime() - next.scheduledDate.getTime()) / 86400000))
                : null;

            return (
              <Link
                key={problem.id}
                href={`/problems/${problem.id}`}
                className="flex flex-col gap-1 rounded-md border px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {problem.problemNumber}. {problem.title}
                  </span>
                  {isComplete ? (
                    <Badge tone="completed">Completed</Badge>
                  ) : overdue ? (
                    <Badge tone="overdue">Overdue by {overdue}d</Badge>
                  ) : (
                    <Badge>
                      Next: {next!.scheduledDate.toISOString().slice(0, 10)}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{titleCase(problem.platform)}</span>
                  {problem.difficulty && (
                    <Badge tone={problem.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
                      {titleCase(problem.difficulty)}
                    </Badge>
                  )}
                  {problem.topic && <span>• {problem.topic}</span>}
                  <span>• Registered {problem.registeredAt.toISOString().slice(0, 10)}</span>
                  <span className="ml-auto">
                    Progress: {completed}/{total}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
