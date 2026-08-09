/**
 * Route `beforeLoad` auth redirects are intentionally disabled for this app.
 *
 * The Supabase session on this project lives in `localStorage` (the browser
 * client), and TanStack route lifecycle checks can run before the restored
 * session has reached React context. Redirecting from `beforeLoad` during that
 * gap causes `/` ↔ `/auth` loops in the Lovable preview.
 *
 * Protected screens are guarded by `AdminRoute`, which waits for the local
 * auth provider to finish restoring Supabase state before rendering or sending
 * users to `/auth`. Data access remains protected by Supabase/RLS and the
 * authenticated server-function middleware.
 */
export async function redirectIfUnauthenticated() {
  return;
}

export async function redirectIfAuthenticated() {
  return;
}
// code:4ce0
