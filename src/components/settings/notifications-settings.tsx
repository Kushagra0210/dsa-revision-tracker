"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { updateNotificationPrefsAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { PushSubscribeButton } from "@/components/settings/push-subscribe";
import type { ActionResult } from "@/types";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function NotificationsSettings({
  feedToken,
  appUrl,
  vapidPublicKey,
  pushConfigured,
  emailConfigured,
  notifyEmail,
  reminderHour,
}: {
  feedToken: string;
  appUrl: string;
  vapidPublicKey: string;
  pushConfigured: boolean;
  emailConfigured: boolean;
  notifyEmail: boolean;
  reminderHour: number;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateNotificationPrefsAction,
    { ok: false as const, error: "" },
  );
  const [copied, setCopied] = useState(false);

  const feedUrl = `${appUrl}/api/feed/${feedToken}`;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Push notifications</h3>
        <p className="text-xs text-muted-foreground">
          Get a browser notification at your preferred time when revisions are waiting.
          {!pushConfigured && " (Server-side push keys are not configured yet.)"}
        </p>
        <PushSubscribeButton publicKey={vapidPublicKey} enabled={!pushConfigured ? false : true} />
      </section>

      <form action={formAction} className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Daily reminder & email digest</h3>
        <p className="text-xs text-muted-foreground">
          {emailConfigured
            ? "The daily summary is also delivered by email when things are waiting."
            : "(Email delivery is not configured on this deployment yet; the reminder hour still drives browser notifications.)"}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 pb-2">
            <input
              id="notifyEmail"
              type="checkbox"
              name="notifyEmail"
              defaultChecked={notifyEmail}
              className="size-4 accent-primary"
              disabled={!emailConfigured}
            />
            <Label htmlFor="notifyEmail" className="cursor-pointer">
              Also send me email
            </Label>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="reminderHour">Reminder hour (your local time)</Label>
            <Select id="reminderHour" name="reminderHour" defaultValue={String(reminderHour)}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
        {state.ok && <p className="text-xs text-success">Preferences saved ✓</p>}
        {state.ok === false && state.error && <p className="text-xs text-danger">{state.error}</p>}
      </form>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Calendar feed (.ics)</h3>
        <p className="text-xs text-muted-foreground">
          Subscribe from Google Calendar, Outlook or Apple Calendar to see every scheduled revision.
        </p>
        <div className="flex items-center gap-2">
          <Input value={feedUrl} readOnly className="font-mono text-xs" />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(feedUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="size-4" /> {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Anyone with this URL can see your revision schedule — keep it private.
        </p>
      </section>
    </div>
  );
}
