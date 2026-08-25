import { auth } from "@/lib/auth";
import { markSolutionViewed } from "@/services/revisions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const revisionId = (body as { revisionId?: unknown })?.revisionId;
  if (typeof revisionId !== "string") {
    return Response.json({ ok: false, error: "revisionId required" }, { status: 400 });
  }

  const ok = await markSolutionViewed(revisionId, session.user.id);
  return Response.json({ ok }, { status: ok ? 200 : 404 });
}
