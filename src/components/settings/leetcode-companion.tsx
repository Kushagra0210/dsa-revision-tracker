"use client";

import { useState, useTransition } from "react";
import { createLeetCodeCompanionTokenAction, revokeLeetCodeCompanionTokenAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";

type Token = { id: string; label: string; createdAt: Date; lastUsedAt: Date | null };

export function LeetCodeCompanion({ appUrl, tokens }: { appUrl: string; tokens: Token[] }) {
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const makeToken = () => startTransition(async () => {
    const result = await createLeetCodeCompanionTokenAction();
    if (result.ok && result.data) setSecret(result.data.secret);
  });
  return <div className="flex flex-col gap-3 text-sm">
    <p className="text-muted-foreground">Use the optional companion extension to explicitly add the problem open in your LeetCode tab after an accepted submission. It never receives your LeetCode password or cookies, and it does not poll LeetCode.</p>
    {secret ? <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100"><p className="font-semibold">Copy this token now — it will not be shown again.</p><code className="mt-2 block break-all rounded bg-black/10 p-2">{secret}</code><p className="mt-2">Tracker URL: <code>{appUrl}</code></p></div> : <Button type="button" onClick={makeToken} disabled={pending}>{pending ? "Creating…" : "Create companion token"}</Button>}
    {tokens.length > 0 && <div className="rounded-md border p-3"><p className="mb-2 font-medium">Active companion tokens</p>{tokens.map((token) => <div key={token.id} className="flex items-center justify-between gap-3 py-1"><span>{token.label} · created {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(token.createdAt)}</span><button className="text-xs text-destructive underline" onClick={() => startTransition(async () => { await revokeLeetCodeCompanionTokenAction(token.id); })} disabled={pending}>Revoke</button></div>)}</div>}
    <p className="text-xs text-muted-foreground">Load <code>extension/</code> as an unpacked Chrome/Edge extension, then paste the URL and one-time token.</p>
  </div>;
}
