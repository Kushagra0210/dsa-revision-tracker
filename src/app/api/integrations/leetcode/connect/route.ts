import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pairLeetCodeCompanion } from "@/services/integrations";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to connect the extension." }, { status: 401 });
  const body = await request.json().catch(() => null) as { pairingCode?: unknown; secret?: unknown } | null;
  if (typeof body?.pairingCode !== "string" || typeof body.secret !== "string") return NextResponse.json({ error: "Invalid pairing request" }, { status: 400 });
  try {
    await pairLeetCodeCompanion(session.user.id, body.pairingCode, body.secret);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "This pairing request is invalid or has already been used." }, { status: 400 });
  }
}
