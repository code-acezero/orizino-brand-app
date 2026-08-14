"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

import { Plus, Trash2, GripVertical, Tag, Clock, Image, Bell, Layout, Layers, ChevronDown, ChevronUp, Settings2, Palette, Sun, Moon, Star, Search, FolderOpen, LayoutGrid } from "lucide-react";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useTabParam } from "@/hooks/use-tab-param";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ImageUpload from "@/components/ImageUpload";
import HomepageAnalytics from "@/components/admin/HomepageAnalytics";
import { ProductShowcaseTab } from "./AdminShowcase";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

interface AppearanceConfig {
  hero_overlay_style: string;
  marquee_text: string;
  marquee_speed: string;
  glass_blur_strength: string;
  card_accent_glow: boolean;
  hero_vignette: string;
}

const defaultAppearanceConfig: AppearanceConfig = {
  hero_overlay_style: "cinematic",
  marquee_text: "FREE SHIPPING NATIONWIDE • EXCLUSIVE HEAVYWEIGHT DROP • 100% COMBED FRENCH TERRY • LIMITED EDITIONS",
  marquee_speed: "normal",
  glass_blur_strength: "16px",
  card_accent_glow: true,
  hero_vignette: "cinematic",
};

interface SaleConfig {
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: string;
  custom_icon_url: string;
  banner_image: string;
  color: string;
  button_text: string;
  button_link: string;
  position: string;
  starts_at: string;
  ends_at: string;
  show_countdown: boolean;
  show_products: boolean;
  product_source: string;
  product_count: number;
  sort_order: number;
  trigger_popup: boolean;
}

const defaultSale = (): SaleConfig => ({
  id: crypto.randomUUID(),
  enabled: true,
  title: "Sale Live!",
  subtitle: "Limited time offer",
  icon: "⚡",
  custom_icon_url: "",
  banner_image: "",
  color: "280 70% 55%",
  button_text: "Shop Now",
  button_link: "/inventory",
  position: "after-featured",
  starts_at: "",
  ends_at: "",
  show_countdown: false,
  show_products: false,
  product_source: "",
  product_count: 4,
  sort_order: 0,
  trigger_popup: false,
});

const themeOptions = [
  { id: "default", label: "Cyber Emerald", color: "160 84% 45%" },
  { id: "ocean", label: "Ocean Blue", color: "200 90% 50%" },
  { id: "sunset", label: "Sunset Orange", color: "25 95% 55%" },
  { id: "rose", label: "Rose Pink", color: "340 82% 55%" },
  { id: "violet", label: "Royal Violet", color: "270 80% 60%" },
  { id: "crimson", label: "Crimson Red", color: "0 85% 55%" },
  { id: "gold", label: "Golden Hour", color: "45 90% 50%" },
  { id: "mint", label: "Fresh Mint", color: "170 70% 45%" },
];

const iconOptions = ["⚡", "🔥", "💎", "🎯", "🏷️", "💥", "🌟", "❄️", "🎁", "🛒", "🎉", "💰", "🚀", "🎪"];
const colorOptions = [
  { label: "Primary", value: "var(--primary)" },
  { label: "Purple", value: "280 70% 55%" },
  { label: "Red", value: "0 85% 55%" },
  { label: "Orange", value: "25 95% 55%" },
  { label: "Gold", value: "45 90% 50%" },
  { label: "Green", value: "160 84% 45%" },
  { label: "Blue", value: "200 90% 50%" },
  { label: "Pink", value: "340 82% 55%" },
  { label: "Teal", value: "175 80% 40%" },
  { label: "Indigo", value: "240 70% 50%" },
];
const positionOptions = [
  { value: "after-slider", label: "After Showcase Slider" },
  { value: "after-categories", label: "After Categories" },
  { value: "after-featured", label: "After Featured" },
  { value: "after-arrivals", label: "After New Arrivals" },
  { value: "bottom", label: "Bottom" },
];

const AdminHome = () => {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug, is_featured, sort_order, is_active").is("parent_id", null).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-home-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, slug, is_featured, is_active, thumbnail, price").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: settingsRow } = useQuery({
    queryKey: ["admin-home-cat-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_category_sections").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: salesRow } = useQuery({
    queryKey: ["admin-sales-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_sales_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: arrivalsRow } = useQuery({
    queryKey: ["admin-new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_new_arrivals").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: layoutRow } = useQuery({
    queryKey: ["admin-home-layout"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_layout_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sectionOrderRow } = useQuery({
    queryKey: ["admin-section-order"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_section_order").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: specsRow } = useQuery({
    queryKey: ["admin-home-specs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_specs_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lookbookRow } = useQuery({
    queryKey: ["admin-home-lookbook"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_lookbook_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: instagramRow } = useQuery({
    queryKey: ["admin-home-instagram"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_instagram_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pressQuoteRow } = useQuery({
    queryKey: ["admin-home-press-quote"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_press_quote_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: mosaicRow } = useQuery({
    queryKey: ["admin-home-category-mosaic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("key", "home_category_mosaic_config").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const defaultSectionOrder = [
    { id: "hero", label: "Cinematic Hero Slider", icon: "🎠", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "marquee", label: "Brand Ticker Marquee", icon: "🔤", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "featured", label: "Featured Essentials (Editorial Grid)", icon: "⭐", visible: true, title: "Featured Essentials", subtitle: "Handpicked heavyweight drop-shoulder pieces", product_count: 5, columns: 4, view_all_link: "/inventory" },
    { id: "craftsmanship", label: "Craftsmanship & Specs Spotlight", icon: "🛠️", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "category-mosaic", label: "Category Mosaic Bento Grid", icon: "🔲", visible: true, title: "Shop by Category", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "lookbook", label: "Campaign Lookbook Spotlight", icon: "📖", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "press-quote", label: "Editorial Press Quote Banner", icon: "💬", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "collections", label: "Collection Showcase Strip", icon: "🔳", visible: true, title: "Curated Collections", subtitle: "Explore by style & drop edition", product_count: 0, columns: 4, view_all_link: "" },
    { id: "arrivals", label: "New Arrivals (with Category Filter Pills)", icon: "✨", visible: true, title: "New Arrivals", subtitle: "Latest limited drops & silhouettes", product_count: 8, columns: 4, view_all_link: "/inventory" },
    { id: "instagram", label: "Community Outfit Feed (#OrizinoStyle)", icon: "📸", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "cinematic-showcase", label: "Cinematic Bento Product Showcase", icon: "🎬", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
  ];

  const sectionSettingsConfig: Record<string, { hasTitle: boolean; hasSubtitle: boolean; hasProductCount: boolean; hasColumns: boolean; hasViewAllLink: boolean }> = {
    hero: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    marquee: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    featured: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: true, hasViewAllLink: true },
    craftsmanship: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    "category-mosaic": { hasTitle: true, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    lookbook: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    "press-quote": { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    collections: { hasTitle: true, hasSubtitle: true, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    arrivals: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: true, hasViewAllLink: true },
    instagram: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    "cinematic-showcase": { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
  };

  const [catSections, setCatSections] = useState<{ category_id: string; sort_order: number; product_count: number }[]>([]);
  const [sales, setSales] = useState<SaleConfig[]>([]);
  const [newArrivals, setNewArrivals] = useState({ enabled: true, title: "New Arrivals", subtitle: "Fresh drops just landed", product_count: 8 });
  const [appearanceConfig, setAppearanceConfig] = useState<AppearanceConfig>({ ...defaultAppearanceConfig });
  const [sectionOrder, setSectionOrder] = useState(defaultSectionOrder);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionSubTab, setSectionSubTab] = useState("order");
  const [activeTab, setActiveTab] = useTabParam("dashboard", "/brand/home");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [selectedMode, setSelectedMode] = useState("dark");
  const [featCatSearch, setFeatCatSearch] = useState("");
  const [featProdSearch, setFeatProdSearch] = useState("");

  // Fetch current theme/mode
  const { data: themeSettings } = useQuery({
    queryKey: ["admin-theme-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").in("key", ["site_theme", "site_mode"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (themeSettings) {
      themeSettings.forEach((s) => {
        const val = typeof s.value === "object" && s.value !== null ? (s.value as any).value ?? s.value : s.value;
        if (s.key === "site_theme") setSelectedTheme(String(val || "default"));
        if (s.key === "site_mode") setSelectedMode(String(val || "dark"));
      });
    }
  }, [themeSettings]);

  const saveTheme = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({
        data: {
          entries: [
            { key: "site_theme", value: { value: selectedTheme } },
            { key: "site_mode", value: { value: selectedMode } },
          ],
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-theme-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Theme applied successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (settingsRow?.value) {
      const val = settingsRow.value as any;
      const sections = val?.value ?? val;
      if (Array.isArray(sections)) setCatSections(sections);
    }
  }, [settingsRow]);

  useEffect(() => {
    if (salesRow?.value) {
      const val = salesRow.value as any;
      const config = val?.value ?? val;
      if (Array.isArray(config)) setSales(config);
    }
  }, [salesRow]);

  useEffect(() => {
    if (arrivalsRow?.value) {
      const val = arrivalsRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setNewArrivals((prev) => ({ ...prev, ...config }));
    }
  }, [arrivalsRow]);

  useEffect(() => {
    if (layoutRow?.value) {
      const val = layoutRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setAppearanceConfig((prev) => ({ ...prev, ...config }));
    }
  }, [layoutRow]);

  useEffect(() => {
    if (sectionOrderRow?.value) {
      const val = sectionOrderRow.value as any;
      const rawOrder = val?.value ?? val;
      if (Array.isArray(rawOrder) && rawOrder.length > 0) {
        // Map old legacy IDs to new storefront IDs if present
        const normalized = rawOrder.map((o: any) => {
          if (o.id === "slider") return { ...o, id: "hero", label: "Cinematic Hero Slider", icon: "🎠" };
          return o;
        });

        // Filter ONLY valid current storefront section IDs
        const validSaved = normalized
          .map((o: any) => {
            const def = defaultSectionOrder.find((d) => d.id === o.id);
            return def ? { ...def, ...o } : null;
          })
          .filter(Boolean) as typeof defaultSectionOrder;

        // Append any new storefront default sections that were missing
        const missingDefs = defaultSectionOrder.filter(
          (d) => !validSaved.some((v) => v.id === d.id)
        );

        const finalOrder = [...validSaved, ...missingDefs];
        setSectionOrder(finalOrder);
      }
    }
  }, [sectionOrderRow]);

  const saveCatSections = useMutation({
    mutationFn: async (sections: typeof catSections) => {
      await saveSiteSettings({ data: { entries: [{ key: "home_category_sections", value: { value: sections } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-cat-sections"] });
      qc.invalidateQueries({ queryKey: ["home-category-sections"] });
      toast.success("Category sections saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const [specsConfig, setSpecsConfig] = useState({
    is_enabled: true,
    badge_tag: "[ THE ORIZINO STANDARD ]",
    title: "Engineered Craftsmanship",
    subtitle: "Uncompromising quality and custom-milled textiles built for longevity.",
    items: [
      { tag: "380+ GSM TERRY", title: "Heavyweight Cotton", description: "Dense 100% combed French Terry cotton structured for substantial drape and shape retention." },
      { tag: "ARCHITECTURAL FIT", title: "Drop-Shoulder Cut", description: "Custom boxy silhouette with relaxed shoulder drape engineered for everyday versatility." },
      { tag: "REACTIVE DYE", title: "Deep Color Fastness", description: "Specialized garment-dye process producing rich tonal depth that maintains vibrancy wash after wash." },
      { tag: "TWIN-NEEDLE SEAMS", title: "Reinforced Construction", description: "High-density double-needle stitching along stress points to prevent stretching and distortion." },
    ],
  });

  const [lookbookConfig, setLookbookConfig] = useState({
    is_enabled: true,
    badge_tag: "[ CAMPAIGN EDITION ]",
    edition_tag: "DROP 01 / 2026",
    campaign_subtitle: "EDITORIAL SPOTLIGHT",
    campaign_title: "Architectural Heavyweight Series",
    campaign_description: "Proportionally engineered drop-shoulder silhouettes in 380GSM French Terry.",
    image_url: "/orizino-logo.svg",
    featured_look_title: "The Oversized Signature Set",
    featured_look_description: "Curated pairing of our flagship Heavyweight Drop Shoulder Tee with the Utility Cargo Pants. Styled for minimal elegance and maximal durability.",
    item_1_name: "Heavyweight Tee (380GSM)",
    item_1_price: "৳ 1,850",
    item_2_name: "Architectural Utility Cargo",
    item_2_price: "৳ 2,450",
    cta_text: "Shop The Full Look",
    cta_link: "/inventory",
  });

  const [instagramConfig, setInstagramConfig] = useState({
    is_enabled: true,
    badge_tag: "[ COMMUNITY LOOKS ]",
    title: "#OrizinoStyle",
    subtitle: "Tag @orizino_official to be featured in our curated streetwear gallery.",
    instagram_url: "https://instagram.com",
    instagram_handle: "@orizino_official",
    posts: [
      { handle: "@orizino_style", caption: "Heavyweight drop shoulder tee in Onyx Black.", tag: "#OrizinoStyle", image_url: "" },
      { handle: "@streetwear_vibes", caption: "Minimalist streetwear silhouette for the city.", tag: "#OrizinoFits", image_url: "" },
      { handle: "@urban_fits", caption: "Architectural cargo drape paired with signature hoodie.", tag: "#OrizinoCommunity", image_url: "" },
      { handle: "@orizino_daily", caption: "Crafted for longevity & heavyweight comfort.", tag: "#OrizinoCulture", image_url: "" },
    ],
  });

  const [pressQuoteConfig, setPressQuoteConfig] = useState({
    quote: "Orizino redefines architectural streetwear — custom-milled heavyweight textiles, drop-shoulder precision, and effortless presence.",
    attribution: "FASHION OBSERVER",
    publication: "2026 EDITION",
    badge_tag: "[ EDITORIAL SPOTLIGHT ]"
  });

  const [mosaicConfig, setMosaicConfig] = useState({
    is_enabled: true,
    title: "Shop the collection"
  });

  useEffect(() => {
    if (specsRow?.value) {
      const val = specsRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setSpecsConfig((prev) => ({ ...prev, ...config }));
    }
  }, [specsRow]);

  useEffect(() => {
    if (lookbookRow?.value) {
      const val = lookbookRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setLookbookConfig((prev) => ({ ...prev, ...config }));
    }
  }, [lookbookRow]);

  useEffect(() => {
    if (instagramRow?.value) {
      const val = instagramRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setInstagramConfig((prev) => ({ ...prev, ...config }));
    }
  }, [instagramRow]);

  useEffect(() => {
    if (pressQuoteRow?.value) {
      const val = pressQuoteRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setPressQuoteConfig((prev) => ({ ...prev, ...config }));
    }
  }, [pressQuoteRow]);

  useEffect(() => {
    if (mosaicRow?.value) {
      const val = mosaicRow.value as any;
      const config = val?.value ?? val;
      if (config && typeof config === "object") setMosaicConfig((prev) => ({ ...prev, ...config }));
    }
  }, [mosaicRow]);

  const saveSpecs = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_specs_config", value: { value: specsConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-specs"] });
      qc.invalidateQueries({ queryKey: ["home-specs-config"] });
      toast.success("Craftsmanship specs saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveLookbook = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_lookbook_config", value: { value: lookbookConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-lookbook"] });
      qc.invalidateQueries({ queryKey: ["home-lookbook-config"] });
      toast.success("Lookbook campaign spotlight saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveInstagram = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_instagram_config", value: { value: instagramConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-instagram"] });
      qc.invalidateQueries({ queryKey: ["home-instagram-config"] });
      toast.success("Instagram community feed saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const savePressQuote = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_press_quote_config", value: { value: pressQuoteConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-press-quote"] });
      qc.invalidateQueries({ queryKey: ["home-press-quote-config"] });
      toast.success("Press quote saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveMosaic = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_category_mosaic_config", value: { value: mosaicConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-category-mosaic"] });
      qc.invalidateQueries({ queryKey: ["home-category-mosaic-config"] });
      toast.success("Category mosaic saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveSales = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_sales_config", value: { value: sales } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sales-config"] });
      qc.invalidateQueries({ queryKey: ["home-sales-config"] });
      toast.success("Sale sections saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveNewArrivals = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_new_arrivals", value: { value: newArrivals } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-new-arrivals"] });
      qc.invalidateQueries({ queryKey: ["home-new-arrivals"] });
      toast.success("New arrivals settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveLayout = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({
        data: {
          entries: [
            { key: "home_layout_config", value: { value: appearanceConfig } },
            { key: "site_theme", value: { value: selectedTheme } },
            { key: "site_mode", value: { value: selectedMode } },
          ],
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-layout"] });
      qc.invalidateQueries({ queryKey: ["home-layout-config"] });
      qc.invalidateQueries({ queryKey: ["admin-theme-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Appearance & Brand settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveSectionOrder = useMutation({
    mutationFn: async () => {
      const featSec = sectionOrder.find((s) => s.id === "featured");
      const arrSec = sectionOrder.find((s) => s.id === "arrivals");
      const colSec = sectionOrder.find((s) => s.id === "collections");

      await saveSiteSettings({
        data: {
          entries: [
            { key: "home_section_order", value: { value: sectionOrder } },
            {
              key: "home_sections_config",
              value: {
                featured_title: featSec?.title || "Featured Essentials",
                featured_subtitle: featSec?.subtitle || "Handpicked heavyweight drop-shoulder pieces",
                new_arrivals_title: arrSec?.title || "New Arrivals",
                new_arrivals_subtitle: arrSec?.subtitle || "Latest limited drops & silhouettes",
                collections_title: colSec?.title || "Curated Collections",
                collections_subtitle: colSec?.subtitle || "Explore by style & drop edition",
              },
            },
          ],
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-order"] });
      qc.invalidateQueries({ queryKey: ["home-section-order"] });
      qc.invalidateQueries({ queryKey: ["home-sections-config"] });
      toast.success("Section layout & titles saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSectionOrderReorder = useCallback((reordered: typeof sectionOrder) => {
    setSectionOrder(reordered);
  }, []);

  const { getDragProps: getSectionOrderDragProps, dragIndex: secDragIdx, overIndex: secOverIdx } = useDragReorder(sectionOrder, handleSectionOrderReorder);

  const addSection = () => setCatSections([...catSections, { category_id: "", sort_order: catSections.length, product_count: 8 }]);
  const removeSection = (index: number) => setCatSections(catSections.filter((_, i) => i !== index));
  const updateSection = (index: number, field: string, value: any) => {
    const updated = [...catSections];
    updated[index] = { ...updated[index], [field]: value };
    setCatSections(updated);
  };

  const addSale = () => setSales([...sales, defaultSale()]);
  const removeSale = (id: string) => setSales(sales.filter((s) => s.id !== id));
  const updateSale = (id: string, field: string, value: any) => {
    setSales(sales.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleCatFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      await supabase.from("categories").update({ is_featured }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-home-categories"] }); toast.success("Updated"); },
  });

  const updateCatOrder = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      await supabase.from("categories").update({ sort_order }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-home-categories"] }),
  });

  const toggleProdFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      await supabase.from("products").update({ is_featured }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-home-products"] }); toast.success("Updated"); },
  });

  const bulkToggleCategoriesFeatured = async (featured: boolean) => {
    const filtered = localCategories.filter(cat => !featCatSearch || cat.name.toLowerCase().includes(featCatSearch.toLowerCase()));
    for (const cat of filtered) {
      await toggleCatFeatured.mutateAsync({ id: cat.id, is_featured: featured });
    }
  };

  const bulkToggleProductsFeatured = async (featured: boolean) => {
    const filtered = localProducts.filter(prod => !featProdSearch || prod.name.toLowerCase().includes(featProdSearch.toLowerCase()));
    for (const prod of filtered) {
      await toggleProdFeatured.mutateAsync({ id: prod.id, is_featured: featured });
    }
  };

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown";
  const availableCategories = categories.filter((c) => !catSections.some((s) => s.category_id === c.id));

  const getSaleColor = (sale: SaleConfig) => sale.color?.startsWith("var") ? `hsl(var(--primary))` : `hsl(${sale.color})`;

  const handleCatReorder = useCallback((reordered: typeof catSections) => {
    setCatSections(reordered.map((s, i) => ({ ...s, sort_order: i })));
  }, []);

  const handleSaleReorder = useCallback((reordered: SaleConfig[]) => {
    setSales(reordered.map((s, i) => ({ ...s, sort_order: i })));
  }, []);

  const catKey = categories.map((c) => `${c.id}:${c.sort_order}:${c.is_featured}`).join(",");
  const prodKey = products.map((p) => `${p.id}:${p.is_featured}`).join(",");

  const [localCategories, setLocalCategories] = useState(categories);
  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => { setLocalCategories(categories); }, [catKey]);
  useEffect(() => { setLocalProducts(products); }, [prodKey]);

  const handleFeatCatReorder = useCallback(async (reordered: typeof categories) => {
    setLocalCategories(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("categories").update({ sort_order: i }).eq("id", reordered[i].id);
    }
    qc.invalidateQueries({ queryKey: ["admin-home-categories"] });
  }, [qc]);

  const handleFeatProdReorder = useCallback((reordered: typeof products) => {
    setLocalProducts(reordered);
  }, []);

  const { dragIndex: catDragIdx, overIndex: catOverIdx, getDragProps: getCatDragProps } = useDragReorder(catSections, handleCatReorder);
  const { dragIndex: saleDragIdx, overIndex: saleOverIdx, getDragProps: getSaleDragProps } = useDragReorder(sales, handleSaleReorder);
  const { dragIndex: featCatDragIdx, overIndex: featCatOverIdx, getDragProps: getFeatCatDragProps } = useDragReorder(localCategories, handleFeatCatReorder);
  const { dragIndex: featProdDragIdx, overIndex: featProdOverIdx, getDragProps: getFeatProdDragProps } = useDragReorder(localProducts, handleFeatProdReorder);

  const handleHomeReject = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-home-section-order"] });
    qc.invalidateQueries({ queryKey: ["admin-sales-config"] });
    qc.invalidateQueries({ queryKey: ["admin-home-layout"] });
    qc.invalidateQueries({ queryKey: ["admin-home-lookbook"] });
    qc.invalidateQueries({ queryKey: ["admin-home-instagram"] });
    qc.invalidateQueries({ queryKey: ["admin-home-press-quote"] });
    qc.invalidateQueries({ queryKey: ["admin-home-category-mosaic"] });
    toast.warning("Changes discarded and reverted to saved state");
  }, [qc]);

  // Dynamic universal save action for the active tab in AdminHome
  const activeSaveAction = useMemo(() => {
    if (activeTab === "dashboard" || activeTab === "cinematic-showcase") return null;
    if (activeTab === "campaigns") {
      return {
        label: "Save",
        onSave: async () => {
          await saveSectionOrder.mutateAsync();
          await saveSales.mutateAsync();
        },
        isSaving: saveSectionOrder.isPending || saveSales.isPending,
        onReject: handleHomeReject,
        canReject: true,
      };
    }
    if (activeTab === "layout") {
      return {
        label: "Save",
        onSave: () => saveLayout.mutate(),
        isSaving: saveLayout.isPending,
        onReject: handleHomeReject,
        canReject: true,
      };
    }
    return {
      label: "Save",
      onSave: () => saveSectionOrder.mutate(),
      isSaving: saveSectionOrder.isPending,
      onReject: handleHomeReject,
      canReject: true,
    };
  }, [activeTab, saveSectionOrder, saveSales, saveLayout, handleHomeReject]);

  useRegisterUniversalSave(activeSaveAction, [activeSaveAction]);

  return (
    <div className="space-y-0">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="section-order">Section Order</TabsTrigger>
          <TabsTrigger value="category-displays">Category Displays</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns & Drops</TabsTrigger>
          <TabsTrigger value="editorial">Editorial & Social</TabsTrigger>
          <TabsTrigger value="layout">Appearance</TabsTrigger>
          <TabsTrigger value="cinematic-showcase">Cinematic Showcase</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5">
          {/* Command Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 p-6 bg-gradient-to-br from-background via-secondary/10 to-primary/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live Dashboard
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Home Page Control Center</h1>
                <p className="text-sm text-muted-foreground mt-1">Monitor and manage every aspect of your live storefront.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab("category-displays")}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 text-xs font-semibold text-foreground transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" /> Layout Studio
                </button>
                <button
                  onClick={() => setActiveTab("layout")}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-colors"
                >
                  <Palette className="w-3.5 h-3.5" /> Appearance
                </button>
              </div>
            </div>
          </div>

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Sections Live",
                value: sectionOrder.filter((s) => s.visible !== false).length,
                total: sectionOrder.length,
                icon: <Layout className="w-4 h-4" />,
                color: "emerald",
                tab: "category-displays",
                desc: "of homepage sections visible"
              },
              {
                label: "Active Sales",
                value: sales.filter((s) => s.enabled).length,
                total: sales.length,
                icon: <Tag className="w-4 h-4" />,
                color: "amber",
                tab: "campaigns",
                desc: "sale banners running"
              },
              {
                label: "Featured Products",
                value: localProducts.filter((p) => p.is_featured).length,
                total: localProducts.length,
                icon: <Star className="w-4 h-4" />,
                color: "violet",
                tab: "category-displays",
                desc: "products highlighted"
              },
              {
                label: "Featured Categories",
                value: localCategories.filter((c) => c.is_featured).length,
                total: localCategories.length,
                icon: <FolderOpen className="w-4 h-4" />,
                color: "sky",
                tab: "category-displays",
                desc: "categories promoted"
              },
            ].map((stat) => {
              const pct = stat.total > 0 ? Math.round((stat.value / stat.total) * 100) : 0;
              const colorMap: Record<string, string> = {
                emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                violet: "text-violet-500 bg-violet-500/10 border-violet-500/20",
                sky: "text-sky-500 bg-sky-500/10 border-sky-500/20",
              };
              const barMap: Record<string, string> = {
                emerald: "bg-emerald-500",
                amber: "bg-amber-500",
                violet: "bg-violet-500",
                sky: "bg-sky-500",
              };
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/50 bg-card/60 p-4 cursor-pointer hover:border-border hover:bg-card/80 transition-all group"
                  onClick={() => setActiveTab(stat.tab)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${colorMap[stat.color]}`}>
                      {stat.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">Edit →</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-foreground tabular-nums">{stat.value}</span>
                      <span className="text-sm text-muted-foreground">/ {stat.total}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.desc}</p>
                  </div>
                  <div className="h-1 rounded-full bg-secondary/40 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barMap[stat.color]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right tabular-nums">{pct}%</p>
                </div>
              );
            })}
          </div>

          {/* Section Status Table + Sales & Theme side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

            {/* Section Status */}
            <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setActiveTab("category-displays")}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Layout className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Homepage Section Status</p>
                  <p className="text-[11px] text-muted-foreground">All 11 storefront sections at a glance</p>
                </div>
                <span className="text-[11px] font-semibold text-primary">Manage →</span>
              </div>
              <div className="p-3 space-y-1">
                {sectionOrder.map((section, idx) => {
                  const isVisible = section.visible !== false;
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isVisible ? "hover:bg-secondary/20" : "opacity-50"}`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black tabular-nums shrink-0 ${isVisible ? "bg-primary/10 text-primary" : "bg-secondary/40 text-muted-foreground"}`}>
                        {idx + 1}
                      </div>
                      <span className="text-base leading-none shrink-0">{section.icon}</span>
                      <p className="flex-1 text-xs font-medium text-foreground truncate">{section.title || section.label}</p>
                      {section.subtitle && (
                        <p className="hidden md:block text-[11px] text-muted-foreground truncate max-w-[180px]">{section.subtitle}</p>
                      )}
                      {(section.product_count || 0) > 0 && (
                        <span className="hidden sm:inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-border/30 shrink-0">
                          {section.product_count} items
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border shrink-0 ${isVisible ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-secondary/30 text-muted-foreground border-border/30"}`}>
                        {isVisible ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Live</> : "Hidden"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right column: Sales + Theme stacked */}
            <div className="space-y-5">

              {/* Active Sales */}
              <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setActiveTab("campaigns")}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Sale Banners</p>
                    <p className="text-[11px] text-muted-foreground">
                      {sales.filter(s => s.enabled).length} active · {sales.length} total
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-500">Edit →</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {sales.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs text-muted-foreground">No sale banners configured</p>
                      <button onClick={() => setActiveTab("campaigns")} className="mt-2 text-xs text-primary font-semibold hover:underline">Add first sale →</button>
                    </div>
                  ) : sales.map((sale) => {
                    const bgColor = sale.color?.startsWith("var") ? "hsl(var(--primary))" : `hsl(${sale.color})`;
                    return (
                      <div key={sale.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${sale.enabled ? "border-amber-500/15 bg-amber-500/5" : "border-border/30 bg-secondary/10 opacity-50"}`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${bgColor}20` }}>
                          {sale.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{sale.title}</p>
                          <p className="text-[10px] text-muted-foreground">{positionOptions.find(p => p.value === sale.position)?.label || sale.position}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0 ${sale.enabled ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-secondary/30 text-muted-foreground border-border/30"}`}>
                          {sale.enabled ? "Live" : "Off"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Appearance Summary */}
              <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setActiveTab("layout")}
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Appearance & Theme</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{themeOptions.find(t => t.id === selectedTheme)?.label || selectedTheme} · {selectedMode} mode</p>
                  </div>
                  <span className="text-[11px] font-semibold text-violet-500">Edit →</span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Theme", value: themeOptions.find(t => t.id === selectedTheme)?.label || selectedTheme },
                    { label: "Mode", value: selectedMode },
                    { label: "Glass Blur", value: appearanceConfig.glass_blur_strength },
                    { label: "Accent Glow", value: appearanceConfig.card_accent_glow ? "On" : "Off" },
                    { label: "Hero Vignette", value: appearanceConfig.hero_vignette },
                    { label: "Ticker Speed", value: appearanceConfig.marquee_speed },
                  ].map((item) => (
                    <div key={item.label} className="px-3 py-2 rounded-xl bg-secondary/15 border border-border/30">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
                      <p className="text-xs font-semibold text-foreground capitalize mt-0.5 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>{/* end right column */}
          </div>

        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <HomepageAnalytics />
        </TabsContent>

        {/* Category & Section Layout — Premium Redesign */}
        <TabsContent value="category-displays" className="space-y-0">

          {/* ── HERO BANNER ─────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl mb-6 border border-border/40 bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_60%)] pointer-events-none" />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground">Storefront Layout Studio</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Drag, reorder, and configure every section of your live homepage.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {sectionOrder.filter((s: any) => s.visible !== false).length} of {sectionOrder.length} sections live
                </div>
                <Button
                  onClick={() => saveSectionOrder.mutate()}
                  disabled={saveSectionOrder.isPending}
                  className="h-9 px-5 font-bold shadow-lg shadow-primary/20"
                >
                  {saveSectionOrder.isPending ? (
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> Saving…</span>
                  ) : "Save Layout & Order"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── MAIN GRID: Section List (2/3) + Mosaic Config (1/3) ─── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* Section Order List — takes 2/3 width */}
            <div className="xl:col-span-2 space-y-2">
              {sectionOrder.map((section, idx) => {
                const settingsCfg = sectionSettingsConfig[section.id] || { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false };
                const hasSettings = settingsCfg.hasTitle || settingsCfg.hasSubtitle || settingsCfg.hasProductCount || settingsCfg.hasColumns || settingsCfg.hasViewAllLink;
                const isExpanded = expandedSection === section.id;
                const isVisible = (section as any).visible !== false;

                const updateSectionField = (field: string, value: any) => {
                  setSectionOrder(sectionOrder.map((s) => s.id === section.id ? { ...s, [field]: value } : s));
                };

                return (
                  <div
                    key={section.id}
                    className={`group rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                        : secOverIdx === idx && secDragIdx !== idx
                        ? "border-primary/60 bg-primary/8 scale-[1.01] shadow-lg"
                        : isVisible
                        ? "border-border/50 bg-card/60 hover:border-border hover:bg-card/80"
                        : "border-border/30 bg-secondary/10 opacity-60"
                    }`}
                  >
                    {/* Row */}
                    <div
                      {...getSectionOrderDragProps(idx)}
                      className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing select-none"
                    >
                      {/* Drag handle + position number */}
                      <div className="flex items-center gap-2 shrink-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black tabular-nums ${isExpanded ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"}`}>
                          {idx + 1}
                        </div>
                      </div>

                      {/* Icon + labels */}
                      <span className="text-lg leading-none shrink-0">{section.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold truncate ${isExpanded ? "text-primary" : "text-foreground"}`}>
                            {section.title || section.label}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider border ${isVisible ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-secondary/30 text-muted-foreground border-border/30"}`}>
                            {isVisible ? "Live" : "Hidden"}
                          </span>
                        </div>
                        {section.subtitle && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.subtitle}</p>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasSettings && (
                          <button
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? "bg-primary/20 text-primary" : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}
                            onClick={(e) => { e.stopPropagation(); setExpandedSection(isExpanded ? null : section.id); }}
                          >
                            <Settings2 className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                        )}
                        <Switch
                          checked={isVisible}
                          onCheckedChange={(checked) => updateSectionField("visible", checked)}
                          className="scale-90 data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Expanded settings panel */}
                    {isExpanded && hasSettings && (
                      <div className="px-4 pb-4 pt-0 border-t border-primary/10 bg-background/40 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-bold pt-3">Section Settings</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {settingsCfg.hasTitle && (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">Header Title</Label>
                              <Input value={section.title || ""} onChange={(e) => updateSectionField("title", e.target.value)} placeholder={section.label} className="h-8 text-xs bg-background/60" />
                            </div>
                          )}
                          {settingsCfg.hasSubtitle && (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">Subtitle</Label>
                              <Input value={section.subtitle || ""} onChange={(e) => updateSectionField("subtitle", e.target.value)} placeholder="Optional subtitle" className="h-8 text-xs bg-background/60" />
                            </div>
                          )}
                          {settingsCfg.hasProductCount && (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">Product Count</Label>
                              <Input type="number" min={1} max={24} value={section.product_count || 8} onChange={(e) => updateSectionField("product_count", parseInt(e.target.value) || 8)} className="h-8 text-xs bg-background/60" />
                            </div>
                          )}
                          {settingsCfg.hasViewAllLink && (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">"View All" Link</Label>
                              <Input value={section.view_all_link || ""} onChange={(e) => updateSectionField("view_all_link", e.target.value)} placeholder="/inventory" className="h-8 text-xs bg-background/60" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mosaic Config — takes 1/3 width, stretches full height */}
            <div className="xl:col-span-1">

              {/* Category Mosaic Config — fills sidebar height */}
              <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden h-full flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/10">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Category Mosaic</p>
                    <p className="text-[11px] text-muted-foreground">Visual bento grid config</p>
                  </div>
                </div>
                <div className="p-4 space-y-4 flex-1">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/15">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Enable Mosaic</p>
                      <p className="text-[11px] text-muted-foreground">Show category bento grid</p>
                    </div>
                    <Switch checked={mosaicConfig.is_enabled} onCheckedChange={(v) => setMosaicConfig({ ...mosaicConfig, is_enabled: v })} className="data-[state=checked]:bg-emerald-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Section Title</Label>
                    <Input value={mosaicConfig.title} onChange={(e) => setMosaicConfig({ ...mosaicConfig, title: e.target.value })} placeholder="Shop by Category" className="h-9 text-sm" />
                  </div>
                </div>
              </div>

            </div>{/* end mosaic col */}
          </div>{/* end top 3-col grid */}

          {/* ── BOTTOM ROW: Featured Categories + Featured Products (50/50) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">

            {/* Featured Categories */}
            <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/10">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Featured Categories</p>
                  <p className="text-[11px] text-muted-foreground">{localCategories.filter(c => c.is_featured).length} of {localCategories.length} featured</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => bulkToggleCategoriesFeatured(true)} className="px-2 h-6 rounded-md border border-border/50 text-[10px] font-semibold hover:bg-secondary/40 transition-colors">All</button>
                  <button onClick={() => bulkToggleCategoriesFeatured(false)} className="px-2 h-6 rounded-md border border-border/50 text-[10px] font-semibold hover:bg-secondary/40 transition-colors">None</button>
                </div>
              </div>
              <div className="p-3 space-y-2 flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={featCatSearch} onChange={(e) => setFeatCatSearch(e.target.value)} placeholder="Search categories…" className="pl-8 h-8 text-xs" />
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
                  {localCategories
                    .filter(cat => !featCatSearch || cat.name.toLowerCase().includes(featCatSearch.toLowerCase()))
                    .map((cat, catIdx) => (
                      <div key={cat.id} {...getFeatCatDragProps(catIdx)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                        featCatDragIdx === catIdx ? "opacity-40" : featCatOverIdx === catIdx ? "ring-1 ring-primary/50 bg-primary/5" : cat.is_featured ? "border-primary/20 bg-primary/5" : "border-border/30 bg-secondary/10 hover:bg-secondary/20"
                      }`}>
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                        <span className="w-5 h-5 rounded-md bg-secondary/60 flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0 tabular-nums">{catIdx + 1}</span>
                        <span className="flex-1 text-xs font-medium text-foreground truncate">{cat.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${cat.is_featured ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/30 text-muted-foreground border-border/30"}`}>
                          {cat.is_featured ? "On" : "Off"}
                        </span>
                        <Switch checked={cat.is_featured} onCheckedChange={(v) => toggleCatFeatured.mutate({ id: cat.id, is_featured: v })} className="scale-75 data-[state=checked]:bg-primary shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Featured Products */}
            <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/10">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Featured Products</p>
                  <p className="text-[11px] text-muted-foreground">{localProducts.filter(p => p.is_featured).length} of {localProducts.length} featured</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => bulkToggleProductsFeatured(true)} className="px-2 h-6 rounded-md border border-border/50 text-[10px] font-semibold hover:bg-secondary/40 transition-colors">All</button>
                  <button onClick={() => bulkToggleProductsFeatured(false)} className="px-2 h-6 rounded-md border border-border/50 text-[10px] font-semibold hover:bg-secondary/40 transition-colors">None</button>
                </div>
              </div>
              <div className="p-3 space-y-2 flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={featProdSearch} onChange={(e) => setFeatProdSearch(e.target.value)} placeholder="Search products…" className="pl-8 h-8 text-xs" />
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
                  {localProducts
                    .filter(prod => !featProdSearch || prod.name.toLowerCase().includes(featProdSearch.toLowerCase()))
                    .map((prod, prodIdx) => (
                      <div key={prod.id} {...getFeatProdDragProps(prodIdx)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                        featProdDragIdx === prodIdx ? "opacity-40" : featProdOverIdx === prodIdx ? "ring-1 ring-primary/50 bg-primary/5" : prod.is_featured ? "border-primary/20 bg-primary/5" : "border-border/30 bg-secondary/10 hover:bg-secondary/20"
                      }`}>
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                        <span className="w-5 h-5 rounded-md bg-secondary/60 flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0 tabular-nums">{prodIdx + 1}</span>
                        {prod.thumbnail
                          ? <img src={prod.thumbnail} alt="" className="w-7 h-7 object-cover rounded-lg border border-border/20 shrink-0" />
                          : <div className="w-7 h-7 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0"><Star className="w-3 h-3 text-muted-foreground/30" /></div>
                        }
                        <span className="flex-1 text-xs font-medium text-foreground truncate">{prod.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${prod.is_featured ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/30 text-muted-foreground border-border/30"}`}>
                          {prod.is_featured ? "On" : "Off"}
                        </span>
                        <Switch checked={prod.is_featured} onCheckedChange={(v) => toggleProdFeatured.mutate({ id: prod.id, is_featured: v })} className="scale-75 data-[state=checked]:bg-primary shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            </div>

          </div>{/* end bottom 50/50 row */}
        </TabsContent>

        {/* Campaigns & Drops */}
        <TabsContent value="campaigns" className="space-y-6">
          {/* Sales */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><Tag className="w-5 h-5 text-accent" /></div>
                  <div><CardTitle>Sale Banners</CardTitle><p className="text-sm text-muted-foreground">Add multiple customizable sale sections to the home page.</p></div>
                </div>
                <Button onClick={addSale} size="sm"><Plus className="w-4 h-4 mr-1" />Add Sale</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {sales.length === 0 && <p className="text-center text-muted-foreground py-8">No sale sections added. Click "Add Sale" to create one.</p>}
              {sales.map((sale, idx) => (
                <div key={sale.id} {...getSaleDragProps(idx)} className={`border border-border rounded-2xl p-4 space-y-4 bg-secondary/10 cursor-grab active:cursor-grabbing transition-colors ${saleOverIdx === idx && saleDragIdx !== idx ? "border-primary bg-primary/10" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      {sale.custom_icon_url ? <img src={sale.custom_icon_url} className="w-6 h-6 object-contain" alt="" /> : <span className="text-xl">{sale.icon}</span>}
                      Sale #{idx + 1}: {sale.title || "Untitled"}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Switch checked={sale.enabled} onCheckedChange={(v) => updateSale(sale.id, "enabled", v)} />
                      <Button size="icon" variant="ghost" onClick={() => removeSale(sale.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input value={sale.title} onChange={(e) => updateSale(sale.id, "title", e.target.value)} /></div>
                    <div><Label>Subtitle</Label><Input value={sale.subtitle} onChange={(e) => updateSale(sale.id, "subtitle", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><Label>Emoji Icon</Label><div className="flex flex-wrap gap-1 mt-1">{iconOptions.map((ic) => (<button key={ic} onClick={() => updateSale(sale.id, "icon", ic)} className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center border transition-all ${sale.icon === ic ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>{ic}</button>))}</div></div>
                    <div><Label>Color</Label><div className="flex flex-wrap gap-1 mt-1">{colorOptions.map((c) => (<button key={c.value} onClick={() => updateSale(sale.id, "color", c.value)} className={`w-6 h-6 rounded-full border-2 transition-all ${sale.color === c.value ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c.value.startsWith("var") ? `hsl(var(--primary))` : `hsl(${c.value})` }} title={c.label} />))}</div></div>
                    <div><Label>Sort Order</Label><Input type="number" value={sale.sort_order} onChange={(e) => updateSale(sale.id, "sort_order", Number(e.target.value))} /></div>
                    <div><Label>Position</Label><Select value={sale.position} onValueChange={(v) => updateSale(sale.id, "position", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{positionOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="flex items-center gap-1"><Image className="w-3 h-3" /> Custom Icon</Label><ImageUpload bucket="banners" folder="sale-icons" value={sale.custom_icon_url || ""} onUploaded={(url) => updateSale(sale.id, "custom_icon_url", url)} />{sale.custom_icon_url && <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => updateSale(sale.id, "custom_icon_url", "")}>Remove</Button>}</div>
                    <div><Label className="flex items-center gap-1"><Image className="w-3 h-3" /> Banner Image</Label><ImageUpload bucket="banners" folder="sale-banners" value={sale.banner_image || ""} onUploaded={(url) => updateSale(sale.id, "banner_image", url)} />{sale.banner_image && <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => updateSale(sale.id, "banner_image", "")}>Remove</Button>}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Button Text</Label><Input value={sale.button_text} onChange={(e) => updateSale(sale.id, "button_text", e.target.value)} /></div>
                    <div><Label>Button Link</Label><Input value={sale.button_link} onChange={(e) => updateSale(sale.id, "button_link", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Starts At</Label><Input type="datetime-local" value={sale.starts_at} onChange={(e) => updateSale(sale.id, "starts_at", e.target.value)} /></div>
                    <div><Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ends At</Label><Input type="datetime-local" value={sale.ends_at} onChange={(e) => updateSale(sale.id, "ends_at", e.target.value)} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2"><Switch checked={sale.show_countdown} onCheckedChange={(v) => updateSale(sale.id, "show_countdown", v)} /><Label className="text-sm">Show Countdown</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={sale.trigger_popup} onCheckedChange={(v) => updateSale(sale.id, "trigger_popup", v)} /><Label className="text-sm flex items-center gap-1"><Bell className="w-3 h-3" /> Trigger Popup</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={sale.show_products} onCheckedChange={(v) => updateSale(sale.id, "show_products", v)} /><Label className="text-sm">Show Products</Label></div>
                  </div>
                  {sale.show_products && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1"><Select value={sale.product_source} onValueChange={(v) => updateSale(sale.id, "product_source", v)}><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent><SelectItem value="featured">Featured Products</SelectItem><SelectItem value="latest">Latest Products</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="w-20"><Input type="number" value={sale.product_count} onChange={(e) => updateSale(sale.id, "product_count", Number(e.target.value))} min={1} max={12} /></div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                    <div className="rounded-2xl p-5 relative overflow-hidden" style={sale.banner_image ? { backgroundImage: `url(${sale.banner_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                      <div className="absolute inset-0 opacity-20" style={{ background: sale.color.startsWith("var") ? `hsl(var(--primary))` : `linear-gradient(135deg, hsl(${sale.color}), hsl(${sale.color} / 0.6))` }} />
                      {sale.banner_image && <div className="absolute inset-0 bg-background/60" />}
                      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {sale.custom_icon_url ? <img src={sale.custom_icon_url} className="w-10 h-10 object-contain" alt="" /> : <span className="text-2xl">{sale.icon}</span>}
                          <div>
                            <h4 className="text-lg font-bold font-display text-foreground">{sale.title || "Sale"}</h4>
                            <p className="text-sm text-muted-foreground">{sale.subtitle || "Limited time"}</p>
                            {sale.show_countdown && sale.ends_at && <p className="text-xs text-primary font-mono mt-1">⏱ Countdown will show here</p>}
                          </div>
                        </div>
                        <span className="btn-pill font-semibold px-6 py-2 text-sm text-white" style={{ background: getSaleColor(sale) }}>{sale.button_text || "Shop Now"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* New Arrivals */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
                <div><CardTitle>New Arrivals Section</CardTitle><p className="text-sm text-muted-foreground">Show the latest added products on the home page.</p></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label>Show New Arrivals</Label><Switch checked={newArrivals.enabled} onCheckedChange={(v) => setNewArrivals({ ...newArrivals, enabled: v })} /></div>
              <div><Label>Title</Label><Input value={newArrivals.title} onChange={(e) => setNewArrivals({ ...newArrivals, title: e.target.value })} /></div>
              <div><Label>Subtitle</Label><Input value={newArrivals.subtitle} onChange={(e) => setNewArrivals({ ...newArrivals, subtitle: e.target.value })} /></div>
              <div><Label>Number of Products</Label><Input type="number" value={newArrivals.product_count} onChange={(e) => setNewArrivals({ ...newArrivals, product_count: Number(e.target.value) })} min={1} max={20} /></div>
            </CardContent>
          </Card>

          {/* Campaign Lookbook Spotlight */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">📸</div>
                <div>
                  <CardTitle>Campaign Lookbook Spotlight ("Shop The Look")</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage the editorial lookbook banner, image, pricing, and CTAs.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
                <div>
                  <Label className="text-base font-semibold">Enable Section on Storefront</Label>
                  <p className="text-xs text-muted-foreground">Toggle to show or hide Campaign Lookbook Spotlight on the homepage.</p>
                </div>
                <Switch
                  checked={lookbookConfig.is_enabled !== false}
                  onCheckedChange={(checked) => setLookbookConfig({ ...lookbookConfig, is_enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Badge Tag</Label><Input value={lookbookConfig.badge_tag} onChange={(e) => setLookbookConfig({ ...lookbookConfig, badge_tag: e.target.value })} /></div>
                <div><Label>Edition Tag</Label><Input value={lookbookConfig.edition_tag} onChange={(e) => setLookbookConfig({ ...lookbookConfig, edition_tag: e.target.value })} /></div>
                <div><Label>Category Subtitle</Label><Input value={lookbookConfig.campaign_subtitle} onChange={(e) => setLookbookConfig({ ...lookbookConfig, campaign_subtitle: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Campaign Main Title</Label><Input value={lookbookConfig.campaign_title} onChange={(e) => setLookbookConfig({ ...lookbookConfig, campaign_title: e.target.value })} /></div>
                <div><Label>Campaign Description</Label><Input value={lookbookConfig.campaign_description} onChange={(e) => setLookbookConfig({ ...lookbookConfig, campaign_description: e.target.value })} /></div>
              </div>

              <div>
                <Label>Campaign Editorial Image</Label>
                <ImageUpload
                  bucket="banners"
                  folder="lookbook"
                  value={lookbookConfig.image_url || ""}
                  onUploaded={(url) => setLookbookConfig({ ...lookbookConfig, image_url: url })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div><Label>Featured Outfit Title</Label><Input value={lookbookConfig.featured_look_title} onChange={(e) => setLookbookConfig({ ...lookbookConfig, featured_look_title: e.target.value })} /></div>
                <div><Label>Featured Outfit Description</Label><Input value={lookbookConfig.featured_look_description} onChange={(e) => setLookbookConfig({ ...lookbookConfig, featured_look_description: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><Label>Item 1 Name</Label><Input value={lookbookConfig.item_1_name} onChange={(e) => setLookbookConfig({ ...lookbookConfig, item_1_name: e.target.value })} /></div>
                <div><Label>Item 1 Price</Label><Input value={lookbookConfig.item_1_price} onChange={(e) => setLookbookConfig({ ...lookbookConfig, item_1_price: e.target.value })} /></div>
                <div><Label>Item 2 Name</Label><Input value={lookbookConfig.item_2_name} onChange={(e) => setLookbookConfig({ ...lookbookConfig, item_2_name: e.target.value })} /></div>
                <div><Label>Item 2 Price</Label><Input value={lookbookConfig.item_2_price} onChange={(e) => setLookbookConfig({ ...lookbookConfig, item_2_price: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>CTA Button Text</Label><Input value={lookbookConfig.cta_text} onChange={(e) => setLookbookConfig({ ...lookbookConfig, cta_text: e.target.value })} /></div>
                <div><Label>CTA Button Link</Label><Input value={lookbookConfig.cta_link} onChange={(e) => setLookbookConfig({ ...lookbookConfig, cta_link: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Editorial & Social */}
        <TabsContent value="editorial" className="space-y-6">
          {/* Craftsmanship Specs */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">🛡️</div>
                <div>
                  <CardTitle>Craftsmanship Specs ([ THE ORIZINO STANDARD ])</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage the 4 technical specification pillars shown on the homepage.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
                <div>
                  <Label className="text-base font-semibold">Enable Section on Storefront</Label>
                  <p className="text-xs text-muted-foreground">Toggle to show or hide Craftsmanship Specs on the homepage.</p>
                </div>
                <Switch
                  checked={specsConfig.is_enabled !== false}
                  onCheckedChange={(checked) => setSpecsConfig({ ...specsConfig, is_enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Badge Tag</Label><Input value={specsConfig.badge_tag} onChange={(e) => setSpecsConfig({ ...specsConfig, badge_tag: e.target.value })} /></div>
                <div><Label>Section Title</Label><Input value={specsConfig.title} onChange={(e) => setSpecsConfig({ ...specsConfig, title: e.target.value })} /></div>
                <div><Label>Subtitle</Label><Input value={specsConfig.subtitle} onChange={(e) => setSpecsConfig({ ...specsConfig, subtitle: e.target.value })} /></div>
              </div>

              <div className="space-y-4 pt-2">
                <Label className="text-base font-semibold">Specification Items (4 Pillars)</Label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {specsConfig.items.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
                      <p className="text-xs font-mono font-bold text-primary">SPEC #0{idx + 1}</p>
                      <div><Label>Tag</Label><Input value={item.tag} onChange={(e) => {
                        const updated = [...specsConfig.items];
                        updated[idx] = { ...updated[idx], tag: e.target.value };
                        setSpecsConfig({ ...specsConfig, items: updated });
                      }} /></div>
                      <div><Label>Title</Label><Input value={item.title} onChange={(e) => {
                        const updated = [...specsConfig.items];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        setSpecsConfig({ ...specsConfig, items: updated });
                      }} /></div>
                      <div><Label>Description</Label><Input value={item.description} onChange={(e) => {
                        const updated = [...specsConfig.items];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setSpecsConfig({ ...specsConfig, items: updated });
                      }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={() => saveSpecs.mutate()} disabled={saveSpecs.isPending}>
                {saveSpecs.isPending ? "Saving..." : "Save Craftsmanship Specs"}
              </Button>
            </CardContent>
          </Card>

          {/* Press Quote */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Press Quote Banner</CardTitle>
              <p className="text-sm text-muted-foreground">Configure the editorial quote banner on the homepage.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Badge Tag</Label>
                <Input value={pressQuoteConfig.badge_tag} onChange={(e) => setPressQuoteConfig({ ...pressQuoteConfig, badge_tag: e.target.value })} />
              </div>
              <div>
                <Label>Main Quote</Label>
                <Textarea rows={3} value={pressQuoteConfig.quote} onChange={(e) => setPressQuoteConfig({ ...pressQuoteConfig, quote: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Attribution</Label>
                  <Input value={pressQuoteConfig.attribution} onChange={(e) => setPressQuoteConfig({ ...pressQuoteConfig, attribution: e.target.value })} />
                </div>
                <div>
                  <Label>Publication Info</Label>
                  <Input value={pressQuoteConfig.publication} onChange={(e) => setPressQuoteConfig({ ...pressQuoteConfig, publication: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community Feed */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">📷</div>
                <div>
                  <CardTitle>Community Feed (#OrizinoStyle)</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage Instagram outfit posts, handles, and gallery images.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
                <div>
                  <Label className="text-base font-semibold">Enable Section on Storefront</Label>
                  <p className="text-xs text-muted-foreground">Toggle to show or hide Community Feed (#OrizinoStyle) on the homepage.</p>
                </div>
                <Switch
                  checked={instagramConfig.is_enabled !== false}
                  onCheckedChange={(checked) => setInstagramConfig({ ...instagramConfig, is_enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Badge Tag</Label><Input value={instagramConfig.badge_tag} onChange={(e) => setInstagramConfig({ ...instagramConfig, badge_tag: e.target.value })} /></div>
                <div><Label>Section Title</Label><Input value={instagramConfig.title} onChange={(e) => setInstagramConfig({ ...instagramConfig, title: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2"><Label>Subtitle</Label><Input value={instagramConfig.subtitle} onChange={(e) => setInstagramConfig({ ...instagramConfig, subtitle: e.target.value })} /></div>
                <div><Label>Instagram Handle</Label><Input value={instagramConfig.instagram_handle} onChange={(e) => setInstagramConfig({ ...instagramConfig, instagram_handle: e.target.value })} /></div>
              </div>
              <div><Label>Instagram Profile URL</Label><Input value={instagramConfig.instagram_url} onChange={(e) => setInstagramConfig({ ...instagramConfig, instagram_url: e.target.value })} /></div>

              <div className="space-y-4 pt-2">
                <Label className="text-base font-semibold">Community Look Posts (4 Grid Cards)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {instagramConfig.posts.map((post, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
                      <p className="text-xs font-mono font-bold text-primary">POST #0{idx + 1}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>User Handle</Label><Input value={post.handle} onChange={(e) => {
                          const updated = [...instagramConfig.posts];
                          updated[idx] = { ...updated[idx], handle: e.target.value };
                          setInstagramConfig({ ...instagramConfig, posts: updated });
                        }} /></div>
                        <div><Label>Hashtag</Label><Input value={post.tag} onChange={(e) => {
                          const updated = [...instagramConfig.posts];
                          updated[idx] = { ...updated[idx], tag: e.target.value };
                          setInstagramConfig({ ...instagramConfig, posts: updated });
                        }} /></div>
                      </div>
                      <div><Label>Caption</Label><Input value={post.caption} onChange={(e) => {
                        const updated = [...instagramConfig.posts];
                        updated[idx] = { ...updated[idx], caption: e.target.value };
                        setInstagramConfig({ ...instagramConfig, posts: updated });
                      }} /></div>
                      <div>
                        <Label>Outfit Image</Label>
                        <ImageUpload
                          bucket="banners"
                          folder="instagram"
                          value={post.image_url || ""}
                          onUploaded={(url) => {
                            const updated = [...instagramConfig.posts];
                            updated[idx] = { ...updated[idx], image_url: url };
                            setInstagramConfig({ ...instagramConfig, posts: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance & Brand Identity */}
        <TabsContent value="layout">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-6">
              {/* Color Scheme & Theme Preset */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Theme & Accent Palette</CardTitle>
                      <p className="text-sm text-muted-foreground">Select the core color theme and display mode for your storefront.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Color Accent Presets</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {themeOptions.map((t) => {
                        const isSelected = selectedTheme === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTheme(t.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                                : "border-border/50 bg-secondary/20 hover:border-border hover:bg-secondary/40"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full border border-white/20 shrink-0 shadow-inner" style={{ background: `hsl(${t.color})` }} />
                            <span className="text-xs font-semibold text-foreground truncate">{t.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
                    <div>
                      <Label className="text-base font-semibold">Storefront Mode</Label>
                      <p className="text-xs text-muted-foreground">Choose between luxury dark mode or crisp light mode.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-background/60 p-1 rounded-lg border border-border/60">
                      <Button
                        size="sm"
                        type="button"
                        variant={selectedMode === "dark" ? "default" : "ghost"}
                        onClick={() => setSelectedMode("dark")}
                        className="h-8 px-3 text-xs"
                      >
                        <Moon className="w-3.5 h-3.5 mr-1" /> Dark
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant={selectedMode === "light" ? "default" : "ghost"}
                        onClick={() => setSelectedMode("light")}
                        className="h-8 px-3 text-xs"
                      >
                        <Sun className="w-3.5 h-3.5 mr-1" /> Light
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Announcement Bar & Marquee Ticker */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle>Marquee Ticker & Announcement Bar</CardTitle>
                      <p className="text-sm text-muted-foreground">Configure the scrolling banner marquee shown at the top of the homepage.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Marquee Scrolling Text</Label>
                    <Input
                      value={appearanceConfig.marquee_text}
                      onChange={(e) => setAppearanceConfig({ ...appearanceConfig, marquee_text: e.target.value })}
                      placeholder="e.g. FREE SHIPPING NATIONWIDE • EXCLUSIVE DROP"
                    />
                    <p className="text-[11px] text-muted-foreground">Use • to separate key promotional bullet points.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Scroll Speed</Label>
                      <Select
                        value={appearanceConfig.marquee_speed}
                        onValueChange={(v) => setAppearanceConfig({ ...appearanceConfig, marquee_speed: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slow">Slow & Elegant</SelectItem>
                          <SelectItem value="normal">Normal (Default)</SelectItem>
                          <SelectItem value="fast">Fast Dynamic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Hero Vignette Intensity</Label>
                      <Select
                        value={appearanceConfig.hero_vignette}
                        onValueChange={(v) => setAppearanceConfig({ ...appearanceConfig, hero_vignette: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cinematic">Cinematic Dark Vignette</SelectItem>
                          <SelectItem value="minimal">Minimal Gradient Overlay</SelectItem>
                          <SelectItem value="full">Full Edge-to-Edge Shadow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Glassmorphism & UI Aesthetics */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Settings2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Glassmorphism & Aesthetic Effects</CardTitle>
                      <p className="text-sm text-muted-foreground">Fine-tune glass backdrop blur strength and neon accent lighting.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Glass Backdrop Blur</Label>
                      <Select
                        value={appearanceConfig.glass_blur_strength}
                        onValueChange={(v) => setAppearanceConfig({ ...appearanceConfig, glass_blur_strength: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8px">Subtle Blur (8px)</SelectItem>
                          <SelectItem value="16px">Balanced Glass (16px)</SelectItem>
                          <SelectItem value="24px">Heavy Frosted Glass (24px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/20">
                      <div>
                        <Label className="text-sm font-semibold">Neon Accent Glow</Label>
                        <p className="text-[11px] text-muted-foreground">Ambient color glows on badges & cards.</p>
                      </div>
                      <Switch
                        checked={appearanceConfig.card_accent_glow}
                        onCheckedChange={(v) => setAppearanceConfig({ ...appearanceConfig, card_accent_glow: v })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Brand Theme Preview */}
            <div className="xl:sticky xl:top-4 self-start space-y-4">
              <Card className="glass border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Palette className="w-4 h-4 text-primary" /> Real-time Storefront Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border bg-black/90 p-4 space-y-4 text-white overflow-hidden shadow-2xl relative">
                    {/* Fake Marquee Header */}
                    <div className="bg-primary/20 border-y border-primary/30 py-1.5 px-3 text-[10px] font-mono tracking-widest text-primary flex items-center overflow-hidden whitespace-nowrap font-bold">
                      <span className="animate-pulse mr-2">●</span> {appearanceConfig.marquee_text}
                    </div>

                    {/* Fake Hero Banner */}
                    <div className="relative rounded-lg overflow-hidden h-28 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex flex-col justify-end p-3 border border-white/10">
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] font-mono uppercase bg-primary text-black px-2 py-0.5 rounded font-bold">
                          [ ORIZINO BRAND ]
                        </span>
                      </div>
                      <p className="text-xs font-bold font-display tracking-tight text-white drop-shadow-md">
                        Drop-Shoulder Architectural Fit
                      </p>
                      <p className="text-[10px] text-zinc-400">Custom 380GSM French Terry</p>
                    </div>

                    {/* Fake Product Glass Card */}
                    <div
                      className="p-3 rounded-xl border border-white/10 space-y-2 relative"
                      style={{
                        backdropFilter: `blur(${appearanceConfig.glass_blur_strength})`,
                        background: "rgba(255,255,255,0.03)",
                        boxShadow: appearanceConfig.card_accent_glow ? "0 0 15px rgba(16, 185, 129, 0.15)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Heavyweight Oversized Tee</span>
                        <span className="text-primary font-bold">৳ 1,850</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">380 GSM</span>
                        <span className="text-[9px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Drop Shoulder</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── CINEMATIC BENTO SHOWCASE CONFIG ─────────────────────────── */}
        <TabsContent value="cinematic-showcase" className="space-y-6">
          <ProductShowcaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHome;
// code:4ce0
