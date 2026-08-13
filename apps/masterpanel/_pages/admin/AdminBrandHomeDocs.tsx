"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { FileText, Plus, Trash2, Edit3, Save, Sparkles, Download, ShieldCheck, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface DocItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  download_url: string;
  is_public: boolean;
  updated_at: string;
}

interface DocsConfig {
  headline: string;
  subheadline: string;
  docs: DocItem[];
}

const DEFAULT_DOCS: DocsConfig = {
  headline: "Brand Documentation & Legal Policies",
  subheadline: "Official guidelines, fabric care instructions, terms of service, and privacy disclosures.",
  docs: [
    {
      id: "1",
      title: "Sizing & Fit Architecture Guide",
      slug: "sizing-fit-guide",
      category: "Sizing & Fit",
      summary: "Comprehensive measurement charts for 3cm shoulder drops and relaxed unisex fits.",
      content: "All Orizino garments feature an engineered drop-shoulder silhouette...",
      download_url: "",
      is_public: true,
      updated_at: "2026-08-05",
    },
    {
      id: "2",
      title: "Garment Care & Fabric Lifespan Manual",
      slug: "fabric-care-manual",
      category: "Care & Quality",
      summary: "Best practices for washing 240 GSM ring-spun cotton and preserving garment dyes.",
      content: "To maintain the rich texture and heavy weight of your garment...",
      download_url: "",
      is_public: true,
      updated_at: "2026-08-08",
    },
    {
      id: "3",
      title: "Privacy Policy & Data Security Standards",
      slug: "privacy-policy",
      category: "Legal & Terms",
      summary: "How Orizino encrypts and safeguards your personal information and transaction logs.",
      content: "Your privacy is paramount at Orizino. This document outlines our data handling practices...",
      download_url: "",
      is_public: true,
      updated_at: "2026-08-01",
    },
  ],
};

export default function AdminBrandHomeDocs() {
  const qc = useQueryClient();
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: config = DEFAULT_DOCS, isLoading } = useQuery<DocsConfig>({
    queryKey: ["brandhome-docs-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "brandhome_docs").maybeSingle();
      return (data?.value as unknown as DocsConfig) || DEFAULT_DOCS;
    },
  });

  const [draft, setDraft] = useState<DocsConfig>(DEFAULT_DOCS);

  React.useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (payload: DocsConfig) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "brandhome_docs",
        value: payload as any,
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Docs & Legal Policies saved successfully!");
      qc.invalidateQueries({ queryKey: ["brandhome-docs-config"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save documentation"),
  });

  const handleSaveDoc = () => {
    if (!editingDoc) return;
    const exists = draft.docs.some((d) => d.id === editingDoc.id);
    const updated = exists
      ? draft.docs.map((d) => (d.id === editingDoc.id ? editingDoc : d))
      : [...draft.docs, editingDoc];
    
    setDraft((prev) => ({ ...prev, docs: updated }));
    setIsDialogOpen(false);
    setEditingDoc(null);
  };

  const handleDeleteDoc = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      docs: prev.docs.filter((d) => d.id !== id),
    }));
  };

  const openNewDoc = () => {
    setEditingDoc({
      id: Date.now().toString(),
      title: "",
      slug: "",
      category: "General",
      summary: "",
      content: "",
      download_url: "",
      is_public: true,
      updated_at: new Date().toISOString().split("T")[0],
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading Docs Settings...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8 border-b border-border/50 pb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BrandHome Docs & Legal</h1>
            <p className="text-xs text-muted-foreground">Publish documentation, policies & brand guides for BrandHome.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewDoc} variant="outline" className="rounded-xl gap-2 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Document
          </Button>
          <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending} className="rounded-xl gap-2 text-xs font-bold">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
          </Button>
        </div>
      </div>

      {/* Global Docs Display Settings */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Documentation Page Headers
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Section Title</label>
            <Input
              value={draft.headline}
              onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              className="bg-background/80"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Subtitle / Description</label>
            <Input
              value={draft.subheadline}
              onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })}
              className="bg-background/80"
            />
          </div>
        </div>
      </div>

      {/* Docs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Registered Documents ({draft.docs.length})</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {draft.docs.map((doc) => (
            <div key={doc.id} className="bg-card/70 border border-border/60 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {doc.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Updated {doc.updated_at}</span>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-2 line-clamp-1">{doc.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">{doc.summary}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${doc.is_public ? "bg-emerald-500" : "bg-muted"}`} />
                  <span className="text-muted-foreground text-[11px]">{doc.is_public ? "Public" : "Internal"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingDoc(doc);
                      setIsDialogOpen(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / New Doc Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingDoc?.title ? "Edit Document" : "Create New Document"}</DialogTitle>
          </DialogHeader>

          {editingDoc && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Document Title</label>
                  <Input
                    value={editingDoc.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                      setEditingDoc({ ...editingDoc, title, slug });
                    }}
                    placeholder="Title..."
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">URL Slug</label>
                  <Input
                    value={editingDoc.slug}
                    onChange={(e) => setEditingDoc({ ...editingDoc, slug: e.target.value })}
                    placeholder="url-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <Input
                    value={editingDoc.category}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    placeholder="Care & Quality, Legal, Sizing"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">PDF / Attachment Link (Optional)</label>
                  <Input
                    value={editingDoc.download_url}
                    onChange={(e) => setEditingDoc({ ...editingDoc, download_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Summary / Abstract</label>
                <Textarea
                  rows={2}
                  value={editingDoc.summary}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Brief summary..."
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Full Document Text (Markdown)</label>
                <Textarea
                  rows={6}
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  placeholder="Detailed document content..."
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Switch
                  checked={editingDoc.is_public}
                  onCheckedChange={(checked) => setEditingDoc({ ...editingDoc, is_public: checked })}
                />
                <span>Publicly Visible on BrandHome</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDoc}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
