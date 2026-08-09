"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Eye, Trash2, Plus } from "lucide-react";
import { defaultAdminFooterConfig, type AdminFooterConfig, type AdminFooterLink } from "@/hooks/use-admin-footer-settings";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

interface FooterConfig {
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
  terms_url: string;
  privacy_url: string;
  refund_policy_url: string;
  shipping_policy_url: string;
  contact_url: string;
}

const defaultConfig: FooterConfig = {
  show_newsletter: true,
  show_social: true,
  show_categories: true,
  show_quick_links: true,
  show_trust_badges: true,
  copyright_text: "",
  footer_style: "compact",
  bg_style: "glass",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_tiktok: "",
  social_youtube: "",
  terms_url: "",
  privacy_url: "",
  refund_policy_url: "",
  shipping_policy_url: "",
  contact_url: "",
};

const AdminFooter: React.FC = () => {
  const queryClient = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [config, setConfig] = useState<FooterConfig>(defaultConfig);

  const { isLoading } = useQuery({
    queryKey: ["admin-footer-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "footer_config").maybeSingle();
      return (data?.value as unknown as FooterConfig) || null;
    },
    staleTime: 0,
    refetchOnMount: true,
    meta: {
      onSuccess: (data: FooterConfig | null) => {
        if (data) setConfig({ ...defaultConfig, ...data });
      },
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "footer_config", value: config }] } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-footer"] });
      toast.success("Footer settings saved!");
    },
    onError: () => toast.error("Failed to save"),
  });

  const update = <K extends keyof FooterConfig>(key: K, val: FooterConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const styles: { id: FooterConfig["footer_style"]; label: string; desc: string }[] = [
    { id: "editorial", label: "Editorial (Awwwards)", desc: "Oversized wordmark, asymmetric grid, generous whitespace" },
    { id: "expanded", label: "Expanded", desc: "Classic multi-column with newsletter and link sections" },
    { id: "minimal", label: "Minimal", desc: "Single line, brand + copyright only" },
  ];

  const bgStyles: { id: FooterConfig["bg_style"]; label: string }[] = [
    { id: "transparent", label: "Transparent" },
    { id: "glass", label: "Glass" },
    { id: "solid", label: "Solid" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Footer Settings</h1>
          <p className="text-sm text-muted-foreground">Customize the site footer appearance and content</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Layout Style */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Layout Style</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => update("footer_style", s.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${config.footer_style === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
              >
                <p className="font-medium text-sm text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Background Style */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Background</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {bgStyles.map((b) => (
                <button
                  key={b.id}
                  onClick={() => update("bg_style", b.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${config.bg_style === b.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Toggles */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Sections</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {([
              ["show_newsletter", "Newsletter"],
              ["show_social", "Social Links"],
              ["show_categories", "Categories"],
              ["show_quick_links", "Quick Links"],
              ["show_trust_badges", "Trust Badges"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch checked={config[key]} onCheckedChange={(v) => update(key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Copyright */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Copyright Text</CardTitle></CardHeader>
          <CardContent>
            <Input
              value={config.copyright_text}
              onChange={(e) => update("copyright_text", e.target.value)}
              placeholder="Leave empty for default (© 2024 SiteName)"
            />
            <p className="text-xs text-muted-foreground mt-1">Custom copyright text for the footer</p>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Social Media URLs</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                ["social_facebook", "Facebook"],
                ["social_instagram", "Instagram"],
                ["social_twitter", "Twitter / X"],
                ["social_tiktok", "TikTok"],
                ["social_youtube", "YouTube"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={config[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={`https://${label.toLowerCase()}.com/...`}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legal / Policy links */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Legal & policy links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                ["terms_url", "Terms & Conditions"],
                ["privacy_url", "Privacy Policy"],
                ["refund_policy_url", "Refund Policy"],
                ["shipping_policy_url", "Shipping Policy"],
                ["contact_url", "Contact"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={config[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="https://yoursite.com/…"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminFooterCustomizer />
    </div>
  );
};

export default AdminFooter;

/* ───────────────────────────────────────────────────────────────────────── */
/* Admin Footer customizer                                                   */
/* ───────────────────────────────────────────────────────────────────────── */


const AdminFooterCustomizer: React.FC = () => {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [cfg, setCfg] = useState<AdminFooterConfig>(defaultAdminFooterConfig);

  useQuery({
    queryKey: ["admin-footer-config-editor"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "admin_footer_config").maybeSingle();
      const v = (data?.value as unknown as Partial<AdminFooterConfig>) || null;
      if (v) setCfg({ ...defaultAdminFooterConfig, ...v });
      return v;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const save = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "admin_footer_config", value: cfg }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-footer-config"] });
      toast.success("Admin footer saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const upd = <K extends keyof AdminFooterConfig>(k: K, v: AdminFooterConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const updLink = (i: number, patch: Partial<AdminFooterLink>) =>
    setCfg((c) => ({ ...c, custom_links: c.custom_links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const addLink = () => setCfg((c) => ({ ...c, custom_links: [...c.custom_links, { label: "", url: "" }] }));
  const rmLink = (i: number) => setCfg((c) => ({ ...c, custom_links: c.custom_links.filter((_, idx) => idx !== i) }));

  const toggles: [keyof AdminFooterConfig, string][] = [
    ["show_status", "Status dot"],
    ["show_brand", "Brand name"],
    ["show_version", "Version badge"],
    ["show_env", "Environment badge"],
    ["show_language", "Language menu"],
    ["show_docs", "Docs link"],
    ["show_support", "Support link"],
    ["show_shortcuts", "Shortcuts button"],
    ["show_copyright", "Copyright"],
  ];

  return (
    <div className="space-y-4 pt-8 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Admin Footer</h2>
          <p className="text-sm text-muted-foreground">Customize the footer that shows inside the admin dashboard</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Visible elements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {toggles.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch checked={cfg[k] as boolean} onCheckedChange={(v) => upd(k, v as never)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Labels & URLs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Brand label</Label>
              <Input value={cfg.brand_label} onChange={(e) => upd("brand_label", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Version label</Label>
              <Input value={cfg.version_label} onChange={(e) => upd("version_label", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Copyright text (optional)</Label>
              <Input value={cfg.copyright_text} onChange={(e) => upd("copyright_text", e.target.value)} placeholder={`© ${new Date().getFullYear()} ${cfg.brand_label}`} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Docs URL</Label>
              <Input value={cfg.docs_url} onChange={(e) => upd("docs_url", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Support URL</Label>
              <Input value={cfg.support_url} onChange={(e) => upd("support_url", e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Custom links</CardTitle>
            <Button size="sm" variant="outline" onClick={addLink}><Plus className="w-3.5 h-3.5 mr-1" />Add link</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {cfg.custom_links.length === 0 && (
              <p className="text-xs text-muted-foreground">No custom links yet.</p>
            )}
            {cfg.custom_links.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={l.label} onChange={(e) => updLink(i, { label: e.target.value })} placeholder="Label" className="flex-1" />
                <Input value={l.url} onChange={(e) => updLink(i, { url: e.target.value })} placeholder="https://…" className="flex-[2]" />
                <Button size="icon" variant="ghost" onClick={() => rmLink(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// code:4ce0
