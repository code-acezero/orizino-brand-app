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
import {
  Type, Ruler, Navigation, Footprints, Component, Eye, Save,
  RotateCcw, PaintBucket, Square, CircleDot, Layers, MonitorSmartphone,
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
  "── Custom ──",
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
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs font-mono text-primary">{value}{unit}</span>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
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
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
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

/* ── Main Component ── */
/**
 * Same idea as the shared `useTabParam` hook, but keyed on `?panel=` instead
 * of `?tab=` — this page already uses `tab` for the outer General /
 * Customizer / Currency switch, so the Customizer's own five sections
 * (driven from the sidebar sub-menu) need a second, independent param.
 */
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

const SiteCustomizer = () => {
  const qc = useQueryClient();
  const [panel, setPanel] = usePanelParam("typography");
  const [config, setConfig] = useState<SiteCustomizerConfig>({ ...defaultCustomizerConfig });
  const [hasChanges, setHasChanges] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const { data: settings } = useQuery({
    queryKey: ["site-customizer"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/site-settings?keys=site_customizer");
        if (res.ok) {
          const json = await res.json();
          if (json?.site_customizer) {
            return { value: json.site_customizer };
          }
        }
      } catch {
        // fallback
      }

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "site_customizer")
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings?.value) {
      const val = (settings.value as any)?.value ?? settings.value;
      if (typeof val === "object") {
        setConfig((prev) => ({ ...prev, ...val }));
      }
    }
  }, [settings]);

  const update = (partial: Partial<SiteCustomizerConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch("/api/site-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "site_customizer", value: config }),
        });
        if (res.ok) return;
      } catch {
        // fallback
      }

      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "site_customizer", value: config as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-customizer"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      setHasChanges(false);
      toast.success("Customizations saved & applied");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetToDefaults = () => {
    setConfig({ ...defaultCustomizerConfig });
    setHasChanges(true);
  };

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
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-180px)]">
      {/* Left: Settings Panel */}
      <div className="w-full md:w-[420px] md:shrink-0 flex flex-col min-w-0">
        {/* Sticky action bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PaintBucket className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Site Customizer</h3>
            {hasChanges && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={resetToDefaults} className="text-xs gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasChanges} className="gap-1">
              <Save className="w-3 h-3" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <Tabs value={panel} onValueChange={setPanel} className="w-full">
            {/* Navigation between Type/Space/Nav/UI/Motion now lives in the
                sidebar (Settings ▸ Customizer ▸ …) as proper sub-items —
                keeping a 5-way tab strip crammed above the content was what
                broke on mobile. The Tabs primitive still needs a TabsList
                to register triggers/keyboard nav, so it's kept but visually
                hidden, matching the pattern used on the parent Settings page. */}
            <TabsList className="hidden">
              <TabsTrigger value="typography">Type</TabsTrigger>
              <TabsTrigger value="spacing">Space</TabsTrigger>
              <TabsTrigger value="navbar">Nav</TabsTrigger>
              <TabsTrigger value="components">UI</TabsTrigger>
              <TabsTrigger value="animations">Motion</TabsTrigger>
            </TabsList>

            {/* ── Typography ── */}
            <TabsContent value="typography" className="space-y-5 pr-2">
              <Section title="Font Families" desc="Choose display and body typefaces">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Heading Font</Label>
                    <Select value={config.heading_font} onValueChange={(v) => update({ heading_font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fonts.map((f) => (
                          <SelectItem key={f} value={f}>
                            <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Body Font</Label>
                    <Select value={config.body_font} onValueChange={(v) => update({ body_font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fonts.map((f) => (
                          <SelectItem key={f} value={f}>
                            <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              <Section title="Sizing & Spacing">
                <div className="space-y-4">
                  <SliderField label="Base Font Size" value={config.base_font_size} onChange={(v) => update({ base_font_size: v })} min={12} max={20} unit="px" />
                  <SliderField label="Heading Scale" value={config.heading_scale} onChange={(v) => update({ heading_scale: v })} min={1} max={1.5} step={0.05} preview={`H1: ${Math.round(config.base_font_size * Math.pow(config.heading_scale, 4))}px`} />
                  <SliderField label="Line Height" value={config.line_height} onChange={(v) => update({ line_height: v })} min={1.2} max={2} step={0.05} />
                  <SliderField label="Letter Spacing" value={config.letter_spacing} onChange={(v) => update({ letter_spacing: v })} min={-0.05} max={0.15} step={0.005} unit="em" />
                </div>
              </Section>

              {/* Live typography preview */}
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-4" style={{
                  fontFamily: `'${config.body_font}', sans-serif`,
                  fontSize: `${config.base_font_size}px`,
                  lineHeight: config.line_height,
                  letterSpacing: `${config.letter_spacing}em`,
                }}>
                  <h3 style={{
                    fontFamily: `'${config.heading_font}', sans-serif`,
                    fontWeight: Number(config.heading_weight),
                    fontSize: `${config.base_font_size * Math.pow(config.heading_scale, 2)}px`,
                  }} className="text-foreground mb-1">
                    Heading Preview
                  </h3>
                  <p style={{ fontWeight: Number(config.body_weight) }} className="text-muted-foreground text-sm">
                    Body text preview — The quick brown fox jumps over the lazy dog.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Spacing & Layout ── */}
            <TabsContent value="spacing" className="space-y-5 pr-2">
              <Section title="Page Layout" desc="Control overall page structure">
                <div className="space-y-4">
                  <SliderField label="Container Width" value={config.container_width} onChange={(v) => update({ container_width: v })} min={1024} max={1920} step={16} unit="px" />
                  <SliderField label="Section Gap" value={config.section_gap} onChange={(v) => update({ section_gap: v })} min={16} max={96} step={4} unit="px" />
                  <SliderField label="Content Padding" value={config.content_padding} onChange={(v) => update({ content_padding: v })} min={8} max={48} step={4} unit="px" />
                </div>
              </Section>

              <Separator />

              <Section title="Card & Element Sizing">
                <div className="space-y-4">
                  <SliderField label="Card Padding" value={config.card_padding} onChange={(v) => update({ card_padding: v })} min={8} max={40} step={2} unit="px" />
                  <SliderField label="Border Radius" value={config.border_radius} onChange={(v) => update({ border_radius: v })} min={0} max={32} step={2} unit="px" />
                  <OptionGrid
                    label="Button Shape"
                    options={[
                      { value: "full", label: "Pill" },
                      { value: "xl", label: "Rounded" },
                      { value: "md", label: "Soft" },
                      { value: "none", label: "Square" },
                    ]}
                    value={config.button_radius}
                    onChange={(v) => update({ button_radius: v })}
                  />
                </div>
              </Section>

              {/* Spacing preview */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-2 items-end">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] text-muted-foreground"
                        style={{
                          borderRadius: `${config.border_radius}px`,
                          padding: `${config.card_padding}px`,
                          height: `${40 + i * 15}px`,
                          flex: 1,
                        }}
                      >
                        {config.border_radius}px
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Navbar & Footer ── */}
            <TabsContent value="navbar" className="space-y-5 pr-2">
              <Section title="Navigation Bar">
                <div className="space-y-4">
                  <SliderField label="Navbar Height" value={config.navbar_height} onChange={(v) => update({ navbar_height: v })} min={48} max={96} step={4} unit="px" />
                  <SliderField label="Backdrop Blur" value={config.navbar_blur} onChange={(v) => update({ navbar_blur: v })} min={0} max={32} step={2} unit="px" />
                  <SliderField label="Background Opacity" value={config.navbar_opacity} onChange={(v) => update({ navbar_opacity: v })} min={20} max={100} step={5} unit="%" />
                  <OptionGrid
                    label="Navbar Style"
                    options={[
                      { value: "glass", label: "Glass" },
                      { value: "solid", label: "Solid" },
                      { value: "transparent", label: "Transparent" },
                      { value: "bordered", label: "Bordered" },
                    ]}
                    value={config.navbar_style}
                    onChange={(v) => update({ navbar_style: v })}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Sticky Navbar</Label>
                      <Switch checked={config.navbar_sticky} onCheckedChange={(v) => update({ navbar_sticky: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Show Search Bar</Label>
                      <Switch checked={config.navbar_show_search} onCheckedChange={(v) => update({ navbar_show_search: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Show Categories</Label>
                      <Switch checked={config.navbar_show_categories} onCheckedChange={(v) => update({ navbar_show_categories: v })} />
                    </div>
                  </div>
                </div>
              </Section>

              <Separator />

              <Section title="Footer">
                <div className="space-y-4">
                  <OptionGrid
                    label="Footer Style"
                    options={[
                      { value: "glass", label: "Glass" },
                      { value: "solid", label: "Solid Dark" },
                      { value: "minimal", label: "Minimal" },
                      { value: "gradient", label: "Gradient" },
                    ]}
                    value={config.footer_style}
                    onChange={(v) => update({ footer_style: v })}
                  />
                  <SliderField label="Columns" value={config.footer_columns} onChange={(v) => update({ footer_columns: v })} min={2} max={5} />
                  <SliderField label="Background Opacity" value={config.footer_bg_opacity} onChange={(v) => update({ footer_bg_opacity: v })} min={20} max={100} step={5} unit="%" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Newsletter Section</Label>
                      <Switch checked={config.footer_show_newsletter} onCheckedChange={(v) => update({ footer_show_newsletter: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Social Links</Label>
                      <Switch checked={config.footer_show_socials} onCheckedChange={(v) => update({ footer_show_socials: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Trust Signals</Label>
                      <Switch checked={config.footer_show_trust} onCheckedChange={(v) => update({ footer_show_trust: v })} />
                    </div>
                  </div>
                </div>
              </Section>
            </TabsContent>

            {/* ── Components ── */}
            <TabsContent value="components" className="space-y-5 pr-2">
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
                    label="Shadow"
                    options={[
                      { value: "none", label: "None" },
                      { value: "sm", label: "Small" },
                      { value: "md", label: "Medium" },
                      { value: "lg", label: "Large" },
                    ]}
                    value={config.card_shadow}
                    onChange={(v) => update({ card_shadow: v })}
                  />
                  <OptionGrid
                    label="Hover Effect"
                    options={[
                      { value: "none", label: "None" },
                      { value: "lift", label: "Lift" },
                      { value: "glow", label: "Glow" },
                      { value: "scale", label: "Scale" },
                    ]}
                    value={config.card_hover_effect}
                    onChange={(v) => update({ card_hover_effect: v })}
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Show Card Border</Label>
                    <Switch checked={config.card_border} onCheckedChange={(v) => update({ card_border: v })} />
                  </div>
                </div>
              </Section>

              <Separator />

              <Section title="Buttons">
                <div className="space-y-4">
                  <OptionGrid
                    label="Button Style"
                    options={[
                      { value: "pill", label: "Pill" },
                      { value: "rounded", label: "Rounded" },
                      { value: "sharp", label: "Sharp" },
                      { value: "ghost", label: "Ghost" },
                    ]}
                    value={config.button_style}
                    onChange={(v) => update({ button_style: v })}
                  />
                  <OptionGrid
                    label="Button Size"
                    options={[
                      { value: "sm", label: "Small" },
                      { value: "default", label: "Default" },
                      { value: "lg", label: "Large" },
                      { value: "xl", label: "Extra Large" },
                    ]}
                    value={config.button_size}
                    onChange={(v) => update({ button_size: v })}
                  />
                  {/* Button preview */}
                  <div className="flex gap-2 flex-wrap">
                    <button className={`bg-primary text-primary-foreground font-medium px-5 py-2 text-sm transition-all ${
                      config.button_style === "pill" ? "rounded-full" :
                      config.button_style === "rounded" ? "rounded-xl" :
                      config.button_style === "sharp" ? "rounded-none" : "rounded-lg bg-transparent border border-primary text-primary"
                    }`}>Primary</button>
                    <button className={`bg-secondary text-secondary-foreground font-medium px-5 py-2 text-sm transition-all ${
                      config.button_style === "pill" ? "rounded-full" :
                      config.button_style === "rounded" ? "rounded-xl" :
                      config.button_style === "sharp" ? "rounded-none" : "rounded-lg"
                    }`}>Secondary</button>
                  </div>
                </div>
              </Section>

              <Separator />

              <Section title="Glass Effect">
                <div className="space-y-4">
                  <SliderField label="Blur Strength" value={config.glass_blur} onChange={(v) => update({ glass_blur: v })} min={0} max={32} step={2} unit="px" />
                  <SliderField label="Opacity" value={config.glass_opacity} onChange={(v) => update({ glass_opacity: v })} min={20} max={100} step={5} unit="%" />
                  {/* Glass preview */}
                  <div className="relative rounded-xl overflow-hidden h-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30" />
                    <div
                      className="absolute inset-2 rounded-lg border border-border/30 flex items-center justify-center text-xs text-foreground"
                      style={{
                        backdropFilter: `blur(${config.glass_blur}px)`,
                        backgroundColor: `hsl(var(--card) / ${config.glass_opacity / 100})`,
                      }}
                    >
                      Glass Preview
                    </div>
                  </div>
                </div>
              </Section>

              <Separator />

              <Section title="Inputs & Badges">
                <div className="space-y-4">
                  <OptionGrid
                    label="Input Style"
                    options={[
                      { value: "default", label: "Default" },
                      { value: "filled", label: "Filled" },
                      { value: "underline", label: "Underline" },
                      { value: "pill", label: "Pill" },
                    ]}
                    value={config.input_style}
                    onChange={(v) => update({ input_style: v })}
                  />
                  <OptionGrid
                    label="Badge Style"
                    options={[
                      { value: "outline", label: "Outline" },
                      { value: "filled", label: "Filled" },
                      { value: "soft", label: "Soft" },
                      { value: "dot", label: "Dot" },
                    ]}
                    value={config.badge_style}
                    onChange={(v) => update({ badge_style: v })}
                  />
                </div>
              </Section>
            </TabsContent>

            {/* ── Animations ── */}
            <TabsContent value="animations" className="space-y-5 pr-2">
              <Section title="Motion & Transitions" desc="Control page animations">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Page Transitions</Label>
                    <Switch checked={config.page_transitions} onCheckedChange={(v) => update({ page_transitions: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Hover Animations</Label>
                    <Switch checked={config.hover_animations} onCheckedChange={(v) => update({ hover_animations: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Scroll Animations</Label>
                    <Switch checked={config.scroll_animations} onCheckedChange={(v) => update({ scroll_animations: v })} />
                  </div>
                  <OptionGrid
                    label="Animation Speed"
                    options={[
                      { value: "slow", label: "Slow" },
                      { value: "normal", label: "Normal" },
                      { value: "fast", label: "Fast" },
                      { value: "instant", label: "Instant" },
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

      {/* Right: Live Preview — desktop/tablet only; a fixed device-frame
          preview doesn't fit usefully on a phone screen, and was the actual
          cause of the customizer overflowing horizontally on mobile. */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Live Preview</span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                onClick={() => setPreviewDevice(device)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  previewDevice === device ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-border/50 bg-secondary/20 overflow-hidden flex items-start justify-center p-4">
          <div
            className="h-full rounded-xl border border-border/30 bg-background overflow-hidden shadow-2xl transition-all duration-300"
            style={{ width: previewWidth, maxWidth: "100%" }}
          >
            {/* Preview chrome */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/40 border-b border-border/30">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              </div>
              <div className="flex-1 mx-3 h-5 rounded-md bg-secondary/60 flex items-center px-2">
                <span className="text-[10px] text-muted-foreground">yoursite.com</span>
              </div>
            </div>

            {/* Preview content */}
            <ScrollArea className="h-[calc(100%-36px)]">
              <div style={previewCSS}>
                {/* Navbar preview */}
                <div
                  className="border-b border-border/30 flex items-center justify-between px-4"
                  style={{
                    height: `${config.navbar_height}px`,
                    backdropFilter: config.navbar_style === "glass" ? `blur(${config.navbar_blur}px)` : undefined,
                    backgroundColor: config.navbar_style === "solid" ? "hsl(var(--card))" :
                      config.navbar_style === "transparent" ? "transparent" :
                      `hsl(var(--card) / ${config.navbar_opacity / 100})`,
                    borderBottom: config.navbar_style === "bordered" ? "2px solid hsl(var(--primary) / 0.3)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">A</span>
                    </div>
                    <span style={{ fontFamily: `'${config.heading_font}', sans-serif`, fontWeight: Number(config.heading_weight) }} className="text-sm font-bold text-foreground">
                      Site Name
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.navbar_show_search && (
                      <div className="w-28 h-6 rounded-full bg-secondary/50 border border-border/30" />
                    )}
                    {config.navbar_show_categories && (
                      <div className="w-16 h-6 rounded-full bg-secondary/30 border border-border/30" />
                    )}
                    <div className="w-5 h-5 rounded-full bg-secondary/50" />
                    <div className="w-5 h-5 rounded-full bg-secondary/50" />
                  </div>
                </div>

                {/* Hero */}
                <div className="relative overflow-hidden" style={{ padding: `${config.content_padding}px` }}>
                  <div className="h-36 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center gap-2" style={{ borderRadius: `${config.border_radius}px` }}>
                    <span style={{ fontFamily: `'${config.heading_font}', sans-serif`, fontWeight: Number(config.heading_weight), fontSize: `${config.base_font_size * Math.pow(config.heading_scale, 2)}px` }} className="text-foreground">
                      Hero Heading
                    </span>
                    <span style={{ fontFamily: `'${config.body_font}', sans-serif`, fontSize: `${config.base_font_size}px` }} className="text-muted-foreground text-xs">
                      Subheading text goes here
                    </span>
                    <button className={`bg-primary text-primary-foreground text-[10px] font-medium px-4 py-1.5 mt-1 ${
                      config.button_style === "pill" ? "rounded-full" :
                      config.button_style === "rounded" ? "rounded-xl" :
                      config.button_style === "sharp" ? "rounded-none" : "rounded-lg"
                    }`}>Shop Now</button>
                  </div>
                </div>

                {/* Product cards */}
                <div style={{ padding: `0 ${config.content_padding}px`, marginTop: `${config.section_gap / 3}px` }}>
                  <h3 style={{ fontFamily: `'${config.heading_font}', sans-serif`, fontWeight: Number(config.heading_weight), fontSize: `${config.base_font_size * config.heading_scale}px` }} className="text-foreground mb-3">
                    Featured Products
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`overflow-hidden transition-all ${
                          config.card_border ? "border border-border/30" : ""
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
                        <div className="aspect-square rounded-lg bg-secondary/30 mb-1.5" style={{ borderRadius: `${Math.max(config.border_radius - 4, 0)}px` }} />
                        <p style={{ fontFamily: `'${config.body_font}', sans-serif`, fontWeight: Number(config.body_weight) }} className="text-[10px] text-foreground truncate">Product {i}</p>
                        <p className="text-[9px] text-primary font-semibold">$29.99</p>
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
                  <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(config.footer_columns, 3)}, 1fr)` }}>
                    <div>
                      <span style={{ fontFamily: `'${config.heading_font}', sans-serif` }} className="text-[10px] font-bold text-foreground block mb-1">Site Name</span>
                      <div className="space-y-0.5">
                        {["Link 1", "Link 2", "Link 3"].map((l) => (
                          <div key={l} className="h-2.5 w-12 rounded bg-muted-foreground/20" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-foreground block mb-1">Categories</span>
                      <div className="space-y-0.5">
                        {["Cat 1", "Cat 2"].map((l) => (
                          <div key={l} className="h-2.5 w-10 rounded bg-muted-foreground/20" />
                        ))}
                      </div>
                    </div>
                    {config.footer_show_newsletter && (
                      <div>
                        <span className="text-[10px] font-bold text-foreground block mb-1">Newsletter</span>
                        <div className="flex gap-1">
                          <div className="h-5 flex-1 rounded bg-secondary/50 border border-border/30" />
                          <div className="h-5 w-8 rounded bg-primary/30" />
                        </div>
                      </div>
                    )}
                  </div>
                  {config.footer_show_socials && (
                    <div className="flex gap-1.5 mt-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-5 h-5 rounded-full bg-secondary/50 border border-border/30" />
                      ))}
                    </div>
                  )}
                  {config.footer_show_trust && (
                    <div className="flex gap-1.5 mt-2">
                      {["🔒", "🚚", "✓"].map((icon) => (
                        <div key={icon} className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                          <span>{icon}</span>
                          <span>Trust</span>
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
  );
};

export default SiteCustomizer;
// code:4ce0
