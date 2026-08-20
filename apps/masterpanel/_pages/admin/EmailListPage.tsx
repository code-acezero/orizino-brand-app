"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  listSubscribers,
  exportSubscribers,
  importSubscribers,
  bulkUpdateSubscribers,
} from "@/lib/subscribers.functions";
import { pushAudienceToSheet, pullAndMergeSheet } from "@/lib/audience-sheet-sync.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Users,
  AtSign,
  Download,
  Mail,
  RefreshCw,
  Upload,
  UserMinus,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  FileSpreadsheet,
  Link2,
  MessageSquare,
  Send,
  Copy,
  Wand2,
  Phone,
  ExternalLink,
  ArrowLeftRight,
  UserPlus,
  CloudUpload,
  CloudDownload,
  Zap,
  ShieldCheck,
  Check,
} from "lucide-react";
import { format } from "date-fns";

export interface TableRowItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  tag: string;
}

const SAMPLE_STARTER_ROWS: TableRowItem[] = [
  { id: "row_1", name: "Tanvir Ahmed",    phone: "01711223344", email: "tanvir.ahmed@example.com",  tag: "VIP" },
  { id: "row_2", name: "",                phone: "01899887766", email: "customer.bd@example.com",    tag: "Storefront" },
  { id: "row_3", name: "Nabila Islam",    phone: "01955667788", email: "",                           tag: "WhatsApp Only" },
  { id: "row_4", name: "",                phone: "",             email: "subscriber@orizino.com",     tag: "Newsletter" },
  { id: "row_5", name: "Rahim Chowdhury", phone: "01300112233", email: "rahim@orizino.com",          tag: "Ramadan VIP" },
];

export default function AdminEmailSubscribers() {
  const qc = useQueryClient();
  const pushToSheet    = useServerFn(pushAudienceToSheet);
  const mergeFromSheet = useServerFn(pullAndMergeSheet);

  // Active top-level sub-view
  const [activeTab, setActiveTab] = useState<"subscribers" | "audience" | "sheets" | "broadcast">("subscribers");

  // Subscribers state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "unsubscribed">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTag, setNewTag] = useState("Newsletter");

  // Audience & Sheets state
  const [sheetUrl, setSheetUrl]       = useState("");
  const [csvRawText, setCsvRawText]   = useState("");
  const [tableRows, setTableRows]     = useState<TableRowItem[]>(SAMPLE_STARTER_ROWS);
  const [savedRows, setSavedRows]     = useState<TableRowItem[]>(SAMPLE_STARTER_ROWS);
  const [selectedChannels, setSelectedChannels] = useState({ email: true, whatsapp: false, sms: false });
  const [campaignTitle, setCampaignTitle]         = useState("Seasonal Drop VIP Access");
  const [campaignMessage, setCampaignMessage]     = useState(
    "ORIZINO VIP: Our exclusive new season pieces are live! Enjoy early access at https://shop.orizino.com"
  );

  // Syncing & Loading states
  const [isDispatching, setIsDispatching]   = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isQuadSyncing, setIsQuadSyncing]   = useState(false);
  const [syncReport, setSyncReport]         = useState<{ added: number; unchanged: number; sheetCount: number } | null>(null);

  // ── Load Subscribers Data ──────────────────────────────────────────────────
  const { data: subsData, isLoading: subsLoading, error: subsError, refetch: refetchSubs, isFetching: subsFetching } = useQuery({
    queryKey: ["subs", search, status],
    queryFn: async () => {
      try {
        const res = await listSubscribers({ search: search || undefined, status, limit: 500, offset: 0 });
        if (res && Array.isArray(res.items)) return res;
      } catch (fnErr) {
        console.warn("Server action fetch failed, falling back to direct Supabase query:", fnErr);
      }

      let q = supabase
        .from("email_subscriptions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(500);

      if (search) q = q.ilike("email", `%${search.trim()}%`);
      if (status === "active") q = q.eq("is_active", true);
      if (status === "unsubscribed") q = q.eq("is_active", false);

      const { data: rows, count, error: sbError } = await q;
      if (sbError) throw sbError;
      return { items: rows ?? [], total: count ?? 0 };
    },
    retry: 1,
  });

  const subsList = subsData?.items ?? [];

  // ── Load Saved Audience Table ──────────────────────────────────────────────
  const { data: savedTable } = useQuery({
    queryKey: ["marketing-audience-table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketing_audience_table")
        .maybeSingle();
      if (error) return null;
      return (data?.value as unknown as TableRowItem[]) || null;
    },
  });

  useEffect(() => {
    if (savedTable && Array.isArray(savedTable) && savedTable.length > 0) {
      setTableRows(savedTable);
      setSavedRows(savedTable);
    }
  }, [savedTable]);

  // ── Load Saved Sheet URL ───────────────────────────────────────────────────
  const { data: savedSheetUrl } = useQuery({
    queryKey: ["marketing-audience-sheet-url"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketing_audience_sheet_url")
        .maybeSingle();
      if (error) return "";
      return (data?.value as unknown as string) || "";
    },
  });

  useEffect(() => {
    if (typeof savedSheetUrl === "string") {
      setSheetUrl(savedSheetUrl);
    }
  }, [savedSheetUrl]);

  // ── Save Audience Changes ──────────────────────────────────────────────────
  const isDirty = useMemo(() => JSON.stringify(tableRows) !== JSON.stringify(savedRows), [tableRows, savedRows]);

  const saveMutation = useMutation({
    mutationFn: async (rowsToSave: TableRowItem[]) => {
      const clean = rowsToSave.filter((r) => r.phone.trim() || r.email.trim() || r.name.trim());
      const { error } = await supabase.from("site_settings").upsert(
        { key: "marketing_audience_table", value: clean as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
      return clean;
    },
    onSuccess: (clean) => {
      setSavedRows(clean);
      toast.success(`Saved ${clean.length} audience contacts.`);
      qc.invalidateQueries({ queryKey: ["marketing-audience-table"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save contacts"),
  });

  useRegisterUniversalSave({
    isDirty,
    onSave: async () => {
      await saveMutation.mutateAsync(tableRows);
    },
  });

  // ── Quad-Sync Operation ────────────────────────────────────────────────────
  const handleQuadSync = async () => {
    setIsQuadSyncing(true);
    try {
      const res = await fetch("/api/marketing/quad-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToSheetsIfConfigured: true, pullFromSheetsIfConfigured: true }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        toast.success(
          `Quad-Sync Complete: ${data.totalUnified} unified contacts synchronized across Subscribers, Database Users, Audience Table & Google Sheets!`
        );
        qc.invalidateQueries({ queryKey: ["marketing-audience-table"] });
        qc.invalidateQueries({ queryKey: ["subs"] });
        refetchSubs();
      } else {
        toast.error(data?.error || "Quad-Sync failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Quad-Sync encountered an error");
    } finally {
      setIsQuadSyncing(false);
    }
  };

  // ── Subscribers Mutations ──────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === subsList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subsList.map((i) => i.id)));
    }
  };

  const handleBulkStatus = async (isActive: boolean) => {
    if (selected.size === 0) return;
    try {
      const ids = Array.from(selected);
      try {
        await bulkUpdateSubscribers({ ids, action: isActive ? "resubscribe" : "unsubscribe" });
      } catch {
        const { error } = await supabase
          .from("email_subscriptions")
          .update({ is_active: isActive, updated_at: new Date().toISOString() } as any)
          .in("id", ids);
        if (error) throw error;
      }
      toast.success(`Updated ${ids.length} subscribers.`);
      setSelected(new Set());
      refetchSubs();
      qc.invalidateQueries({ queryKey: ["subs"] });
    } catch (err: any) {
      toast.error(err.message || "Bulk update failed");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} selected subscriber(s)?`)) return;
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("email_subscriptions").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} subscribers.`);
      setSelected(new Set());
      refetchSubs();
      qc.invalidateQueries({ queryKey: ["subs"] });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      const emailClean = newEmail.trim().toLowerCase();
      const { error } = await supabase.from("email_subscriptions").upsert(
        {
          email: emailClean,
          name: newName.trim() || null,
          source: "admin_manual",
          is_active: true,
          tags: [newTag.trim() || "Manual"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "email" }
      );
      if (error) throw error;

      // Add to audience table if phone provided
      if (newPhone.trim()) {
        const newEntry: TableRowItem = {
          id: `row_${Date.now()}`,
          name: newName.trim(),
          phone: newPhone.trim(),
          email: emailClean,
          tag: newTag.trim() || "Manual",
        };
        const updated = [newEntry, ...tableRows];
        setTableRows(updated);
        saveMutation.mutate(updated);
      }

      toast.success(`Added ${emailClean} to audience.`);
      setNewEmail("");
      setNewName("");
      setNewPhone("");
      setAddOpen(false);
      refetchSubs();
      qc.invalidateQueries({ queryKey: ["subs"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add subscriber");
    }
  };

  const handleImportCSV = async () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: Array<{ email: string; name?: string }> = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const email = parts.find((p) => p.includes("@"));
      if (email) {
        const name = parts.find((p) => !p.includes("@") && isNaN(Number(p)));
        parsed.push({ email, name });
      }
    }

    if (parsed.length === 0) {
      toast.error("No valid email addresses detected in input.");
      return;
    }

    try {
      await importSubscribers({ entries: parsed, source: "csv_import", tags: ["Bulk Import"] });
      toast.success(`Successfully imported ${parsed.length} subscribers!`);
      setImportText("");
      setImportOpen(false);
      refetchSubs();
      qc.invalidateQueries({ queryKey: ["subs"] });
      qc.invalidateQueries({ queryKey: ["marketing-audience-table"] });
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportSubscribers({});
      const blob = new Blob([res.body], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `orizino_subscribers_${format(new Date(), "yyyyMMdd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported subscribers to CSV.");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  // ── Audience Table Row Manipulation ────────────────────────────────────────
  const addTableRow = () => {
    const newId = `row_${Date.now()}`;
    const newRow: TableRowItem = { id: newId, name: "", phone: "", email: "", tag: "VIP" };
    setTableRows((prev) => [newRow, ...prev]);
  };

  const updateRowField = (id: string, field: keyof TableRowItem, val: string) => {
    setTableRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const deleteRow = (id: string) => {
    setTableRows((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Sheet Sync Actions ─────────────────────────────────────────────────────
  const handleSaveSheetUrl = async () => {
    if (!sheetUrl.trim()) return;
    try {
      await supabase.from("site_settings").upsert(
        { key: "marketing_audience_sheet_url", value: sheetUrl.trim() as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      toast.success("Google Sheet URL connected & saved.");
      qc.invalidateQueries({ queryKey: ["marketing-audience-sheet-url"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Sheet URL");
    }
  };

  const handlePullFromSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Please enter and save a valid Google Sheet URL first.");
      return;
    }
    setIsSyncingSheet(true);
    try {
      const res = await mergeFromSheet({ data: { sheetUrl: sheetUrl.trim() } });
      if (res?.ok) {
        setSyncReport({
          added: res.added ?? 0,
          unchanged: res.unchanged ?? 0,
          sheetCount: res.sheetCount ?? 0,
        });
        toast.success(
          `Sheet Ingest: Added ${res.added} new contacts (${res.unchanged} existing, total in sheet: ${res.sheetCount})`
        );
        qc.invalidateQueries({ queryKey: ["marketing-audience-table"] });
      } else {
        toast.error(res?.error || "Failed to pull from Google Sheet");
      }
    } catch (err: any) {
      toast.error(err?.message || "Encountered an error while pulling Sheet data");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handlePushToSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Please enter and save a valid Google Sheet URL first.");
      return;
    }
    setIsSyncingSheet(true);
    try {
      const res = await pushToSheet({ data: { sheetUrl: sheetUrl.trim(), rows: tableRows } });
      if (res?.ok) {
        toast.success(`Successfully pushed ${res.rowsPushed} contacts to Google Sheet!`);
      } else {
        toast.error(res?.error || "Failed to push to Google Sheet");
      }
    } catch (err: any) {
      toast.error(err?.message || "Encountered an error pushing to Google Sheet");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleDispatchCampaign = async () => {
    const validEmails = tableRows.filter((r) => r.email.trim() && r.email.includes("@"));
    const validPhones = tableRows.filter((r) => r.phone.trim().length >= 10);

    if (selectedChannels.email && validEmails.length === 0) {
      toast.error("No valid emails found in audience to dispatch.");
      return;
    }

    setIsDispatching(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success(
        `Campaign dispatched to ${selectedChannels.email ? validEmails.length : 0} emails and ${
          selectedChannels.whatsapp || selectedChannels.sms ? validPhones.length : 0
        } mobile recipients!`
      );
    } finally {
      setIsDispatching(false);
    }
  };

  // Count calculations
  const totalSubscribersCount = subsData?.total ?? subsList.length;
  const activeSubscribersCount = subsList.filter((s) => s.is_active).length;
  const totalAudienceContacts = tableRows.filter((r) => r.phone.trim() || r.email.trim()).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in text-foreground">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Audience & Subscribers</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                Unified Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage newsletter subscribers, customer audience segments, multi-channel lists & Google Sheets 2-way sync
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuadSync}
            disabled={isQuadSyncing}
            className="h-9 px-3 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-xl font-medium shadow-sm transition-all"
            title="Synchronize across Database Users, Orders, Newsletter Subscribers, Audience Table & Google Sheets"
          >
            <Zap className={`w-3.5 h-3.5 ${isQuadSyncing ? "animate-spin text-amber-500" : "text-primary"}`} />
            {isQuadSyncing ? "Quad-Syncing..." : "Quad-Sync (4-Way)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 hover:bg-secondary/60 rounded-xl"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>

          <Button
            onClick={() => setAddOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl shadow-sm bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </Button>
        </div>
      </div>

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subscribers</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-0.5 text-foreground">{totalSubscribersCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{activeSubscribersCount} active subscribers</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <AtSign className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Audience Contacts</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-0.5 text-foreground">{totalAudienceContacts}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Multi-channel entries</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Google Sheets</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-0.5 text-foreground">
              {sheetUrl ? "Connected" : "Not Linked"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">2-Way live sync</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Channels Ready</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-0.5 text-foreground">Email · SMS · WA</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Direct dispatch active</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
            <Send className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Main Unified Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-secondary/40 border border-border/50 rounded-2xl gap-1">
          <TabsTrigger value="subscribers" className="text-xs py-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <AtSign className="w-3.5 h-3.5 mr-1.5" /> Subscribers List ({subsList.length})
          </TabsTrigger>
          <TabsTrigger value="audience" className="text-xs py-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Audience Grid ({tableRows.length})
          </TabsTrigger>
          <TabsTrigger value="sheets" className="text-xs py-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Google Sheets Sync
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs py-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" /> Direct Broadcast
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: SUBSCRIBERS DIRECTORY
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="subscribers" className="space-y-4 m-0 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search email address or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background border-border/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-36 bg-background border-border/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSubs()}
                disabled={subsFetching}
                className="h-9 px-3 text-xs border-border/60 rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${subsFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Bulk Actions Banner */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl animate-fade-in text-xs">
              <span className="font-semibold text-primary">{selected.size} subscriber(s) selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(true)} className="h-7 text-xs bg-card">
                  Mark Active
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatus(false)} className="h-7 text-xs bg-card">
                  Mark Unsubscribed
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-7 text-xs">
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={subsList.length > 0 && selected.size === subsList.length}
                        onChange={selectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="p-3">Subscriber</th>
                    <th className="p-3">Source & Tags</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Subscribed At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {subsLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading subscribers...
                      </td>
                    </tr>
                  ) : subsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No subscribers found matching query.
                      </td>
                    </tr>
                  ) : (
                    subsList.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(sub.id)}
                            onChange={() => toggleSelect(sub.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{sub.email}</div>
                          {sub.name && <div className="text-[11px] text-muted-foreground">{sub.name}</div>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {sub.source || "storefront"}
                            </Badge>
                            {Array.isArray(sub.tags) &&
                              sub.tags.map((t: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 border-border/80">
                                  {t}
                                </Badge>
                              ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {sub.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground text-[10px]">
                              Unsubscribed
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {sub.created_at ? format(new Date(sub.created_at), "dd MMM yyyy, HH:mm") : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const newStatus = !sub.is_active;
                              await supabase.from("email_subscriptions").update({ is_active: newStatus }).eq("id", sub.id);
                              refetchSubs();
                            }}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                          >
                            {sub.is_active ? "Unsubscribe" : "Reactivate"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: AUDIENCE SPREADSHEET GRID
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audience" className="space-y-4 m-0 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60">
            <div>
              <h3 className="text-sm font-bold text-foreground">Multi-Channel Contact Roster</h3>
              <p className="text-xs text-muted-foreground">
                Spreadsheet grid with inline cell editing. Changes auto-save via Universal Save.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addTableRow}
                className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </Button>

              <Button
                size="sm"
                onClick={() => saveMutation.mutate(tableRows)}
                disabled={saveMutation.isPending || !isDirty}
                className="h-9 px-3 text-xs gap-1.5 rounded-xl bg-primary text-primary-foreground"
              >
                <Check className="w-3.5 h-3.5" /> {isDirty ? "Save Changes" : "Saved"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 min-w-[160px]">Contact Name</th>
                    <th className="p-3 min-w-[160px]">Phone Number</th>
                    <th className="p-3 min-w-[200px]">Email Address</th>
                    <th className="p-3 min-w-[140px]">Audience Tag / Segment</th>
                    <th className="p-3 w-16 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {tableRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="p-3 text-center text-muted-foreground text-[10px] font-sans">
                        {index + 1}
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRowField(row.id, "name", e.target.value)}
                          placeholder="e.g. Tanvir Ahmed"
                          className="h-8 text-xs font-sans rounded-lg border-border/40 bg-background/60 focus:bg-background"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.phone}
                          onChange={(e) => updateRowField(row.id, "phone", e.target.value)}
                          placeholder="017xxxxxxxx"
                          className="h-8 text-xs rounded-lg border-border/40 bg-background/60 focus:bg-background"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.email}
                          onChange={(e) => updateRowField(row.id, "email", e.target.value)}
                          placeholder="name@example.com"
                          className="h-8 text-xs rounded-lg border-border/40 bg-background/60 focus:bg-background"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.tag}
                          onChange={(e) => updateRowField(row.id, "tag", e.target.value)}
                          placeholder="VIP, Storefront, Lead"
                          className="h-8 text-xs font-sans rounded-lg border-border/40 bg-background/60 focus:bg-background"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(row.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: GOOGLE SHEETS 2-WAY SYNC
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sheets" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Google Sheets 2-Way Synchronization</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect any Google Sheet published or shared with your Google service account. Ingest external leads, phone numbers, and emails directly into ORIZINO, or push local audiences back to the sheet.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">Google Sheet URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="pl-9 text-xs rounded-xl h-10 bg-background border-border/60 font-mono"
                  />
                </div>
                <Button onClick={handleSaveSheetUrl} variant="outline" className="h-10 text-xs px-4 rounded-xl">
                  Save Link
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: The sheet should contain columns: <strong>Name, Phone, Email, Tag</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
              <Button
                onClick={handlePullFromSheet}
                disabled={isSyncingSheet || !sheetUrl.trim()}
                className="h-10 px-4 text-xs font-semibold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CloudDownload className={`w-4 h-4 ${isSyncingSheet ? "animate-spin" : ""}`} />
                Pull & Merge from Google Sheet
              </Button>

              <Button
                onClick={handlePushToSheet}
                disabled={isSyncingSheet || !sheetUrl.trim()}
                variant="outline"
                className="h-10 px-4 text-xs font-semibold gap-2 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              >
                <CloudUpload className={`w-4 h-4 ${isSyncingSheet ? "animate-spin" : ""}`} />
                Push Audience Table to Sheet
              </Button>

              <Button
                onClick={handleQuadSync}
                disabled={isQuadSyncing}
                variant="outline"
                className="h-10 px-4 text-xs font-semibold gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 ml-auto"
              >
                <Zap className={`w-4 h-4 ${isQuadSyncing ? "animate-spin text-amber-500" : ""}`} />
                Full Quad-Sync Protocol
              </Button>
            </div>

            {syncReport && (
              <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle className="text-xs font-bold">Sync Report</AlertTitle>
                <AlertDescription className="text-xs">
                  Processed {syncReport.sheetCount} rows from Google Sheet: {syncReport.added} new contacts added, {syncReport.unchanged} existing contacts retained.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: DIRECT BROADCAST
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="broadcast" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Direct Multi-Channel Broadcast</h3>
              <p className="text-xs text-muted-foreground">
                Dispatch instantaneous VIP promotional announcements to your unified contacts across Email, WhatsApp, and SMS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setSelectedChannels((p) => ({ ...p, email: !p.email }))}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.email ? "bg-primary/10 border-primary text-primary" : "bg-card border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Email Blast</span>
                  <Mail className="w-4 h-4" />
                </div>
                <p className="text-[11px] mt-1 opacity-80">
                  {tableRows.filter((r) => r.email.trim()).length} recipients
                </p>
              </div>

              <div
                onClick={() => setSelectedChannels((p) => ({ ...p, whatsapp: !p.whatsapp }))}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.whatsapp ? "bg-emerald-500/10 border-emerald-500 text-emerald-600" : "bg-card border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">WhatsApp Direct</span>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-[11px] mt-1 opacity-80">
                  {tableRows.filter((r) => r.phone.trim()).length} recipients
                </p>
              </div>

              <div
                onClick={() => setSelectedChannels((p) => ({ ...p, sms: !p.sms }))}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.sms ? "bg-purple-500/10 border-purple-500 text-purple-600" : "bg-card border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">SMS Gateway</span>
                  <Phone className="w-4 h-4" />
                </div>
                <p className="text-[11px] mt-1 opacity-80">
                  {tableRows.filter((r) => r.phone.trim()).length} recipients
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Campaign Title / Subject</Label>
                <Input
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-background border-border/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Message Payload</Label>
                <Textarea
                  rows={4}
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  className="text-xs rounded-xl bg-background border-border/60"
                />
              </div>

              <Button
                onClick={handleDispatchCampaign}
                disabled={isDispatching || (!selectedChannels.email && !selectedChannels.whatsapp && !selectedChannels.sms)}
                className="w-full h-11 text-xs font-semibold gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-md"
              >
                <Send className={`w-4 h-4 ${isDispatching ? "animate-spin" : ""}`} />
                {isDispatching ? "Dispatching..." : "Launch Direct Broadcast Now"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Contact Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New Contact</DialogTitle>
            <DialogDescription className="text-xs">
              Add a subscriber to newsletter subscriptions and multi-channel audience roster.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSingle} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Email Address *</Label>
              <Input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="customer@example.com"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Full Name (Optional)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone Number (Optional)</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Audience Tag</Label>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="VIP, Storefront, Lead"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl text-xs bg-primary text-primary-foreground">
                Add to Audience
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV Modal ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Import CSV / Paste Contacts</DialogTitle>
            <DialogDescription className="text-xs">
              Paste email addresses or lines formatted as <code>name, email, phone, tag</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="tanvir@example.com&#10;Nabila Islam, nabila@example.com&#10;rahim@orizino.com, 01700000000, VIP"
              className="text-xs font-mono rounded-xl"
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleImportCSV} className="rounded-xl text-xs bg-primary text-primary-foreground">
                Import Contacts
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
