import { notFound } from "next/navigation";
import { requireSession } from "@/app/actions/auth";
import { RevisionSession } from "@/components/revisions/revision-session";
import { localDayBounds, todayIsoDate } from "@/lib/scheduling";
import { getUserTimezone } from "@/services/revisions";
import { getRevisionForUser } from "@/services/revisions";

export const dynamic = "force-dynamic";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const userId = (await requireSession()).user.id;
  const { revisionId } = await params;

  const revision = await getRevisionForUser(userId, revisionId);
  if (!revision) notFound();

  const problem = revision.problem;
  const timezone = await getUserTimezone(userId);
  const today = todayIsoDate(timezone);
  const bounds = localDayBounds(today, timezone);

  const statusLabel =
    revision.status === "COMPLETED"
      ? "Already completed"
      : revision.scheduledDate < bounds.start
        ? "Overdue"
        : "Due today";

  return (
    <RevisionSession
      data={{
        revisionId: revision.id,
        problemNumber: problem.problemNumber,
        title: problem.title,
        platformLabel:
          problem.platform.charAt(0) + problem.platform.slice(1).toLowerCase(),
        url: problem.url,
        solutionUrl: problem.solutionUrl,
        difficulty: problem.difficulty,
        topic: problem.topic,
        revisionNumber: revision.revisionNumber,
        totalRevisions: problem.revisions.length,
        scheduledLabel: revision.scheduledDate.toISOString().slice(0, 10),
        statusLabel,
        notes: problem.notes,
      }}
    />
  );
}
