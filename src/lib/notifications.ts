/** Local (on-device) reminder notifications. Works in the browser and inside an Android WebView/PWA. */

const SW_URL = "/reminders-sw.js";

export type ReminderPermission = "granted" | "denied" | "default" | "unsupported";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function reminderPermission(): ReminderPermission {
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
  if (!notificationsSupported()) return "unsupported";
  const result = (await Notification.requestPermission()) as ReminderPermission;
  if (result === "granted") await getRegistration();
  return result;
}

export async function showReminder(title: string, body: string, tag = "smc-reminder") {
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
  if ("vibrate" in navigator) navigator.vibrate?.([250, 120, 250]);
  return true;
}

export type ReminderItem = { key: string; at: Date; title: string; body: string };

let timers: number[] = [];

/** Replaces all pending in-app reminder timers with the given list. */
export function scheduleReminders(items: ReminderItem[]) {
  clearReminders();
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
