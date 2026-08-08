/**
 * Reminder notifications.
 * On Android (Capacitor shell) these are real scheduled OS notifications that
 * fire even when the app is closed. On the web they fall back to browser
 * notifications driven by in-page timers.
 */

import {
  isNative,
  nativeBuzz,
  nativeRequestNotifications,
  nativeScheduleReminders,
  nativeShowNow,
} from "@/lib/native";

const SW_URL = "/reminders-sw.js";

export type ReminderPermission = "granted" | "denied" | "default" | "unsupported";

export function notificationsSupported() {
  if (isNative()) return true;
  return typeof window !== "undefined" && "Notification" in window;
}

export function reminderPermission(): ReminderPermission {
  if (isNative()) return "granted";
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission as ReminderPermission;
}

let swRegistration: ServiceWorkerRegistration | null = null;

async function getRegistration() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    return swRegistration;
  } catch {
    return null;
  }
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (isNative()) {
    const result = await nativeRequestNotifications();
    return result === "granted" ? "granted" : "denied";
  }
  if (!notificationsSupported()) return "unsupported";
  const result = (await Notification.requestPermission()) as ReminderPermission;
  if (result === "granted") await getRegistration();
  return result;
}

export async function showReminder(title: string, body: string, tag = "smc-reminder") {
  if (isNative()) {
    const ok = await nativeShowNow(title, body);
    void nativeBuzz(true);
    return ok;
  }
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: document.documentElement.lang || "en",
    requireInteraction: true,
  };
  const registration = await getRegistration();
  if (registration) {
    await registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
  void nativeBuzz(true);
  return true;
}

export type ReminderItem = { key: string; at: Date; title: string; body: string };

let timers: number[] = [];

/** Replaces all pending reminders with the given list. */
export function scheduleReminders(items: ReminderItem[]) {
  clearReminders();
  if (isNative()) {
    void nativeScheduleReminders(items);
    return items.length;
  }
  if (!notificationsSupported() || Notification.permission !== "granted") return 0;
  const now = Date.now();
  let scheduled = 0;
  for (const item of items) {
    const delay = item.at.getTime() - now;
    // Only schedule within the next 12 hours; the list is rebuilt as data changes.
    if (delay <= 0 || delay > 12 * 60 * 60 * 1000) continue;
    const id = window.setTimeout(() => {
      void showReminder(item.title, item.body, item.key);
    }, delay);
    timers.push(id);
    scheduled += 1;
  }
  return scheduled;
}

export function clearReminders() {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
}
