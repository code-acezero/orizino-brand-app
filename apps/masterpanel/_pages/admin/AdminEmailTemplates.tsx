"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listTemplates, upsertTemplate, deleteTemplate, sendTestEmail } from "@/lib/email-campaigns.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { format } from "date-fns";
import {
  Plus, Pencil, Trash2, FileText, FlaskConical, Type, AlignLeft, Image as ImageIcon,
  MousePointerClick, Minus, MoveVertical, Columns as ColumnsIcon, Code, ArrowUp, ArrowDown,
  Copy, Eye, Smartphone, Monitor, Moon, Sun, Save, Variable, GripVertical, Layers, Wand2, X,
  RefreshCw, Search, CheckCircle2, Filter,
} from "lucide-react";
import {
  type Block, type EmailDesign, defaultDesign, renderEmail, applyVariables, COMMON_VARIABLES,
} from "@/lib/email-blocks";
import { EMAIL_PRESETS } from "@/lib/email-presets";

const uid = () => Math.random().toString(36).slice(2, 10);

const BLOCK_LIBRARY: Array<{ type: Block["type"]; label: string; icon: any; make: () => Block }> = [
  { type: "heading", label: "Heading", icon: Type, make: () => ({ id: uid(), type: "heading", level: 1, text: "Your heading", align: "left" }) },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft, make: () => ({ id: uid(), type: "paragraph", text: "Write something meaningful here…", size: 15 }) },
  { type: "image", label: "Image", icon: ImageIcon, make: () => ({ id: uid(), type: "image", src: "https://shop.orizino.com/apple-touch-icon.png", alt: "", width: 560, radius: 8, align: "center" }) },
  { type: "button", label: "Button", icon: MousePointerClick, make: () => ({ id: uid(), type: "button", text: "Explore Collection", href: "https://shop.orizino.com", align: "left", background: "#9a0002", color: "#FAF6EE", radius: 10 }) },
  { type: "divider", label: "Divider", icon: Minus, make: () => ({ id: uid(), type: "divider", color: "#2d2a32" }) },
  { type: "spacer", label: "Spacer", icon: MoveVertical, make: () => ({ id: uid(), type: "spacer", height: 24 }) },
  { type: "columns", label: "2 Columns", icon: ColumnsIcon, make: () => ({ id: uid(), type: "columns", left: [{ id: uid(), type: "paragraph", text: "Left column" }], right: [{ id: uid(), type: "paragraph", text: "Right column" }] }) },
  { type: "html", label: "Raw HTML", icon: Code, make: () => ({ id: uid(), type: "html", html: "<p>Custom HTML…</p>" }) },
];

function normalizeDesign(t: any): EmailDesign {
  const d = t?.design;
  if (d && typeof d === "object" && Array.isArray(d.blocks)) return { ...defaultDesign(), ...d };
  return defaultDesign();
}

export default function AdminEmailTemplates() {
  const fetchFn = useServerFn(listTemplates);
  const save = useServerFn(upsertTemplate);
  const del = useServerFn(deleteTemplate);
  const sendTest = useServerFn(sendTestEmail);
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      try {
        const res: any = await fetchFn();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn("ServerFn listTemplates fallback to direct client query", err);
      }
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<any | null>(null);
  const [design, setDesign] = useState<EmailDesign>(defaultDesign());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [presetOpen, setPresetOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"blocks" | "preview" | "inspect">("preview");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (editing) setDesign(normalizeDesign(editing));
    setViewMode("visual");
  }, [editing?.id]);

  const html = useMemo(() => {
    if (editing?.html && !editing?.design?.blocks?.length) return editing.html;
    return renderEmail(design);
  }, [design, editing]);

  const inHtmlMode = !!design.customHtml && design.customHtml.trim().length > 0;
  const sampleVars = useMemo(() => Object.fromEntries(COMMON_VARIABLES.map((v) => [v.key, v.sample])), []);

  const previewHtml = useMemo(() => {
    let rendered = applyVariables(previewing ? (previewing.html || renderEmail(normalizeDesign(previewing))) : html, sampleVars);

    if (device === "mobile") {
      const mobileStyle = `<style>
        table{max-width:100% !important;width:100% !important;}
        td[width]{width:auto !important;display:block !important;}
        img{max-width:100% !important;height:auto !important;}
        body{-webkit-text-size-adjust:100%;}
      </style>`;
      rendered = rendered.includes("</head>")
        ? rendered.replace("</head>", `${mobileStyle}</head>`)
        : `${mobileStyle}${rendered}`;
    }

    if (theme === "dark") {
      const darkStyle = `<style>html,body{background:#0d0c0e !important;color-scheme:dark}</style>`;
      rendered = rendered
        .replace("<body ", `<body data-theme="dark" `)
        .replace(/background:#f4f5f7/g, "background:#0d0c0e");
      rendered = rendered.includes("</head>")
        ? rendered.replace("</head>", `${darkStyle}</head>`)
        : `${darkStyle}${rendered}`;
    }
    return rendered;
  }, [html, previewing, sampleVars, theme, device]);

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setDesign((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));
  };
  const removeBlock = (id: string) => {
    setDesign((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateBlock = (id: string) => {
    setDesign((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return d;
      const clone = JSON.parse(JSON.stringify(d.blocks[idx]));
      clone.id = uid();
      const next = [...d.blocks];
      next.splice(idx + 1, 0, clone);
      return { ...d, blocks: next };
    });
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setDesign((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= d.blocks.length) return d;
      const next = [...d.blocks];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...d, blocks: next };
    });
  };
  const addBlock = (make: () => Block) => {
    const b = make();
    setDesign((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setSelectedId(b.id);
  };
  const insertVar = (key: string) => {
    if (!selectedId) { toast.info("Select a block first"); return; }
    const b = design.blocks.find((x) => x.id === selectedId);
    if (!b) return;
    const token = `{{${key}}}`;
    if (b.type === "heading" || b.type === "paragraph" || b.type === "button") {
      updateBlock(selectedId, { text: (b as any).text + token } as any);
    } else if (b.type === "html") {
      updateBlock(selectedId, { html: (b as any).html + token } as any);
    } else {
      toast.info("This block doesn't support variables");
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editing.id,
        name: editing.name,
        category: editing.category || "general",
        subject: editing.subject || "",
        design,
        html,
      };
      return save({ data: payload });
    },
    onSuccess: () => {
      toast.success("Template saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const handleTest = async () => {
    const target = editing || previewing;
    if (!testTo || !target) return;
    setTestSending(true);
    try {
      const rendered = applyVariables(target.html || html, sampleVars);
      const r: any = await sendTest({ data: { to: testTo, subject: target.subject || target.name, html: rendered } });
      if (r?.error) toast.error(r.error);
      else if (r?.warning) toast.warning(r.warning);
      else if (r?.id) toast.success(`Test sent to ${testTo}`);
      else toast.error("Failed to send");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setTestSending(false); }
  };

  const selected = design.blocks.find((b) => b.id === selectedId) ?? null;

  const categories = useMemo(() => {
    const set = new Set<string>(["all"]);
    templates.forEach((t: any) => {
      if (t.category) set.add(t.category.toLowerCase());
    });
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t: any) => {
      const matchCat = filterCategory === "all" || t.category?.toLowerCase() === filterCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, filterCategory, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-[#FAF6EE]">
                Email Template Studio
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/10 text-primary border-primary/20">
                {templates.length} Templates
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Luxury responsive email templates rendered with the Cherry Vanilla brand design system.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 gap-1.5 rounded-xl border-border/60"
            onClick={() => setPresetOpen(true)}
          >
            <Wand2 className="w-3.5 h-3.5 text-primary" /> From Presets
          </Button>
          <Button
            size="sm"
            className="text-xs h-9 font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            onClick={() => {
              setEditing({
                name: "Untitled Template",
                category: "general",
                subject: "",
                design: defaultDesign(),
              });
              setSelectedId(null);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> New Template
          </Button>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by title or subject…"
            className="h-9 pl-9 text-xs bg-background/60 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
            <SelectTrigger className="w-44 h-9 text-xs bg-background/50 border-border/60 rounded-xl capitalize font-medium">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{filterCategory === "all" ? "All Categories" : filterCategory}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card border-border/60">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs capitalize">
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── TEMPLATES GRID ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-border/40 bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border/60 rounded-2xl bg-card/30 space-y-4">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="text-base font-bold text-foreground">No email templates found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {searchQuery ? "No templates match your search criteria." : "Create your first template or start from built-in presets."}
            </p>
          </div>
          <Button size="sm" onClick={() => setPresetOpen(true)} className="rounded-xl">
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Start from Presets
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t: any) => (
            <div
              key={t.id}
              className="group text-left rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {t.name}
                  </h3>
                  <Badge variant="secondary" className="text-[9px] uppercase font-mono tracking-wider bg-secondary/50 text-muted-foreground">
                    {t.category || "general"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-4">
                  {t.subject || <span className="italic opacity-60">No subject specified</span>}
                </p>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {t.updated_at ? format(new Date(t.updated_at), "MMM d, yyyy") : "Official Preset"}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewing(t)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    title="Live Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(t)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    title="Edit Template"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Delete template "${t.name}"?`)) return;
                      await del({ data: { id: t.id } });
                      qc.invalidateQueries({ queryKey: ["templates"] });
                      toast.success("Template deleted");
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QUICK PREVIEW MODAL ── */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 h-[85vh] flex flex-col overflow-hidden rounded-2xl">
          <DialogHeader className="px-5 py-3.5 border-b border-border/60 flex flex-row items-center justify-between bg-card/80 backdrop-blur-md">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {previewing?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Subject: <span className="text-foreground">{previewing?.subject || "No subject"}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`p-1.5 rounded-full transition-colors ${device === "desktop" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`p-1.5 rounded-full transition-colors ${device === "mobile" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="p-1.5 rounded-full text-muted-foreground hover:bg-card/60"
                  title="Toggle Light/Dark Theme"
                >
                  {theme === "light" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(previewing);
                  setPreviewing(null);
                }}
                className="h-8 rounded-xl text-xs gap-1.5 font-semibold"
              >
                <Pencil className="w-3 h-3" /> Edit in Studio
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/40 p-4 overflow-y-auto flex items-center justify-center">
            <div
              className={`rounded-2xl shadow-xl overflow-hidden border transition-all ${
                theme === "dark" ? "bg-[#0d0c0e] border-white/10" : "bg-white border-border/60"
              }`}
              style={{ width: device === "mobile" ? 380 : 700, maxWidth: "100%", height: "100%" }}
            >
              <iframe
                title="Email Preview Frame"
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-full"
                style={{ border: 0, colorScheme: theme === "dark" ? "dark" : "light" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FULL STUDIO EDITOR DIALOG ── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[1400px] w-[96vw] p-0 gap-0 h-[92vh] flex flex-col overflow-hidden [&>button.absolute]:hidden rounded-2xl">
          <DialogHeader className="px-3 sm:px-4 py-2.5 border-b border-border/60 flex flex-row flex-wrap items-center gap-2 space-y-0 bg-background/95 backdrop-blur">
            <DialogTitle className="text-[15px] sm:text-base font-semibold tracking-tight mr-auto">
              Template Studio
            </DialogTitle>
            <div className="hidden lg:flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
              <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-full transition-colors ${device === "desktop" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}><Monitor className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-full transition-colors ${device === "mobile" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}><Smartphone className="w-3.5 h-3.5" /></button>
            </div>
            <div className="hidden lg:flex items-center gap-1 bg-secondary/50 rounded-full p-0.5" title="Editor mode">
              <button onClick={() => setViewMode("visual")} className={`px-2 py-1 rounded-full text-[11px] flex items-center gap-1 transition-colors ${viewMode === "visual" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}>
                <Layers className="w-3 h-3" />Visual
              </button>
              <button onClick={() => setViewMode("html")} className={`px-2 py-1 rounded-full text-[11px] flex items-center gap-1 transition-colors ${viewMode === "html" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}>
                <Code className="w-3 h-3" />HTML
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
              <button onClick={() => setTheme("light")} className={`p-1.5 rounded-full transition-colors ${theme === "light" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}><Sun className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTheme("dark")} className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "bg-card shadow-xs" : "hover:bg-card/60"}`}><Moon className="w-3.5 h-3.5" /></button>
            </div>
            <Button size="sm" variant="ghost" className="hidden lg:inline-flex" onClick={() => setShowVars((v) => !v)}><Variable className="w-3.5 h-3.5 mr-1" />Variables</Button>
            <Button size="sm" className="rounded-full px-4 h-8 font-semibold" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-3.5 h-3.5 lg:mr-1.5" /><span className="hidden lg:inline">{saveMut.isPending ? "Saving…" : "Save"}</span>
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0" onClick={() => setEditing(null)} aria-label="Close editor">
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* iOS-style segmented tab bar (mobile + tablet) */}
          <div className="lg:hidden px-4 pt-3 pb-2 bg-background">
            <div className="relative flex items-center bg-muted/70 rounded-xl p-1 shadow-inner">
              {(["blocks", "preview", "inspect"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setMobilePanel(p)}
                  className={`relative flex-1 text-[13px] font-medium capitalize py-1.5 rounded-lg transition-all duration-200 ${
                    mobilePanel === p
                      ? "bg-card text-foreground shadow-xs ring-1 ring-border/60"
                      : "text-muted-foreground active:bg-card/40"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace: 3-col on lg+, single panel on mobile/tablet */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] min-h-0">
            {/* LEFT — block palette + outline */}
            <aside className={`${mobilePanel === "blocks" ? "flex" : "hidden"} lg:flex flex-col border-r border-border/60 overflow-y-auto bg-muted/20`}>
              <div className="p-4 lg:p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Add Block</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                  {BLOCK_LIBRARY.map((b) => (
                    <button key={b.type} onClick={() => addBlock(b.make)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all text-xs">
                      <b.icon className="w-4 h-4 text-primary" />
                      <span className="text-[11px] text-foreground">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4 lg:px-3 lg:pb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Outline</p>
                <div className="space-y-1 bg-card lg:bg-transparent rounded-xl lg:rounded-none border lg:border-0 border-border/60 divide-y lg:divide-y-0 divide-border/60 overflow-hidden">
                  {design.blocks.map((b, i) => (
                    <button key={b.id} onClick={() => { setSelectedId(b.id); setMobilePanel("inspect"); }}
                      className={`group w-full flex items-center gap-2 px-3 py-2.5 lg:py-1.5 text-left text-[13px] lg:text-xs transition-all ${
                        selectedId === b.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-foreground"
                      }`}>
                      <GripVertical className="w-3.5 h-3.5 opacity-40" />
                      <span className="flex-1 truncate capitalize">{b.type}</span>
                      <span className="text-[11px] text-muted-foreground">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER — preview */}
            <main className={`${mobilePanel === "preview" ? "block" : "hidden"} lg:block overflow-y-auto bg-muted/40 p-4 lg:p-4`}>
              {/* Subject / meta strip */}
              <div className="mx-auto mb-4 max-w-[640px] bg-card border border-border/60 rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 shadow-xs">
                <Input placeholder="Template name" value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-9 text-sm rounded-lg" />
                <Input placeholder="Category" value={editing?.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-9 text-sm rounded-lg" />
                <Input placeholder="Subject line" value={editing?.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="h-9 text-sm rounded-lg" />
              </div>

              {viewMode === "visual" ? (
                <div className="w-full overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
                  <div
                    className={`mx-auto rounded-[28px] shadow-xl overflow-hidden border transition-all ${theme === "dark" ? "bg-[#0d0c0e] border-white/10" : "bg-card border-border/60"}`}
                    style={{ width: device === "mobile" ? 380 : 720, maxWidth: device === "mobile" ? "100%" : undefined }}
                  >
                    <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className={`w-full h-[62dvh] lg:h-[calc(92vh-220px)] ${theme === "dark" ? "bg-[#0d0c0e]" : "bg-white"}`} style={{ border: 0, colorScheme: theme === "dark" ? "dark" : "light" }} />
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-3 h-[68dvh] lg:h-[calc(92vh-220px)]">
                  <div className="flex flex-col bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Code className="w-3 h-3" />Raw HTML</span>
                      <span className="text-[10px] normal-case tracking-normal">
                        {inHtmlMode ? "HTML override active" : "Empty = render blocks"}
                      </span>
                    </div>
                    <Textarea
                      value={design.customHtml ?? ""}
                      onChange={(e) => setDesign((d) => ({ ...d, customHtml: e.target.value }))}
                      placeholder={`Paste custom HTML here...`}
                      className="flex-1 font-mono text-xs rounded-none border-0 resize-none focus-visible:ring-0"
                    />
                    <div className="px-3 py-2 border-t border-border flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDesign((d) => ({ ...d, customHtml: html }))}>
                        Copy blocks → HTML
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDesign((d) => ({ ...d, customHtml: "" }))}>
                        Clear HTML override
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />Live Preview
                    </div>
                    <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="flex-1 w-full bg-white" style={{ border: 0 }} />
                  </div>
                </div>
              )}

              {/* Test send */}
              <div className="mx-auto mt-4 max-w-[640px] bg-card border border-border/60 rounded-2xl p-3 flex items-center gap-2 shadow-xs">
                <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="h-9 text-sm flex-1 rounded-lg" />
                <Button size="sm" variant="outline" className="rounded-full h-9 px-4" disabled={!testTo || testSending} onClick={handleTest}>
                  {testSending ? "Sending…" : "Send Test"}
                </Button>
              </div>
            </main>

            {/* RIGHT — inspector */}
            <aside className={`${mobilePanel === "inspect" ? "block" : "hidden"} lg:block border-l border-border/60 overflow-y-auto bg-muted/20`}>
              {showVars && (
                <div className="p-3 border-b border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><Variable className="w-3 h-3" /> Insert Variable</p>
                  <div className="grid grid-cols-2 gap-1">
                    {COMMON_VARIABLES.map((v) => (
                      <button key={v.key} onClick={() => insertVar(v.key)}
                        className="text-left px-2 py-1.5 rounded-md text-[11px] hover:bg-primary/10 hover:text-primary transition-colors">
                        <code className="text-primary">{`{{${v.key}}}`}</code>
                        <div className="text-[10px] text-muted-foreground truncate">{v.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected ? (
                <BlockInspector
                  block={selected}
                  onChange={(patch) => updateBlock(selected.id, patch)}
                  onDuplicate={() => duplicateBlock(selected.id)}
                  onDelete={() => removeBlock(selected.id)}
                  onMoveUp={() => moveBlock(selected.id, -1)}
                  onMoveDown={() => moveBlock(selected.id, 1)}
                />
              ) : (
                <GlobalInspector design={design} onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))} />
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PRESETS DIALOG ── */}
      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Start from a Preset</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose from luxury pre-crafted templates and customize them for your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-2">
            {EMAIL_PRESETS.map((p) => (
              <div
                key={p.key}
                onClick={() => {
                  setEditing({
                    name: p.name,
                    category: p.category,
                    subject: p.subject,
                    design: p.build(),
                  });
                  setPresetOpen(false);
                }}
                className="p-4 rounded-xl border border-border/60 bg-card/60 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                  <Badge variant="outline" className="text-[9px] uppercase font-mono">{p.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GlobalInspector({ design, onChange }: { design: EmailDesign; onChange: (p: Partial<EmailDesign>) => void }) {
  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Global Styling</div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Background Canvas</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.bodyBackground || "#0d0c0e"}
            onChange={(e) => onChange({ bodyBackground: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={design.bodyBackground || "#0d0c0e"}
            onChange={(e) => onChange({ bodyBackground: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Card Container</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.containerBackground || "#16151a"}
            onChange={(e) => onChange({ containerBackground: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={design.containerBackground || "#16151a"}
            onChange={(e) => onChange({ containerBackground: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Accent Brand Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.accentColor || "#9a0002"}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={design.accentColor || "#9a0002"}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}

function BlockInspector({
  block,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: Block;
  onChange: (patch: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground capitalize">
          {block.type} Block
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMoveUp} title="Move Up"><ArrowUp className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMoveDown} title="Move Down"><ArrowDown className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDuplicate} title="Duplicate"><Copy className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={onDelete} title="Delete"><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>

      {"text" in block && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Content</Label>
          <Textarea
            value={(block as any).text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="min-h-[80px] text-xs"
          />
        </div>
      )}

      {"href" in block && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Link URL</Label>
          <Input
            value={(block as any).href}
            onChange={(e) => onChange({ href: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      )}

      {"src" in block && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Image URL</Label>
          <Input
            value={(block as any).src}
            onChange={(e) => onChange({ src: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      )}

      {"html" in block && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">HTML Snippet</Label>
          <Textarea
            value={(block as any).html}
            onChange={(e) => onChange({ html: e.target.value })}
            className="min-h-[100px] text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
}
