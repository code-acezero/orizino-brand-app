// Orizino service worker — handles web push notifications & call rings
const CACHE_NAME = "orizino-shell-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "Notification", body: event.data ? event.data.text() : "" };
  }

  const isCall = data.type === "call";
  const title = data.title || (isCall ? "Incoming call" : "Notification");
  const body = data.body || (isCall ? "A support agent is calling you" : "");
  const url = data.url || (isCall ? "/support" : "/");

  const options = {
    body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    image: data.image,
    tag: data.tag || (isCall ? "incoming-call" : "default"),
    renotify: true,
    requireInteraction: !!isCall,
    vibrate: isCall ? [400, 200, 400, 200, 400, 200, 400] : [200, 100, 200],
    silent: false,
    data: { url, type: data.type, ...data.data },
    actions: isCall
      ? [
          { action: "accept", title: "Answer" },
          { action: "decline", title: "Decline" },
        ]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = event.action === "decline" ? "/" : data.url || "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(target) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })()
  );
});

// Fallback: cache nothing — keep behavior simple to avoid stale shells
self.addEventListener("fetch", () => {});
