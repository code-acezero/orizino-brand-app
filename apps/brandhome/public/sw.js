// ───────────────────────────────────────────────────────────────────────────
// Orizino Service Worker  –  Web Push + PWA offline shell
// Version: 2.0.0
// ───────────────────────────────────────────────────────────────────────────

const CACHE_NAME   = "orizino-shell-v2";
const OFFLINE_URL  = "/";          // fallback page for navigation misses

// ── Install: pre-cache the offline shell ──────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL]).catch(() => { /* best-effort */ })
    )
  );
  self.skipWaiting();
});

// ── Activate: prune old caches ────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// ── Fetch: network-first for API + SW registration, stale-while-revalidate
//   for static assets, offline fallback for navigation ───────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Skip Supabase / API calls — always live
  if (url.pathname.startsWith("/rest/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/functions/")) return;

  // Navigation requests: network-first, offline fallback
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? fetch(OFFLINE_URL))
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp|avif)(\?.*)?$/.test(url.pathname)) {
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
    return;
  }
});

// ── Push: rich notification rendering ────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (_) {
    data = { title: "Notification", body: e.data ? e.data.text() : "" };
  }

  const type  = data.type || "general";
  const isCall  = type === "call";
  const isOrder = type === "order";
  const isPromo = type === "promo";

  const title = data.title || (isCall ? "📞 Incoming Call" : isOrder ? "📦 Order Update" : "Orizino");
  const body  = data.body  || (isCall ? "A support agent is calling you" : "");
  const url   = data.url   || (isCall ? "/support" : isOrder ? "/orders" : "/");

  const options = {
    body,
    icon:             data.icon  || "/icons/icon-192.png",
    badge:            data.badge || "/icons/badge-72.png",
    image:            data.image || undefined,
    tag:              data.tag   || type,
    renotify:         true,
    requireInteraction: isCall,
    silent:           false,
    timestamp:        Date.now(),
    vibrate: isCall
      ? [400, 150, 400, 150, 400, 150, 400]
      : isOrder
      ? [200, 100, 200]
      : [100],
    data: { url, type, ...data.data },
    actions: isCall
      ? [
          { action: "accept",  title: "✅ Answer"  },
          { action: "decline", title: "❌ Decline" },
        ]
      : isOrder
      ? [
          { action: "view",    title: "View Order" },
          { action: "dismiss", title: "Dismiss"    },
        ]
      : [],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const data   = e.notification.data || {};
  const action = e.action;

  // Decline call or explicit dismiss → do nothing beyond closing
  if (action === "decline" || action === "dismiss") return;

  const target = data.url || "/";

  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Re-focus existing tab if URL matches
      for (const client of all) {
        if ((client.url.includes(target) || target === "/") && "focus" in client) {
          await client.focus();
          // Send message to the page so it can deep-link or highlight content
          client.postMessage({ type: "PUSH_CLICK", action, data });
          return;
        }
      }
      // Open new tab
      const newClient = await self.clients.openWindow(target);
      // Post message after a brief delay so the page has time to boot
      if (newClient) {
        setTimeout(() => {
          newClient.postMessage({ type: "PUSH_CLICK", action, data });
        }, 1000);
      }
    })()
  );
});

// ── Push subscription change: auto-renew ─────────────────────────────────
self.addEventListener("pushsubscriptionchange", (e) => {
  // Notify all open clients so they can re-subscribe via the push.ts lib
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" }));
    })
  );
});

// ── Message channel: allow page to send commands ──────────────────────────
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
