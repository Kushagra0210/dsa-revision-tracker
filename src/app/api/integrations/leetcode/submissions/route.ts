import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences } from "@/services/settings";
import { createProblem } from "@/services/problems";
import { validateIntegrationSecret } from "@/services/integrations";
import { leetCodeCompanionSchema } from "@/lib/validation/schemas";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const userId = await validateIntegrationSecret(secret);
  if (!userId) return NextResponse.json({ error: "Invalid or revoked companion token" }, { status: 401, headers: corsHeaders });

  const parsed = leetCodeCompanionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400, headers: corsHeaders });

  const preferences = await getUserPreferences(userId);
  const created = await createProblem({
    userId,
    timezone: preferences.timezone,
    ...parsed.data,
    platform: "LEETCODE",
  });
  if (!created.ok) return NextResponse.json({ ok: false, duplicate: true, message: created.message, existingId: created.existingId }, { status: 409, headers: corsHeaders });

  return NextResponse.json({ ok: true, problemId: created.problem.id, nextRevision: created.problem.revisions[0]?.scheduledDate.toISOString() ?? null }, { status: 201, headers: corsHeaders });
}
