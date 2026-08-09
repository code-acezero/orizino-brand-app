"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Download, Copy, Trash2, History, TerminalSquare, Settings2,
  CheckCircle2, XCircle, Camera, Keyboard, PenLine,
} from "lucide-react";
import {
  useScanHistory, useScannerPrefs, scansToCsv, downloadFile,
  type ScanEntry, type ScanMode, type ScanStatus, type ScannerPrefs,
  DEFAULT_PREFS,
} from "@/lib/scanner-prefs";

/* ------------------------------------------------------------------ */
/* Scan History                                                        */
/* ------------------------------------------------------------------ */

const MODE_ICON: Record<ScanMode, JSX.Element> = {
  camera: <Camera className="w-3 h-3" aria-hidden />,
  hid: <Keyboard className="w-3 h-3" aria-hidden />,
  manual: <PenLine className="w-3 h-3" aria-hidden />,
};

export function ScannerHistoryPanel() {
  const { items, clear } = useScanHistory();
  const [mode, setMode] = useState<"all" | ScanMode>("all");
  const [status, setStatus] = useState<"all" | ScanStatus>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (mode !== "all" && e.mode !== mode) return false;
      if (status !== "all" && e.status !== status) return false;
      if (q && !e.code.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, mode, status, q]);

  const exportCsv = () => {
    downloadFile(`scan-history-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", scansToCsv(filtered));
  };

  return (
    <section className="rounded-xl border border-border p-3 sm:p-4 bg-card/50 space-y-3 min-w-0">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4 text-primary" />Scan history</h3>
        <Badge variant="outline" className="ml-1">{filtered.length}/{items.length}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-3.5 h-3.5 mr-1" />CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={!items.length}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search code…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
        <Select value={mode} onValueChange={(v) => setMode(v as any)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="camera">Camera</SelectItem>
            <SelectItem value="hid">Physical (HID)</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="success">Successful</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Time</th>
                <th className="text-left px-2 py-1.5 font-medium">Code</th>
                <th className="text-left px-2 py-1.5 font-medium">Mode</th>
                <th className="text-left px-2 py-1.5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-6">No scans yet.</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border/50">
                  <td className="px-2 py-1.5 whitespace-nowrap font-mono text-[11px]">{new Date(e.ts).toLocaleTimeString()}</td>
                  <td className="px-2 py-1.5 font-mono">{e.code}</td>
                  <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1">{MODE_ICON[e.mode]}{e.mode}</span></td>
                  <td className="px-2 py-1.5">
                    {e.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" />success</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive" title={e.reason}>
                        <XCircle className="w-3 h-3" />rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Test Panel                                                          */
/* ------------------------------------------------------------------ */

export function ScannerTestPanel() {
  const { items } = useScanHistory();
  const last100 = items.slice(0, 100);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(last100, null, 2));
      toast({ title: "Copied", description: `${last100.length} scans copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };
  const downloadJson = () => {
    downloadFile(`scanner-debug-${Date.now()}.json`, "application/json", JSON.stringify(last100, null, 2));
  };

  return (
    <section className="rounded-xl border border-border p-3 sm:p-4 bg-card/50 space-y-3 min-w-0">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold flex items-center gap-2"><TerminalSquare className="w-4 h-4 text-primary" />Test panel</h3>
        <Badge variant="outline" className="ml-1">{last100.length} events</Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={copyJson} disabled={!last100.length}>
            <Copy className="w-3.5 h-3.5 mr-1" />Copy JSON
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJson} disabled={!last100.length}>
            <Download className="w-3.5 h-3.5 mr-1" />Download
          </Button>
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        Live raw input log for troubleshooting. Each row shows the raw string, timestamp and detected input mode.
      </p>
      <div className="rounded-lg border border-border bg-black/90 text-emerald-300 font-mono text-[11px] max-h-64 overflow-auto p-2">
        {last100.length === 0 ? (
          <div className="text-white/40 text-center py-6">Waiting for scans…</div>
        ) : (
          last100.map((e) => (
            <div key={e.id} className="whitespace-pre">
              <span className="text-white/50">{new Date(e.ts).toISOString()}</span>
              {"  "}<span className={e.status === "success" ? "text-emerald-400" : "text-red-400"}>[{e.status}]</span>
              {"  "}<span className="text-amber-300">[{e.mode}]</span>
              {"  "}<span>{JSON.stringify(e.raw ?? e.code)}</span>
              {e.reason ? <span className="text-red-300"> — {e.reason}</span> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Settings Dialog                                                     */
/* ------------------------------------------------------------------ */

export function ScannerSettingsButton() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useScannerPrefs();
  const [draft, setDraft] = useState<ScannerPrefs>(prefs);

  const openDialog = () => { setDraft(prefs); setOpen(true); };
  const save = () => { setPrefs(draft); setOpen(false); toast({ title: "Scanner settings saved" }); };
  const reset = () => setDraft(DEFAULT_PREFS);

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog}>
        <Settings2 className="w-3.5 h-3.5 mr-1" />Scanner settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Scanner settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Target action for a completed scan</Label>
              <Select value={draft.action} onValueChange={(v) => setDraft({ ...draft, action: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lookup">Search / look up product</SelectItem>
                  <SelectItem value="add_to_order">Add to current order</SelectItem>
                  <SelectItem value="focus_input">Focus a specific input</SelectItem>
                </SelectContent>
              </Select>
              {draft.action === "focus_input" && (
                <Input
                  className="mt-2 font-mono"
                  placeholder='CSS selector, e.g. #order-search'
                  value={draft.focusSelector}
                  onChange={(e) => setDraft({ ...draft, focusSelector: e.target.value })}
                />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Debounce (ms)</Label>
                <Input
                  type="number" min={0} max={5000}
                  value={draft.debounceMs}
                  onChange={(e) => setDraft({ ...draft, debounceMs: Math.max(0, Number(e.target.value) || 0) })}
                />
                <p className="text-[11px] text-muted-foreground">Ignore repeat scans of the same code within this window.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Min. code length</Label>
                <Input
                  type="number" min={1} max={64}
                  value={draft.minLength}
                  onChange={(e) => setDraft({ ...draft, minLength: Math.max(1, Number(e.target.value) || 1) })}
                />
                <p className="text-[11px] text-muted-foreground">Shorter HID inputs are treated as typing.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Enter / Tab behaviour after scan</Label>
              <Select value={draft.enterBehavior} onValueChange={(v) => setDraft({ ...draft, enterBehavior: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commit">Enter = commit scan (default)</SelectItem>
                  <SelectItem value="tab">Emit Tab to move focus</SelectItem>
                  <SelectItem value="none">Do nothing (no keystroke replay)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Max ms between HID keystrokes</Label>
              <Input
                type="number" min={10} max={500}
                value={draft.fastMs}
                onChange={(e) => setDraft({ ...draft, fastMs: Math.max(10, Number(e.target.value) || 50) })}
              />
              <p className="text-[11px] text-muted-foreground">Keystrokes faster than this are treated as a physical scanner.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={reset}>Reset defaults</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
