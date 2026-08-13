"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save, Trash2, Plus, Layout, ShieldCheck, Mail, Phone,
  MapPin, Globe, Sparkles, Sliders, Layers, Link as LinkIcon,
  Loader2, Zap
} from "lucide-react";
import { Instagram, Facebook, Twitter, Youtube } from "@/components/ui/social-icons";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface FooterCtaLink {
  id: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  is_active: boolean;
}

export interface FooterNavsConfig {
  brandLinks: NavLinkItem[];
  supportLinks: NavLinkItem[];
  accountLinks: NavLinkItem[];
  legalLinks: NavLinkItem[];
  ctaLinks: FooterCtaLink[];
}

export interface FooterConfig {
  show_newsletter: boolean;
  show_social: boolean;
  show_categories: boolean;
  show_quick_links: boolean;
  show_trust_badges: boolean;
  copyright_text: string;
  footer_style: "minimal" | "compact" | "expanded" | "editorial";
  bg_style: "transparent" | "glass" | "solid";
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_tiktok: string;
  social_youtube: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  terms_url: string;
  privacy_url: string;
  refund_policy_url: string;
  shipping_policy_url: string;
  contact_url: string;
}

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  show_newsletter: true,
  show_social: true,
  show_categories: true,
  show_quick_links: true,
  show_trust_badges: true,
  copyright_text: "",
  footer_style: "editorial",
  bg_style: "glass",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_tiktok: "",
  social_youtube: "",
  contact_email: "contact.orizino@gmail.com",
  contact_phone: "+8801603327099",
  contact_address: "Kushtia Sadar, Kushtia, Khulna 7000, Bangladesh",
  terms_url: "/terms",
  privacy_url: "/privacy",
  refund_policy_url: "/refund",
  shipping_policy_url: "/shipping",
  contact_url: "/support",
};

const DEFAULT_FOOTER_NAVS: FooterNavsConfig = {
  brandLinks: [
    { label: "About Orizino", href: "/page/about" },
    { label: "Story & Craft", href: "/page/about" },
    { label: "Streetwear Care", href: "/support" },
    { label: "Sustainability", href: "/page/about" },
  ],
  supportLinks: [
    { label: "Help Center", href: "/support" },
    { label: "Track Order", href: "/orders" },
    { label: "Return & Exchange", href: "/refund" },
    { label: "Contact Us", href: "/support" },
    { label: "FAQ", href: "/page/faq" },
  ],
  accountLinks: [
    { label: "My Profile", href: "/profile" },
    { label: "Order History", href: "/orders" },
    { label: "Saved Wishlist", href: "/wishlist" },
    { label: "Account Settings", href: "/settings" },
  ],
  legalLinks: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Return Policy", href: "/refund" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
  ctaLinks: [
    { id: "1", label: "Track Your Order", href: "/track", variant: "primary", is_active: true },
    { id: "2", label: "Verify Product Authenticity", href: "/scanner-info", variant: "outline", is_active: true },
    { id: "3", label: "Explore Brand Docs", href: "/docs", variant: "outline", is_active: true },
    { id: "4", label: "News & Articles", href: "/news", variant: "ghost", is_active: true },
  ],
};

const AdminFooter: React.FC = () => {
  const queryClient = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);

  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [navs, setNavs] = useState<FooterNavsConfig>(DEFAULT_FOOTER_NAVS);

  useQuery({
    queryKey: ["admin-footer-config-studio"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["footer_config", "footer_navs"]);

      const map: Record<string, any> = {};
      data?.forEach((s) => { map[s.key] = s.value; });

      if (map.footer_config) setConfig((prev) => ({ ...prev, ...map.footer_config }));
      if (map.footer_navs) {
        setNavs((prev) => ({
          ...prev,
          ...map.footer_navs,
          ctaLinks: Array.isArray(map.footer_navs.ctaLinks) ? map.footer_navs.ctaLinks : DEFAULT_FOOTER_NAVS.ctaLinks,
        }));
      }

      return map;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Try server fn compat
      try {
        await saveSiteSettings({
          data: {
            entries: [
              { key: "footer_config", value: config },
              { key: "footer_navs", value: navs },
            ],
          },
        });
      } catch (e) {
        console.warn("Server fn fallback to direct supabase client:", e);
      }

      // 2. Direct Supabase Client Upsert guarantees database persistence
      const { error: err1 } = await supabase
        .from("site_settings")
        .upsert({ key: "footer_config", value: config as any }, { onConflict: "key" });

      const { error: err2 } = await supabase
        .from("site_settings")
        .upsert({ key: "footer_navs", value: navs as any }, { onConflict: "key" });

      if (err1 || err2) {
        throw new Error(err1?.message || err2?.message || "Failed to save settings to database");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-footer"] });
      queryClient.invalidateQueries({ queryKey: ["footer-navs-brandhome"] });
      toast.success("Footer configuration & CTA button links saved to database!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save footer settings"),
  });

  const updateConfig = <K extends keyof FooterConfig>(key: K, val: FooterConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  // Nav link helpers
  const handleAddLink = (category: "brandLinks" | "supportLinks" | "accountLinks" | "legalLinks") => {
    setNavs((prev) => ({
      ...prev,
      [category]: [...prev[category], { label: "New Link", href: "/" }],
    }));
  };

  const handleUpdateLink = (category: "brandLinks" | "supportLinks" | "accountLinks" | "legalLinks", index: number, field: "label" | "href", val: string) => {
    setNavs((prev) => {
      const updated = [...prev[category]];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, [category]: updated };
    });
  };

  const handleRemoveLink = (category: "brandLinks" | "supportLinks" | "accountLinks" | "legalLinks", index: number) => {
    setNavs((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, idx) => idx !== index),
    }));
  };

  // CTA link helpers
  const handleAddCtaLink = () => {
    const newId = String(Date.now());
    setNavs((prev) => ({
      ...prev,
      ctaLinks: [
        ...(prev.ctaLinks || []),
        { id: newId, label: "New Action CTA", href: "/support", variant: "outline", is_active: true },
      ],
    }));
  };

  const handleUpdateCtaLink = (id: string, patch: Partial<FooterCtaLink>) => {
    setNavs((prev) => ({
      ...prev,
      ctaLinks: (prev.ctaLinks || []).map((cta) => (cta.id === id ? { ...cta, ...patch } : cta)),
    }));
  };

  const handleRemoveCtaLink = (id: string) => {
    setNavs((prev) => ({
      ...prev,
      ctaLinks: (prev.ctaLinks || []).filter((cta) => cta.id !== id),
    }));
  };

  const LAYOUT_STYLES = [
    {
      id: "editorial",
      title: "Editorial (Awwwards Luxury)",
      desc: "Oversized dynamic SVG watermark title, asymmetric 12-col grid, compact trust bar & CTA buttons bar.",
      badge: "Recommended",
    },
    {
      id: "expanded",
      title: "Expanded Grid",
      desc: "Classic multi-column layout with newsletter subscription bar, social pills & categorical link stacks.",
      badge: "Popular",
    },
    {
      id: "minimal",
      title: "Minimal Strip",
      desc: "Single compact row with copyright text, system status indicator, currency & theme switchers.",
      badge: "Clean",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Top Header & Sticky Action Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-6 flex-wrap sticky top-0 bg-background/90 backdrop-blur-md z-10 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Footer & Legal Navigation Studio
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                {config.footer_style} Style
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Manage storefront & BrandHome footer layouts, CTA buttons, column links & contacts all in one page.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-xl gap-2 font-bold text-xs px-5 shadow-sm"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Footer Config
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: LAYOUT & VISUAL PRESETS ── */}
      <div className="space-y-6">
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 1. Select Footer Layout Preset
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LAYOUT_STYLES.map((style) => {
              const isSelected = config.footer_style === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => updateConfig("footer_style", style.id as any)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-4 bg-background/80 ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 shadow-md"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-sm text-foreground">{style.title}</h3>
                      <Badge variant={isSelected ? "default" : "outline"} className="text-[9px]">
                        {style.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{style.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-semibold">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary animate-pulse" : "bg-muted"}`} />
                    <span className={isSelected ? "text-primary font-bold" : "text-muted-foreground"}>
                      {isSelected ? "Active Layout" : "Select Layout"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" /> Footer Feature Toggles
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            {[
              { key: "show_newsletter", title: "Newsletter Subscription Bar", desc: "Allow users to subscribe to email updates" },
              { key: "show_social", title: "Social Media Handles", desc: "Display Instagram, Facebook, Twitter & YouTube icons" },
              { key: "show_categories", title: "Category Links Stack", desc: "Show shop categories dynamically in footer" },
              { key: "show_quick_links", title: "Support & Account Links", desc: "Display quick navigational link columns" },
              { key: "show_trust_badges", title: "Trust Badges Strip", desc: "Free delivery, 7-day returns & payment guarantees" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/50">
                <div className="pr-2">
                  <h3 className="font-semibold text-xs text-foreground">{item.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={config[item.key as keyof FooterConfig] as boolean}
                  onCheckedChange={(checked) => updateConfig(item.key as keyof FooterConfig, checked as any)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: CTA ACTION BUTTONS MANAGER ── */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> 2. Footer Call to Action (CTA) Buttons
            </h2>
            <p className="text-xs text-muted-foreground">Add or remove featured CTA action buttons shown in the storefront & BrandHome footers.</p>
          </div>
          <Button onClick={handleAddCtaLink} size="sm" className="rounded-xl gap-1.5 font-bold text-xs">
            <Plus className="w-3.5 h-3.5" /> Add CTA Button
          </Button>
        </div>

        <div className="space-y-3">
          {(navs.ctaLinks || []).length === 0 && (
            <div className="p-8 text-center border border-dashed border-border/60 rounded-xl">
              <p className="text-xs text-muted-foreground">No CTA buttons added yet. Click "Add CTA Button" to create your first action button!</p>
            </div>
          )}

          {(navs.ctaLinks || []).map((cta) => (
            <div
              key={cta.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-3 bg-background/80 ${
                cta.is_active ? "border-border/60" : "border-border/30 opacity-60"
              }`}
            >
              <div className="flex-1 grid sm:grid-cols-3 gap-3 w-full">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">Button Title</label>
                  <Input
                    value={cta.label}
                    onChange={(e) => handleUpdateCtaLink(cta.id, { label: e.target.value })}
                    placeholder="e.g. Track Order"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">Target Route / URL</label>
                  <Input
                    value={cta.href}
                    onChange={(e) => handleUpdateCtaLink(cta.id, { href: e.target.value })}
                    placeholder="e.g. /track, /support, /news"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">Button Style</label>
                  <select
                    value={cta.variant || "outline"}
                    onChange={(e) => handleUpdateCtaLink(cta.id, { variant: e.target.value as any })}
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="primary">Primary Solid</option>
                    <option value="secondary">Secondary Dark</option>
                    <option value="outline">Outline Border</option>
                    <option value="ghost">Minimal Ghost</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center shrink-0 pt-2 md:pt-0">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground">Active</label>
                  <Switch
                    checked={cta.is_active}
                    onCheckedChange={(checked) => handleUpdateCtaLink(cta.id, { is_active: checked })}
                  />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveCtaLink(cta.id)}
                  className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: NAVIGATION COLUMN LINKS ── */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
          <Layers className="w-4 h-4 text-indigo-500" /> 3. Navigation Columns Link Stacks
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {[
            { key: "brandLinks" as const, title: "Brand Column Links", color: "text-blue-500" },
            { key: "supportLinks" as const, title: "Support Column Links", color: "text-emerald-500" },
            { key: "accountLinks" as const, title: "Account Column Links", color: "text-purple-500" },
            { key: "legalLinks" as const, title: "Legal & Policy Links", color: "text-amber-500" },
          ].map((col) => (
            <div key={col.key} className="bg-background/80 border border-border/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${col.color}`}>
                  <LinkIcon className="w-3.5 h-3.5" /> {col.title} ({navs[col.key].length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddLink(col.key)}
                  className="h-7 text-[11px] rounded-lg gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" /> Add Link
                </Button>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {navs[col.key].map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/40">
                    <Input
                      value={link.label}
                      onChange={(e) => handleUpdateLink(col.key, idx, "label", e.target.value)}
                      placeholder="Label..."
                      className="h-8 text-xs bg-background flex-1"
                    />
                    <Input
                      value={link.href}
                      onChange={(e) => handleUpdateLink(col.key, idx, "href", e.target.value)}
                      placeholder="/path or URL..."
                      className="h-8 text-xs font-mono bg-background flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveLink(col.key, idx)}
                      className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: CONTACTS & SOCIAL HANDLES ── */}
      <div className="space-y-6">
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-500" /> 4. Customer Care & Support Details
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> Support Email
              </label>
              <Input
                value={config.contact_email}
                onChange={(e) => updateConfig("contact_email", e.target.value)}
                placeholder="contact.orizino@gmail.com"
                className="bg-background/80 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Support Phone / WhatsApp
              </label>
              <Input
                value={config.contact_phone}
                onChange={(e) => updateConfig("contact_phone", e.target.value)}
                placeholder="+8801603327099"
                className="bg-background/80 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Headquarters Address
              </label>
              <Input
                value={config.contact_address}
                onChange={(e) => updateConfig("contact_address", e.target.value)}
                placeholder="Kushtia, Bangladesh"
                className="bg-background/80 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Official Social Media URLs
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "social_instagram" as const, label: "Instagram URL", icon: Instagram },
              { key: "social_facebook" as const, label: "Facebook Page URL", icon: Facebook },
              { key: "social_twitter" as const, label: "Twitter / X URL", icon: Twitter },
              { key: "social_youtube" as const, label: "YouTube Channel URL", icon: Youtube },
              { key: "social_tiktok" as const, label: "TikTok Profile URL", icon: Globe },
            ].map((item) => (
              <div key={item.key}>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5 text-primary" /> {item.label}
                </label>
                <Input
                  value={config[item.key]}
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  placeholder="https://..."
                  className="bg-background/80 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 5: COPYRIGHT & LEGAL SLUGS ── */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-500" /> 5. Copyright & Legal Disclosures
        </h2>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Custom Copyright Statement</label>
          <Input
            value={config.copyright_text}
            onChange={(e) => updateConfig("copyright_text", e.target.value)}
            placeholder="Leave blank for automatic copyright (e.g. © 2026 Orizino. All rights reserved.)"
            className="bg-background/80 text-xs"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Privacy Policy URL</label>
            <Input
              value={config.privacy_url}
              onChange={(e) => updateConfig("privacy_url", e.target.value)}
              className="bg-background/80 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Terms of Service URL</label>
            <Input
              value={config.terms_url}
              onChange={(e) => updateConfig("terms_url", e.target.value)}
              className="bg-background/80 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Return Policy URL</label>
            <Input
              value={config.refund_policy_url}
              onChange={(e) => updateConfig("refund_policy_url", e.target.value)}
              className="bg-background/80 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Help Center URL</label>
            <Input
              value={config.contact_url}
              onChange={(e) => updateConfig("contact_url", e.target.value)}
              className="bg-background/80 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFooter;
