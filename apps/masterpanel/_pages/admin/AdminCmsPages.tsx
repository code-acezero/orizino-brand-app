"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { toast } from "@/lib/app-toast";
import { FileText, Save, Plus, Trash2, Eye, Blocks, Code2, ShieldCheck, RefreshCw, Cookie } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageBuilder, { type PageBlock } from "@/components/admin/PageBuilder";

const AdminCmsPages = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [editorMode, setEditorMode] = useState<"blocks" | "markdown">("blocks");

  const { data: pages = [] } = useQuery({
    queryKey: ["admin-cms-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("*").order("created_at");
      return data || [];
    },
  });

  // Parse blocks from content (stored as JSON in a special format)
  const getBlocks = (page: any): PageBlock[] => {
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

  const hasBlocks = (page: any) => page?.content?.startsWith("<!--BLOCKS:");

  const saveMutation = useMutation({
    mutationFn: async (page: any) => {
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
      toast.success("Page saved!");
      qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    },
  });

  const createPage = async () => {
    if (!newSlug.trim() || !newTitle.trim()) return;
    const { error } = await supabase.from("cms_pages").insert({
      slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      title: newTitle,
      content: `<!--BLOCKS:${JSON.stringify([])}-->`,
    });
    if (error) { toast.error(error.message); return; }
    setCreating(false);
    setNewSlug("");
    setNewTitle("");
    qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    toast.success("Page created!");
  };

  const deletePage = async (id: string) => {
    await supabase.from("cms_pages").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin-cms-pages"] });
    toast.success("Page deleted");
  };

  const convertToBlocks = () => {
    if (!selected) return;
    setSelected({ ...selected, content: `<!--BLOCKS:${JSON.stringify([])}-->` });
    setEditorMode("blocks");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">CMS & Legal Pages</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage storefront content, terms, privacy, return policy, and custom pages.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> New Page
        </Button>
      </div>

      {/* Quick Legal Policies Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { slug: "privacy", label: "Privacy Policy", icon: ShieldCheck, path: "/privacy", color: "text-blue-500" },
          { slug: "terms", label: "Terms of Service", icon: FileText, path: "/terms", color: "text-amber-500" },
          { slug: "returns", label: "Return Policy", icon: RefreshCw, path: "/refund", color: "text-emerald-500" },
          { slug: "cookies", label: "Cookie Policy", icon: Cookie, path: "/cookies", color: "text-purple-500" },
        ].map((item) => {
          const found = pages.find((p: any) => p.slug === item.slug);
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
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-card hover:border-primary/50 flex flex-col justify-between gap-2 ${
                isSelected ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs font-bold text-foreground">{item.label}</span>
                </div>
                <Badge variant={found?.is_published ? "default" : "outline"} className="text-[9px] py-0 h-4">
                  {found?.is_published ? "Live" : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                <span>{item.path}</span>
                <a
                  href={`/page/${item.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary transition-colors inline-flex items-center gap-0.5"
                >
                  Preview <Eye className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: "calc(100vh - 280px)" }}>
        {/* Page list */}
        <div className="border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-secondary/30">
            <p className="text-sm font-medium text-foreground">Pages</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pages.map((page: any) => (
              <button
                key={page.id}
                onClick={() => { setSelected({ ...page }); setEditorMode(hasBlocks(page) ? "blocks" : "markdown"); }}
                className={`w-full text-left p-3 border-b border-border hover:bg-secondary/30 transition-colors ${selected?.id === page.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasBlocks(page) ? <Blocks className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm font-medium text-foreground">{page.title}</span>
                  </div>
                  <Badge variant={page.is_published ? "default" : "secondary"} className="text-[10px]">
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">/{page.slug}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 border border-border rounded-2xl overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Blocks className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a page to edit</p>
                <p className="text-xs text-muted-foreground mt-1">Use the visual block editor or markdown</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Input
                    value={selected.title}
                    onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                    className="rounded-xl h-8 text-sm font-medium w-48"
                  />
                  <a href={`/page/${selected.slug}`} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Preview
                  </a>
                  <div className="flex items-center gap-2">
                    <Switch checked={selected.is_published} onCheckedChange={(v) => setSelected({ ...selected, is_published: v })} />
                    <span className="text-xs text-muted-foreground">Published</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="destructive" onClick={() => deletePage(selected.id)} className="rounded-xl gap-1 h-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" onClick={() => saveMutation.mutate(selected)} disabled={saveMutation.isPending} className="rounded-xl gap-1 h-8">
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as any)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="blocks" className="gap-1.5"><Blocks className="w-3.5 h-3.5" /> Visual Builder</TabsTrigger>
                    <TabsTrigger value="markdown" className="gap-1.5"><Code2 className="w-3.5 h-3.5" /> Markdown</TabsTrigger>
                  </TabsList>

                  <TabsContent value="blocks">
                    {hasBlocks(selected) ? (
                      <PageBuilder
                        blocks={getBlocks(selected)}
                        onChange={setBlocks}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <Blocks className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">This page uses markdown. Convert to visual blocks?</p>
                        <Button onClick={convertToBlocks} variant="outline" className="rounded-xl">
                          Convert to Block Editor
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="markdown">
                    <div className="space-y-4">
                      <Textarea
                        value={hasBlocks(selected) ? "(Visual blocks — switch to Visual Builder tab)" : selected.content}
                        onChange={(e) => !hasBlocks(selected) && setSelected({ ...selected, content: e.target.value })}
                        className="min-h-[400px] rounded-xl font-mono text-sm"
                        disabled={hasBlocks(selected)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Meta Title</Label>
                          <Input value={selected.meta_title || ""} onChange={(e) => setSelected({ ...selected, meta_title: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Meta Description</Label>
                          <Input value={selected.meta_description || ""} onChange={(e) => setSelected({ ...selected, meta_description: e.target.value })} className="rounded-xl" />
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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Page title" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL path)</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="page-slug" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createPage}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCmsPages;
// code:4ce0
