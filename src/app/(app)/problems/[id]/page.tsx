import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/app/actions/auth";
import { ProblemActions } from "@/components/problems/problem-actions";
import { Badge } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProblem } from "@/services/problems";

export const dynamic = "force-dynamic";

const RESULT_TONE: Record<string, "easy" | "medium" | "hard" | "overdue"> = {
  EASY: "easy",
  GOOD: "easy",
  HARD: "medium",
  FORGOT: "overdue",
};

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = (await requireSession()).user.id;
  const { id } = await params;

  const problem = await getProblem(userId, id);
  if (!problem) notFound();

  const completed = problem.revisions.filter((r) => r.status === "COMPLETED");
  const next = problem.revisions.find((r) => r.status !== "COMPLETED" && r.status !== "SKIPPED");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/problems" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> Back to problems
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            {problem.problemNumber}. {problem.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>{titleCase(problem.platform)}</span>
            {problem.difficulty && (
              <Badge tone={problem.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
                {titleCase(problem.difficulty)}
              </Badge>
            )}
            {problem.topic && <Badge>{problem.topic}</Badge>}
            <span>Registered {formatDate(problem.registeredAt)}</span>
            {problem.url && (
              <a href={problem.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Open problem ↗
              </a>
            )}
          </div>
        </div>
        <ProblemActions
          problem={{
            id: problem.id,
            problemNumber: problem.problemNumber,
            title: problem.title,
            platform: problem.platform,
            difficulty: problem.difficulty,
            topic: problem.topic,
            url: problem.url,
            solutionUrl: problem.solutionUrl,
            notes: problem.notes,
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Revision Progress — {completed.length}/{problem.revisions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {problem.revisions.map((rev) => {
            const done = rev.status === "COMPLETED";
            const isNext = next?.id === rev.id;
            return (
              <span
                key={rev.id}
                title={`Revision ${rev.revisionNumber}: ${rev.scheduledDate.toISOString().slice(0, 10)}${done ? ` (${rev.result})` : ""}`}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  done
                    ? "border-success/40 bg-success/10 text-success"
                    : isNext
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground"
                }`}
              >
                R{rev.revisionNumber} {done ? "✓" : isNext ? "→" : ""}
              </span>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-1 border-l pl-4 text-sm">
              <li className="pb-3">
                <span className="absolute -left-[5px] mt-1 size-2 rounded-full bg-primary" />
                <p className="font-medium">{formatDate(problem.registeredAt)}</p>
                <p className="text-xs text-muted-foreground">Problem solved & registered</p>
              </li>
              {problem.revisions.map((rev) => (
                <li key={rev.id} className="pb-3 last:pb-0">
                  <span
                    className={`absolute -left-[5px] mt-1 size-2 rounded-full ${
                      rev.status === "COMPLETED"
                        ? "bg-success"
                        : rev.id === next?.id
                          ? "bg-warning animate-pulse"
                          : "bg-border"
                    }`}
                  />
                  <p className="font-medium">{formatDate(rev.scheduledDate)}</p>
                  <p className="text-xs text-muted-foreground">
                    Revision {rev.revisionNumber} (+{rev.intervalDays}d)
                    {rev.status === "COMPLETED"
                      ? ` ✓ ${titleCaseLower(rev.result ?? "")}${rev.completedAt ? ` · done ${formatDate(rev.completedAt)}` : ""}`
                      : rev.id === next?.id
                        ? isPast(rev.scheduledDate)
                          ? " · due (overdue)"
                          : " · upcoming"
                        : ""}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revision History</CardTitle>
          </CardHeader>
          <CardContent>
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revisions completed yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Result</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((rev) => (
                    <tr key={rev.id} className="border-t">
                      <td className="py-2 pr-2 align-top">{formatDate(rev.completedAt!)}</td>
                      <td className="py-2 pr-2 align-top">
                        <Badge tone={RESULT_TONE[rev.result ?? ""] ?? "default"}>
                          {titleCaseLower(rev.result ?? "?")}
                        </Badge>
                      </td>
                      <td className="py-2 align-top text-muted-foreground">{rev.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(problem.notes || problem.solutionUrl) && (
              <div className="mt-4 rounded-md border bg-muted p-3 text-sm">
                {problem.notes && (
                  <>
                    <p className="mb-1 font-medium">Notes</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{problem.notes}</p>
                  </>
                )}
                {problem.solutionUrl && (
                  <a
                    href={problem.solutionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    Open solution ↗
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date.toISOString().slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function titleCaseLower(value: string) {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : value;
}
