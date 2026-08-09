"use client";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, GripVertical, Settings2, Eye, EyeOff, Copy,
  Type, Image, LayoutGrid, Columns, Quote, List, Video, Minus,
  ArrowUp, ArrowDown, Code, Link2, Box, LayoutTemplate, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";

/* ── Block Types ── */
export type BlockType =
  | "hero" | "text" | "image" | "gallery" | "columns" | "spacer"
  | "cta" | "testimonial" | "features" | "video" | "divider"
  | "banner" | "richtext" | "html" | "products" | "categories";

export interface PageBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  props: Record<string, any>;
}

const BLOCK_CATALOG: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "hero", label: "Hero Section", icon: <LayoutTemplate className="w-4 h-4" />, desc: "Full-width hero with title, subtitle, CTA" },
  { type: "text", label: "Text Block", icon: <Type className="w-4 h-4" />, desc: "Heading + paragraph text" },
  { type: "image", label: "Image", icon: <Image className="w-4 h-4" />, desc: "Single image with optional caption" },
  { type: "gallery", label: "Image Gallery", icon: <LayoutGrid className="w-4 h-4" />, desc: "Grid of images" },
  { type: "columns", label: "Columns", icon: <Columns className="w-4 h-4" />, desc: "2-4 column layout with content" },
  { type: "cta", label: "Call to Action", icon: <Link2 className="w-4 h-4" />, desc: "Prominent action button section" },
  { type: "testimonial", label: "Testimonial", icon: <Quote className="w-4 h-4" />, desc: "Customer quote/review" },
  { type: "features", label: "Feature Grid", icon: <List className="w-4 h-4" />, desc: "Grid of feature cards" },
  { type: "video", label: "Video Embed", icon: <Video className="w-4 h-4" />, desc: "YouTube/Vimeo embed" },
  { type: "divider", label: "Divider", icon: <Minus className="w-4 h-4" />, desc: "Horizontal separator" },
  { type: "spacer", label: "Spacer", icon: <Box className="w-4 h-4" />, desc: "Vertical spacing" },
  { type: "banner", label: "Banner", icon: <Image className="w-4 h-4" />, desc: "Full-width banner image" },
  { type: "richtext", label: "Rich Text", icon: <Code className="w-4 h-4" />, desc: "Markdown content block" },
  { type: "products", label: "Product Grid", icon: <LayoutGrid className="w-4 h-4" />, desc: "Display products from store" },
  { type: "categories", label: "Category Grid", icon: <LayoutGrid className="w-4 h-4" />, desc: "Display category cards" },
];

const defaultProps: Record<BlockType, Record<string, any>> = {
  hero: { title: "Welcome to Our Store", subtitle: "Discover amazing products", buttonText: "Shop Now", buttonLink: "/inventory", bgColor: "", bgImage: "", textAlign: "center" },
  text: { heading: "Section Title", body: "Write your content here...", align: "left", size: "base" },
  image: { url: "", alt: "", caption: "", width: "full", rounded: true },
  gallery: { images: [], columns: 3, gap: "md" },
  columns: { count: 2, items: [{ title: "Column 1", body: "Content" }, { title: "Column 2", body: "Content" }] },
  cta: { title: "Ready to get started?", subtitle: "Join thousands of happy customers", buttonText: "Get Started", buttonLink: "/inventory", variant: "primary" },
  testimonial: { quote: "Amazing product!", author: "John Doe", role: "Customer", avatar: "" },
  features: { items: [{ icon: "⚡", title: "Fast", desc: "Lightning speed" }, { icon: "🔒", title: "Secure", desc: "Bank-level security" }, { icon: "💎", title: "Quality", desc: "Premium materials" }] },
  video: { url: "", title: "" },
  divider: { style: "line", color: "" },
  spacer: { height: 48 },
  banner: { imageUrl: "", linkUrl: "", alt: "" },
  richtext: { content: "# Hello\n\nWrite **markdown** here." },
  html: { code: "" },
  products: { count: 4, featured: true, title: "Featured Products" },
  categories: { count: 6, title: "Shop by Category" },
};

/* ── Block Settings Panels ── */
const BlockSettings: React.FC<{
  block: PageBlock;
  onChange: (props: Record<string, any>) => void;
}> = ({ block, onChange }) => {
  const p = block.props;
  const set = (key: string, val: any) => onChange({ ...p, [key]: val });

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Button Text</Label><Input value={p.buttonText} onChange={(e) => set("buttonText", e.target.value)} /></div>
            <div><Label className="text-xs">Button Link</Label><Input value={p.buttonLink} onChange={(e) => set("buttonLink", e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Background Image</Label><ImageUpload bucket="banners" folder="pages" value={p.bgImage} onUploaded={(url) => set("bgImage", url)} /></div>
          <div><Label className="text-xs">Text Align</Label>
            <div className="flex gap-1 mt-1">{["left", "center", "right"].map((a) => (
              <button key={a} onClick={() => set("textAlign", a)} className={`px-3 py-1 rounded-lg text-xs capitalize ${p.textAlign === a ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{a}</button>
            ))}</div>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Heading</Label><Input value={p.heading} onChange={(e) => set("heading", e.target.value)} /></div>
          <div><Label className="text-xs">Body</Label><Textarea value={p.body} onChange={(e) => set("body", e.target.value)} rows={4} /></div>
          <div><Label className="text-xs">Size</Label>
            <div className="flex gap-1 mt-1">{["sm", "base", "lg", "xl"].map((s) => (
              <button key={s} onClick={() => set("size", s)} className={`px-3 py-1 rounded-lg text-xs ${p.size === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s}</button>
            ))}</div>
          </div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Image</Label><ImageUpload bucket="banners" folder="pages" value={p.url} onUploaded={(url) => set("url", url)} /></div>
          <div><Label className="text-xs">Alt Text</Label><Input value={p.alt} onChange={(e) => set("alt", e.target.value)} /></div>
          <div><Label className="text-xs">Caption</Label><Input value={p.caption} onChange={(e) => set("caption", e.target.value)} /></div>
          <div className="flex items-center gap-2"><Switch checked={p.rounded} onCheckedChange={(v) => set("rounded", v)} /><Label className="text-xs">Rounded Corners</Label></div>
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Button Text</Label><Input value={p.buttonText} onChange={(e) => set("buttonText", e.target.value)} /></div>
            <div><Label className="text-xs">Button Link</Label><Input value={p.buttonLink} onChange={(e) => set("buttonLink", e.target.value)} /></div>
          </div>
        </div>
      );
    case "testimonial":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Quote</Label><Textarea value={p.quote} onChange={(e) => set("quote", e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Author</Label><Input value={p.author} onChange={(e) => set("author", e.target.value)} /></div>
            <div><Label className="text-xs">Role</Label><Input value={p.role} onChange={(e) => set("role", e.target.value)} /></div>
          </div>
        </div>
      );
    case "features":
      return (
        <div className="space-y-3">
          <Label className="text-xs">Features (up to 6)</Label>
          {(p.items || []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start p-2 rounded-lg border border-border/30">
              <Input value={item.icon} onChange={(e) => { const items = [...p.items]; items[i] = { ...items[i], icon: e.target.value }; set("items", items); }} className="w-12" placeholder="🔥" />
              <div className="flex-1 space-y-1">
                <Input value={item.title} onChange={(e) => { const items = [...p.items]; items[i] = { ...items[i], title: e.target.value }; set("items", items); }} placeholder="Title" />
                <Input value={item.desc} onChange={(e) => { const items = [...p.items]; items[i] = { ...items[i], desc: e.target.value }; set("items", items); }} placeholder="Description" />
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { const items = p.items.filter((_: any, j: number) => j !== i); set("items", items); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {(p.items || []).length < 6 && (
            <Button size="sm" variant="outline" onClick={() => set("items", [...(p.items || []), { icon: "✨", title: "New Feature", desc: "Description" }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Feature
            </Button>
          )}
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Video URL (YouTube/Vimeo)</Label><Input value={p.url} onChange={(e) => set("url", e.target.value)} placeholder="https://youtube.com/watch?v=..." /></div>
          <div><Label className="text-xs">Title</Label><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
        </div>
      );
    case "spacer":
      return (
        <div><Label className="text-xs">Height (px)</Label><Input type="number" value={p.height} onChange={(e) => set("height", parseInt(e.target.value) || 16)} min={8} max={200} /></div>
      );
    case "richtext":
      return (
        <div><Label className="text-xs">Markdown Content</Label><Textarea value={p.content} onChange={(e) => set("content", e.target.value)} rows={8} className="font-mono text-xs" /></div>
      );
    case "products":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Section Title</Label><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label className="text-xs">Product Count</Label><Input type="number" value={p.count} onChange={(e) => set("count", parseInt(e.target.value) || 4)} min={2} max={12} /></div>
          <div className="flex items-center gap-2"><Switch checked={p.featured} onCheckedChange={(v) => set("featured", v)} /><Label className="text-xs">Featured Only</Label></div>
        </div>
      );
    case "categories":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Section Title</Label><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label className="text-xs">Category Count</Label><Input type="number" value={p.count} onChange={(e) => set("count", parseInt(e.target.value) || 6)} min={2} max={12} /></div>
        </div>
      );
    case "banner":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Banner Image</Label><ImageUpload bucket="banners" folder="pages" value={p.imageUrl} onUploaded={(url) => set("imageUrl", url)} /></div>
          <div><Label className="text-xs">Link URL</Label><Input value={p.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} /></div>
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">No settings for this block type.</p>;
  }
};

/* ── Block Preview (simplified visual) ── */
const BlockPreview: React.FC<{ block: PageBlock }> = ({ block }) => {
  const p = block.props;

  switch (block.type) {
    case "hero":
      return (
        <div className={`p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-${p.textAlign || "center"}`}
          style={p.bgImage ? { backgroundImage: `url(${p.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
          <h2 className="text-lg font-display font-bold text-foreground">{p.title || "Hero Title"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{p.subtitle}</p>
          {p.buttonText && <div className="mt-3"><span className="inline-block px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs">{p.buttonText}</span></div>}
        </div>
      );
    case "text":
      return (
        <div className={`text-${p.align || "left"}`}>
          {p.heading && <h3 className="font-display font-bold text-foreground">{p.heading}</h3>}
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.body}</p>
        </div>
      );
    case "image":
      return p.url ? <img src={p.url} alt={p.alt} className={`max-h-24 object-cover ${p.rounded ? "rounded-xl" : ""}`} /> : <div className="h-16 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground text-xs">No image</div>;
    case "cta":
      return (
        <div className="p-4 rounded-xl bg-primary/10 text-center">
          <h3 className="font-bold text-foreground text-sm">{p.title}</h3>
          <p className="text-xs text-muted-foreground">{p.subtitle}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs">{p.buttonText}</span>
        </div>
      );
    case "testimonial":
      return (
        <div className="p-3 bg-secondary/50 rounded-xl italic text-sm text-muted-foreground">
          "{p.quote}" — <span className="font-medium text-foreground">{p.author}</span>
        </div>
      );
    case "features":
      return (
        <div className="grid grid-cols-3 gap-2">
          {(p.items || []).slice(0, 3).map((f: any, i: number) => (
            <div key={i} className="text-center p-2 bg-secondary/30 rounded-lg">
              <span className="text-lg">{f.icon}</span>
              <p className="text-xs font-medium text-foreground mt-1">{f.title}</p>
            </div>
          ))}
        </div>
      );
    case "video":
      return <div className="h-16 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground text-xs"><Video className="w-5 h-5 mr-2" /> {p.title || "Video"}</div>;
    case "divider":
      return <hr className="border-border" />;
    case "spacer":
      return <div className="bg-secondary/20 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground" style={{ height: Math.min(p.height || 48, 48) }}>{p.height}px</div>;
    case "richtext":
      return <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{p.content}</p>;
    case "products":
      return <div className="p-2 bg-secondary/30 rounded-lg text-xs text-center text-muted-foreground">📦 {p.title} ({p.count} products)</div>;
    case "categories":
      return <div className="p-2 bg-secondary/30 rounded-lg text-xs text-center text-muted-foreground">📁 {p.title} ({p.count} categories)</div>;
    case "banner":
      return p.imageUrl ? <img src={p.imageUrl} alt={p.alt} className="max-h-16 w-full object-cover rounded-lg" /> : <div className="h-12 bg-secondary rounded-lg" />;
    default:
      return <div className="text-xs text-muted-foreground">Block: {block.type}</div>;
  }
};

/* ── Main Page Builder Component ── */
interface PageBuilderProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
}

const PageBuilder: React.FC<PageBuilderProps> = ({ blocks, onChange }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const addBlock = (type: BlockType) => {
    const newBlock: PageBlock = {
      id: crypto.randomUUID(),
      type,
      visible: true,
      props: { ...defaultProps[type] },
    };
    onChange([...blocks, newBlock]);
    setAddOpen(false);
    setEditingId(newBlock.id);
  };

  const updateBlock = (id: string, props: Record<string, any>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, props } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const toggleVisibility = (id: string) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const clone: PageBlock = { ...blocks[idx], id: crypto.randomUUID(), props: { ...blocks[idx].props } };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, clone);
    onChange(updated);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.4";
  };
  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1";
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return; }
    const reordered = [...blocks];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onChange(reordered);
    setDragIndex(null);
    setOverIndex(null);
  };

  const editingBlock = blocks.find((b) => b.id === editingId);
  const catalogEntry = editingBlock ? BLOCK_CATALOG.find((c) => c.type === editingBlock.type) : null;

  return (
    <div className="flex gap-4 h-full">
      {/* Block List */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{blocks.length} blocks</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Block
          </Button>
        </div>

        {blocks.length === 0 && (
          <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center">
            <Box className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No blocks yet. Click "Add Block" to start building.</p>
          </div>
        )}

        <div className="space-y-1.5">
          {blocks.map((block, index) => {
            const catalog = BLOCK_CATALOG.find((c) => c.type === block.type);
            return (
              <motion.div
                key={block.id}
                layout
                draggable
                onDragStart={(e) => handleDragStart(e as any, index)}
                onDragEnd={(e) => handleDragEnd(e as any)}
                onDragOver={(e) => handleDragOver(e as any, index)}
                onDrop={(e) => handleDrop(e as any, index)}
                className={`group border rounded-2xl transition-all ${
                  editingId === block.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50 hover:border-border"
                } ${!block.visible ? "opacity-50" : ""} ${overIndex === index ? "border-primary/50 bg-primary/5" : ""}`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => setEditingId(editingId === block.id ? null : block.id)}>
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab shrink-0" />
                  <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {catalog?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{catalog?.label || block.type}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }} className="p-1 rounded hover:bg-secondary" disabled={index === 0}>
                      <ArrowUp className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }} className="p-1 rounded hover:bg-secondary" disabled={index === blocks.length - 1}>
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(block.id); }} className="p-1 rounded hover:bg-secondary">
                      {block.visible ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-1 rounded hover:bg-secondary">
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="px-3 pb-2.5">
                  <BlockPreview block={block} />
                </div>

                {/* Inline Settings */}
                <AnimatePresence>
                  {editingId === block.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/30"
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Settings2 className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">Settings</span>
                        </div>
                        <BlockSettings block={block} onChange={(props) => updateBlock(block.id, props)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add Block Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Block</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {BLOCK_CATALOG.map((item) => (
              <button
                key={item.type}
                onClick={() => addBlock(item.type)}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageBuilder;
// code:4ce0
