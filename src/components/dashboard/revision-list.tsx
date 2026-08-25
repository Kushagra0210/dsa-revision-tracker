import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RevisionRow({
  item,
  overdueDays,
}: {
  item: {
    revisionId: string;
    problemId: string;
    problemNumber: string;
    title: string;
    platform: string;
    difficulty: string | null;
    topic: string | null;
    revisionNumber: number;
    totalRevisions: number;
    status: string;
  };
  overdueDays?: number;
}) {
  const label = item.platform.charAt(0) + item.platform.slice(1).toLowerCase();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
      <div className="min-w-0">
        <Link
          href={`/problems/${item.problemId}`}
          className="block truncate text-sm font-medium hover:text-primary"
        >
          {item.problemNumber}. {item.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{label}</span>
          {item.difficulty && (
            <Badge tone={item.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
              {item.difficulty[0] + item.difficulty.slice(1).toLowerCase()}
            </Badge>
          )}
          {item.topic && <span>• {item.topic}</span>}
          <span>
            • Revision #{item.revisionNumber}/{item.totalRevisions}
          </span>
          {item.status === "overdue" && (
            <Badge tone="overdue">Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}</Badge>
          )}
          {item.status === "due_today" && <Badge tone="due">Due today</Badge>}
        </div>
      </div>
      <Link
        href={`/revisions/${item.revisionId}`}
        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 ${
          item.status === "overdue" ? "bg-danger" : "bg-primary"
        }`}
      >
        Start Revision <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

export function OverdueBanner({ count }: { count: number }) {
  return (
    <Card className="border-danger/40 bg-danger/5">
      <CardHeader className="flex-row items-center gap-2">
        <AlertTriangle className="size-4 text-danger" />
        <CardTitle className="text-danger">{count} Overdue</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        These revisions were missed on earlier days and stay here until you complete them.
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
