/* SmartMediCare reminder worker: shows and focuses medicine reminders. Not an app-shell cache. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((client) => "focus" in client);
      if (existing) return existing.focus();
      return self.clients.openWindow("/home");
    })(),
  );
});
