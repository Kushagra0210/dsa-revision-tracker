import { NextRequest, NextResponse } from "next/server";
import { isPairingComplete } from "@/services/integrations";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  return NextResponse.json({ paired: await isPairingComplete(code) });
}
