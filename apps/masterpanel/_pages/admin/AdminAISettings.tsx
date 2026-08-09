"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/app-toast";
import {
  Bot,
  MessageCircle,
  Upload,
  X,
  Image as ImageIcon,
  Droplet,
  Zap,
  Brain,
  Shield,
  Wrench,
  Languages,
  Clock,
} from "lucide-react";
import { DEFAULT_AI_WIDGET_SETTINGS, type AiWidgetSettings } from "@/hooks/use-ai-widget-settings";
import BubbleLivePreview from "@/components/admin/BubbleLivePreview";
import GeminiFallbackPanel from "@/components/admin/GeminiFallbackPanel";

const DEFAULT_CONFIG = {
  name: "AI Assistant",
  welcome_message: "Hi! I'm here to help you find products, track orders, and more. How can I assist you?",
  personality: "friendly, helpful, and knowledgeable about products",
  custom_instructions: "",
  is_enabled: true,
  show_on_all_pages: true,
  primary_color: "",
  avatar_emoji: "🤖",
  avatar_url: "",
  avatar_type: "emoji" as "emoji" | "image",
  // Floating water bubble (FAB)
  fab_bubble_style: "solid" as "solid" | "transparent" | "glass" | "water",
  fab_bubble_color: "#3b82f6",
  fab_bubble_color2: "#a855f7",
  fab_energy_color: "#ef4444",
  fab_enable_energy: true,
  fab_energy_interval: 5,
  fab_show_hover_label: true,
  fab_hover_label_text: "Chat with us",
  fab_size: 56,
  fab_underwater_texts: ["Chat", "AI", "Need help?", "Ask anything", "Agent support"] as string[],
  // Advanced AI brain
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  max_tokens: 800,
  response_style: "balanced" as "concise" | "balanced" | "detailed",
  primary_language: "auto",
  fallback_language: "en",
  tone: "professional-friendly",
  brand_voice: "",
  knowledge_base: "",
  restricted_topics: "",
  // Capabilities (tool toggles)
  cap_product_recommendations: true,
  cap_order_tracking: true,
  cap_returns_refunds: true,
  cap_inventory_lookup: true,
  cap_coupon_lookup: true,
  cap_faq_answers: true,
  cap_human_handoff: true,
  cap_collect_lead: false,
  cap_memory: true,
  // Safety & handoff
  escalation_keywords: ["human", "agent", "manager", "refund issue", "complaint"] as string[],
  fallback_message:
    "I'm not sure about that yet. Want me to connect you with a human teammate?",
  out_of_hours_message:
    "Our team is offline right now. Leave your question and we'll reply first thing in the morning.",
  // Business hours
  business_hours_enabled: false,
  business_hours_start: "09:00",
  business_hours_end: "21:00",
  business_timezone: "Asia/Dhaka",
  // Rate / safety
  max_messages_per_session: 50,
  require_login_to_chat: false,
};

const AdminAISettings = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [widgetForm, setWidgetForm] = useState<AiWidgetSettings>(DEFAULT_AI_WIDGET_SETTINGS);

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

  const saveWidgetMutation = useMutation({
    mutationFn: async () => {
      const { id, ...rest } = widgetForm;
      if (id) {
        const { error } = await supabase
          .from("ai_widget_settings" as any)
          .update(rest as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_widget_settings" as any).insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-widget-settings"] });
      qc.invalidateQueries({ queryKey: ["ai-widget-settings"] });
      toast.success("Agent Flow widget settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateList = (key: keyof AiWidgetSettings, val: string) =>
    setWidgetForm((p) => ({ ...p, [key]: val.split("\n").map((s) => s.trim()).filter(Boolean) } as AiWidgetSettings));

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `ai-agent/avatar-${Date.now()}.${ext}`;
      // Admins have write access to the `site-assets` bucket (not `avatars`,
      // which is per-user keyed by auth.uid()/...). Using site-assets avoids
      // the "row violates row-level security policy" error.
      const { error: uploadErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, avatar_url: urlData.publicUrl, avatar_type: "image" as const }));
      toast.success("Avatar uploaded");
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
      // Older writes double-wrapped the payload as { value: {...} }.
      // Unwrap so name/avatar and every other key surface at the top level.
      return raw && typeof raw === "object" && "value" in raw && typeof raw.value === "object"
        ? raw.value
        : raw;
    },
  });

  useEffect(() => {
    if (config) {
      const { value: _legacy, ...clean } = config as any;
      setForm({ ...DEFAULT_CONFIG, ...clean });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Never write the legacy nested `value` key back.
      const { value: _legacy, ...clean } = form as any;
      const { error } = await supabase.from("site_settings").upsert({
        key: "ai_agent_config",
        value: clean as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-config"] });
      qc.invalidateQueries({ queryKey: ["ai-agent-config"] });
      toast.success("AI agent settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">AI Agent Settings</h1>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Identity</CardTitle>
            <CardDescription>Configure your AI agent's name and personality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AI Assistant" />
            </div>

            {/* Avatar Type Selector */}
            <div className="space-y-3">
              <Label>Avatar</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, avatar_type: "emoji" })}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    form.avatar_type === "emoji" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, avatar_type: "image" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    form.avatar_type === "image" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Image
                </button>
              </div>

              {form.avatar_type === "emoji" ? (
                <Input value={form.avatar_emoji} onChange={(e) => setForm({ ...form, avatar_emoji: e.target.value })} placeholder="🤖" maxLength={4} className="w-20 text-center text-xl" />
              ) : (
                <div className="space-y-2">
                  {form.avatar_url ? (
                    <div className="relative inline-block">
                      <img src={form.avatar_url} alt="Agent avatar" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, avatar_url: "", avatar_type: "emoji" })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading..." : form.avatar_url ? "Change Image" : "Upload Avatar"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Recommended: 128×128px, under 2MB</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Personality</Label>
              <Input value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder="friendly, helpful..." />
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Behavior</CardTitle>
            <CardDescription>Control how and where the agent appears</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable AI Agent</p>
                <p className="text-xs text-muted-foreground">Show the chat widget on the site</p>
              </div>
              <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show on All Pages</p>
                <p className="text-xs text-muted-foreground">Display floating widget site-wide</p>
              </div>
              <Switch checked={form.show_on_all_pages} onCheckedChange={(v) => setForm({ ...form, show_on_all_pages: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Messages & Instructions</CardTitle>
            <CardDescription>Customize the agent's greeting and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                placeholder="Hi! How can I help you today?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Custom Instructions</Label>
              <Textarea
                value={form.custom_instructions}
                onChange={(e) => setForm({ ...form, custom_instructions: e.target.value })}
                placeholder="Additional instructions for the AI agent... (e.g., specific policies, brand voice guidelines, topics to avoid)"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                These instructions are added to the AI's system prompt. Use them to customize behavior, add policies, or restrict topics.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Floating Water Bubble (FAB) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Droplet className="w-5 h-5" /> Floating Water Bubble</CardTitle>
            <CardDescription>Customize the animated water bubble launcher and its red energy pulse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Live preview */}
            <BubbleLivePreview form={form} widgetForm={widgetForm} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Bubble Style</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["solid", "transparent", "glass", "water"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, fab_bubble_style: s })}
                      className={`px-3 py-2 rounded-md border text-sm capitalize transition ${form.fab_bubble_style === s ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Solid uses full colors. Transparent shows the page through. Glass adds a frosted blur. Water is a clear refractive bubble with caustic highlights.</p>
              </div>
              <div className="space-y-2">
                <Label>Bubble Color (primary)</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.fab_bubble_color} onChange={(e) => setForm({ ...form, fab_bubble_color: e.target.value })} className="w-12 h-10 rounded border border-border bg-transparent cursor-pointer" />
                  <Input value={form.fab_bubble_color} onChange={(e) => setForm({ ...form, fab_bubble_color: e.target.value })} placeholder="#3b82f6" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bubble Color (highlight)</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.fab_bubble_color2} onChange={(e) => setForm({ ...form, fab_bubble_color2: e.target.value })} className="w-12 h-10 rounded border border-border bg-transparent cursor-pointer" />
                  <Input value={form.fab_bubble_color2} onChange={(e) => setForm({ ...form, fab_bubble_color2: e.target.value })} placeholder="#a855f7" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Energy Pulse Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.fab_energy_color} onChange={(e) => setForm({ ...form, fab_energy_color: e.target.value })} className="w-12 h-10 rounded border border-border bg-transparent cursor-pointer" />
                  <Input value={form.fab_energy_color} onChange={(e) => setForm({ ...form, fab_energy_color: e.target.value })} placeholder="#ef4444" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Energy Pulse Interval (seconds)</Label>
                <Input type="number" min={2} max={30} value={form.fab_energy_interval} onChange={(e) => setForm({ ...form, fab_energy_interval: Number(e.target.value) || 5 })} />
              </div>
              <div className="space-y-2">
                <Label>Bubble Size (px)</Label>
                <Input type="number" min={44} max={96} value={form.fab_size} onChange={(e) => setForm({ ...form, fab_size: Number(e.target.value) || 56 })} />
              </div>
              <div className="space-y-2">
                <Label>Hover Label Text</Label>
                <Input value={form.fab_hover_label_text} onChange={(e) => setForm({ ...form, fab_hover_label_text: e.target.value })} placeholder="Chat with us" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div>
                <p className="text-sm font-medium">Enable red energy pulse</p>
                <p className="text-xs text-muted-foreground">Periodic electric flow inside the bubble</p>
              </div>
              <Switch checked={form.fab_enable_energy} onCheckedChange={(v) => setForm({ ...form, fab_enable_energy: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show hover label</p>
                <p className="text-xs text-muted-foreground">Capsule shown next to the bubble on desktop hover</p>
              </div>
              <Switch checked={form.fab_show_hover_label} onCheckedChange={(v) => setForm({ ...form, fab_show_hover_label: v })} />
            </div>
          </CardContent>
        </Card>

        {/* AI Brain — model & response */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5" /> AI Brain</CardTitle>
            <CardDescription>Choose the model, tone, and response shape for the agent.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Model</Label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash · fastest & free</option>
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro · most capable</option>
                <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite · cheapest</option>
                <option value="openai/gpt-5">GPT-5 · premium reasoning</option>
                <option value="openai/gpt-5-mini">GPT-5 Mini · balanced</option>
                <option value="openai/gpt-5-nano">GPT-5 Nano · ultra fast</option>
              </select>
              <p className="text-xs text-muted-foreground">Routed via Lovable AI Gateway.</p>
            </div>
            <div className="space-y-2">
              <Label>Response style</Label>
              <select
                value={form.response_style}
                onChange={(e) => setForm({ ...form, response_style: e.target.value as any })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="concise">Concise — 1–2 sentences</option>
                <option value="balanced">Balanced — short paragraphs</option>
                <option value="detailed">Detailed — thorough answers</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Creativity (temperature: {form.temperature.toFixed(2)})</Label>
              <input
                type="range" min={0} max={1.5} step={0.05}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">0 = factual, 1.5 = playful & creative.</p>
            </div>
            <div className="space-y-2">
              <Label>Max response length (tokens)</Label>
              <Input type="number" min={100} max={4000}
                value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) || 800 })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Languages className="w-3.5 h-3.5" /> Primary language</Label>
              <select
                value={form.primary_language}
                onChange={(e) => setForm({ ...form, primary_language: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="auto">Auto-detect from user</option>
                <option value="en">English</option>
                <option value="bn">Bangla</option>
                <option value="hi">Hindi</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <select
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="professional-friendly">Professional & friendly</option>
                <option value="luxury-concierge">Luxury concierge</option>
                <option value="playful">Playful & witty</option>
                <option value="empathetic">Empathetic & calm</option>
                <option value="expert">Expert & matter-of-fact</option>
                <option value="casual">Casual buddy</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Brand voice notes</Label>
              <Textarea rows={3}
                value={form.brand_voice}
                onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
                placeholder="e.g. Always mention 7-day free returns. Never discount more than 15%. Refer to us as 'the studio'." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Knowledge base</Label>
              <Textarea rows={5}
                value={form.knowledge_base}
                onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })}
                placeholder="Paste FAQs, policies, shipping details, sizing notes. The agent will use this as ground truth." />
              <p className="text-xs text-muted-foreground">Injected into the system prompt as authoritative facts.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Restricted topics</Label>
              <Input
                value={form.restricted_topics}
                onChange={(e) => setForm({ ...form, restricted_topics: e.target.value })}
                placeholder="e.g. competitors, medical advice, legal advice" />
              <p className="text-xs text-muted-foreground">Comma-separated. The agent will politely redirect.</p>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5" /> Capabilities</CardTitle>
            <CardDescription>Toggle what the agent can do for customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["cap_product_recommendations", "Product recommendations", "Suggest items from the catalog"],
              ["cap_order_tracking", "Order tracking", "Look up order status and delivery ETA"],
              ["cap_returns_refunds", "Returns & refunds", "Guide through return / refund flow"],
              ["cap_inventory_lookup", "Inventory & stock", "Check live stock and variants"],
              ["cap_coupon_lookup", "Coupons & offers", "Share active promo codes"],
              ["cap_faq_answers", "FAQ answers", "Answer policy & shipping questions"],
              ["cap_human_handoff", "Human handoff", "Escalate to a real agent on request"],
              ["cap_collect_lead", "Collect leads", "Ask for name & email when helpful"],
              ["cap_memory", "Remember the customer", "Personalize across sessions"],
            ].map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground truncate">{desc}</p>
                </div>
                <Switch
                  checked={(form as any)[key]}
                  onCheckedChange={(v) => setForm({ ...form, [key]: v } as any)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safety, hours & handoff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Safety & Handoff</CardTitle>
            <CardDescription>Hours, fallback copy, and escalation triggers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Escalation keywords (comma-separated)</Label>
              <Input
                value={(form.escalation_keywords || []).join(", ")}
                onChange={(e) => setForm({
                  ...form,
                  escalation_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })}
                placeholder="human, agent, manager, complaint"
              />
              <p className="text-xs text-muted-foreground">When detected, agent offers handoff to a human.</p>
            </div>
            <div className="space-y-2">
              <Label>Fallback message (when unsure)</Label>
              <Textarea rows={2}
                value={form.fallback_message}
                onChange={(e) => setForm({ ...form, fallback_message: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Out-of-hours message</Label>
              <Textarea rows={2}
                value={form.out_of_hours_message}
                onChange={(e) => setForm({ ...form, out_of_hours_message: e.target.value })} />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Business hours mode</p>
                <p className="text-xs text-muted-foreground">Outside hours, the agent uses the out-of-hours message.</p>
              </div>
              <Switch checked={form.business_hours_enabled}
                onCheckedChange={(v) => setForm({ ...form, business_hours_enabled: v })} />
            </div>
            {form.business_hours_enabled && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={form.business_hours_start}
                    onChange={(e) => setForm({ ...form, business_hours_start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={form.business_hours_end}
                    onChange={(e) => setForm({ ...form, business_hours_end: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Timezone</Label>
                  <Input value={form.business_timezone}
                    onChange={(e) => setForm({ ...form, business_timezone: e.target.value })}
                    placeholder="Asia/Dhaka" />
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label>Max messages / session</Label>
                <Input type="number" min={5} max={500}
                  value={form.max_messages_per_session}
                  onChange={(e) => setForm({ ...form, max_messages_per_session: Number(e.target.value) || 50 })} />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Require login to chat</p>
                  <p className="text-xs text-muted-foreground">Guests will be asked to sign in first.</p>
                </div>
                <Switch checked={form.require_login_to_chat}
                  onCheckedChange={(v) => setForm({ ...form, require_login_to_chat: v })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Flow Widget — DB-managed copy & welcome */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Agent Flow Widget</CardTitle>
                <CardDescription>
                  Floating texts, chat greetings, premade questions, and cinematic daily welcome.
                  Use <code>{"{name}"}</code> and <code>{"{brand}"}</code> as placeholders.
                </CardDescription>
              </div>
              <Button onClick={() => saveWidgetMutation.mutate()} disabled={saveWidgetMutation.isPending} size="sm">
                {saveWidgetMutation.isPending ? "Saving..." : "Save widget"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Floating texts (one per line)</Label>
                <Textarea
                  rows={5}
                  value={(widgetForm.fab_floating_texts || []).join("\n")}
                  onChange={(e) => updateList("fab_floating_texts", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Premade questions (one per line)</Label>
                <Textarea
                  rows={5}
                  value={(widgetForm.chat_premade_questions || []).join("\n")}
                  onChange={(e) => updateList("chat_premade_questions", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Animation style</Label>
                <select
                  value={widgetForm.fab_animation_style}
                  onChange={(e) => setWidgetForm({ ...widgetForm, fab_animation_style: e.target.value as any })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="drift">Drift</option>
                  <option value="orbit">Orbit</option>
                  <option value="pulse">Pulse</option>
                  <option value="wave">Wave</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Animation intensity (1–10)</Label>
                <Input
                  type="number" min={1} max={10}
                  value={widgetForm.fab_animation_intensity}
                  onChange={(e) => setWidgetForm({ ...widgetForm, fab_animation_intensity: Math.max(1, Math.min(10, Number(e.target.value) || 5)) })}
                />
              </div>
              <div className="flex items-center justify-between sm:col-span-2 pt-1">
                <div>
                  <p className="text-sm font-medium">Show avatar inline with texts</p>
                  <p className="text-xs text-muted-foreground">Occasionally swap the floating text for the Agent Flow avatar.</p>
                </div>
                <Switch
                  checked={widgetForm.fab_show_avatar_inline}
                  onCheckedChange={(v) => setWidgetForm({ ...widgetForm, fab_show_avatar_inline: v })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Chat greeting — logged-in users</Label>
                <Textarea rows={2} value={widgetForm.chat_greeting_logged_in}
                  onChange={(e) => setWidgetForm({ ...widgetForm, chat_greeting_logged_in: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Chat greeting — guests</Label>
                <Textarea rows={2} value={widgetForm.chat_greeting_guest}
                  onChange={(e) => setWidgetForm({ ...widgetForm, chat_greeting_guest: e.target.value })} />
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable cinematic daily welcome</p>
                  <p className="text-xs text-muted-foreground">Big water bubble greets visitors once per day.</p>
                </div>
                <Switch checked={widgetForm.welcome_enabled}
                  onCheckedChange={(v) => setWidgetForm({ ...widgetForm, welcome_enabled: v })} />
              </div>
              <div className="space-y-2">
                <Label>Welcome duration (ms)</Label>
                <Input type="number" min={1500} max={12000}
                  value={widgetForm.welcome_cinematic_duration_ms}
                  onChange={(e) => setWidgetForm({ ...widgetForm, welcome_cinematic_duration_ms: Number(e.target.value) || 4500 })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First-time visitor</Label>
                  <Textarea rows={2} value={widgetForm.welcome_first_time}
                    onChange={(e) => setWidgetForm({ ...widgetForm, welcome_first_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Returning logged-in (one per line)</Label>
                  <Textarea rows={3} value={(widgetForm.welcome_returning_logged_in || []).join("\n")}
                    onChange={(e) => updateList("welcome_returning_logged_in", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Returning today (one per line)</Label>
                  <Textarea rows={3} value={(widgetForm.welcome_returning_today || []).join("\n")}
                    onChange={(e) => updateList("welcome_returning_today", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Returning this week (one per line)</Label>
                  <Textarea rows={3} value={(widgetForm.welcome_returning_week || []).join("\n")}
                    onChange={(e) => updateList("welcome_returning_week", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Returning after a long time (one per line)</Label>
                  <Textarea rows={3} value={(widgetForm.welcome_returning_long || []).join("\n")}
                    onChange={(e) => updateList("welcome_returning_long", e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GeminiFallbackPanel />
    </div>
  );
};

export default AdminAISettings;
// code:4ce0
