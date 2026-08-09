"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  listSubscribers,
  exportSubscribers,
  importSubscribers,
  bulkUpdateSubscribers,
} from "@/lib/subscribers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import SearchInput from "@/components/admin/SearchInput";
import DataToolbar from "@/components/admin/DataToolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/lib/app-toast";
import {
  AlertTriangle,
  AtSign,
  Download,
  Mail,
  RefreshCw,
  Upload,
  UserMinus,
} from "lucide-react";
import { EmptyState } from "@/components/admin/TableStates";
import { format } from "date-fns";

export default function AdminEmailSubscribers() {
  const fetchList = useServerFn(listSubscribers);
  const exp = useServerFn(exportSubscribers);
  const imp = useServerFn(importSubscribers);
  const bulk = useServerFn(bulkUpdateSubscribers);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "unsubscribed">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["subs", search, status],
    queryFn: () =>
      fetchList({ data: { search: search || undefined, status, limit: 500, offset: 0 } }),
    retry: false,
  });
  const items = data?.items ?? [];
  const loadError = error as Error | null;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const doExport = async () => {
    const ids = selected.size ? Array.from(selected) : undefined;
    const res = await exp({ data: { ids } });
    const blob = new Blob([res.body], { type: res.mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = res.filename;
    a.click();
  };
  const doImport = async () => {
    const entries: { email: string; name?: string }[] = [];
    const emailRe = /[^\s,<>"']+@[^\s,<>"']+\.[^\s,<>"']+/;
    for (const rawLine of importText.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      // Support: "Name <email@x.com>", "Name, email@x.com", "email@x.com, Name", "email@x.com"
      const angle = line.match(/^\s*(.*?)\s*<\s*([^>]+@[^>]+)\s*>\s*$/);
      if (angle) {
        const email = angle[2].trim();
        if (emailRe.test(email)) entries.push({ email, name: angle[1].trim() || undefined });
        continue;
      }
      const parts = line.split(/[,;\t]/).map((s) => s.trim()).filter(Boolean);
      const emailPart = parts.find((p) => emailRe.test(p));
      if (!emailPart) continue;
      const name = parts.filter((p) => p !== emailPart).join(" ").trim() || undefined;
      entries.push({ email: emailPart, name });
    }
    if (!entries.length) {
      toast.error("No valid emails");
      return;
    }
    const res = await imp({ data: { entries, source: "import" } });
    toast.success(`${res.inserted} of ${res.total} subscribed`);
    setImportOpen(false);
    setImportText("");
    qc.invalidateQueries({ queryKey: ["subs"] });
  };
  const doBulk = async (action: "unsubscribe" | "resubscribe" | "delete") => {
    if (!selected.size) return;
    await bulk({ data: { ids: Array.from(selected), action } });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["subs"] });
    toast.success("Updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <AtSign className="w-7 h-7" />
            Email Subscribers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} signups from footer, popups & imports
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={doExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Couldn't load subscribers</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {loadError.message || "An unexpected error occurred while talking to Supabase."}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DataToolbar
        left={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search email…"
          />
        }
        right={
          <>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <>
                <Badge variant="secondary">{selected.size} selected</Badge>
                <Button size="sm" variant="outline" onClick={() => doBulk("unsubscribe")}>
                  <UserMinus className="w-4 h-4 mr-1.5" />
                  Unsubscribe
                </Button>
                <Button size="sm" variant="outline" onClick={() => doBulk("resubscribe")}>
                  Resubscribe
                </Button>
                <Button size="sm" variant="destructive" onClick={() => doBulk("delete")}>
                  Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Tags</th>
              <th className="px-3 py-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Mail className="w-5 h-5" />}
                    message="No subscribers found"
                    hint={search ? "Try a different search or clear filters." : "Subscribers will appear here as customers sign up."}
                  />
                </td>
              </tr>
            )}
            {items.map((s: any) => (
              <tr key={s.id} className="border-t border-border/50 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                </td>
                <td className="px-3 py-2 text-sm">
                  {s.name || <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                <td className="px-3 py-2">
                  {s.is_active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="outline">Unsubscribed</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{s.source || "footer"}</td>
                <td className="px-3 py-2 text-xs space-x-1">
                  {(s.tags ?? []).map((t: string) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {format(new Date(s.created_at), "MMM d, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import subscribers</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            One per line. Supports <code>email@x.com</code>, <code>Name, email@x.com</code>, or <code>Name &lt;email@x.com&gt;</code>.
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Jane Doe, jane@example.com\nJohn Smith <john@example.com>\nhello@example.com"}
            rows={8}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// code:4ce0
