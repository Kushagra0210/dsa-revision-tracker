"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushSubscribeButton({
  publicKey,
  enabled,
}: {
  publicKey: string;
  enabled: boolean;
}) {
  const [subscribed, setSubscribed] = useState<boolean | null>(enabled ? null : false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function subscribe() {
    setMessage(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("Push is not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Notification permission was not granted.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    if (response.ok) {
      setSubscribed(true);
      setMessage("Push notifications enabled ✓");
    } else {
      setMessage("Failed to save the subscription.");
    }
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: "DELETE",
      });
      await subscription.unsubscribe();
    }
    setSubscribed(false);
    setMessage("Push notifications disabled.");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={subscribed ? "outline" : "default"}
          disabled={pending}
          onClick={() => startTransition(() => void (subscribed ? unsubscribe() : subscribe()))}
        >
          {subscribed ? (
            <>
              <BellOff className="size-4" /> Disable push notifications
            </>
          ) : subscribed === null ? (
            <>
              <Check className="size-4" /> Push notifications enabled
            </>
          ) : (
            <>
              <Bell className="size-4" /> Enable push notifications
            </>
          )}
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
