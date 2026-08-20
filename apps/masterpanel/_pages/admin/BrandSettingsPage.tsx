"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/app-toast";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Monitor,
  Smartphone,
  Globe,
  Check,
  Image as ImageIcon,
  Type,
  Shapes,
  Megaphone,
  RotateCcw,
  Save,
  ArrowRight,
  Sliders,
  Scale,
  Layout,
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { BrandImage, LOGO_FILTERS, type LogoFilter } from "@/lib/brand-image";
import { useTabParam } from "@/hooks/use-tab-param";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SiteThemePanel from "@/components/admin/SiteThemePanel";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

const LOGO_STYLES = [
  { id: "none", label: "Bare", cls: "" },
  { id: "rounded", label: "Rounded", cls: "rounded-xl" },
  { id: "circle", label: "Circle", cls: "rounded-full" },
  { id: "squircle", label: "Squircle", cls: "rounded-[28%]" },
  { id: "square", label: "Square", cls: "rounded-none" },
  { id: "pill", label: "Pill", cls: "rounded-full" },
  { id: "shield", label: "Shield", cls: "[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" },
  { id: "hexagon", label: "Hexagon", cls: "[clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" },
  { id: "octagon", label: "Octagon", cls: "[clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)]" },
  { id: "diamond", label: "Diamond", cls: "rotate-45 rounded-md" },
  { id: "blob", label: "Blob", cls: "rounded-[30%_70%_70%_30%/30%_30%_70%_70%]" },
  { id: "leaf", label: "Leaf", cls: "rounded-tl-[60%] rounded-br-[60%] rounded-tr-md rounded-bl-md" },
  { id: "ticket", label: "Ticket", cls: "[clip-path:polygon(0_8%,8%_0,92%_0,100%_8%,100%_92%,92%_100%,8%_100%,0_92%)]" },
];

const LOGO_EFFECTS = [
  { id: "none", label: "Bare" },
  { id: "glossy", label: "Glossy" },
  { id: "glow", label: "Aura Glow" },
  { id: "neon", label: "Neon" },
  { id: "shadow", label: "Soft Shadow" },
  { id: "elevated", label: "Elevated" },
  { id: "border", label: "Hairline" },
  { id: "ring-gradient", label: "Gradient Ring" },
  { id: "frosted", label: "Frosted" },
  { id: "embossed", label: "Embossed" },
  { id: "outline-dual", label: "Dual Outline" },
  { id: "grayscale", label: "Mono" },
  { id: "negative", label: "Invert" },
  { id: "duotone", label: "Duotone" },
];


const CUSTOM_FONTS = [
  "Agraham", "Bilderberg", "Nevera", "OrangeAvenue", "PrimorStylish",
  "ProdesStencil", "Rostex", "SingleGrinch", "Transcity", "Zaslia",
  "Goca", "Logofontik", "Fear", "Monoo", "Monolite",
];

// Curated Google Fonts grouped by style, for the Display Typography picker.
// Loaded on demand via a <link rel="stylesheet"> injected into <head>.
type FontGroup = {
  id: string;
  label: string;
  fonts: { family: string; weight?: number; sample?: string }[];
};

const GOOGLE_FONT_GROUPS: FontGroup[] = [
  {
    id: "display",
    label: "Display",
    fonts: [
      { family: "Bebas Neue", weight: 400 },
      { family: "Anton", weight: 400 },
      { family: "Archivo Black", weight: 400 },
      { family: "Abril Fatface", weight: 400 },
      { family: "Bowlby One", weight: 400 },
      { family: "Russo One", weight: 400 },
      { family: "Staatliches", weight: 400 },
      { family: "Black Ops One", weight: 400 },
      { family: "Monoton", weight: 400 },
      { family: "Righteous", weight: 400 },
      { family: "Audiowide", weight: 400 },
      { family: "Bungee", weight: 400 },
    ],
  },
  {
    id: "serif",
    label: "Serif",
    fonts: [
      { family: "Playfair Display", weight: 700 },
      { family: "Cormorant Garamond", weight: 600 },
      { family: "DM Serif Display", weight: 400 },
      { family: "Instrument Serif", weight: 400 },
      { family: "Libre Baskerville", weight: 700 },
      { family: "Lora", weight: 600 },
      { family: "Merriweather", weight: 700 },
      { family: "EB Garamond", weight: 600 },
      { family: "Fraunces", weight: 700 },
    ],
  },
  {
    id: "sans",
    label: "Sans",
    fonts: [
      { family: "Inter", weight: 700 },
      { family: "Space Grotesk", weight: 700 },
      { family: "Manrope", weight: 700 },
      { family: "Outfit", weight: 700 },
      { family: "Sora", weight: 700 },
      { family: "Plus Jakarta Sans", weight: 700 },
      { family: "Syne", weight: 700 },
      { family: "Urbanist", weight: 800 },
      { family: "Epilogue", weight: 800 },
      { family: "Bricolage Grotesque", weight: 700 },
      { family: "Onest", weight: 700 },
    ],
  },
  {
    id: "script",
    label: "Script & Hand",
    fonts: [
      { family: "Pacifico", weight: 400 },
      { family: "Caveat", weight: 600 },
      { family: "Dancing Script", weight: 600 },
      { family: "Great Vibes", weight: 400 },
      { family: "Sacramento", weight: 400 },
      { family: "Allura", weight: 400 },
      { family: "Satisfy", weight: 400 },
      { family: "Shadows Into Light", weight: 400 },
      { family: "Permanent Marker", weight: 400 },
      { family: "Kalam", weight: 700 },
    ],
  },
  {
    id: "mono",
    label: "Mono & Tech",
    fonts: [
      { family: "JetBrains Mono", weight: 700 },
      { family: "Space Mono", weight: 700 },
      { family: "IBM Plex Mono", weight: 600 },
      { family: "Fira Code", weight: 600 },
      { family: "Major Mono Display", weight: 400 },
      { family: "VT323", weight: 400 },
      { family: "Share Tech Mono", weight: 400 },
    ],
  },
];

const ALL_GOOGLE_FONTS = GOOGLE_FONT_GROUPS.flatMap((g) => g.fonts);

const loadedGoogleFonts = new Set<string>();
function loadGoogleFont(family: string, weight = 700) {
  if (typeof document === "undefined") return;
  const key = `${family}@${weight}`;
  if (loadedGoogleFonts.has(key)) return;
  loadedGoogleFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&display=swap`;
  link.setAttribute("data-brand-font", "1");
  document.head.appendChild(link);
}

function TypographyPicker({
  titleFont,
  setTitleFont,
}: {
  titleFont: string;
  setTitleFont: (v: string) => void;
}) {
  const [group, setGroup] = useState<string>("custom");
  const [query, setQuery] = useState("");

  // Preload fonts for whichever group is visible so previews render in their face.
  useEffect(() => {
    if (group === "all" || group === "google") {
      ALL_GOOGLE_FONTS.forEach((f) => loadGoogleFont(f.family, f.weight));
    } else {
      const g = GOOGLE_FONT_GROUPS.find((x) => x.id === group);
      g?.fonts.forEach((f) => loadGoogleFont(f.family, f.weight));
    }
    // Also ensure the currently selected font (if Google) is loaded.
    const sel = ALL_GOOGLE_FONTS.find((f) => f.family === titleFont);
    if (sel) loadGoogleFont(sel.family, sel.weight);
  }, [group, titleFont]);

  const groupTabs = [
    { id: "custom", label: "Custom" },
    ...GOOGLE_FONT_GROUPS.map((g) => ({ id: g.id, label: g.label })),
    { id: "all", label: "All" },
  ];

  const visibleFonts = (() => {
    let list: { family: string; weight?: number; kind: "custom" | "google" }[] = [];
    if (group === "custom" || group === "all") {
      list.push(...CUSTOM_FONTS.map((f) => ({ family: f, kind: "custom" as const })));
    }
    if (group === "all") {
      list.push(...ALL_GOOGLE_FONTS.map((f) => ({ ...f, kind: "google" as const })));
    } else if (group !== "custom") {
      const g = GOOGLE_FONT_GROUPS.find((x) => x.id === group);
      if (g) list.push(...g.fonts.map((f) => ({ ...f, kind: "google" as const })));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.family.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 bg-muted/40 rounded-full p-1">
          {groupTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setGroup(t.id)}
              className={cn(
                "px-2.5 py-1 text-[11px] rounded-full transition-colors",
                group === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search font…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-xs flex-1 min-w-[140px]"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
        <button
          onClick={() => setTitleFont("")}
          className={cn(
            "text-left px-3 py-2.5 rounded-xl text-xs transition-all border",
            !titleFont ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30 hover:bg-muted/40"
          )}
        >
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">System</span>
          <span className="font-semibold text-sm">Default</span>
        </button>
        {visibleFonts.map((f) => {
          const active = titleFont === f.family;
          return (
            <button
              key={f.kind + f.family}
              onClick={() => {
                setTitleFont(f.family);
                if (f.kind === "google") loadGoogleFont(f.family, f.weight);
              }}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl text-xs transition-all border",
                active ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30 hover:bg-muted/40"
              )}
            >
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                {f.kind === "custom" ? "Display" : "Google"}
              </span>
              <span style={{ fontFamily: `'${f.family}', sans-serif` }} className="text-lg leading-tight block truncate">
                {f.family}
              </span>
            </button>
          );
        })}
        {visibleFonts.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground py-6 text-center">No fonts match "{query}".</p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Google Fonts load from fonts.googleapis.com on demand. Custom fonts are bundled locally.
      </p>
    </div>
  );
}

const FAVICON_SIZES = [16, 32, 64, 180];

// Shared field wrapper
function Field({
  label,
  hint,
  count,
  max,
  children,
}: {
  label: string;
  hint?: string;
  count?: number;
  max?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground/90">{label}</Label>
        {typeof count === "number" && typeof max === "number" && (
          <span
            className={cn(
              "text-[10px] tabular-nums",
              count > max ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {count}/{max}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

const AdminBranding = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useTabParam("overview", "/brand");
  const show = (k: string) => tab === k;
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [logoStyle, setLogoStyle] = useState("rounded");
  const [logoEffect, setLogoEffect] = useState("none");
  const [logoFilter, setLogoFilter] = useState<LogoFilter>("none");
  const [logoTint, setLogoTint] = useState<string>("#ffffff");
  const [iconFilter, setIconFilter] = useState<LogoFilter>("none");
  const [iconTint, setIconTint] = useState<string>("#ffffff");
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [brandSuffix, setBrandSuffix] = useState("");
  const [brandPrefix, setBrandPrefix] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [address, setAddress] = useState("");
  const [titleColors, setTitleColors] = useState<Record<number, string>>({});
  const [titleFont, setTitleFont] = useState("");
  const [titleSource, setTitleSource] = useState<"text" | "image">("text");
  const [titleImageUrl, setTitleImageUrl] = useState("");
  const [titleFilter, setTitleFilter] = useState<LogoFilter>("none");
  const [titleTint, setTitleTint] = useState<string>("#ffffff");
  const [titleGroupMode, setTitleGroupMode] = useState<"single" | "1-1" | "2-2" | "1-2" | "custom">("single");
  const [titleGroupCustom, setTitleGroupCustom] = useState<number[]>([]);
  const [brandTitleSizeNav, setBrandTitleSizeNav] = useState<number>(20);
  const [brandLogoTitleRatio, setBrandLogoTitleRatio] = useState<number>(1.0);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  // Ensure the currently selected Google font is loaded for live preview.
  useEffect(() => {
    const sel = ALL_GOOGLE_FONTS.find((f) => f.family === titleFont);
    if (sel) loadGoogleFont(sel.family, sel.weight);
  }, [titleFont]);

  const { data: settings } = useQuery({
    queryKey: ["admin-branding"],
    queryFn: async () => {
      const keys = [
        "logo_url", "site_icon_url", "logo_display_style", "logo_effect",
        "logo_color_filter", "logo_tint_color", "icon_color_filter", "icon_tint_color",
        "site_name", "site_description", "brand_suffix", "brand_prefix", "contact_email", "contact_phone",
        "support_url", "address", "title_letter_colors", "title_font",
        "title_source", "title_image_url", "title_group_mode", "title_group_custom",
        "title_color_filter", "title_tint_color",
        "brand_title_size_nav", "brand_logo_title_ratio",
      ];
      const map: Record<string, any> = {};

      try {
        const res = await fetch(`/api/site-settings?keys=${keys.join(",")}`);
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === "object") {
            Object.assign(map, json);
          }
        }
      } catch {
        // fallback
      }

      if (Object.keys(map).length === 0) {
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", keys);
        data?.forEach((s) => {
          const val = s.value;
          map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
        });
      }
      return map;
    },
  });

  useEffect(() => {
    if (settings) {
      setLogoUrl((settings.logo_url as string) || "");
      setIconUrl((settings.site_icon_url as string) || "");
      setLogoStyle((settings.logo_display_style as string) || "rounded");
      setLogoEffect((settings.logo_effect as string) || "none");
      setLogoFilter(((settings.logo_color_filter as string) || "none") as LogoFilter);
      setLogoTint((settings.logo_tint_color as string) || "#ffffff");
      setIconFilter(((settings.icon_color_filter as string) || "none") as LogoFilter);
      setIconTint((settings.icon_tint_color as string) || "#ffffff");
      const rawName = settings.site_name;
      setSiteName(String(typeof rawName === "object" && rawName !== null ? (rawName as any).value ?? "" : rawName ?? ""));
      const rawDesc = settings.site_description;
      setSiteDescription(String(typeof rawDesc === "object" && rawDesc !== null ? (rawDesc as any).value ?? "" : rawDesc ?? ""));
      setBrandSuffix(String(settings.brand_suffix || ""));
      setBrandPrefix(String(settings.brand_prefix || ""));
      setContactEmail(String(settings.contact_email || ""));
      setContactPhone(String(settings.contact_phone || ""));
      setSupportUrl(String(settings.support_url || ""));
      setAddress(String(settings.address || ""));
      if (settings.title_letter_colors && typeof settings.title_letter_colors === "object") {
        setTitleColors(settings.title_letter_colors as Record<number, string>);
      }
      setTitleFont((settings.title_font as string) || "");
      setTitleSource(((settings.title_source as string) === "image" ? "image" : "text"));
      setTitleImageUrl((settings.title_image_url as string) || "");
      setTitleFilter(((settings.title_color_filter as string) || "none") as LogoFilter);
      setTitleTint((settings.title_tint_color as string) || "#ffffff");
      setTitleGroupMode((["single","1-1","2-2","1-2","custom"].includes(settings.title_group_mode as string)
        ? settings.title_group_mode
        : "single") as any);
      setTitleGroupCustom(Array.isArray(settings.title_group_custom)
        ? (settings.title_group_custom as any[]).map((n) => Math.max(1, Number(n) || 1))
        : []);
      setBrandTitleSizeNav(Number(settings.brand_title_size_nav) || 20);
      setBrandLogoTitleRatio(Number(settings.brand_logo_title_ratio) || 1.0);
      setInitialSnapshot(JSON.stringify(settings));
    }
  }, [settings]);

  const currentSnapshot = JSON.stringify({
    logo_url: logoUrl, site_icon_url: iconUrl, logo_display_style: logoStyle,
    logo_effect: logoEffect,
    logo_color_filter: logoFilter, logo_tint_color: logoTint,
    icon_color_filter: iconFilter, icon_tint_color: iconTint,
    site_name: siteName, site_description: siteDescription,
    brand_suffix: brandSuffix,
    brand_prefix: brandPrefix,
    contact_email: contactEmail, contact_phone: contactPhone, support_url: supportUrl,
    address, title_letter_colors: titleColors, title_font: titleFont,
    title_source: titleSource, title_image_url: titleImageUrl, title_group_mode: titleGroupMode,
    title_group_custom: titleGroupCustom,
    title_color_filter: titleFilter, title_tint_color: titleTint,
    brand_title_size_nav: brandTitleSizeNav,
    brand_logo_title_ratio: brandLogoTitleRatio,
  });

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    try {
      const init = JSON.parse(initialSnapshot);
      const initNormalized = JSON.stringify({
        logo_url: init.logo_url || "",
        site_icon_url: init.site_icon_url || "",
        logo_display_style: init.logo_display_style || "rounded",
        logo_effect: init.logo_effect || "none",
        logo_color_filter: init.logo_color_filter || "none",
        logo_tint_color: init.logo_tint_color || "#ffffff",
        icon_color_filter: init.icon_color_filter || "none",
        icon_tint_color: init.icon_tint_color || "#ffffff",
        site_name: String(init.site_name || ""),
        site_description: String(init.site_description || ""),
        brand_suffix: String(init.brand_suffix || ""),
        brand_prefix: String(init.brand_prefix || ""),
        contact_email: String(init.contact_email || ""),
        contact_phone: String(init.contact_phone || ""),
        support_url: String(init.support_url || ""),
        address: String(init.address || ""),
        title_letter_colors: init.title_letter_colors || {},
        title_font: init.title_font || "",
        title_source: init.title_source === "image" ? "image" : "text",
        title_image_url: init.title_image_url || "",
        title_group_mode: init.title_group_mode || "single",
        title_group_custom: Array.isArray(init.title_group_custom) ? init.title_group_custom : [],
        title_color_filter: init.title_color_filter || "none",
        title_tint_color: init.title_tint_color || "#ffffff",
        brand_title_size_nav: Number(init.brand_title_size_nav) || 20,
        brand_logo_title_ratio: Number(init.brand_logo_title_ratio) || 1.0,
      });
      return initNormalized !== currentSnapshot;
    } catch {
      return false;
    }
  }, [initialSnapshot, currentSnapshot]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items: { key: string; value: any }[] = [
        { key: "site_name", value: siteName },
        { key: "site_description", value: siteDescription },
        { key: "brand_suffix", value: brandSuffix },
        { key: "brand_prefix", value: brandPrefix },
        { key: "contact_email", value: contactEmail },
        { key: "contact_phone", value: contactPhone },
        { key: "support_url", value: supportUrl },
        { key: "address", value: address },
        { key: "logo_url", value: logoUrl },
        { key: "site_icon_url", value: iconUrl },
        { key: "logo_display_style", value: logoStyle },
        { key: "logo_effect", value: logoEffect },
        { key: "logo_color_filter", value: logoFilter },
        { key: "logo_tint_color", value: logoTint },
        { key: "icon_color_filter", value: iconFilter },
        { key: "icon_tint_color", value: iconTint },
        { key: "title_letter_colors", value: titleColors },
        { key: "title_font", value: titleFont },
        { key: "title_source", value: titleSource },
        { key: "title_image_url", value: titleImageUrl },
        { key: "title_group_mode", value: titleGroupMode },
        { key: "title_group_custom", value: titleGroupCustom },
        { key: "title_color_filter", value: titleFilter },
        { key: "title_tint_color", value: titleTint },
        { key: "brand_title_size_nav", value: brandTitleSizeNav },
        { key: "brand_logo_title_ratio", value: brandLogoTitleRatio },
      ];

      try {
        const res = await fetch("/api/site-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (res.ok) return;
      } catch {
        // fallback
      }

      for (const item of items) {
        const { error } = await supabase
          .from("site_settings")
          .upsert(
            { key: item.key, value: item.value as any, updated_at: new Date().toISOString() },
            { onConflict: "key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      ["admin-branding", "site-settings-nav", "site-settings-footer", "site-settings-landing", "site-settings",
       "brand-identity", "company-nav-brand", "site-favicon", "site-favicon-url"]
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setInitialSnapshot(currentSnapshot);
      toast.success("Branding saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetChanges = () => {
    if (!settings) return;
    setLogoUrl((settings.logo_url as string) || "");
    setIconUrl((settings.site_icon_url as string) || "");
    setLogoStyle((settings.logo_display_style as string) || "rounded");
    setLogoEffect((settings.logo_effect as string) || "none");
    setLogoFilter(((settings.logo_color_filter as string) || "none") as LogoFilter);
    setLogoTint((settings.logo_tint_color as string) || "#ffffff");
    setIconFilter(((settings.icon_color_filter as string) || "none") as LogoFilter);
    setIconTint((settings.icon_tint_color as string) || "#ffffff");
    const rawName = settings.site_name;
    setSiteName(String(typeof rawName === "object" && rawName !== null ? (rawName as any).value ?? "" : rawName ?? ""));
    const rawDesc = settings.site_description;
    setSiteDescription(String(typeof rawDesc === "object" && rawDesc !== null ? (rawDesc as any).value ?? "" : rawDesc ?? ""));
    setBrandSuffix(String(settings.brand_suffix || ""));
    setBrandPrefix(String(settings.brand_prefix || ""));
    setContactEmail(String(settings.contact_email || ""));
    setContactPhone(String(settings.contact_phone || ""));
    setSupportUrl(String(settings.support_url || ""));
    setAddress(String(settings.address || ""));
    setTitleColors(
      settings.title_letter_colors && typeof settings.title_letter_colors === "object"
        ? (settings.title_letter_colors as Record<number, string>)
        : {}
    );
    setTitleFont((settings.title_font as string) || "");
    setTitleSource(((settings.title_source as string) === "image" ? "image" : "text"));
    setTitleImageUrl((settings.title_image_url as string) || "");
    setTitleGroupMode((["single","1-1","2-2","1-2","custom"].includes(settings.title_group_mode as string)
      ? settings.title_group_mode
      : "single") as any);
    setTitleGroupCustom(Array.isArray(settings.title_group_custom)
      ? (settings.title_group_custom as any[]).map((n) => Math.max(1, Number(n) || 1))
      : []);
    setTitleFilter(((settings.title_color_filter as string) || "none") as LogoFilter);
    setTitleTint((settings.title_tint_color as string) || "#ffffff");
    setBrandTitleSizeNav(Number(settings.brand_title_size_nav) || 20);
    setBrandLogoTitleRatio(Number(settings.brand_logo_title_ratio) || 1.0);
  };

  const getEffectClass = (effect: string) => {
    switch (effect) {
      case "glossy": return "after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/30 after:via-white/5 after:to-transparent after:pointer-events-none";
      case "glow": return "shadow-[0_0_24px_hsl(var(--primary)/0.45),0_0_8px_hsl(var(--primary)/0.6)]";
      case "neon": return "ring-1 ring-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.9),inset_0_0_8px_hsl(var(--primary)/0.4)]";
      case "shadow": return "shadow-[0_8px_24px_-6px_hsl(0_0%_0%/0.45)]";
      case "elevated": return "shadow-[0_2px_4px_hsl(0_0%_0%/0.1),0_12px_28px_-8px_hsl(0_0%_0%/0.35)]";
      case "border": return "ring-1 ring-foreground/15";
      case "ring-gradient": return "ring-[1.5px] ring-transparent [background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))_border-box]";
      case "frosted": return "backdrop-blur-md bg-background/40 ring-1 ring-white/10";
      case "embossed": return "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.25),inset_0_-1px_0_hsl(0_0%_0%/0.25),0_2px_6px_hsl(0_0%_0%/0.2)]";
      case "outline-dual": return "ring-1 ring-foreground/20 outline outline-1 outline-offset-2 outline-foreground/10";
      case "grayscale": return "grayscale";
      case "negative": return "invert";
      case "duotone": return "[filter:grayscale(1)_contrast(1.1)] mix-blend-luminosity";
      default: return "";
    }
  };


  const styleObj = LOGO_STYLES.find((s) => s.id === logoStyle) || LOGO_STYLES[0];

  const groupChunks = (text: string): string[] => {
    if (!text) return [];
    if (titleGroupMode === "single") return [text];
    const chars = Array.from(text);
    if (titleGroupMode === "1-1") return chars;
    const out: string[] = [];
    if (titleGroupMode === "2-2") {
      for (let i = 0; i < chars.length; i += 2) out.push(chars.slice(i, i + 2).join(""));
      return out;
    }
    if (titleGroupMode === "custom") {
      const sizes = titleGroupCustom.map((n) => Math.max(1, Math.floor(Number(n) || 1)));
      if (!sizes.length) return [text];
      let i = 0, k = 0;
      while (i < chars.length) {
        const take = sizes[k % sizes.length];
        out.push(chars.slice(i, i + take).join(""));
        i += take; k += 1;
      }
      return out;
    }
    // 1-2 alternating
    let i = 0, take = 1;
    while (i < chars.length) {
      out.push(chars.slice(i, i + take).join(""));
      i += take; take = take === 1 ? 2 : 1;
    }
    return out;
  };

  const renderTitle = (cls: string, customSize?: number) => {
    if (titleSource === "image" && titleImageUrl) {
      return (
        <BrandImage
          src={titleImageUrl}
          alt={siteName || "Title"}
          filter={titleFilter}
          customColor={titleTint}
          className={cn("h-6 w-auto", cls)}
        />
      );
    }
    const text = siteName || "Your Brand";
    const style: React.CSSProperties = {
      fontFamily: titleFont ? `'${titleFont}', sans-serif` : undefined,
      fontSize: customSize ? `${customSize}px` : undefined,
    };

    // When single mode, render as a single continuous text string without breaking into spans,
    // so font kerning, ligatures, and script cursive connections apply naturally across the full word.
    if (titleGroupMode === "single") {
      const singleColor = titleColors[0];
      return (
        <span
          className={cn(cls, "inline-block tracking-normal")}
          style={{ ...style, color: singleColor || undefined }}
        >
          {text}
        </span>
      );
    }

    const chunks = groupChunks(text);
    return (
      <span className={cn(cls, "inline-flex items-baseline gap-[0.15em]")} style={style}>
        {chunks.map((chunk, ci) => (
          <span key={ci} className="inline-flex" style={titleColors[ci] ? { color: titleColors[ci] } : undefined}>
            {chunk}
          </span>
        ))}
      </span>
    );
  };

  useRegisterUniversalSave(
    {
      id: "admin-branding",
      label: "Save Brand Changes",
      onSave: () => saveMutation.mutate(),
      isSaving: saveMutation.isPending,
      isDirty: isDirty,
    },
    [isDirty, saveMutation.isPending]
  );

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Brand Identity Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure luxury logo styling, typography, color filters, and site-wide theme defaults.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Check className="w-3.5 h-3.5" />
            Live Preview Synchronized
          </Badge>
        </div>
      </div>
      {/* Two-column workspace */}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* LEFT: Identity editors & Overview */}
        <div className="space-y-6">
          {/* Executive Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Executive Brand Identity Hero Card */}
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 md:p-8 shadow-xl">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-3 py-1 font-bold">
                        <Check className="w-3 h-3 mr-1" /> Telemetry & System Assets Synchronized
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-display font-black tracking-tight text-foreground">
                      {siteName || "ORIZINO"} {brandSuffix}
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground max-w-xl leading-relaxed">
                      {siteDescription || "Luxury Storefront & E-commerce Brand Experience"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setTab("logo")} className="rounded-xl text-xs font-semibold gap-2 border-border/60">
                      <ImageIcon className="w-3.5 h-3.5" /> Edit Assets
                    </Button>
                    <Button size="sm" onClick={() => setTab("theme")} className="rounded-xl text-xs font-bold gap-2 shadow-md">
                      <Palette className="w-3.5 h-3.5" /> Customize Theme
                    </Button>
                  </div>
                </div>
              </div>

              {/* Identity Metric & Spec Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Logo & Icon Overview Card */}
                <Card className="border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo & Favicon</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setTab("logo")} className="h-7 text-[11px] font-semibold text-primary">
                        Configure <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div className={cn("w-14 h-14 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center p-1.5 overflow-hidden shrink-0", styleObj.cls)}>
                        {logoUrl ? (
                          <BrandImage src={logoUrl} alt="Logo" filter={logoFilter} customColor={logoTint} className="w-full h-full" />
                        ) : (
                          <span className="font-bold text-lg text-foreground">{siteName?.charAt(0) || "O"}</span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-mono">{logoStyle}</Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md">{logoFilter} filter</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{logoUrl ? "Custom SVG/PNG Asset Active" : "Default System Logo"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Color Filters & Palette Overview Card */}
                <Card className="border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Palette className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Palette & Contrast</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setTab("color")} className="h-7 text-[11px] font-semibold text-primary">
                        Configure <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Auto Contrast Tint</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Cream Vanilla / Charcoal</Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        <div className="h-6 rounded-md bg-primary flex items-center justify-center text-[9px] font-mono text-primary-foreground font-bold" title="Primary">Pri</div>
                        <div className="h-6 rounded-md bg-secondary flex items-center justify-center text-[9px] font-mono text-secondary-foreground" title="Secondary">Sec</div>
                        <div className="h-6 rounded-md bg-card border border-border flex items-center justify-center text-[9px] font-mono text-card-foreground" title="Card">Card</div>
                        <div className="h-6 rounded-md bg-muted flex items-center justify-center text-[9px] font-mono text-muted-foreground" title="Muted">Mut</div>
                        <div className="h-6 rounded-md bg-accent flex items-center justify-center text-[9px] font-mono text-accent-foreground" title="Accent">Acc</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Typography & Display Font Overview Card */}
                <Card className="border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Type className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Typography Engine</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setTab("typography")} className="h-7 text-[11px] font-semibold text-primary">
                        Configure <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Active Display Font</span>
                        <span className="font-semibold text-foreground">{titleFont || "System Default"}</span>
                      </div>
                      <div className="pt-1 text-center border-t border-border/30">
                        {renderTitle("text-xl font-bold truncate block")}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Brand Voice & Corporate Info Card */}
                <Card className="border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corporate Voice & Contact</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setTab("voice")} className="h-7 text-[11px] font-semibold text-primary">
                        Configure <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contact Email</span>
                        <span className="font-medium text-foreground">{contactEmail || "Not specified"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contact Phone</span>
                        <span className="font-medium text-foreground">{contactPhone || "Not specified"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Support Portal</span>
                        <span className="font-medium text-primary truncate max-w-[140px]">{supportUrl || "Disabled"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Logo & Icon assets */}
          {show("logo") && (
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard icon={ImageIcon} title="Site Logo" description="Recommended 256×256+, transparent PNG or SVG">
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-20 h-20 shrink-0 overflow-hidden relative bg-secondary/40 border border-border/50 flex items-center justify-center p-2",
                      styleObj.cls,
                      getEffectClass(logoEffect)
                    )}
                  >
                    {logoUrl ? (
                      <BrandImage src={logoUrl} alt="Logo" filter={logoFilter} customColor={logoTint} className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                        {siteName?.charAt(0) || "L"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <ImageUpload bucket="site-assets" folder="branding" value={logoUrl} onUploaded={(url) => setLogoUrl(url)} />
                    {logoUrl && (
                      <button onClick={() => setLogoUrl("")} className="text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Globe} title="Favicon & App Icon" description="Square crop, rendered across browsers and devices">
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
                <ImageUpload bucket="site-assets" folder="branding" value={iconUrl} onUploaded={(url) => setIconUrl(url)} />
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {FAVICON_SIZES.map((size) => (
                    <div key={size} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-card border border-border/40">
                      <div
                        className="rounded-md overflow-hidden bg-secondary/40 flex items-center justify-center"
                        style={{ width: Math.min(size, 48), height: Math.min(size, 48) }}
                      >
                        {iconUrl ? (
                          <BrandImage src={iconUrl} alt="" filter={iconFilter} customColor={iconTint} className="w-full h-full" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground tabular-nums">{size}px</span>
                    </div>
                  ))}
                </div>
                {iconUrl && (
                  <button onClick={() => setIconUrl("")} className="text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                    Remove icon
                  </button>
                )}
              </div>
            </SectionCard>
          </div>
          )}

          {/* Logo Shape & Effect */}
          {show("shape") && (
          <SectionCard icon={Shapes} title="Logo Shape & Effect" description="Pick a silhouette and finishing treatment">
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">Shape</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {LOGO_STYLES.map((style) => {
                    const active = logoStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setLogoStyle(style.id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                          active ? "border-primary bg-primary/10 shadow-sm" : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        {active && <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />}
                        <div className={cn("w-10 h-10 flex items-center justify-center overflow-hidden", style.cls, !logoUrl && (style.id === "none" ? "text-foreground/70 font-semibold" : "bg-gradient-primary text-primary-foreground font-bold text-xs"))}>
                          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : "L"}
                        </div>
                        <span className="text-[9px] font-medium text-foreground/80">{style.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">Effect</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {LOGO_EFFECTS.map((effect) => {
                    const active = logoEffect === effect.id;
                    return (
                      <button
                        key={effect.id}
                        onClick={() => setLogoEffect(effect.id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                          active ? "border-primary bg-primary/10 shadow-sm" : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        {active && <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />}
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden relative", !logoUrl && "bg-gradient-primary text-primary-foreground", getEffectClass(effect.id))}>
                          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : "L"}
                        </div>
                        <span className="text-[9px] font-medium text-foreground/80">{effect.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>
          )}

          {/* Color Filter (logo + icon) */}
          {show("color") && (
          <SectionCard icon={Palette} title="Color Filter" description="Recolor your logo and icon without touching the theme accent">
            {[
              { kind: "logo" as const, label: "Logo", src: logoUrl, filter: logoFilter, tint: logoTint, setFilter: setLogoFilter, setTint: setLogoTint },
              { kind: "icon" as const, label: "App Icon", src: iconUrl, filter: iconFilter, tint: iconTint, setFilter: setIconFilter, setTint: setIconTint },
              ...(titleSource === "image" && titleImageUrl
                ? [{ kind: "title" as const, label: "Title Image", src: titleImageUrl, filter: titleFilter, tint: titleTint, setFilter: setTitleFilter, setTint: setTitleTint }]
                : []),
            ].map((row) => (
              <div key={row.kind} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{row.label}</Label>
                  {row.filter === "custom" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Tint</span>
                      <input
                        type="color"
                        value={row.tint}
                        onChange={(e) => row.setTint(e.target.value)}
                        className="w-7 h-7 rounded-md border border-border/60 cursor-pointer bg-transparent"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {LOGO_FILTERS.map((f) => {
                    const active = row.filter === f.id;
                    const previewColor = f.id === "custom" ? row.tint : undefined;
                    return (
                      <button
                        key={f.id}
                        onClick={() => row.setFilter(f.id)}
                        title={f.hint}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                          active ? "border-primary bg-primary/10 shadow-sm" : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        {active && <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />}
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-[conic-gradient(at_50%_50%,hsl(var(--muted))_0deg,hsl(var(--background))_90deg,hsl(var(--muted))_180deg,hsl(var(--background))_270deg)] bg-[length:8px_8px]">
                          {row.src ? (
                            <BrandImage src={row.src} alt="" filter={f.id} customColor={previewColor} className="w-9 h-9" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{f.label}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-foreground/80 text-center leading-tight">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              Tip: "Accent Tint" and "Custom Color" use a CSS mask — transparent PNG / SVG works best.
            </p>
          </SectionCard>
          )}

          {show("typography") && (
          <SectionCard icon={Type} title="Display Typography" description="Font used for the site name and headline titles across all public applications">
            <TypographyPicker titleFont={titleFont} setTitleFont={setTitleFont} />
          </SectionCard>
          )}

          {/* Top Nav Brand Title Sizing */}
          {show("typography") && (
          <SectionCard
            icon={Sliders}
            title="Top Navigation Brand Title Size"
            description="Control the exact rendered font size of the brand title in the main top navigation bar."
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>Navigation Title Size</span>
                    <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-background">
                      {brandTitleSizeNav}px
                    </Badge>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Adjusts title typography scale in header navbar across desktop and mobile.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-64">
                  <Slider
                    min={12}
                    max={40}
                    step={1}
                    value={[brandTitleSizeNav]}
                    onValueChange={([val]) => setBrandTitleSizeNav(val)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={12}
                    max={40}
                    value={brandTitleSizeNav}
                    onChange={(e) => setBrandTitleSizeNav(Math.min(40, Math.max(12, Number(e.target.value) || 20)))}
                    className="w-16 h-8 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Quick Sizing Presets */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Quick Presets</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Compact", size: 16, desc: "16px" },
                    { label: "Standard", size: 20, desc: "20px" },
                    { label: "Prominent", size: 24, desc: "24px" },
                    { label: "Large", size: 28, desc: "28px" },
                    { label: "Statement", size: 32, desc: "32px" },
                  ].map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => setBrandTitleSizeNav(preset.size)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all",
                        brandTitleSizeNav === preset.size
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Top Nav Bar Simulation */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Live Top Nav Simulation</Label>
                <div className="rounded-xl border border-border/70 bg-background/95 p-3 flex items-center justify-between shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className={cn("overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}
                      style={{
                        height: `${Math.round((brandTitleSizeNav * 1.35) * brandLogoTitleRatio)}px`,
                        width: `${Math.round((brandTitleSizeNav * 1.35) * brandLogoTitleRatio)}px`,
                        minWidth: "20px",
                        minHeight: "20px",
                      }}
                    >
                      {logoUrl ? (
                        <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                          {siteName?.charAt(0) || "L"}
                        </div>
                      )}
                    </div>
                    {renderTitle("font-bold tracking-wider leading-none select-none uppercase", brandTitleSizeNav)}
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Catalog</span>
                    <span>Collections</span>
                    <span>Lookbook</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
          )}

          {/* Logo vs Title Proportional Ratio Size Matching */}
          {show("typography") && (
          <SectionCard
            icon={Scale}
            title="Brand Logo vs Title Size Matching"
            description="Adjust the relative proportional scale between the logo icon and brand title so they lock up harmoniously across Top Nav, Footer, and Landing pages."
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>Logo / Title Scale Ratio</span>
                    <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-background">
                      {brandLogoTitleRatio.toFixed(2)}x
                    </Badge>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Controls the relative size multiplier of the logo mark compared to the title text.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-64">
                  <Slider
                    min={0.6}
                    max={2.0}
                    step={0.05}
                    value={[brandLogoTitleRatio]}
                    onValueChange={([val]) => setBrandLogoTitleRatio(Number(val.toFixed(2)))}
                    className="flex-1"
                  />
                  <span className="w-14 text-right text-xs font-mono font-semibold text-foreground">
                    {brandLogoTitleRatio.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* Ratio Presets */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Ratio Balance Presets</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Subtle Logo", ratio: 0.75, desc: "0.75x Title" },
                    { label: "Balanced 1:1", ratio: 1.0, desc: "1.00x Title" },
                    { label: "Emphasized", ratio: 1.25, desc: "1.25x Title" },
                    { label: "Prominent", ratio: 1.5, desc: "1.50x Title" },
                    { label: "Hero Dominant", ratio: 1.8, desc: "1.80x Title" },
                  ].map((preset) => (
                    <button
                      key={preset.ratio}
                      type="button"
                      onClick={() => setBrandLogoTitleRatio(preset.ratio)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all",
                        Math.abs(brandLogoTitleRatio - preset.ratio) < 0.03
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Surface Live Lockup Previews */}
              <div className="space-y-3 pt-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5" /> Synchronized Multi-Surface Lockups
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Top Nav Surface Lockup */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-background flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Top Nav Lockup</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Header</Badge>
                    </div>
                    <div className="flex items-center gap-2.5 py-2">
                      <div className={cn("overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}
                        style={{
                          height: `${Math.round((brandTitleSizeNav * 1.35) * brandLogoTitleRatio)}px`,
                          width: `${Math.round((brandTitleSizeNav * 1.35) * brandLogoTitleRatio)}px`,
                          minWidth: "22px",
                          minHeight: "22px",
                        }}
                      >
                        {logoUrl ? (
                          <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                            {siteName?.charAt(0) || "L"}
                          </div>
                        )}
                      </div>
                      {renderTitle("font-bold tracking-wider leading-none uppercase", brandTitleSizeNav)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Header bar with title at {brandTitleSizeNav}px and logo scaled {brandLogoTitleRatio.toFixed(2)}x.
                    </p>
                  </div>

                  {/* Footer Surface Lockup */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-background flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Footer Lockup</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Footer</Badge>
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <div className={cn("overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}
                        style={{
                          height: `${Math.round(20 * brandLogoTitleRatio)}px`,
                          width: `${Math.round(20 * brandLogoTitleRatio)}px`,
                          minWidth: "16px",
                          minHeight: "16px",
                        }}
                      >
                        {logoUrl ? (
                          <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-[9px]">
                            {siteName?.charAt(0) || "L"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        {renderTitle("font-bold tracking-wider leading-none uppercase text-sm", 14)}
                        {brandSuffix && <span className="text-[10px] text-muted-foreground">{brandSuffix}</span>}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Footer lockup automatically scales logo relative to footer typography.
                    </p>
                  </div>

                  {/* Landing / Hero Surface Lockup */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-background flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Hero Landing Lockup</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Hero</Badge>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center gap-2 py-1">
                      <div className={cn("overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}
                        style={{
                          height: `${Math.round(36 * brandLogoTitleRatio)}px`,
                          width: `${Math.round(36 * brandLogoTitleRatio)}px`,
                          minWidth: "28px",
                          minHeight: "28px",
                        }}
                      >
                        {logoUrl ? (
                          <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {siteName?.charAt(0) || "L"}
                          </div>
                        )}
                      </div>
                      {renderTitle("font-bold tracking-widest leading-none uppercase text-lg", 22)}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Centered hero brand identity with proportional lockup balance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
          )}

          {/* Hybrid site title: image or grouped text */}
          {show("typography") && (
          <SectionCard
            icon={Type}
            title="Site Title System & Letter Grouping"
            description="Choose a single continuous wordmark for natural custom fonts & ligatures, or chunk text into visual groups with per-letter colors."
          >
            <div className="space-y-4">
              {/* Source toggle */}
              <div className="flex gap-2">
                {(["text","image"] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setTitleSource(src)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all",
                      titleSource === src
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    {src === "text" ? <Type className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {src === "text" ? "Text Title" : "Image Title"}
                  </button>
                ))}
              </div>

              {titleSource === "image" ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Upload PNG or SVG. Displayed as the wordmark across all apps. Solid-black / white
                    files auto-invert to contrast with the site theme; extra tint controls live in
                    the "Color Filter" section.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="h-14 min-w-[120px] px-3 rounded-lg bg-background border border-border/60 flex items-center justify-center overflow-hidden">
                      {titleImageUrl
                        ? <BrandImage src={titleImageUrl} alt="Title" filter={titleFilter} customColor={titleTint} className="h-full w-auto max-w-[200px]" />
                        : <span className="text-[10px] text-muted-foreground">No image</span>}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <ImageUpload bucket="site-assets" folder="branding" value={titleImageUrl} onUploaded={(url) => setTitleImageUrl(url)} />
                      {titleImageUrl && (
                        <button
                          onClick={() => setTitleImageUrl("")}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remove title image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">
                      Letter grouping mode
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {([
                        { id: "single", label: "Single Word", hint: "Unbroken natural font" },
                        { id: "1-1",    label: "1 · 1",  hint: "Each letter" },
                        { id: "2-2",    label: "2 · 2",  hint: "Pairs" },
                        { id: "1-2",    label: "1 · 2",  hint: "Alternating" },
                        { id: "custom", label: "Custom", hint: "Your pattern" },
                      ] as const).map((m) => {
                        const active = titleGroupMode === m.id;
                        const preview = groupChunks(siteName || "Orizino").join(" · ");
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              setTitleGroupMode(m.id);
                              if (m.id === "custom" && titleGroupCustom.length === 0) {
                                setTitleGroupCustom([1, 2]);
                              }
                            }}
                            className={cn(
                              "relative flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left",
                              active
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                            )}
                          >
                            {active && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-primary" />}
                            <span className="text-[11px] font-semibold text-foreground/90">{m.label}</span>
                            <span className="text-[9px] text-muted-foreground">{m.hint}</span>
                            {m.id === titleGroupMode && siteName && (
                              <span className="text-[9px] font-mono text-primary/80 truncate max-w-full">
                                {m.id === "single" ? siteName : preview}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      <strong>Single Word</strong> renders unbroken text with full font ligatures, kerning, and cursive connections. Chunked modes allow multi-colored segmented letters.
                    </p>
                  </div>

                  {/* Custom pattern editor */}
                  {titleGroupMode === "custom" && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Custom pattern <span className="text-foreground/70 normal-case tracking-normal">· {siteName.replace(/\s/g, "").length} letters total</span>
                        </Label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setTitleGroupCustom((p) => [...p, 1])}
                            className="text-[10px] px-2 py-1 rounded-md border border-border/60 hover:bg-muted/60"
                          >+ Group</button>
                          <button
                            onClick={() => setTitleGroupCustom([])}
                            className="text-[10px] px-2 py-1 rounded-md border border-border/60 hover:bg-muted/60"
                          >Reset</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {titleGroupCustom.map((size, gi) => (
                          <div key={gi} className="flex items-center gap-1 rounded-lg border border-border/60 bg-background px-1.5 py-1">
                            <span className="text-[9px] text-muted-foreground">#{gi + 1}</span>
                            <button
                              onClick={() => setTitleGroupCustom((p) => p.map((v, i) => i === gi ? Math.max(1, v - 1) : v))}
                              className="w-5 h-5 rounded-md hover:bg-muted text-xs"
                            >−</button>
                            <span className="min-w-[1.25rem] text-center text-xs font-semibold">{size}</span>
                            <button
                              onClick={() => setTitleGroupCustom((p) => p.map((v, i) => i === gi ? Math.min(20, v + 1) : v))}
                              className="w-5 h-5 rounded-md hover:bg-muted text-xs"
                            >+</button>
                            <button
                              onClick={() => setTitleGroupCustom((p) => p.filter((_, i) => i !== gi))}
                              className="w-5 h-5 rounded-md hover:bg-destructive/10 hover:text-destructive text-[10px]"
                            >×</button>
                          </div>
                        ))}
                        {titleGroupCustom.length === 0 && (
                          <span className="text-[10px] text-muted-foreground">Add groups to define a pattern (e.g. 2, 3, 1).</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Pattern repeats until all letters are grouped. Total of pattern: {titleGroupCustom.reduce((a, b) => a + b, 0)}.
                      </p>
                    </div>
                  )}

                  {/* Group-based colors: one swatch per visual chunk */}
                  {siteName && (
                    <div className="rounded-xl border border-border/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Palette className="w-3 h-3" /> Group colors
                        </Label>
                        <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setTitleColors({})}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-start gap-3">
                        {groupChunks(siteName).map((chunk, ci) => (
                          <div
                            key={ci}
                            className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/10 px-2.5 py-2"
                          >
                            <span
                              className="text-xl font-display font-bold leading-none whitespace-pre"
                              style={{
                                ...(titleColors[ci] ? { color: titleColors[ci] } : undefined),
                                ...(titleFont ? { fontFamily: `'${titleFont}', sans-serif` } : undefined),
                              }}
                            >
                              {chunk.replace(/ /g, "·")}
                            </span>
                            <input
                              type="color"
                              value={titleColors[ci] || "#ffffff"}
                              onChange={(e) => setTitleColors((prev) => ({ ...prev, [ci]: e.target.value }))}
                              className="w-7 h-7 rounded-md border border-border/60 cursor-pointer bg-transparent"
                              aria-label={`Color for group ${ci + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {titleGroupMode === "single"
                          ? "Single group — one color applies to the whole title."
                          : titleGroupMode === "1-1"
                          ? "One swatch per letter."
                          : "One swatch per group. Change the grouping above to re-chunk."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
          )}



          {/* Brand voice */}
          {show("voice") && (
          <SectionCard icon={Megaphone} title="Brand Voice" description="The name, tagline, and ways customers reach you">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Primary Brand Name" count={siteName.length} max={40} hint="Master brand name across Storefront, Wordmark, Invoices, Emails &amp; SEO">
                <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. ORIZINO" />
              </Field>
              <Field label="Brand Suffix" count={brandSuffix.length} max={12} hint="Shown after brand name in footer (e.g. co.). Hidden in top nav.">
                <Input value={brandSuffix} onChange={(e) => setBrandSuffix(e.target.value)} placeholder="co." />
              </Field>
              <Field label="Brand Prefix" count={brandPrefix.length} max={12} hint="Small label shown next to brand name in footer (replaces the dot). Hidden in top nav.">
                <Input value={brandPrefix} onChange={(e) => setBrandPrefix(e.target.value)} placeholder="est. 2024" />
              </Field>
              <Field label="Contact Email">
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="support@yoursite.com" />
              </Field>
              <Field label="Site Description / Tagline" count={siteDescription.length} max={160} hint="Used for meta description and footer">
                <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={2} placeholder="Your premium online marketplace" />
              </Field>
              <div className="space-y-4">
                <Field label="Contact Phone">
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 234 567 890" />
                </Field>
                <Field label="Support URL">
                  <Input value={supportUrl} onChange={(e) => setSupportUrl(e.target.value)} placeholder="https://support.yoursite.com" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Business Address">
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="123 Main St, City, Country" />
                </Field>
              </div>
            </div>
          </SectionCard>
          )}

          {show("theme") && <SiteThemePanel />}
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="border-border/60 rounded-2xl overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Desktop navbar preview */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Navbar · Desktop</p>
                <div className="rounded-xl bg-background border border-border/60 p-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}>
                      {logoUrl ? (
                        <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                          {siteName?.charAt(0) || "L"}
                        </div>
                      )}
                    </div>
                    {renderTitle("font-display font-bold text-sm text-foreground truncate")}
                    <div className="flex-1" />
                    <div className="hidden sm:flex gap-1">
                      {["Home", "Shop", "About"].map((l) => (
                        <span key={l} className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile preview */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Mobile</p>
                <div className="rounded-2xl bg-background border border-border/60 p-3 max-w-[220px] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Smartphone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground tabular-nums">9:41</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 overflow-hidden relative shrink-0", styleObj.cls, getEffectClass(logoEffect))}>
                      {logoUrl ? (
                        <BrandImage src={logoUrl} alt="" filter={logoFilter} customColor={logoTint} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-[9px]">
                          {siteName?.charAt(0) || "L"}
                        </div>
                      )}
                    </div>
                    {renderTitle("font-display font-bold text-xs text-foreground truncate")}
                  </div>
                </div>
              </div>

              {/* Browser tab preview */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Browser Tab</p>
                <div className="rounded-t-xl bg-secondary/40 border border-border/60 p-2 pb-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg bg-background border border-b-0 border-border/60 max-w-[220px]">
                    {iconUrl ? (
                      <BrandImage src={iconUrl} alt="" filter={iconFilter} customColor={iconTint} className="w-3.5 h-3.5 rounded-sm shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[10px] text-foreground truncate">{siteName || "Your Site"}</span>
                    <span className="text-muted-foreground text-[10px] ml-1">×</span>
                  </div>
                </div>
              </div>

              {/* Brand wordmark large */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Wordmark</p>
                <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-transparent p-5 text-center">
                  {renderTitle("text-3xl font-display font-bold")}
                  {siteDescription && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{siteDescription}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300",
          isDirty ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl">
          <div className="flex items-center gap-2 pl-1">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-amber-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-amber-500" />
            </span>
            <span className="text-xs font-medium">Unsaved changes</span>
          </div>
          <div className="h-5 w-px bg-border/60" />
          <Button variant="ghost" size="sm" onClick={resetChanges} className="h-8 text-xs">
            <RotateCcw className="w-3 h-3 mr-1.5" /> Discard
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-8 text-xs">
            <Save className="w-3 h-3 mr-1.5" />
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminBranding;
// code:4ce0
