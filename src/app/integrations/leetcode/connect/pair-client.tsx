"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function LeetCodeConnect() {
  const [state, setState] = useState<"ready" | "working" | "done" | "invalid" | "signedout">("ready");
  const [payload, setPayload] = useState<{ pairingCode: string; secret: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const pairingCode = params.get("pair"); const secret = params.get("token");
    if (!pairingCode || !secret) setState("invalid"); else setPayload({ pairingCode, secret });
  }, []);
  const connect = async () => {
    if (!payload) return; setState("working");
    const response = await fetch("/api/integrations/leetcode/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 401) return setState("signedout");
    setState(response.ok ? "done" : "invalid");
  };
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 p-6"><p className="text-sm font-medium text-primary">DSA Revision Tracker</p><h1 className="text-3xl font-bold">Connect LeetCode companion</h1>{state === "done" ? <p className="rounded-lg bg-emerald-50 p-4 text-emerald-900">Connected. Return to the extension—you can now add solved problems in one click.</p> : state === "signedout" ? <p>Sign in to your tracker first, then reopen the extension and choose Connect tracker again. <Link className="text-primary underline" href="/login">Sign in</Link></p> : state === "invalid" ? <p className="text-destructive">This connection link is invalid or has expired. Reopen the extension and try again.</p> : <><p className="text-muted-foreground">Approve this browser extension to add the LeetCode problems you explicitly choose. It cannot access your LeetCode password or cookies.</p><button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground" onClick={connect} disabled={state === "working"}>{state === "working" ? "Connecting…" : "Connect extension"}</button></>}</main>;
}
