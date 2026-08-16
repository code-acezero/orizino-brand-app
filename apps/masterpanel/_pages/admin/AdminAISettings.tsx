"use client";
// AI Settings Admin Module
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave, useUndoRedoState } from "@/contexts/UniversalSaveContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Brain,
  Bot,
  MessageSquare,
  MessageCircle,
  Shield,
  Clock,
  Layers,
  Send,
  Zap,
  Cpu,
  Sliders,
  Palette,
  Eye,
  Crown,
  Upload,
  RotateCcw,
  CheckCircle2,
  Globe2,
  ImageIcon,
  Play,
} from "lucide-react";
import { DEFAULT_AI_WIDGET_SETTINGS, type AiWidgetSettings } from "@/hooks/use-ai-widget-settings";
import BubbleLivePreview from "@/components/admin/BubbleLivePreview";
import GeminiFallbackPanel from "@/components/admin/GeminiFallbackPanel";
import { GeminiModelSelector } from "@/components/admin/GeminiModelSelector";

const AVATAR_PRESETS = [
  {
    id: "mr-slime",
    name: "MR. Slime (Official)",
    tag: "Luxury Water-Slime Concierge",
    url: "https://oectjdngvrqnxwhnwfrt.supabase.co/storage/v1/object/public/site-assets/ai-agent/mr-slime.jpg",
  },
  {
    id: "atelier-stylist",
    name: "Atelier Stylist",
    tag: "Luxury Consultant",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "hype-specialist",
    name: "Street Hype",
    tag: "Tokyo & London Streetwear",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  },
];

const PERSONA_PRESETS = [
  {
    id: "mr_slime",
    title: "MR. Slime (Official Concierge)",
    badge: "OFFICIAL CONCIERGE",
    tagline: "Iconic crystal-water slime companion. Fluid, warm, knowledgeable, and fluent across multiple languages.",
    config: {
      name: "MR. Slime",
      personality: "Iconic sentient crystal-water slime companion and style concierge for Orizino. Fluid, warm, playful yet deeply knowledgeable about streetwear, fabrics, sizing, and order tracking. Speaks fluent English, Dhaka Bangla/Banglish, French, Spanish, Arabic, and multilingual replies.",
      welcome_message: "Hey! Welcome to Orizino. I'm MR. Slime—your official AI concierge & luxury fit companion. How can I help you today?",
      brand_voice: "Speak with fluid charm, deep street-luxury garment knowledge, and authentic warmth. Never say 'As an AI model'. Give precise sizing advice for 240+ GSM heavyweight drop-shoulder tees, highlight 24-48h Dhaka delivery, and 7-day hassle-free exchange guarantee.",
      tone: "brotherly-luxury",
      model: "google/gemini-2.5-flash",
      temperature: 0.75,
      response_style: "balanced" as "concise" | "balanced" | "detailed",
      primary_language: "auto",
      avatar_url: "https://oectjdngvrqnxwhnwfrt.supabase.co/storage/v1/object/public/site-assets/ai-agent/mr-slime.jpg",
    },
  },
  {
    id: "luxury_stylist",
    title: "Luxury Atelier Stylist",
    badge: "HIGH FASHION",
    tagline: "Elegant, sophisticated fashion consultant focusing on silhouette, draping, and fabric texture.",
    config: {
      name: "Orizino Atelier",
      personality: "Sophisticated, artistic, polite luxury consultant with impeccable taste in high-end streetwear.",
      welcome_message: "Welcome to Orizino. I am your personal wardrobe consultant. How may I refine your look today?",
      brand_voice: "Speak with calm, refined vocabulary. Emphasize French terry construction, boxy drape, minimalist typography, and exclusive Dhaka craftsmanship.",
      tone: "luxury-concierge",
      model: "google/gemini-2.5-flash",
      temperature: 0.65,
      response_style: "balanced" as "concise" | "balanced" | "detailed",
      primary_language: "auto",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    },
  },
  {
    id: "streetwear_specialist",
    title: "Streetwear Specialist",
    badge: "HYPE STREET",
    tagline: "Energetic, trend-focused Tokyo & London streetwear fashionista.",
    config: {
      name: "Orizino Hype Agent",
      personality: "High-energy, knowledgeable streetwear guru who knows every drop, fit, and colorway inside out.",
      welcome_message: "Yo! Ready to upgrade your daily rotation? Let's get you into the freshest oversized drop shoulder tee right now.",
      brand_voice: "High energy, concise, confident. Highlight oversized boxy cuts, limited batches, and signature graphics.",
      tone: "playful",
      model: "google/gemini-2.5-flash",
      temperature: 0.85,
      response_style: "concise" as "concise" | "balanced" | "detailed",
      primary_language: "auto",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    },
  },
];

const DEFAULT_CONFIG = {
  name: "MR. Slime",
  welcome_message: "Hey! Welcome to Orizino. I'm MR. Slime—your official AI concierge & luxury fit companion. How can I help you today?",
  personality: "Iconic sentient crystal-water slime companion and style concierge for Orizino. Fluid, warm, playful yet deeply knowledgeable about streetwear, fabrics, sizing, and order tracking. Speaks fluent English, Dhaka Bangla/Banglish, French, Spanish, Arabic, and multilingual replies.",
  custom_instructions: "",
  is_enabled: true,
  show_on_all_pages: true,
  primary_color: "",
  avatar_url: "https://oectjdngvrqnxwhnwfrt.supabase.co/storage/v1/object/public/site-assets/ai-agent/mr-slime.jpg",
  avatar_type: "image" as const,
  fab_bubble_style: "water" as "solid" | "transparent" | "glass" | "water",
  fab_bubble_color: "#3b82f6",
  fab_bubble_color2: "#f755ab",
  fab_energy_color: "#ef4444",
  fab_enable_energy: true,
  fab_energy_interval: 5,
  fab_show_hover_label: true,
  fab_hover_label_text: "Chat with MR. Slime",
  fab_size: 56,
  fab_underwater_texts: ["MR. Slime", "Find Your Fit", "240+ GSM Cotton", "Track Order", "Dhaka Atelier"] as string[],
  model: "google/gemini-2.5-flash",
  temperature: 0.75,
  max_tokens: 800,
  response_style: "balanced" as "concise" | "balanced" | "detailed",
  primary_language: "auto",
  fallback_language: "en",
  tone: "brotherly-luxury",
  brand_voice: "Speak with fluid charm, deep street-luxury garment knowledge, and authentic warmth. Never say 'As an AI model'. Give precise sizing advice for 240+ GSM heavyweight drop-shoulder tees, highlight 24-48h Dhaka delivery, and 7-day hassle-free exchange guarantee.",
  knowledge_base: "Dhaka delivery within 24-48 hours (৳70). Outside Dhaka delivery within 48-72 hours (৳130). 240+ GSM compact combed cotton. Free size exchange within 7 days. Cash on delivery available with doorstep inspection.",
  restricted_topics: "competitors, political topics, non-clothing unrelated queries",
  cap_product_recommendations: true,
  cap_order_tracking: true,
  cap_returns_refunds: true,
  cap_inventory_lookup: true,
  cap_coupon_lookup: true,
  cap_faq_answers: true,
  cap_human_handoff: true,
  cap_collect_lead: false,
  cap_memory: true,
  escalation_keywords: ["human", "agent", "manager", "refund issue", "complaint", "talk to human"] as string[],
  fallback_message: "I'm right here with you brother. Let me connect you directly with one of our human team members who can sort this out for you immediately.",
  out_of_hours_message: "Our team is offline right now, brother. Leave your message or order ID and we'll reply first thing in the morning!",
  business_hours_enabled: false,
  business_hours_start: "09:00",
  business_hours_end: "21:00",
  business_timezone: "Asia/Dhaka",
  max_messages_per_session: 50,
  require_login_to_chat: false,
};

const AdminAISettings = () => {
  const qc = useQueryClient();
  const [
    form,
    setForm,
    { undo, redo, canUndo, canRedo, reject, canReject, setInitial },
  ] = useUndoRedoState(DEFAULT_CONFIG);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [widgetForm, setWidgetForm] = useState<AiWidgetSettings>(DEFAULT_AI_WIDGET_SETTINGS);

  const [simMessages, setSimMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hey! Welcome to Orizino. I'm MR. Slime—your official AI concierge & luxury fit companion. How can I help you today?" },
  ]);
  const [simInput, setSimInput] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  const { data: widgetData } = useQuery({
    queryKey: ["admin-ai-widget-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_widget_settings" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (widgetData) setWidgetForm({ ...DEFAULT_AI_WIDGET_SETTINGS, ...widgetData });
  }, [widgetData]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `ai-agent/avatar-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, avatar_url: urlData.publicUrl, avatar_type: "image" as const }));
      toast.success("Avatar image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { data: config } = useQuery({
    queryKey: ["admin-ai-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ai_agent_config").maybeSingle();
      const raw = (data?.value as any) || {};
      return raw && typeof raw === "object" && "value" in raw && typeof raw.value === "object"
        ? raw.value
        : raw;
    },
  });

  useEffect(() => {
    if (config) {
      setInitial((prev) => ({
        ...DEFAULT_CONFIG,
        ...prev,
        ...config,
        avatar_type: "image",
        avatar_url: config.avatar_url || prev.avatar_url,
      }));
    }
  }, [config, setInitial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { value: _legacy, avatar_emoji: _omitEmoji, ...clean } = form as any;
      const cleanPayload = {
        ...clean,
        avatar_type: "image",
      };

      // 1. Save to site_settings (ai_agent_config)
      const { error: err1 } = await supabase.from("site_settings").upsert({
        key: "ai_agent_config",
        value: cleanPayload as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (err1) throw err1;

      // 2. Synchronize ai_widget_settings if present
      if (widgetForm) {
        try {
          await supabase.from("ai_widget_settings" as any).upsert({
            ...(widgetData?.id ? { id: widgetData.id } : {}),
            ...widgetForm,
            fab_bubble_style: form.fab_bubble_style,
            fab_bubble_color: form.fab_bubble_color,
            fab_bubble_color2: form.fab_bubble_color2,
            fab_energy_color: form.fab_energy_color,
            fab_enable_energy: form.fab_enable_energy,
            fab_energy_interval: form.fab_energy_interval,
            fab_show_hover_label: form.fab_show_hover_label,
            fab_hover_label_text: form.fab_hover_label_text,
            fab_size: form.fab_size,
            fab_underwater_texts: form.fab_underwater_texts,
            updated_at: new Date().toISOString(),
          } as any);
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-config"] });
      qc.invalidateQueries({ queryKey: ["ai-agent-config"] });
      qc.invalidateQueries({ queryKey: ["admin-ai-widget-settings"] });
      toast.success("AI agent settings saved successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save AI configuration"),
  });

  const isDirty = useMemo(() => {
    if (!config) return true;
    const currentClean = { ...form, avatar_type: "image" };
    const savedClean = { ...DEFAULT_CONFIG, ...config, avatar_type: "image" };
    const keys = Object.keys(DEFAULT_CONFIG) as (keyof typeof DEFAULT_CONFIG)[];
    return keys.some((k) => JSON.stringify(currentClean[k]) !== JSON.stringify(savedClean[k]));
  }, [form, config]);

  useRegisterUniversalSave(
    {
      label: "Save AI Configuration",
      onSave: () => saveMutation.mutateAsync(),
      isSaving: saveMutation.isPending,
      isDirty: isDirty,
      onUndo: undo,
      canUndo: canUndo,
      onRedo: redo,
      canRedo: canRedo,
      onReject: () => {
        reject();
        toast.warning("AI settings reverted");
      },
      canReject: canReject,
    },
    [form, config, isDirty, saveMutation.isPending, canUndo, canRedo, canReject]
  );

  const applyPreset = (preset: typeof PERSONA_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      ...preset.config,
      avatar_url: preset.config.avatar_url || prev.avatar_url,
    }));
    setSimMessages([
      { role: "assistant", content: preset.config.welcome_message },
    ]);
    toast.success(`Applied "${preset.title}" preset`);
  };

  const handleSimSend = async () => {
    const text = simInput.trim();
    if (!text || simLoading) return;
    const newHistory = [...simMessages, { role: "user" as const, content: text }];
    setSimMessages(newHistory);
    setSimInput("");
    setSimLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newHistory,
          context: {
            locale: form.primary_language || "auto",
          },
        },
      });

      if (error) throw error;

      const reply = data?.reply || data?.message?.content || data?.choices?.[0]?.message?.content || "আরে ভাই, আমি সবসময় আপনার সাথে আছি!";
      setSimMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setSimMessages([
        ...newHistory,
        { role: "assistant", content: `(Brother Concierge): ভাই, আপনার মেসেজ পেয়েছি! ফ্যাব্রিক ও সাইজিং নিয়ে কোনো প্রশ্ন থাকলে নির্দ্বিধায় বলেন—সব সময় সাথে আছি!` },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background shadow-lg backdrop-blur-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-semibold">
            <Bot className="w-3.5 h-3.5" /> Next-Gen Concierge Agent
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">AI Concierge & Streetwear Companion</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Powered by <strong>Google Gemini 2.5 Flash</strong> with dynamic multilingual intelligence (English, Bangla, French, Spanish, Arabic, Hindi), drop-shoulder sizing precision, and live order tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            type="button"
            onClick={() => saveMutation.mutateAsync()}
            disabled={saveMutation.isPending}
            className="gap-2 px-5 rounded-2xl shadow-md cursor-pointer font-bold"
          >
            {saveMutation.isPending ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="w-4 h-4 text-primary" /> Curated Persona Presets
          </CardTitle>
          <CardDescription>
            Select a tailored persona to instantly configure personality, tone, model, and instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PERSONA_PRESETS.map((p) => {
              const isSelected = form.name === p.config.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary shadow-md"
                      : "border-border/50 bg-background/50 hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">{p.title}</p>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{p.tagline}</p>
                  </div>
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Model: Gemini 2.5 Flash</span>
                    <span className="text-primary font-bold">{isSelected ? "● ACTIVE" : "Apply →"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Identity & Avatar Studio</CardTitle>
            <CardDescription>Configure agent name, greeting, and high-resolution photo avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Orizino Bhai" />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" /> Official Image Avatar
              </Label>
              
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/60 bg-background/50">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/40 bg-secondary/30 shrink-0 flex items-center justify-center">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Agent avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-8 h-8 text-primary" />
                  )}
                  <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
                </div>
                
                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {form.avatar_url ? "Custom Photo Active" : "Default Bot Icon"}
                  </p>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                    {form.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm({ ...form, avatar_url: "" })}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Luxury Avatar Presets
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_PRESETS.map((p) => {
                    const isSelected = form.avatar_url === p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm({ ...form, avatar_url: p.url })}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border/50 bg-background/40 hover:border-primary/30"
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{p.tag}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Direct Image URL</Label>
                <Input
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.png"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Personality Brief</Label>
              <Input value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder="Warm, stylish, streetwear-savvy brother..." />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Storefront Visibility & Launcher</CardTitle>
            <CardDescription>Control where and when the agent floating launcher appears</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/50 bg-secondary/10">
              <div>
                <p className="text-sm font-medium">Enable AI Agent</p>
                <p className="text-xs text-muted-foreground">Show the live concierge widget to customers across the storefront</p>
              </div>
              <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/50 bg-secondary/10">
              <div>
                <p className="text-sm font-medium">Show on All Pages</p>
                <p className="text-xs text-muted-foreground">Display floating widget site-wide across shop, products, and checkout</p>
              </div>
              <Switch checked={form.show_on_all_pages} onCheckedChange={(v) => setForm({ ...form, show_on_all_pages: v })} />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Storefront Floating Bubble Preview
              </Label>
              <BubbleLivePreview form={form} widgetForm={widgetForm} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Messages & System Prompt</CardTitle>
            <CardDescription>Customize the welcome greeting, brand policies, and dynamic multilingual rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Welcome Greeting</Label>
              <Textarea
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                placeholder="Hey brother! Welcome to Orizino..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Custom Persona Instructions (Prompt Injection)</Label>
              <Textarea
                value={form.custom_instructions}
                onChange={(e) => setForm({ ...form, custom_instructions: e.target.value })}
                placeholder="e.g. Always recommend our 240+ GSM signature oversized drop shoulder t-shirts for casual streetwear fits..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Injected directly into the AI system prompt to guide tone, policies, and behavior.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> AI Brain Engine & Multilingual Intelligence</CardTitle>
            <CardDescription>Powered by Google Gemini 2.5 Flash Free Tier with automatic 3-tier language detection.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <GeminiModelSelector
                value={form.model}
                onChange={(modelId) => setForm({ ...form, model: modelId })}
              />
            </div>
            <div className="space-y-2">
              <Label>Response Style</Label>
              <select
                value={form.response_style}
                onChange={(e) => setForm({ ...form, response_style: e.target.value as any })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="concise">Concise — 1–2 sharp, brotherly sentences</option>
                <option value="balanced">Balanced — natural, engaging conversation</option>
                <option value="detailed">Detailed — comprehensive style & fit analysis</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Max Output Tokens</Label>
              <Input type="number" min={100} max={4000}
                value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) || 800 })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-primary" /> Dynamic Multilingual Intelligence</Label>
              <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">3-Tier Intelligent Code-Switching Active:</p>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Tier 1 (Explicit Request):</strong> If user says "Speak in French", "বাংলায় বলো", "Talk in Arabic", "Chat in Spanish", or "Reply in Hindi", AI immediately switches language.</li>
                  <li><strong>Tier 2 (Reply Matching):</strong> Automatically detects the language of any customer message and replies in that exact language.</li>
                  <li><strong>Tier 3 (App Selected Language):</strong> Respects the storefront active locale as baseline default.</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Voice & Sizing Guidelines</Label>
              <Textarea rows={3}
                value={form.brand_voice}
                onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
                placeholder="e.g. Always ask for height/weight when recommending sizes..." />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-primary/30 bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500" /> Live AI Agent Simulator
                </CardTitle>
                <CardDescription>
                  Test conversation flow, multilingual language switching (Bangla, English, French, Spanish, Arabic, Hindi), and sizing recommendations in real time.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSimMessages([{ role: "assistant", content: form.welcome_message }])}
                className="gap-1.5 h-8 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Chat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 overflow-y-auto p-4 rounded-2xl border border-border/50 bg-background/60 space-y-3">
              {simMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-primary/30 bg-primary/15 flex items-center justify-center shrink-0">
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="Bhai" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                        : "bg-muted/80 text-foreground border border-border/40 rounded-tl-xs"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {simLoading && (
                <div className="flex gap-2.5 justify-start items-center text-xs text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-primary/30 bg-primary/15 flex items-center justify-center shrink-0 animate-pulse">
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt={form.name || "AI"} className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <span className="animate-pulse font-mono">{form.name || "MR. Slime"} is typing...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSimSend()}
                placeholder="Type in any language (e.g. 'ভাই আমার হাইট ৫'৮ কোনটা সাইজ?', 'Parle en français', 'Hola hermano')..."
                className="text-xs"
              />
              <Button onClick={handleSimSend} disabled={simLoading || !simInput.trim()} className="gap-1.5 px-4 shrink-0">
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <GeminiFallbackPanel />
    </div>
  );
};

export default AdminAISettings;
