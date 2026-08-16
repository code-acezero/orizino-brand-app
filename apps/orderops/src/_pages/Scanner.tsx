import { useState } from "react";
import { BarcodeScanner, ScannerLaunchCard } from "@/components/BarcodeScanner";
import { lookupSerial, type SerialLookupRow } from "@/lib/serials";
import { PackageCheck, PackageX, ScanLine } from "lucide-react";
import { extractSerialCode } from "@orizino/shared";

const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-700",
  sold: "bg-blue-500/15 text-blue-700",
  returned: "bg-amber-500/15 text-amber-700",
  defective: "bg-red-500/15 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

export function Scanner() {
  const [active, setActive] = useState(false);
  const [history, setHistory] = useState<{ code: string; row: SerialLookupRow | null }[]>([]);

  const handleScan = async (rawCode: string) => {
    const code = extractSerialCode(rawCode);
    if (!code) return;
    try {
      const row = await lookupSerial(code);
      setHistory((prev) => [{ code, row }, ...prev].slice(0, 30));
    } catch {
      setHistory((prev) => [{ code, row: null }, ...prev].slice(0, 30));
    }
  };

  if (active) {
    return <BarcodeScanner active onToggle={() => setActive(false)} onScan={(code) => void handleScan(code)} />;
  }

  return (
    <div className="space-y-4 pt-1 pb-4">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight">Scanner</h1>
        <p className="text-sm text-muted-foreground">Quick lookup — check a serial's status without starting an order</p>
      </div>

      <ScannerLaunchCard onOpen={() => setActive(true)} />

      <div className="space-y-2">
        {history.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card py-10 text-center text-muted-foreground">
            <ScanLine className="w-8 h-8 opacity-40" />
            <p className="text-sm">Scanned codes will show up here</p>
          </div>
        )}
        {history.map((h, i) => (
          <div key={`${h.code}-${i}`} className="rounded-2xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
            {h.row ? <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" /> : <PackageX className="w-4 h-4 text-destructive shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-mono truncate">{h.code}</p>
              <p className="text-xs text-muted-foreground truncate">{h.row?.products?.name ?? "Unknown serial"}</p>
            </div>
            {h.row && (
              <span className={`text-[11px] px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_STYLE[h.row.status] ?? "bg-muted"}`}>{h.row.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
