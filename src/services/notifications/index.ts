import type { PrismaClient } from "@/generated/prisma/client";
import { DateTime } from "luxon";
import { prisma as defaultDb } from "@/lib/db";
import { isEmailConfigured, sendDigestEmail } from "@/lib/email";
import { isPushConfigured, sendPush } from "@/lib/push";
import { todayIsoDate } from "@/lib/scheduling";
import { getRevisionQueue } from "@/services/revisions";

type Db = PrismaClient;

export type NotificationTarget = {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  reminderHour: number;
  notifyPush: boolean;
  notifyEmail: boolean;
};

export async function getNotificationSummary(userId: string) {
  const queue = await getRevisionQueue(userId);
  return {
    dueToday: queue.due.length,
    overdue: queue.overdue.length,
    completedToday: queue.completedToday,
    total: queue.due.length + queue.overdue.length,
  };
}

export async function notifyUser(
  user: NotificationTarget,
  appUrl: string,
  db: Db = defaultDb,
): Promise<{ pushSent: number; emailSent: boolean }> {
  const summary = await getNotificationSummary(user.id);

  // nothing pending and nothing done today → stay quiet
  if (summary.total === 0 && summary.completedToday === 0) {
    return { pushSent: 0, emailSent: false };
  }

  const title =
    summary.total > 0
      ? `${summary.total} DSA revision${summary.total === 1 ? "" : "s"} waiting`
      : "All revisions done for today 🎉";
  const parts: string[] = [];
  if (summary.overdue > 0) parts.push(`${summary.overdue} overdue`);
  if (summary.dueToday > 0) parts.push(`${summary.dueToday} due today`);
  if (parts.length === 0 && summary.completedToday > 0) {
    parts.push(`${summary.completedToday} completed today`);
  }
  const body = parts.join(" · ");

  let pushSent = 0;
  if (user.notifyPush && isPushConfigured()) {
    const subscriptions = await db.pushSubscription.findMany({ where: { userId: user.id } });
    for (const subscription of subscriptions) {
      const alive = await sendPush(
        { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
        { title, body, url: `${appUrl}/dashboard` },
      );
      if (alive) pushSent += 1;
      else await db.pushSubscription.delete({ where: { id: subscription.id } });
    }
  }

  let emailSent = false;
  if (user.notifyEmail && isEmailConfigured() && summary.total > 0) {
    emailSent = await sendDigestEmail({
      to: user.email,
      dueToday: summary.dueToday,
      overdue: summary.overdue,
      completedToday: summary.completedToday,
      dashboardUrl: `${appUrl}/dashboard`,
    });
  }

  return { pushSent, emailSent };
}

/** Finds every user whose local clock matches their preferred reminder hour and notifies them. */
export async function runNotificationSweep(
  appUrl: string,
  db: Db = defaultDb,
): Promise<{ checked: number; notified: number; details: { userId: string; pushSent: number; emailSent: boolean }[] }> {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      reminderHour: true,
      notifyPush: true,
      notifyEmail: true,
    },
  });

  const details: { userId: string; pushSent: number; emailSent: boolean }[] = [];

  for (const user of users) {
    const localHour = DateTime.now().setZone(user.timezone).hour;
    if (localHour !== user.reminderHour) continue;

    const result = await notifyUser(user, appUrl, db);
    if (result.pushSent > 0 || result.emailSent) {
      details.push({ userId: user.id, ...result });
    }
  }

  return { checked: users.length, notified: details.length, details };
}

export async function shouldNotifyNow(timezone: string, reminderHour: number): Promise<boolean> {
  return DateTime.now().setZone(timezone).hour === reminderHour;
}

export function todayForUser(timezone: string): string {
  return todayIsoDate(timezone);
}
