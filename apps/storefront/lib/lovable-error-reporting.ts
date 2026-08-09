// Stub: Lovable error reporting is not needed in Next.js deployments
export function reportError(_error: unknown, _context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", _error, _context);
  }
}
