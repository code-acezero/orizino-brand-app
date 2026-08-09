"use client";
import React, { useEffect, useState } from "react";
import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { useQueryClient } from "@tanstack/react-query";
import AdminRoute from "@/components/AdminRoute";
import { BarcodeScanner } from "@/components/admin/products/BarcodeScanner";
import { useScannerAccess, useScannerAudit } from "@/hooks/use-scanner-access";
import { useScannerPrefs, pushScan } from "@/lib/scanner-prefs";
import { lookupSerial, scanSerial } from "@/lib/serials.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ScanLine, Lock } from "lucide-react";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — Orizino" },
      { name: "description", content: "Standalone barcode scanner." },
      { name: "theme-color", content: "#c8102e" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Scanner" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
  }),
  component: ScannerStandalone,
});

const STATUS_TONE: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sold: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  returned: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  defective: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function ScannerStandalone() {
  // Swap manifest + theme color so Chrome installs THIS as the app
  useEffect(() => {
    const manifestLink =
      (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null) ??
      (() => {
        const l = document.createElement("link");
        l.rel = "manifest";
        document.head.appendChild(l);
        return l;
      })();
    const prevManifest = manifestLink.getAttribute("href");
    manifestLink.setAttribute("href", "/scanner-manifest.webmanifest");

    const themeMeta =
      (document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null) ??
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "theme-color");
        document.head.appendChild(m);
        return m;
      })();
    const prevTheme = themeMeta.getAttribute("content");
    themeMeta.setAttribute("content", "#c8102e");

    return () => {
      if (prevManifest) manifestLink.setAttribute("href", prevManifest);
      if (prevTheme) themeMeta.setAttribute("content", prevTheme);
    };
  }, []);

  return (
    <AdminRoute>
      <ScannerShell />
    </AdminRoute>
  );
}

function ScannerShell() {
  const { allowed, loading } = useScannerAccess();
  const audit = useScannerAudit();
  const [prefs] = useScannerPrefs();
  const lookup = useServerFn(lookupSerial);
  const scan = useServerFn(scanSerial);
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function handleCode(code: string, ctx?: { mode?: "camera" | "hid" | "manual"; raw?: string }) {
    const mode = ctx?.mode ?? "manual";
    const raw = ctx?.raw ?? code;
    try {
      const row: any = await lookup({ data: { code } });
      if (!row) {
        pushScan({ code, mode, status: "rejected", reason: "unknown serial", raw });
        void audit.reject(code, mode, "unknown serial");
        toast({ title: "Unknown serial", description: code, variant: "destructive" });
        return;
      }
      pushScan({ code, mode, status: "success", raw });
      void audit.scan(code, mode);
      setCurrent(row);
    } catch (e: any) {
      pushScan({ code, mode, status: "rejected", reason: e?.message ?? "lookup failed", raw });
      void audit.reject(code, mode, e?.message ?? "lookup failed");
      toast({ title: "Lookup failed", description: e?.message, variant: "destructive" });
    }
  }

  async function doAction(action: "sell" | "cancel" | "return" | "defective") {
    if (!current || busy) return;
    setBusy(true);
    try {
      const r: any = await scan({ data: { code: current.serial_code, action } });
      toast({ title: `Marked ${r.status}`, description: current.serial_code });
      qc.invalidateQueries({ queryKey: ["serials"] });
      setCurrent(null);
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  void prefs;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="w-9 h-9 rounded-xl bg-[#c8102e]/15 border border-[#c8102e]/40 flex items-center justify-center">
          <ScanLine className="w-4 h-4 text-[#ff5064]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">Orizino Scanner</p>
          <p className="text-[11px] text-white/50 mt-1">Serials · Barcodes · QR</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg w-full mx-auto">
        {loading ? (
          <div className="text-center text-sm text-white/50 py-10">Checking access…</div>
        ) : !allowed ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-semibold">Scanner access restricted</h3>
            <p className="text-sm text-white/50">Ask an admin to grant Products section access.</p>
          </div>
        ) : (
          <>
            <BarcodeScanner
              active={active}
              onToggle={() => setActive((v) => !v)}
              onScan={(c, ctx) => handleCode(c, ctx)}
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <label className="text-xs text-white/60">Enter manually</label>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="ORZ-PRD-000123"
                  className="font-mono bg-black/40 border-white/10"
                />
                <Button
                  onClick={() =>
                    manualCode && handleCode(manualCode.trim(), { mode: "manual", raw: manualCode })
                  }
                >
                  Look up
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 min-h-[9rem]">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Last scan</p>
              {current ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Serial</span>
                    <span className="font-mono truncate">{current.serial_code}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Product</span>
                    <span className="truncate">{current.products?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3 items-center">
                    <span className="text-white/50">Status</span>
                    <Badge className={STATUS_TONE[current.status] ?? "bg-white/10"}>
                      {current.status}
                    </Badge>
                  </div>
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    {current.status === "available" && (
                      <Button size="sm" disabled={busy} onClick={() => doAction("sell")}>
                        Mark sold
                      </Button>
                    )}
                    {current.status === "sold" && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => doAction("cancel")}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => doAction("return")}>
                          Return
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => doAction("defective")}
                    >
                      Defective
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/40">Scan or enter a serial to see details.</p>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="p-3 text-center text-[10px] text-white/30">
        Install to home screen for a standalone app.
      </footer>
    </div>
  );
}
