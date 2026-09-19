import { headers } from "next/headers";
import { requireSession } from "@/app/actions/auth";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { LeetCodeCompanion } from "@/components/settings/leetcode-companion";
import { RescheduleButton, SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isEmailConfigured } from "@/lib/email";
import { isPushConfigured } from "@/lib/push";
import { getUserPreferences } from "@/services/settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default async function SettingsPage() {
  const userId = (await requireSession()).user.id;
  const [preferences, user] = await Promise.all([
    getUserPreferences(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { feedToken: true, notifyEmail: true, notifyPush: true, reminderHour: true, integrationTokens: { where: { revokedAt: null }, select: { id: true, label: true, createdAt: true, lastUsedAt: true } } },
    }),
  ]);

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Revision Schedule & Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingsForm {...preferences} />
          <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Common timezones</p>
            <p>{COMMON_TIMEZONES.join(" · ")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>LeetCode companion</CardTitle></CardHeader>
        <CardContent><LeetCodeCompanion appUrl={appUrl} tokens={user.integrationTokens} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing problems</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Changing intervals only affects newly registered problems. Existing revision dates stay
            exactly where they are — nothing is silently rescheduled.
          </p>
          <RescheduleButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsSettings
            feedToken={user.feedToken}
            appUrl={appUrl}
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
            pushConfigured={isPushConfigured()}
            emailConfigured={isEmailConfigured()}
            notifyEmail={user.notifyEmail}
            reminderHour={user.reminderHour}
          />
        </CardContent>
      </Card>
    </div>
  );
}
