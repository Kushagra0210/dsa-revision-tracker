import { requireSession } from "@/app/actions/auth";
import { RescheduleButton, SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserPreferences } from "@/services/settings";

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
  const preferences = await getUserPreferences(userId);

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
    </div>
  );
}
