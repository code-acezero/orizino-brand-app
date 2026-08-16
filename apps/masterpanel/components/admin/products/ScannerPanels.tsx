"use client";
import React, { useMemo, useState } from "react";
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

const MODE_ICON: Record<ScanMode, React.ReactNode> = {
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
    <div className="space-y-3 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {filtered.length} of {items.length} records
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length} className="h-8 text-xs rounded-lg">
            <Download className="w-3.5 h-3.5 mr-1" />Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={!items.length} className="h-8 text-xs text-muted-foreground hover:text-destructive rounded-lg">
            <Trash2 className="w-3.5 h-3.5 mr-1" />Clear Log
          </Button>
        </div>
      </header>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
        <Input placeholder="Filter by code or serial…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs font-mono rounded-lg bg-secondary/30" />
        <Select value={mode} onValueChange={(v) => setMode(v as any)}>
          <SelectTrigger className="h-8 text-xs rounded-lg bg-secondary/30"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All modes</SelectItem>
            <SelectItem value="camera" className="text-xs">Camera</SelectItem>
            <SelectItem value="hid" className="text-xs">Physical (HID)</SelectItem>
            <SelectItem value="manual" className="text-xs">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="h-8 text-xs rounded-lg bg-secondary/30"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All results</SelectItem>
            <SelectItem value="success" className="text-xs">Successful</SelectItem>
            <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="max-h-72 overflow-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0 border-b border-border/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Time</th>
                <th className="text-left px-3 py-2 font-semibold">Code / Serial</th>
                <th className="text-left px-3 py-2 font-semibold">Source</th>
                <th className="text-left px-3 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-8 text-xs">No scan events recorded yet.</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</td>
                  <td className="px-3 py-2 font-mono font-medium text-foreground">{e.code}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 capitalize text-[11px] text-muted-foreground">
                      {MODE_ICON[e.mode]}
                      {e.mode}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {e.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium text-[11px]" title={e.reason}>
                        <XCircle className="w-3 h-3" /> rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
    <div className="space-y-3 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {last100.length} raw buffer frames
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyJson} disabled={!last100.length} className="h-8 text-xs rounded-lg">
            <Copy className="w-3.5 h-3.5 mr-1" />Copy JSON
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJson} disabled={!last100.length} className="h-8 text-xs rounded-lg">
            <Download className="w-3.5 h-3.5 mr-1" />Download Log
          </Button>
        </div>
      </header>

      <p className="text-xs text-muted-foreground">
        Live monospace raw input log showing raw scanned sequences, timestamps, and active input wedge modes.
      </p>

      <div className="rounded-xl border border-border/70 bg-black/95 text-emerald-400 font-mono text-[11px] max-h-64 overflow-auto p-3 space-y-1">
        {last100.length === 0 ? (
          <div className="text-white/40 text-center py-8">Waiting for raw barcode inputs…</div>
        ) : (
          last100.map((e) => (
            <div key={e.id} className="whitespace-pre flex items-center gap-2 py-0.5 border-b border-white/5 last:border-0">
              <span className="text-white/40 text-[10px]">{new Date(e.ts).toISOString().slice(11, 23)}</span>
              <span className={e.status === "success" ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                [{e.status}]
              </span>
              <span className="text-amber-300">[{e.mode}]</span>
              <span className="text-white/90">{JSON.stringify(e.raw ?? e.code)}</span>
              {e.reason ? <span className="text-red-400 text-[10px]"> — {e.reason}</span> : null}
            </div>
          ))
        )}
      </div>
    </div>
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
      <Button size="sm" variant="outline" onClick={openDialog} className="h-8 text-xs rounded-xl cursor-pointer">
        <Settings2 className="w-3.5 h-3.5 mr-1" />Settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Scanner Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs sm:text-sm py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target action for a completed scan</Label>
              <Select value={draft.action} onValueChange={(v) => setDraft({ ...draft, action: v as any })}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lookup" className="text-xs">Search / look up product</SelectItem>
                  <SelectItem value="add_to_order" className="text-xs">Add to current order</SelectItem>
                  <SelectItem value="focus_input" className="text-xs">Focus a specific input</SelectItem>
                </SelectContent>
              </Select>
              {draft.action === "focus_input" && (
                <Input
                  className="mt-2 font-mono h-8 text-xs rounded-xl"
                  placeholder='CSS selector, e.g. #order-search'
                  value={draft.focusSelector}
                  onChange={(e) => setDraft({ ...draft, focusSelector: e.target.value })}
                />
              )}
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Debounce (ms)</Label>
                <Input
                  type="number" min={0} max={5000}
                  className="h-8 text-xs rounded-xl"
                  value={draft.debounceMs}
                  onChange={(e) => setDraft({ ...draft, debounceMs: Math.max(0, Number(e.target.value) || 0) })}
                />
                <p className="text-[11px] text-muted-foreground leading-tight">Ignore repeat scans of same code within this window.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Min. code length</Label>
                <Input
                  type="number" min={1} max={64}
                  className="h-8 text-xs rounded-xl"
                  value={draft.minLength}
                  onChange={(e) => setDraft({ ...draft, minLength: Math.max(1, Number(e.target.value) || 1) })}
                />
                <p className="text-[11px] text-muted-foreground leading-tight">Shorter HID inputs are treated as typing.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Enter / Tab behaviour after scan</Label>
              <Select value={draft.enterBehavior} onValueChange={(v) => setDraft({ ...draft, enterBehavior: v as any })}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commit" className="text-xs">Enter = commit scan (default)</SelectItem>
                  <SelectItem value="tab" className="text-xs">Emit Tab to move focus</SelectItem>
                  <SelectItem value="none" className="text-xs">Do nothing (no keystroke replay)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Max ms between HID keystrokes</Label>
              <Input
                type="number" min={10} max={500}
                className="h-8 text-xs rounded-xl"
                value={draft.fastMs}
                onChange={(e) => setDraft({ ...draft, fastMs: Math.max(10, Number(e.target.value) || 50) })}
              />
              <p className="text-[11px] text-muted-foreground leading-tight">Keystrokes arriving faster than this are treated as physical scanner.</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-xs rounded-xl">Reset defaults</Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs rounded-xl">Cancel</Button>
            <Button size="sm" onClick={save} className="h-8 text-xs font-semibold rounded-xl">Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
