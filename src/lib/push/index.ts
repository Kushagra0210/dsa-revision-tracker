import webpush from "web-push";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configure() {
  if (configured || !isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
};

/** Sends a push to one subscription. Returns false if the subscription is dead and should be removed. */
export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: NotificationPayload,
): Promise<boolean> {
  if (!configure()) return true; // push not configured: treat as delivered, keep subscription
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return false;
    throw error;
  }
}
