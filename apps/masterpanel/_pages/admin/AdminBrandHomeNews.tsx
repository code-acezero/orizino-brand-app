"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Newspaper, Plus, Trash2, Edit3, Eye, Save, Sparkles, Image as ImageIcon, Calendar, Tag, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_url: string;
  author: string;
  published_at: string;
  is_published: boolean;
  is_featured: boolean;
}

interface NewsConfig {
  headline: string;
  subheadline: string;
  articles: NewsArticle[];
}

const DEFAULT_NEWS: NewsConfig = {
  headline: "Brand Stories & Newsroom",
  subheadline: "Official press releases, brand updates, and editorial articles from Orizino.",
  articles: [
    {
      id: "1",
      title: "Redefining Streetwear in South Asia: The Orizino Story",
      slug: "redefining-streetwear-south-asia",
      category: "Press Release",
      excerpt: "How precision 3cm shoulder drops and 240 GSM heavy cotton created a new standard for authentic streetwear.",
      content: "Orizino was established to bridge the gap between luxury construction and authentic street culture...",
      cover_url: "",
      author: "Editorial Team",
      published_at: "2026-08-01",
      is_published: true,
      is_featured: true,
    },
    {
      id: "2",
      title: "Autumn / Winter 2026 Collection Reveal",
      slug: "autumn-winter-2026-reveal",
      category: "Collection",
      excerpt: "Introducing garment-washed earthy tones and oversized silhouettes engineered for maximum comfort.",
      content: "Explore the new AW26 drop featuring hand-dyed finishes and custom metallic branding marks...",
      cover_url: "",
      author: "Design Studio",
      published_at: "2026-08-10",
      is_published: true,
      is_featured: false,
    },
  ],
};

export default function AdminBrandHomeNews() {
  const qc = useQueryClient();
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: config = DEFAULT_NEWS, isLoading } = useQuery<NewsConfig>({
    queryKey: ["brandhome-news-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "brandhome_news").maybeSingle();
      return (data?.value as unknown as NewsConfig) || DEFAULT_NEWS;
    },
  });

  const [draft, setDraft] = useState<NewsConfig>(DEFAULT_NEWS);

  React.useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (payload: NewsConfig) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "brandhome_news",
        value: payload as any,
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Newsroom & Articles saved successfully!");
      qc.invalidateQueries({ queryKey: ["brandhome-news-config"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save news settings"),
  });

  const handleSaveArticle = () => {
    if (!editingArticle) return;
    const exists = draft.articles.some((a) => a.id === editingArticle.id);
    const updated = exists
      ? draft.articles.map((a) => (a.id === editingArticle.id ? editingArticle : a))
      : [...draft.articles, editingArticle];
    
    setDraft((prev) => ({ ...prev, articles: updated }));
    setIsDialogOpen(false);
    setEditingArticle(null);
  };

  const handleDeleteArticle = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      articles: prev.articles.filter((a) => a.id !== id),
    }));
  };

  const openNewArticle = () => {
    setEditingArticle({
      id: Date.now().toString(),
      title: "",
      slug: "",
      category: "News",
      excerpt: "",
      content: "",
      cover_url: "",
      author: "Orizino Team",
      published_at: new Date().toISOString().split("T")[0],
      is_published: true,
      is_featured: false,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading News Settings...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8 border-b border-border/50 pb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BrandHome Newsroom & Articles</h1>
            <p className="text-xs text-muted-foreground">Manage press releases, collection drops & brand articles for BrandHome.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewArticle} variant="outline" className="rounded-xl gap-2 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Article
          </Button>
          <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending} className="rounded-xl gap-2 text-xs font-bold">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
          </Button>
        </div>
      </div>

      {/* Global Newsroom Settings */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Newsroom Display Headers
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

      {/* Articles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Published Articles ({draft.articles.length})</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {draft.articles.map((article) => (
            <div key={article.id} className="bg-card/70 border border-border/60 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {article.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {article.published_at}
                  </div>
                </div>
                <h3 className="font-bold text-base text-foreground mb-2 line-clamp-1">{article.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">{article.excerpt}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${article.is_published ? "bg-emerald-500" : "bg-muted"}`} />
                  <span className="text-muted-foreground text-[11px]">{article.is_published ? "Published" : "Draft"}</span>
                  {article.is_featured && (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Featured</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingArticle(article);
                      setIsDialogOpen(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteArticle(article.id)}
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

      {/* Edit / New Article Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingArticle?.title ? "Edit Article" : "Create New Article"}</DialogTitle>
          </DialogHeader>

          {editingArticle && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Article Title</label>
                  <Input
                    value={editingArticle.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                      setEditingArticle({ ...editingArticle, title, slug });
                    }}
                    placeholder="Title..."
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">URL Slug</label>
                  <Input
                    value={editingArticle.slug}
                    onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value })}
                    placeholder="url-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <Input
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                    placeholder="Press Release, Drop, Collection"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Author</label>
                  <Input
                    value={editingArticle.author}
                    onChange={(e) => setEditingArticle({ ...editingArticle, author: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Publish Date</label>
                  <Input
                    type="date"
                    value={editingArticle.published_at}
                    onChange={(e) => setEditingArticle({ ...editingArticle, published_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Cover Image URL</label>
                <Input
                  value={editingArticle.cover_url}
                  onChange={(e) => setEditingArticle({ ...editingArticle, cover_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Excerpt / Summary</label>
                <Textarea
                  rows={2}
                  value={editingArticle.excerpt}
                  onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                  placeholder="Short summary for cards..."
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Article Body Content (Markdown / Text)</label>
                <Textarea
                  rows={5}
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  placeholder="Full article content..."
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingArticle.is_published}
                    onCheckedChange={(checked) => setEditingArticle({ ...editingArticle, is_published: checked })}
                  />
                  <span>Published</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingArticle.is_featured}
                    onCheckedChange={(checked) => setEditingArticle({ ...editingArticle, is_featured: checked })}
                  />
                  <span>Featured Post</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveArticle}>Save Article</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
