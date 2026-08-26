import { buildIcsFeed } from "@/lib/ics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return new Response("Not found", { status: 404 });

  const user = await prisma.user.findUnique({ where: { feedToken: token }, select: { id: true } });
  if (!user) return new Response("Not found", { status: 404 });

  // include problems of the last 30 days so past-but-pending revisions show too
  const since = new Date(Date.now() - 30 * 86400000);
  const problems = await prisma.problem.findMany({
    where: { userId: user.id, revisions: { some: { scheduledDate: { gte: since } } } },
    select: {
      problemNumber: true,
      title: true,
      platform: true,
      url: true,
      topic: true,
      difficulty: true,
      revisions: {
        where: { scheduledDate: { gte: since } },
        select: { scheduledDate: true, revisionNumber: true, status: true },
        orderBy: { scheduledDate: "asc" },
      },
    },
  });

  const ics = buildIcsFeed(problems);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dsa-revisions.ics"',
      "Cache-Control": "no-store",
    },
  });
}
