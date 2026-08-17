// ───────────────────────────────────────────────────────────────────────────
// Orizino Order Ops Service Worker  –  Web Push + PWA offline shell
// Version: 2.0.0  (HashRouter / Capacitor-compatible)
// ───────────────────────────────────────────────────────────────────────────

const CACHE_NAME  = "orderops-shell-v2";
const OFFLINE_URL = "./"; // relative so Capacitor file:// scheme works

// ── Install ───────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL]).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// ── Fetch: static asset cache, bypass API ────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip Supabase / remote API
  if (!url.hostname.includes("localhost") &&
      !url.protocol.startsWith("file") &&
      url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/rest/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/functions/")) return;

  // Static assets: stale-while-revalidate
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached ?? fetchPromise;
      })
    );
  }
});

// ── Push: rich notifications ──────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch (_) { data = { title: "Notification", body: e.data ? e.data.text() : "" }; }

  const type   = data.type || "general";
  const isCall = type === "call";
  const title  = data.title || (isCall ? "📞 Incoming Call" : "Order Ops");
  const body   = data.body  || (isCall ? "A support agent is calling you" : "");

  const options = {
    body,
    icon:               data.icon  || "./icons/icon-192.png",
    badge:              data.badge || "./icons/badge-72.png",
    tag:                data.tag   || type,
    renotify:           true,
    requireInteraction: isCall,
    vibrate: isCall ? [400, 150, 400, 150, 400] : [200, 100, 200],
    data:    { url: data.url || "./", type, ...data.data },
    actions: isCall
      ? [{ action: "accept", title: "✅ Answer" }, { action: "decline", title: "❌ Decline" }]
      : [],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "decline") return;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      if (all.length > 0 && "focus" in all[0]) {
        all[0].focus();
        all[0].postMessage({ type: "PUSH_CLICK", action: e.action, data: e.notification.data });
      } else if (self.clients.openWindow) {
        self.clients.openWindow("./");
      }
    })
  );
});

// ── Subscription change ───────────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" }));
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
