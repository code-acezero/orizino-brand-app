"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/app-toast";
import { loadGoogleFont } from "@orizino/shared/lib/brand-title";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import { cn } from "@/lib/utils";
import {
  Type, Ruler, Navigation, Footprints, Component, Eye, Save,
  RotateCcw, PaintBucket, Square, CircleDot, Layers, MonitorSmartphone,
  ExternalLink, ShoppingBag, Globe, Smartphone, MoveHorizontal,
  Sliders, ShieldCheck, Check, ChevronDown,
} from "lucide-react";

/* ── Default customizer config ── */
export interface SiteCustomizerConfig {
  // Typography
  heading_font: string;
  body_font: string;
  heading_weight: string;
  body_weight: string;
  base_font_size: number;
  heading_scale: number;
  line_height: number;
  letter_spacing: number;
  brand_title_size_nav: number;
  brand_logo_title_ratio: number;

  // Spacing & Layout
  section_gap: number;
  container_width: number;
  content_padding: number;
  card_padding: number;
  border_radius: number;
  button_radius: string;

  // Navbar
  navbar_height: number;
  navbar_blur: number;
  navbar_opacity: number;
  navbar_sticky: boolean;
  navbar_show_search: boolean;
  navbar_show_categories: boolean;
  navbar_style: string;

  // Footer
  footer_style: string;
  footer_show_newsletter: boolean;
  footer_show_socials: boolean;
  footer_show_trust: boolean;
  footer_columns: number;
  footer_bg_opacity: number;

  // Component Styles
  card_style: string;
  card_shadow: string;
  card_border: boolean;
  card_hover_effect: string;
  button_style: string;
  button_size: string;
  input_style: string;
  badge_style: string;
  glass_blur: number;
  glass_opacity: number;

  // Animations
  page_transitions: boolean;
  hover_animations: boolean;
  scroll_animations: boolean;
  animation_speed: string;
}

export const defaultCustomizerConfig: SiteCustomizerConfig = {
  heading_font: "Space Grotesk",
  body_font: "Inter",
  heading_weight: "700",
  body_weight: "400",
  base_font_size: 16,
  heading_scale: 1.25,
  line_height: 1.6,
  letter_spacing: 0,
  brand_title_size_nav: 20,
  brand_logo_title_ratio: 1.0,

  section_gap: 48,
  container_width: 1440,
  content_padding: 24,
  card_padding: 20,
  border_radius: 20,
  button_radius: "full",

  navbar_height: 64,
  navbar_blur: 16,
  navbar_opacity: 60,
  navbar_sticky: true,
  navbar_show_search: true,
  navbar_show_categories: true,
  navbar_style: "glass",

  footer_style: "glass",
  footer_show_newsletter: true,
  footer_show_socials: true,
  footer_show_trust: true,
  footer_columns: 4,
  footer_bg_opacity: 60,

  card_style: "glass",
  card_shadow: "md",
  card_border: true,
  card_hover_effect: "lift",
  button_style: "pill",
  button_size: "default",
  input_style: "default",
  badge_style: "outline",
  glass_blur: 16,
  glass_opacity: 60,

  page_transitions: true,
  hover_animations: true,
  scroll_animations: true,
  animation_speed: "normal",
};

const fonts = [
  "Space Grotesk", "Inter", "Poppins", "Roboto", "Montserrat",
  "Playfair Display", "DM Sans", "Outfit", "Sora", "Manrope",
  "Plus Jakarta Sans", "Urbanist", "Lexend", "Nunito Sans",
  "Quicksand", "Raleway", "Crimson Pro", "Libre Baskerville",
  "Josefin Sans", "Bebas Neue", "Archivo", "Work Sans",
  "── Custom Display ──",
  "Agraham", "Bilderberg", "Nevera", "OrangeAvenue",
  "PrimorStylish", "ProdesStencil", "Rostex", "SingleGrinch",
  "Transcity", "Zaslia",
  "Goca", "Logofontik", "Fear", "Monoo", "Monolite",
];

const fontWeights = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

const NAV_SIZE_PRESETS = [
  { label: "Compact 16px", size: 16 },
  { label: "Standard 20px", size: 20 },
  { label: "Prominent 24px", size: 24 },
  { label: "Large 28px", size: 28 },
  { label: "Statement 32px", size: 32 },
];

const RATIO_PRESETS = [
  { label: "Subtle (0.75x)", ratio: 0.75 },
  { label: "Balanced 1:1 (1.00x)", ratio: 1.0 },
  { label: "Emphasized (1.25x)", ratio: 1.25 },
  { label: "Prominent (1.50x)", ratio: 1.5 },
  { label: "Hero Dominant (1.80x)", ratio: 1.8 },
];

export const CUSTOMIZER_PANELS = [
  { id: "typography", label: "Typography & Fonts", icon: Type, desc: "Display & body fonts, nav title size, ratio matching" },
  { id: "spacing", label: "Spacing & Layout", icon: Ruler, desc: "Container width, section gaps, padding, corner radii" },
  { id: "navbar", label: "Header & Navigation", icon: Navigation, desc: "Navbar height, backdrop blur, sticky mode, search" },
  { id: "footer", label: "Footer & Studio", icon: Footprints, desc: "Columns, newsletters, socials, trust badges" },
  { id: "components", label: "Components & Glass", icon: Component, desc: "Card styles, shadow elevations, glassmorphism blur" },
  { id: "animations", label: "Motion & Physics", icon: Layers, desc: "Route transitions, hover physics, scroll reveals" },
] as const;

/* ── Section component ── */
const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    </div>
    {children}
  </div>
);

const SliderField = ({
  label, value, onChange, min, max, step = 1, unit = "", preview,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string; preview?: string;
}) => (
  <div className="space-y-2 w-full min-w-0">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <Label className="text-xs text-muted-foreground truncate flex-1 min-w-0">{label}</Label>
      <span className="text-xs font-mono text-primary shrink-0 tabular-nums">{value}{unit}</span>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="w-full" />
    {preview && <p className="text-[10px] text-muted-foreground">{preview}</p>}
  </div>
);

const OptionGrid = ({
  label, options, value, onChange,
}: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 text-muted-foreground hover:bg-secondary/30"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

function usePanelParam(defaultValue: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlPanel = new URLSearchParams(location.search).get("panel") || defaultValue;
  const [panel, setPanelState] = useState(urlPanel);

  useEffect(() => {
    setPanelState(urlPanel);
  }, [urlPanel]);

  const setPanel = useCallback(
    (v: string) => {
      setPanelState(v);
      const params = new URLSearchParams(location.search);
      params.set("panel", v);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    },
    [navigate, location]
  );

  return [panel, setPanel] as const;
}

const readVal = (v: unknown) =>
  typeof v === "object" && v !== null ? (v as any).value ?? v : v;

const SiteCustomizer = () => {
  const qc = useQueryClient();
  const [panel, setPanel] = usePanelParam("typography");
  const [config, setConfig] = useState<SiteCustomizerConfig>({ ...defaultCustomizerConfig });
  const [siteName, setSiteName] = useState("ORIZINO");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [rawFooterConfig, setRawFooterConfig] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Query all public UI and content settings from site_settings
  const { data: allSettings } = useQuery({
    queryKey: ["site-customizer-full-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "site_customizer",
          "title_font",
          "body_font",
          "brand_title_size_nav",
          "brand_logo_title_ratio",
          "site_name",
          "logo_url",
          "site_icon_url",
          "footer_config",
          "theme_config",
        ]);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Sync settings when loaded
  useEffect(() => {
    if (!allSettings || allSettings.length === 0) return;

    const map: Record<string, any> = {};
    allSettings.forEach((row) => {
      map[row.key] = readVal(row.value);
    });

    if (map.site_name) setSiteName(String(map.site_name));
    if (map.logo_url) setLogoUrl(String(map.logo_url));
    if (map.site_icon_url) setIconUrl(String(map.site_icon_url));
    if (map.footer_config && typeof map.footer_config === "object") {
      setRawFooterConfig(map.footer_config);
    }

    setConfig((prev) => {
      const customizerObj = typeof map.site_customizer === "object" && map.site_customizer !== null ? map.site_customizer : {};
      
      const merged: SiteCustomizerConfig = {
        ...prev,
        ...customizerObj,
      };

      // Sync with dedicated public content keys
      if (map.title_font) merged.heading_font = String(map.title_font);
      if (map.body_font) merged.body_font = String(map.body_font);
      if (map.brand_title_size_nav) merged.brand_title_size_nav = Number(map.brand_title_size_nav);
      if (map.brand_logo_title_ratio) merged.brand_logo_title_ratio = Number(map.brand_logo_title_ratio);

      // Sync with footer config
      if (map.footer_config && typeof map.footer_config === "object") {
        const fc = map.footer_config;
        if (fc.style) merged.footer_style = fc.style;
        if (fc.show_newsletter !== undefined) merged.footer_show_newsletter = Boolean(fc.show_newsletter);
        if (fc.show_socials !== undefined) merged.footer_show_socials = Boolean(fc.show_socials);
        if (fc.show_trust !== undefined) merged.footer_show_trust = Boolean(fc.show_trust);
        if (fc.columns) merged.footer_columns = Number(fc.columns);
      }

      return merged;
    });
  }, [allSettings]);

  // Load Google Fonts for active preview
  useEffect(() => {
    if (config.heading_font) {
      loadGoogleFont(config.heading_font, Number(config.heading_weight) || 700);
    }
    if (config.body_font) {
      loadGoogleFont(config.body_font, Number(config.body_weight) || 400);
    }
  }, [config.heading_font, config.body_font, config.heading_weight, config.body_weight]);

  const update = (partial: Partial<SiteCustomizerConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Prepare merged footer config
      const updatedFooterConfig = {
        ...rawFooterConfig,
        style: config.footer_style,
        show_newsletter: config.footer_show_newsletter,
        show_socials: config.footer_show_socials,
        show_trust: config.footer_show_trust,
        columns: config.footer_columns,
        bg_opacity: config.footer_bg_opacity,
      };

      // 2. Prepare entries to sync with all public UI configs
      const entriesToUpsert = [
        { key: "site_customizer", value: config as any, updated_at: new Date().toISOString() },
        { key: "title_font", value: config.heading_font as any, updated_at: new Date().toISOString() },
        { key: "body_font", value: config.body_font as any, updated_at: new Date().toISOString() },
        { key: "brand_title_size_nav", value: config.brand_title_size_nav as any, updated_at: new Date().toISOString() },
        { key: "brand_logo_title_ratio", value: config.brand_logo_title_ratio as any, updated_at: new Date().toISOString() },
        { key: "footer_config", value: updatedFooterConfig as any, updated_at: new Date().toISOString() },
      ];

      const { error } = await supabase
        .from("site_settings")
        .upsert(entriesToUpsert, { onConflict: "key" });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-customizer-full-sync"] });
      qc.invalidateQueries({ queryKey: ["site-customizer"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-branding"] });
      qc.invalidateQueries({ queryKey: ["brand-identity"] });
      qc.invalidateQueries({ queryKey: ["site-settings-nav"] });
      qc.invalidateQueries({ queryKey: ["site-settings-footer"] });
      qc.invalidateQueries({ queryKey: ["site-settings-landing"] });
      qc.invalidateQueries({ queryKey: ["company-nav-brand"] });
      qc.invalidateQueries({ queryKey: ["footer-settings"] });
      setHasChanges(false);
      toast.success("UI Customizer synced & applied to all public surfaces");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save customizer settings"),
  });

  const resetToDefaults = () => {
    setConfig({ ...defaultCustomizerConfig });
    setHasChanges(true);
  };

  // Register with Universal Floating Save Button
  useRegisterUniversalSave(
    useMemo(
      () => ({
        id: "site-customizer",
        label: "Save Customizer Config",
        isSaving: saveMutation.isPending,
        isDirty: hasChanges,
        onSave: () => saveMutation.mutate(),
        onReject: resetToDefaults,
        canReject: hasChanges,
      }),
      [saveMutation.isPending, hasChanges, saveMutation]
    )
  );

  // Generate live preview CSS
  const previewCSS = useMemo(() => {
    return {
      "--custom-heading-font": `'${config.heading_font}', sans-serif`,
      "--custom-body-font": `'${config.body_font}', sans-serif`,
      "--custom-base-size": `${config.base_font_size}px`,
      "--custom-line-height": `${config.line_height}`,
      "--custom-letter-spacing": `${config.letter_spacing}em`,
      "--custom-section-gap": `${config.section_gap}px`,
      "--custom-container-width": `${config.container_width}px`,
      "--custom-content-padding": `${config.content_padding}px`,
      "--custom-card-padding": `${config.card_padding}px`,
      "--custom-radius": `${config.border_radius}px`,
      "--custom-navbar-height": `${config.navbar_height}px`,
      "--custom-glass-blur": `${config.glass_blur}px`,
      "--custom-glass-opacity": `${config.glass_opacity}`,
    } as React.CSSProperties;
  }, [config]);

  const previewWidth = previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px";

  return (
    <div className="space-y-6">
      {/* ── Public Content Hub Synchronized Status Banner ── */}
      <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-foreground">Synced with Public Content &amp; UI Engine</span>
            <p className="text-[11px] text-muted-foreground">Changes here automatically update Storefront, BrandHome, Navigation, and Footer surfaces in real time.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <a
            href="/brand/home"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[11px] font-medium transition-colors border border-border/40"
          >
            <ShoppingBag className="w-3 h-3 text-primary" /> Storefront UI
          </a>
          <a
            href="/brand/landing"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[11px] font-medium transition-colors border border-border/40"
          >
            <Globe className="w-3 h-3 text-sky-400" /> BrandHome UI
          </a>
          <a
            href="/brand/footer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[11px] font-medium transition-colors border border-border/40"
          >
            <Footprints className="w-3 h-3 text-emerald-400" /> Footer Config
          </a>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-210px)]">
        {/* Left: Settings Panel */}
        <div className="w-full md:w-[440px] md:shrink-0 flex flex-col min-w-0 overflow-hidden">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <PaintBucket className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">UI Design Customizer</h3>
              {hasChanges && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-8 text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            </div>
          </div>

          {/* Compact 1-Button Menu Switcher */}
          <div className="mb-3">
            <Select value={panel} onValueChange={setPanel}>
              <SelectTrigger className="h-9 w-full px-3 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors shadow-xs flex items-center justify-between text-xs font-semibold cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    {(() => {
                      const Icon = CUSTOMIZER_PANELS.find((p) => p.id === panel)?.icon || Type;
                      return <Icon className="w-3 h-3 text-primary" />;
                    })()}
                  </div>
                  <span className="truncate text-foreground font-bold">
                    {CUSTOMIZER_PANELS.find((p) => p.id === panel)?.label || "Select Section"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="w-[380px] max-w-[90vw] p-1.5 rounded-xl border border-border/60 shadow-xl bg-popover">
                {CUSTOMIZER_PANELS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = panel === p.id;
                  return (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className={cn(
                        "py-2 px-2.5 rounded-lg text-xs cursor-pointer transition-colors my-0.5",
                        isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5 w-full text-left">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/60 border-border/40 text-muted-foreground"
                          )}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn("text-xs leading-none", isSelected ? "font-bold text-foreground" : "font-medium text-foreground")}>
                            {p.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {p.desc}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            <Tabs value={panel} onValueChange={setPanel} className="w-full">
              <TabsList className="hidden">
                <TabsTrigger value="typography">Typography</TabsTrigger>
                <TabsTrigger value="spacing">Spacing</TabsTrigger>
                <TabsTrigger value="navbar">Header</TabsTrigger>
                <TabsTrigger value="footer">Footer</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="animations">Motion</TabsTrigger>
              </TabsList>

              {/* ── 1. Typography ── */}
              <TabsContent value="typography" className="mt-0 space-y-5 pr-3">
                <Section title="Font Families" desc="Choose display and body typefaces (synced across all public apps)">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Heading / Brand Font</Label>
                      <Select value={config.heading_font} onValueChange={(v) => update({ heading_font: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {fonts.map((f) => (
                            <SelectItem key={f} value={f} className="text-xs">
                              <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Body Font</Label>
                      <Select value={config.body_font} onValueChange={(v) => update({ body_font: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {fonts.map((f) => (
                            <SelectItem key={f} value={f} className="text-xs">
                              <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Top Navigation Title Sizing" desc="Size of the brand wordmark inside header navigation">
                  <div className="space-y-3">
                    <SliderField
                      label="Nav Title Size"
                      value={config.brand_title_size_nav}
                      onChange={(v) => update({ brand_title_size_nav: v })}
                      min={12}
                      max={40}
                      unit="px"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {NAV_SIZE_PRESETS.map((p) => (
                        <button
                          key={p.size}
                          type="button"
                          onClick={() => update({ brand_title_size_nav: p.size })}
                          className={`px-2 py-1 rounded-md text-[11px] border transition-all cursor-pointer ${
                            config.brand_title_size_nav === p.size
                              ? "bg-primary/10 border-primary text-primary font-bold"
                              : "border-border/50 text-muted-foreground hover:bg-secondary/40"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Brand Mark vs Title Ratio" desc="Proportional scaling between the logo mark and title text">
                  <div className="space-y-3">
                    <SliderField
                      label="Logo to Title Ratio"
                      value={config.brand_logo_title_ratio}
                      onChange={(v) => update({ brand_logo_title_ratio: v })}
                      min={0.6}
                      max={2.0}
                      step={0.05}
                      unit="x"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {RATIO_PRESETS.map((p) => (
                        <button
                          key={p.ratio}
                          type="button"
                          onClick={() => update({ brand_logo_title_ratio: p.ratio })}
                          className={`px-2 py-1 rounded-md text-[11px] border transition-all cursor-pointer ${
                            config.brand_logo_title_ratio === p.ratio
                              ? "bg-primary/10 border-primary text-primary font-bold"
                              : "border-border/50 text-muted-foreground hover:bg-secondary/40"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Font Weights">
                  <div className="grid grid-cols-2 gap-3">
                    <OptionGrid
                      label="Headings"
                      options={fontWeights}
                      value={config.heading_weight}
                      onChange={(v) => update({ heading_weight: v })}
                    />
                    <OptionGrid
                      label="Body"
                      options={fontWeights.slice(0, 4)}
                      value={config.body_weight}
                      onChange={(v) => update({ body_weight: v })}
                    />
                  </div>
                </Section>

                <Separator />

                <Section title="Typography Metrics">
                  <div className="space-y-4">
                    <SliderField label="Base Font Size" value={config.base_font_size} onChange={(v) => update({ base_font_size: v })} min={12} max={20} unit="px" />
                    <SliderField label="Heading Scale Ratio" value={config.heading_scale} onChange={(v) => update({ heading_scale: v })} min={1} max={1.5} step={0.05} preview={`H1: ${Math.round(config.base_font_size * Math.pow(config.heading_scale, 4))}px`} />
                    <SliderField label="Line Height" value={config.line_height} onChange={(v) => update({ line_height: v })} min={1.2} max={2} step={0.05} />
                    <SliderField label="Letter Spacing" value={config.letter_spacing} onChange={(v) => update({ letter_spacing: v })} min={-0.05} max={0.15} step={0.005} unit="em" />
                  </div>
                </Section>
              </TabsContent>

              {/* ── 2. Spacing & Layout ── */}
              <TabsContent value="spacing" className="mt-0 space-y-5 pr-3">
                <Section title="Page Layout" desc="Control overall page structure and boundary limits">
                  <div className="space-y-4">
                    <SliderField label="Container Max Width" value={config.container_width} onChange={(v) => update({ container_width: v })} min={1024} max={1920} step={16} unit="px" />
                    <SliderField label="Section Gap Spacing" value={config.section_gap} onChange={(v) => update({ section_gap: v })} min={16} max={96} step={4} unit="px" />
                    <SliderField label="Page Content Padding" value={config.content_padding} onChange={(v) => update({ content_padding: v })} min={8} max={48} step={4} unit="px" />
                  </div>
                </Section>

                <Separator />

                <Section title="Cards & Radii" desc="Corner rounding and inner card breathing room">
                  <div className="space-y-4">
                    <SliderField label="Card Inner Padding" value={config.card_padding} onChange={(v) => update({ card_padding: v })} min={8} max={40} step={2} unit="px" />
                    <SliderField label="Global Border Radius" value={config.border_radius} onChange={(v) => update({ border_radius: v })} min={0} max={32} step={2} unit="px" />
                    <OptionGrid
                      label="Button Shape"
                      options={[
                        { value: "pill", label: "Pill Full" },
                        { value: "rounded", label: "Rounded XL" },
                        { value: "soft", label: "Soft 8px" },
                        { value: "sharp", label: "Sharp Square" },
                      ]}
                      value={config.button_style}
                      onChange={(v) => update({ button_style: v })}
                    />
                  </div>
                </Section>
              </TabsContent>

              {/* ── 3. Navigation / Header ── */}
              <TabsContent value="navbar" className="mt-0 space-y-5 pr-3">
                <Section title="Storefront Header & Navigation" desc="Header blur, height and sticky mechanics">
                  <div className="space-y-4">
                    <SliderField label="Navbar Height" value={config.navbar_height} onChange={(v) => update({ navbar_height: v })} min={48} max={96} step={4} unit="px" />
                    <SliderField label="Backdrop Blur" value={config.navbar_blur} onChange={(v) => update({ navbar_blur: v })} min={0} max={32} step={2} unit="px" />
                    <SliderField label="Background Opacity" value={config.navbar_opacity} onChange={(v) => update({ navbar_opacity: v })} min={20} max={100} step={5} unit="%" />
                    <OptionGrid
                      label="Navbar Style"
                      options={[
                        { value: "glass", label: "Glassmorphism" },
                        { value: "solid", label: "Solid Card" },
                        { value: "transparent", label: "Transparent" },
                        { value: "bordered", label: "Bordered Glow" },
                      ]}
                      value={config.navbar_style}
                      onChange={(v) => update({ navbar_style: v })}
                    />
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Sticky Navbar</Label>
                        <Switch checked={config.navbar_sticky} onCheckedChange={(v) => update({ navbar_sticky: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Show Search Bar</Label>
                        <Switch checked={config.navbar_show_search} onCheckedChange={(v) => update({ navbar_show_search: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Show Categories Menu</Label>
                        <Switch checked={config.navbar_show_categories} onCheckedChange={(v) => update({ navbar_show_categories: v })} />
                      </div>
                    </div>
                  </div>
                </Section>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Looking for Category Layout &amp; Marquee Ticker?</span>
                  <a href="/brand/home" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    Storefront Home <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </TabsContent>

              {/* ── 4. Footer ── */}
              <TabsContent value="footer" className="mt-0 space-y-5 pr-3">
                <Section title="Footer Config & Studio Sync" desc="Synchronized with Storefront and BrandHome footers">
                  <div className="space-y-4">
                    <OptionGrid
                      label="Footer Visual Style"
                      options={[
                        { value: "glass", label: "Glass Surface" },
                        { value: "solid", label: "Solid Dark" },
                        { value: "minimal", label: "Minimal Clean" },
                        { value: "gradient", label: "Top Gradient" },
                      ]}
                      value={config.footer_style}
                      onChange={(v) => update({ footer_style: v })}
                    />
                    <SliderField label="Footer Column Count" value={config.footer_columns} onChange={(v) => update({ footer_columns: v })} min={2} max={5} />
                    <SliderField label="Background Opacity" value={config.footer_bg_opacity} onChange={(v) => update({ footer_bg_opacity: v })} min={20} max={100} step={5} unit="%" />
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Newsletter Subscription Block</Label>
                        <Switch checked={config.footer_show_newsletter} onCheckedChange={(v) => update({ footer_show_newsletter: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Social Links &amp; Profiles</Label>
                        <Switch checked={config.footer_show_socials} onCheckedChange={(v) => update({ footer_show_socials: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Trust Signals &amp; Security Badges</Label>
                        <Switch checked={config.footer_show_trust} onCheckedChange={(v) => update({ footer_show_trust: v })} />
                      </div>
                    </div>
                  </div>
                </Section>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Want to edit footer columns, custom links &amp; legal badges?</span>
                  <a href="/brand/footer" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    Footer Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </TabsContent>

              {/* ── 5. Components ── */}
              <TabsContent value="components" className="mt-0 space-y-5 pr-3">
                <Section title="Card Styles" desc="Customize product and content cards">
                  <div className="space-y-4">
                    <OptionGrid
                      label="Card Style"
                      options={[
                        { value: "glass", label: "Glass" },
                        { value: "solid", label: "Solid" },
                        { value: "minimal", label: "Minimal" },
                        { value: "elevated", label: "Elevated" },
                      ]}
                      value={config.card_style}
                      onChange={(v) => update({ card_style: v })}
                    />
                    <OptionGrid
                      label="Card Shadow"
                      options={[
                        { value: "none", label: "None" },
                        { value: "sm", label: "Subtle (sm)" },
                        { value: "md", label: "Medium (md)" },
                        { value: "lg", label: "Luxe (lg)" },
                      ]}
                      value={config.card_shadow}
                      onChange={(v) => update({ card_shadow: v })}
                    />
                    <OptionGrid
                      label="Hover Effect"
                      options={[
                        { value: "lift", label: "Float Lift" },
                        { value: "glow", label: "Border Glow" },
                        { value: "scale", label: "Scale Up" },
                        { value: "none", label: "Static" },
                      ]}
                      value={config.card_hover_effect}
                      onChange={(v) => update({ card_hover_effect: v })}
                    />
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Card Subtle Border</Label>
                      <Switch checked={config.card_border} onCheckedChange={(v) => update({ card_border: v })} />
                    </div>
                  </div>
                </Section>

                <Separator />

                <Section title="Glassmorphism Engine" desc="Backdrop blur &amp; translucent opacity">
                  <div className="space-y-4">
                    <SliderField label="Glass Blur Strength" value={config.glass_blur} onChange={(v) => update({ glass_blur: v })} min={0} max={32} step={2} unit="px" />
                    <SliderField label="Glass Opacity" value={config.glass_opacity} onChange={(v) => update({ glass_opacity: v })} min={10} max={90} step={5} unit="%" />
                  </div>
                </Section>
              </TabsContent>

              {/* ── 6. Motion & Animations ── */}
              <TabsContent value="animations" className="mt-0 space-y-5 pr-3">
                <Section title="Motion & Physics" desc="Page transitions and interaction animations">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Page Route Transitions</Label>
                      <Switch checked={config.page_transitions} onCheckedChange={(v) => update({ page_transitions: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Micro Hover Animations</Label>
                      <Switch checked={config.hover_animations} onCheckedChange={(v) => update({ hover_animations: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Scroll In-View Reveals</Label>
                      <Switch checked={config.scroll_animations} onCheckedChange={(v) => update({ scroll_animations: v })} />
                    </div>
                    <OptionGrid
                      label="Global Animation Speed"
                      options={[
                        { value: "slow", label: "Cinematic Slow" },
                        { value: "normal", label: "Natural Normal" },
                        { value: "fast", label: "Snappy Fast" },
                        { value: "instant", label: "Instant Off" },
                      ]}
                      value={config.animation_speed}
                      onChange={(v) => update({ animation_speed: v })}
                    />
                  </div>
                </Section>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>

        {/* Right: Live Interactive Multi-Surface Preview */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Live Public Surfaces Simulation</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border/40">
              {(["desktop", "tablet", "mobile"] as const).map((device) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => setPreviewDevice(device)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    previewDevice === device
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-border/50 bg-secondary/15 overflow-hidden flex items-start justify-center p-4">
            <div
              className="h-full rounded-xl border border-border/40 bg-background overflow-hidden shadow-2xl transition-all duration-300 flex flex-col"
              style={{ width: previewWidth, maxWidth: "100%" }}
            >
              {/* Preview Window Chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/40 border-b border-border/30 shrink-0">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                </div>
                <div className="flex-1 mx-3 h-5 rounded-md bg-secondary/60 flex items-center px-2">
                  <span className="text-[10px] text-muted-foreground font-mono truncate">https://orizino.com</span>
                </div>
              </div>

              {/* Preview Content */}
              <ScrollArea className="flex-1">
                <div style={previewCSS}>
                  {/* Navbar preview */}
                  <div
                    className="border-b border-border/30 flex items-center justify-between px-4 sticky top-0 z-10 transition-all"
                    style={{
                      height: `${config.navbar_height}px`,
                      backdropFilter: config.navbar_style === "glass" ? `blur(${config.navbar_blur}px)` : undefined,
                      backgroundColor: config.navbar_style === "solid" ? "hsl(var(--card))" :
                        config.navbar_style === "transparent" ? "transparent" :
                        `hsl(var(--card) / ${config.navbar_opacity / 100})`,
                      borderBottom: config.navbar_style === "bordered" ? "2px solid hsl(var(--primary) / 0.3)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Real Brand Logo Mark */}
                      {(logoUrl || iconUrl) ? (
                        <img
                          src={logoUrl || iconUrl}
                          alt={siteName || "Brand Logo"}
                          className="object-contain shrink-0 rounded-sm"
                          style={{
                            width: `${Math.round(28 * config.brand_logo_title_ratio)}px`,
                            height: `${Math.round(28 * config.brand_logo_title_ratio)}px`,
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30"
                          style={{
                            width: `${Math.round(28 * config.brand_logo_title_ratio)}px`,
                            height: `${Math.round(28 * config.brand_logo_title_ratio)}px`,
                          }}
                        >
                          <span className="text-[10px] font-bold text-primary">
                            {(siteName || "O").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span
                        style={{
                          fontFamily: `'${config.heading_font}', sans-serif`,
                          fontWeight: Number(config.heading_weight),
                          fontSize: `${config.brand_title_size_nav}px`,
                          letterSpacing: `${config.letter_spacing}em`,
                        }}
                        className="font-bold text-foreground leading-none"
                      >
                        {siteName || "ORIZINO"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.navbar_show_search && (
                        <div className="w-24 sm:w-28 h-6 rounded-full bg-secondary/60 border border-border/30 flex items-center px-2 text-[9px] text-muted-foreground">
                          Search...
                        </div>
                      )}
                      {config.navbar_show_categories && (
                        <div className="hidden sm:flex px-2.5 h-6 rounded-full bg-secondary/30 border border-border/30 items-center text-[9px] text-muted-foreground">
                          Categories
                        </div>
                      )}
                      <div className="w-6 h-6 rounded-full bg-secondary/50 border border-border/30" />
                      <div className="w-6 h-6 rounded-full bg-secondary/50 border border-border/30" />
                    </div>
                  </div>

                  {/* Hero Banner */}
                  <div className="relative overflow-hidden" style={{ padding: `${config.content_padding}px` }}>
                    <div
                      className="h-40 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex flex-col items-center justify-center gap-2 text-center p-4 border border-border/40"
                      style={{ borderRadius: `${config.border_radius}px` }}
                    >
                      <span
                        style={{
                          fontFamily: `'${config.heading_font}', sans-serif`,
                          fontWeight: Number(config.heading_weight),
                          fontSize: `${config.base_font_size * Math.pow(config.heading_scale, 2)}px`,
                          letterSpacing: `${config.letter_spacing}em`,
                        }}
                        className="text-foreground leading-tight max-w-sm"
                      >
                        The New Architectural Era
                      </span>
                      <span
                        style={{
                          fontFamily: `'${config.body_font}', sans-serif`,
                          fontWeight: Number(config.body_weight),
                          fontSize: `${config.base_font_size - 3}px`,
                        }}
                        className="text-muted-foreground max-w-xs"
                      >
                        Curated apparel and luxury minimalist design essentials.
                      </span>
                      <button
                        type="button"
                        className={`bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1.5 mt-1 shadow-sm ${
                          config.button_style === "pill" ? "rounded-full" :
                          config.button_style === "rounded" ? "rounded-xl" :
                          config.button_style === "soft" ? "rounded-md" : "rounded-none"
                        }`}
                      >
                        Explore Drop →
                      </button>
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  <div style={{ padding: `0 ${config.content_padding}px`, marginTop: `${config.section_gap / 3}px` }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3
                        style={{
                          fontFamily: `'${config.heading_font}', sans-serif`,
                          fontWeight: Number(config.heading_weight),
                          fontSize: `${config.base_font_size * config.heading_scale}px`,
                        }}
                        className="text-foreground"
                      >
                        Featured Items
                      </h3>
                      <span className="text-[10px] text-primary font-semibold">View All</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`overflow-hidden transition-all ${
                            config.card_border ? "border border-border/40" : ""
                          }`}
                          style={{
                            borderRadius: `${config.border_radius}px`,
                            padding: `${config.card_padding / 2}px`,
                            backgroundColor: config.card_style === "glass" ? `hsl(var(--card) / ${config.glass_opacity / 100})` :
                              config.card_style === "minimal" ? "transparent" : "hsl(var(--card))",
                            backdropFilter: config.card_style === "glass" ? `blur(${config.glass_blur}px)` : undefined,
                            boxShadow: config.card_shadow === "sm" ? "0 1px 3px hsl(0 0% 0% / 0.1)" :
                              config.card_shadow === "md" ? "0 4px 12px hsl(0 0% 0% / 0.15)" :
                              config.card_shadow === "lg" ? "0 8px 30px hsl(0 0% 0% / 0.2)" : "none",
                          }}
                        >
                          <div
                            className="aspect-square bg-secondary/40 mb-1.5 flex items-center justify-center"
                            style={{ borderRadius: `${Math.max(config.border_radius - 4, 0)}px` }}
                          >
                            <ShoppingBag className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                          <p
                            style={{
                              fontFamily: `'${config.body_font}', sans-serif`,
                              fontWeight: Number(config.body_weight),
                            }}
                            className="text-[10px] text-foreground font-medium truncate"
                          >
                            Signature Item #{i}
                          </p>
                          <p className="text-[9px] text-primary font-bold mt-0.5">৳3,450</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer preview */}
                  <div
                    className="mt-8 border-t border-border/30"
                    style={{
                      padding: `${config.content_padding}px`,
                      backgroundColor: config.footer_style === "solid" ? "hsl(var(--card))" :
                        config.footer_style === "minimal" ? "transparent" :
                        config.footer_style === "gradient" ? undefined :
                        `hsl(var(--card) / ${config.footer_bg_opacity / 100})`,
                      backgroundImage: config.footer_style === "gradient" ? "linear-gradient(to top, hsl(var(--card)), transparent)" : undefined,
                    }}
                  >
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(config.footer_columns, 3)}, 1fr)` }}>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {(logoUrl || iconUrl) ? (
                            <img
                              src={logoUrl || iconUrl}
                              alt={siteName || "Brand Logo"}
                              className="object-contain shrink-0 rounded-xs"
                              style={{
                                width: `${Math.round(20 * config.brand_logo_title_ratio)}px`,
                                height: `${Math.round(20 * config.brand_logo_title_ratio)}px`,
                              }}
                            />
                          ) : (
                            <div
                              className="rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30"
                              style={{
                                width: `${Math.round(20 * config.brand_logo_title_ratio)}px`,
                                height: `${Math.round(20 * config.brand_logo_title_ratio)}px`,
                              }}
                            >
                              <span className="text-[8px] font-bold text-primary">
                                {(siteName || "O").charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span
                            style={{
                              fontFamily: `'${config.heading_font}', sans-serif`,
                              fontWeight: Number(config.heading_weight),
                              fontSize: `${Math.round(config.brand_title_size_nav * 0.75)}px`,
                            }}
                            className="text-foreground font-bold"
                          >
                            {siteName || "ORIZINO"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {["About Us", "Brand Story", "Careers"].map((l) => (
                            <span key={l} className="text-[9px] text-muted-foreground block">{l}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-foreground block mb-1.5">Shop</span>
                        <div className="space-y-1">
                          {["New Arrivals", "Best Sellers", "Accessories"].map((l) => (
                            <span key={l} className="text-[9px] text-muted-foreground block">{l}</span>
                          ))}
                        </div>
                      </div>
                      {config.footer_show_newsletter && (
                        <div>
                          <span className="text-[10px] font-bold text-foreground block mb-1.5">Stay In Touch</span>
                          <div className="flex gap-1">
                            <div className="h-5 flex-1 rounded-md bg-secondary/60 border border-border/30 flex items-center px-1.5 text-[8px] text-muted-foreground">
                              Enter email...
                            </div>
                            <button type="button" className="h-5 px-2 rounded-md bg-primary text-primary-foreground text-[8px] font-bold">
                              Join
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {config.footer_show_socials && (
                      <div className="flex gap-1.5 mt-4 pt-3 border-t border-border/20">
                        {["Instagram", "Facebook", "Twitter", "YouTube"].map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-full bg-secondary/50 border border-border/30 text-[8px] text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {config.footer_show_trust && (
                      <div className="flex gap-3 mt-2.5">
                        {[
                          { icon: "🔒", label: "Secure Payment" },
                          { icon: "🚚", label: "Fast Shipping" },
                          { icon: "✓", label: "100% Authentic" },
                        ].map((t) => (
                          <div key={t.label} className="flex items-center gap-1 text-[8px] text-muted-foreground">
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteCustomizer;
// code:4ce0
