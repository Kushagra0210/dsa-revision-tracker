"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { completeRevisionAction } from "@/app/actions/revisions";
import { Button } from "@/components/ui/button";
import { Badge, Label, Textarea } from "@/components/ui/field";
import type { ActionResult } from "@/types";

type RevisionData = {
  revisionId: string;
  problemNumber: string;
  title: string;
  platformLabel: string;
  url: string | null;
  solutionUrl: string | null;
  difficulty: string | null;
  topic: string | null;
  revisionNumber: number;
  totalRevisions: number;
  scheduledLabel: string;
  statusLabel: string;
  notes: string | null;
};

const RESULTS = [
  { key: "FORGOT", shortcut: "f", label: "I Forgot It", tone: "danger" as const },
  { key: "HARD", shortcut: "h", label: "Hard", tone: "warning" as const },
  { key: "GOOD", shortcut: "g", label: "Good", tone: "success" as const },
  { key: "EASY", shortcut: "e", label: "Easy", tone: "success" as const },
];

export function RevisionSession({ data }: { data: RevisionData }) {
  const [revealed, setRevealed] = useState(false);
  const [choosingResult, setChoosingResult] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const startedAt = useRef(0);
  const router = useRouter();
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const [, formAction, pending] = useActionState<ActionResult<{ cycleCompleted: boolean }>, FormData>(
    async (_prev, formData) => {
      const result = await completeRevisionAction(_prev, formData);
      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
      }
      return result;
    },
    { ok: false as const, error: "" },
  );

  function pick(resultKey: string) {
    setChosen(resultKey);
    setConfirming(true);
    setTimeout(() => noteRef.current?.focus(), 30);
  }

  function confirm() {
    const form = document.getElementById("revision-form") as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem("result") as HTMLInputElement).value = chosen ?? "GOOD";
    (form.elements.namedItem("solutionViewed") as HTMLInputElement).value = String(revealed);
    (form.elements.namedItem("timeSpentSec") as HTMLInputElement).value = String(
      Math.round((Date.now() - startedAt.current) / 1000),
    );
    (form.elements.namedItem("notes") as HTMLInputElement).value = noteRef.current?.value.slice(0, 2000) ?? "";
    form.requestSubmit();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (!choosingResult && key === "r") {
        setChoosingResult(true);
        return;
      }
      if (key === "s" && !revealed) {
        setRevealed(true);
        void fetch("/api/revisions/solution-viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: data.revisionId }),
        });
        return;
      }
      if ((choosingResult || event.shiftKey) && ["f", "h", "g", "e"].includes(key)) {
        const match = RESULTS.find((r) => r.shortcut === key);
        if (match) {
          event.preventDefault();
          if (!choosingResult) setChoosingResult(true);
          pick(match.key);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choosingResult, revealed]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          ← Back to dashboard
        </Link>
        <span>
          Revision <span className="font-medium text-foreground">{data.revisionNumber}</span> /{" "}
          {data.totalRevisions} · {data.statusLabel}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {data.platformLabel}
        </p>
        <h1 className="mt-1 text-xl font-bold">
          {data.problemNumber}. {data.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {data.difficulty && <Badge tone={data.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>{titleCase(data.difficulty)}</Badge>}
          {data.topic && <Badge>{data.topic}</Badge>}
          <Badge>Scheduled: {data.scheduledLabel}</Badge>
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Open problem ↗
            </a>
          )}
        </div>

        {!choosingResult ? (
          <div className="mt-8 flex flex-col items-center gap-4 border-t pt-8">
            <p className="text-center text-sm text-muted-foreground">
              Try to recall the approach before revealing anything.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setChoosingResult(true)}>
                Start Recall <kbd className="ml-1 rounded bg-primary-foreground/15 px-1 font-mono text-[10px]">R</kbd>
              </Button>
              <Button variant="outline" onClick={() => {
                setRevealed(true);
                setChoosingResult(true);
                void fetch("/api/revisions/solution-viewed", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ revisionId: data.revisionId }),
                });
              }}>
                <Eye className="size-4" /> Reveal Solution{" "}
                <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">S</kbd>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4 border-t pt-6">
            <p className="text-sm font-medium">How well did you remember this problem?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESULTS.map((result) => (
                <button
                  key={result.key}
                  type="button"
                  disabled={pending}
                  onClick={() => pick(result.key)}
                  className={`flex h-auto cursor-pointer flex-col items-center gap-1 rounded-md border px-3 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 ${
                    result.tone === "danger"
                      ? "border-danger/40 text-danger"
                      : result.tone === "warning"
                        ? "border-warning/40 text-warning"
                        : "border-success/40 text-success"
                  }`}
                >
                  {result.label}
                  <kbd className="rounded border px-1 font-mono text-[10px] text-muted-foreground">
                    {result.shortcut.toUpperCase()}
                  </kbd>
                </button>
              ))}
            </div>

            {revealed && (
              <div className="rounded-md border bg-muted p-3 text-sm">
                <p className="mb-1 font-medium">Your saved notes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.notes || "No notes were added for this problem."}
                </p>
                {data.solutionUrl && (
                  <a
                    href={data.solutionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-primary underline-offset-2 hover:underline"
                  >
                    Open your solution ↗
                  </a>
                )}
              </div>
            )}

            {confirming && chosen && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <Label htmlFor="revision-notes">What did you forget? (optional)</Label>
                <Textarea
                  id="revision-notes"
                  ref={noteRef}
                  placeholder="e.g. Forgot the pruning condition."
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      confirm();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={confirm} disabled={pending}>
                    {pending ? "Saving…" : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <form id="revision-form" action={formAction} className="hidden">
          <input type="hidden" name="revisionId" value={data.revisionId} />
          <input type="hidden" name="result" />
          <input type="hidden" name="solutionViewed" value="false" />
          <input type="hidden" name="timeSpentSec" />
          <input type="hidden" name="notes" value="" />
        </form>
        {pending && <p className="mt-4 text-center text-xs text-muted-foreground">Saving…</p>}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Shortcuts: R start · S reveal solution · F forgot · H hard · G good · E easy
      </p>
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
