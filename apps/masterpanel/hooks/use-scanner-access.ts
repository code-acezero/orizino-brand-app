"use client";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logScannerAccess } from "@/lib/scanner.functions";

/**
 * Role-based access to the barcode scanner.
 * Access is granted to:
 *   - admin
 *   - moderator
 *   - anyone with staff_section_access for section "products"
 *
 * Also fires an audit-log entry the first time the scanner is opened
 * per session for this user.
 */
export function useScannerAccess(logOnGrant = true) {
  const { user, loading: authLoading } = useAuth();
  const log = useServerFn(logScannerAccess);
  const [logged, setLogged] = useState(false);

  const q = useQuery({
    queryKey: ["scanner-access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [adm, mod, sec] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "moderator" }),
        supabase.rpc("has_section_access", { _user_id: user!.id, _section: "products" }),
      ]);
      return !!(adm.data || mod.data || sec.data);
    },
  });

  const allowed = q.data === true;
  const loading = authLoading || q.isLoading;

  useEffect(() => {
    if (!logOnGrant || !allowed || logged) return;
    setLogged(true);
    log({ data: { action: "scanner_opened" } }).catch(() => {});
  }, [allowed, logged, logOnGrant, log]);

  return { allowed, loading };
}

/** Best-effort audit log call. Errors are swallowed. */
export function useScannerAudit() {
  const log = useServerFn(logScannerAccess);
  return useMemo(() => ({
    scan: (code: string, mode: "camera" | "hid" | "manual") =>
      log({ data: { action: "scanner_scan", code, mode } }).catch(() => {}),
    reject: (code: string, mode: "camera" | "hid" | "manual", reason: string) =>
      log({ data: { action: "scanner_rejected", code, mode, reason } }).catch(() => {}),
  }), [log]);
}
