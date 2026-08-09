# Order Ops

A mobile-first (iOS/macOS-styled) order management app for Orizino staff:
dashboard, barcode scanner, online orders, and offline orders — all in one
place, separate from the full Master Panel.

## Why this app is architected differently from masterpanel/storefront/company

Those three apps run on **TanStack Start** (SSR, server functions, a Node
server at runtime). Order Ops is deliberately a **plain client-only Vite +
React SPA** instead, for one reason: it needs to be wrappable into a native
Android (and later iOS) app via **Capacitor**, and Capacitor wraps a static
`dist/` bundle in a WebView — there's no Node server on the device to run
server functions against.

To make that possible:

- **No server functions.** Business logic that in masterpanel lives in
  `lib/*.functions.ts` (TanStack Start server functions) is ported here as
  plain functions in `src/lib/*.ts` that call Supabase directly from the
  browser. This is safe because the security boundary was never "runs on a
  server" — it's Postgres Row Level Security (`has_section_access(uid,
  'sales')`), which applies identically whether the query comes from a
  server function or straight from the client with the same logged-in
  session. See the comments in `src/lib/offline-orders.ts` and
  `src/lib/serials.ts`.
- **Invoices/email** go through the existing `generate-invoice` Supabase Edge
  Function (`src/lib/invoice.ts`) instead of a server-only Resend call —
  edge functions are reachable from any client with the anon key, so no
  Node server is needed for that either.
- **Relative asset paths** (`vite.config.ts` sets `base: "./"`) and a
  **HashRouter** (`src/App.tsx`) — both so the built app works when served
  from Capacitor's local WebView root, which isn't `/`, and without needing
  any server-side SPA-fallback rewrite rule.
- **`capacitor.config.ts`** is already checked in and pre-configured
  (`appId: com.orizino.orderops`, `webDir: dist`) so there's no restructuring
  needed later — just the CLI steps below.

## Local development

```bash
npm install --workspace=apps/orderops
npm run dev:orderops        # http://localhost:3003
```

Staff sign in with the same Supabase auth account they use for Master
Panel. Access is gated on `has_section_access(uid, 'sales')` — the same
check the database itself enforces — so anyone who can currently do Sales
work in Master Panel can sign into Order Ops immediately, no extra setup.

## Deploying as a website (e.g. ops.orizino.com)

`netlify.toml` is already set up: point a new Netlify site at this repo,
same as the other three apps, with `apps/orderops` conventions (build
command `npm run build:orderops`, publish `dist`). No redirect rules needed
because of HashRouter.

## Converting to an Android APK (Capacitor)

This turns the exact same web app into an installable `.apk`/`.aab`. Do
this on a machine with Android Studio + the Android SDK installed (not
needed for web development, only for this step).

```bash
# 1. From apps/orderops — install the Capacitor CLI/core (already in
#    package.json devDependencies) and the Android platform package.
npm install --workspace=apps/orderops

# 2. Build the static web bundle Capacitor will wrap.
npm run build --workspace=apps/orderops

# 3. One-time: scaffold the native Android project. This reads
#    capacitor.config.ts (already committed) — no prompts needed.
cd apps/orderops
npx cap add android

# 4. Copy the web build into the native project + sync native deps.
npx cap sync android

# 5. Open in Android Studio to run on a device/emulator, or build a
#    release APK/AAB from there (Build > Generate Signed Bundle / APK).
npx cap open android
```

After the first `cap add android`, whenever the web app changes:

```bash
npm run build --workspace=apps/orderops
npx cap sync android
```

then rebuild in Android Studio (or `npx cap run android` for a quick test
on a connected device/emulator).

### Notes for the Android build specifically

- **Camera permission**: Capacitor's Android template already declares
  `<uses-permission android:name="android.permission.CAMERA" />` when a
  camera API is used via the WebView's `getUserMedia` — Android 6+ will
  still prompt the user the first time the scanner opens, same as on the
  web.
- **`android:allowMixedContent`** is set to `false` in `capacitor.config.ts`
  — the app only ever talks to `https://` endpoints (Supabase + edge
  functions), so this is safe to leave as-is.
- If you later want push notifications, deep links, or an iOS build too,
  those are additive — `npx cap add ios` works the same way once you're on
  a Mac with Xcode, no changes needed to this web app.

## App structure

```
src/
  lib/            Supabase-direct business logic (no server functions)
  components/     AppShell (adaptive sidebar/tab-bar), BarcodeScanner
  pages/           Login, Dashboard, Orders, OfflineOrders, Scanner
  styles/globals.css   iOS/macOS design tokens (System Gray 6, iOS blue, SF font stack)
```
