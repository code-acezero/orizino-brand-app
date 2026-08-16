"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import {
  FileText, Save, Plus, Trash2, Eye, Blocks, Code2, ShieldCheck,
  RefreshCw, Cookie, Search, ExternalLink, Layers,
  Globe, Check, Loader2, FileCode, SearchCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageBuilder, { type PageBlock } from "@/components/admin/PageBuilder";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  created_at?: string;
  updated_at?: string;
}

const LEGAL_QUICK_CARDS = [
  { slug: "privacy", label: "Privacy Policy", icon: ShieldCheck, path: "/privacy", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { slug: "terms", label: "Terms of Service", icon: FileText, path: "/terms", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { slug: "returns", label: "Return Policy", icon: RefreshCw, path: "/refund", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { slug: "cookies", label: "Cookie Policy", icon: Cookie, path: "/cookies", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
];

const AdminCmsPages = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CmsPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editorMode, setEditorMode] = useState<"blocks" | "markdown" | "seo">("blocks");

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ["admin-cms-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("*").order("created_at", { ascending: true });
      return (data as CmsPage[]) || [];
    },
  });

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [pages, searchQuery]);

  const hasBlocks = (page: CmsPage | null) => page?.content?.startsWith("<!--BLOCKS:");

  const getBlocks = (page: CmsPage | null): PageBlock[] => {
    try {
      if (page?.content?.startsWith("<!--BLOCKS:")) {
        const json = page.content.slice(11, page.content.indexOf("-->"));
        return JSON.parse(json);
      }
    } catch {}
    return [];
  };

  const setBlocks = (blocks: PageBlock[]) => {
    if (!selected) return;
    const encoded = `<!--BLOCKS:${JSON.stringify(blocks)}-->`;
    setSelected({ ...selected, content: encoded });
  };

  const saveMutation = useMutation({
    mutationFn: async (page: CmsPage) => {
      const { error } = await supabase.from("cms_pages").update({
        title: page.title,
        content: page.content,
        is_published: page.is_published,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        updated_at: new Date().toISOString(),
      }).eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page updated successfully!");
      qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save page"),
  });

  const createPage = async () => {
    if (!newSlug.trim() || !newTitle.trim()) return;
    const slug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { error } = await supabase.from("cms_pages").insert({
      slug,
      title: newTitle,
      content: `<!--BLOCKS:${JSON.stringify([])}-->`,
      is_published: false,
    });
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setNewSlug("");
    setNewTitle("");
    qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    toast.success("New page created!");
  };

  const deletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page? This action cannot be undone.")) return;
    await supabase.from("cms_pages").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    toast.success("Page deleted!");
  };

  const convertToBlocks = () => {
    if (!selected) return;
    setSelected({ ...selected, content: `<!--BLOCKS:${JSON.stringify([])}-->` });
    setEditorMode("blocks");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              CMS & Content Studio
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                {pages.length} Pages
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Manage storefront legal policies, custom marketing pages & visual content blocks.</p>
          </div>
        </div>

        <Button onClick={() => setCreating(true)} className="rounded-xl gap-2 text-xs font-bold shadow-xs">
          <Plus className="w-4 h-4" /> Create New Page
        </Button>
      </div>

      {/* Quick Legal Policy Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEGAL_QUICK_CARDS.map((item) => {
          const found = pages.find((p) => p.slug === item.slug);
          const isSelected = selected?.slug === item.slug;
          return (
            <div
              key={item.slug}
              onClick={() => {
                if (found) {
                  setSelected({ ...found });
                  setEditorMode(hasBlocks(found) ? "blocks" : "markdown");
                }
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-card/60 backdrop-blur-md hover:border-primary/50 flex flex-col justify-between gap-3 ${
                isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${item.color}`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">{item.label}</span>
                </div>
                <Badge variant={found?.is_published ? "default" : "secondary"} className="text-[10px] py-0 h-4 font-semibold">
                  {found?.is_published ? "Published" : "Draft"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                <span className="font-mono">{item.path}</span>
                <a
                  href={`/page/${item.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary transition-colors inline-flex items-center gap-0.5 font-semibold text-[10px]"
                >
                  Preview <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Studio Area (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Sidebar: Page List */}
        <div className="lg:col-span-4 bg-card/60 border border-border/60 rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="p-3 border-b border-border/50 bg-muted/30 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter pages by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/80 rounded-xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" /> Loading pages...
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No pages found matching your search.
              </div>
            ) : (
              filteredPages.map((page) => {
                const active = selected?.id === page.id;
                const isBlockBased = hasBlocks(page);

                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      setSelected({ ...page });
                      setEditorMode(isBlockBased ? "blocks" : "markdown");
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-center justify-between gap-3 ${
                      active
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {isBlockBased ? <Blocks className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-foreground/90"}`}>
                          {page.title}
                        </h4>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">/{page.slug}</p>
                      </div>
                    </div>

                    <Badge
                      variant={page.is_published ? "default" : "outline"}
                      className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-semibold ${
                        page.is_published ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""
                      }`}
                    >
                      {page.is_published ? "Published" : "Draft"}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Content & Meta Editor */}
        <div className="lg:col-span-8 bg-card/60 border border-border/60 rounded-2xl overflow-hidden flex flex-col h-full">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">No Page Selected</h3>
              <p className="text-xs text-muted-foreground max-w-sm">Select a page from the list on the left or create a new page to open the visual content editor.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Editor Header Bar */}
              <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Input
                    value={selected.title}
                    onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                    className="font-bold text-sm h-9 bg-background/80 rounded-xl max-w-xs"
                    placeholder="Page Title..."
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40 shrink-0">
                    <Globe className="w-3 h-3 text-primary" />
                    <span>/{selected.slug}</span>
                  </div>
                  <a
                    href={`/page/${selected.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-xl border border-border/50">
                    <Switch
                      checked={selected.is_published}
                      onCheckedChange={(v) => setSelected({ ...selected, is_published: v })}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {selected.is_published ? "Published" : "Draft Mode"}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePage(selected.id)}
                    className="h-9 w-9 p-0 hover:bg-destructive/10 text-destructive/80 hover:text-destructive rounded-xl"
                    title="Delete Page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate(selected)}
                    disabled={saveMutation.isPending}
                    className="rounded-xl gap-2 font-bold h-9 text-xs px-4"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Page
                  </Button>
                </div>
              </div>

              {/* Mode Tabs & Workspace */}
              <div className="p-4 flex-1 flex flex-col overflow-hidden">
                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as any)} className="flex-1 flex flex-col">
                  <TabsList className="bg-muted/50 p-1 rounded-xl w-fit mb-4 border border-border/40">
                    <TabsTrigger value="blocks" className="gap-2 text-xs font-bold rounded-lg">
                      <Blocks className="w-3.5 h-3.5 text-primary" /> Visual Builder
                    </TabsTrigger>
                    <TabsTrigger value="markdown" className="gap-2 text-xs font-bold rounded-lg">
                      <Code2 className="w-3.5 h-3.5 text-indigo-500" /> Markdown Code
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="gap-2 text-xs font-bold rounded-lg">
                      <SearchCheck className="w-3.5 h-3.5 text-emerald-500" /> SEO & Meta
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="blocks" className="flex-1 overflow-y-auto">
                    {hasBlocks(selected) ? (
                      <PageBuilder
                        blocks={getBlocks(selected)}
                        onChange={setBlocks}
                      />
                    ) : (
                      <div className="text-center py-16 bg-muted/20 border border-dashed border-border/80 rounded-2xl p-8">
                        <Blocks className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                        <h4 className="font-bold text-sm text-foreground mb-1">Markdown Content Detected</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">This page currently uses raw Markdown text. Would you like to convert it to the drag-and-drop Visual Block Builder?</p>
                        <Button onClick={convertToBlocks} variant="outline" className="rounded-xl gap-2 font-semibold text-xs">
                          <Layers className="w-3.5 h-3.5 text-primary" /> Convert to Visual Blocks
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="markdown" className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold">Markdown Content Body</span>
                      <span className="font-mono">{selected.content?.length || 0} characters</span>
                    </div>
                    <Textarea
                      value={hasBlocks(selected) ? "(Visual block layout active — switch to Visual Builder tab to edit blocks)" : selected.content}
                      onChange={(e) => !hasBlocks(selected) && setSelected({ ...selected, content: e.target.value })}
                      className="flex-1 min-h-[360px] rounded-xl font-mono text-xs bg-background/90 p-4 leading-relaxed border-border/60"
                      disabled={hasBlocks(selected)}
                    />
                  </TabsContent>

                  <TabsContent value="seo" className="flex-1 space-y-6">
                    <div className="bg-background/80 border border-border/60 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                        <SearchCheck className="w-4 h-4" /> Google Search Result Preview
                      </h3>
                      
                      {/* Search Snippet Mock Card */}
                      <div className="p-4 rounded-xl bg-card border border-border/50 space-y-1">
                        <p className="text-xs text-emerald-500 font-mono">https://orizino.com/page/{selected.slug}</p>
                        <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                          {selected.meta_title || selected.title || "Page Title"}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {selected.meta_description || "Configure meta description below to optimize how this page appears on Google search results."}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Meta Title</Label>
                          <Input
                            value={selected.meta_title || ""}
                            onChange={(e) => setSelected({ ...selected, meta_title: e.target.value })}
                            placeholder="Meta Title (50-60 characters)"
                            className="rounded-xl bg-background text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Meta Description</Label>
                          <Input
                            value={selected.meta_description || ""}
                            onChange={(e) => setSelected({ ...selected, meta_description: e.target.value })}
                            placeholder="Meta Description (150-160 characters)"
                            className="rounded-xl bg-background text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Page Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Storefront Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold">Page Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setNewTitle(title);
                  setNewSlug(slug);
                }}
                placeholder="e.g. Lookbook 2026"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">URL Path / Slug</Label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg border border-border/40">/page/</span>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="lookbook-2026"
                  className="rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createPage} disabled={!newTitle || !newSlug} className="font-bold">Create Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCmsPages;
