"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServerFn } from "@/lib/server-fn-compat";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

import { Plus, Trash2, GripVertical, Tag, Clock, Image, Bell, Layout, Layers, ChevronDown, ChevronUp, Settings2, Palette, Sun, Moon, Star, Search, FolderOpen } from "lucide-react";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useTabParam } from "@/hooks/use-tab-param";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ImageUpload from "@/components/ImageUpload";
import LayoutPreview from "@/components/admin/LayoutPreview";
import HomepageAnalytics from "@/components/admin/HomepageAnalytics";

interface LayoutConfig {
  section_spacing: string;
  container_max_width: string;
  section_animation: string;
  animation_delay: number;
  show_section_dividers: boolean;
  divider_style: string;
  featured_bg: string;
  arrivals_bg: string;
  categories_bg: string;
  featured_columns: number;
  arrivals_columns: number;
  card_style: string;
  section_title_size: string;
  section_title_align: string;
  page_bg: string;
  page_bg_pattern: string;
}

const defaultLayoutConfig: LayoutConfig = {
  section_spacing: "16",
  container_max_width: "1440px",
  section_animation: "fade-up",
  animation_delay: 0.05,
  show_section_dividers: false,
  divider_style: "line",
  featured_bg: "none",
  arrivals_bg: "none",
  categories_bg: "none",
  featured_columns: 4,
  arrivals_columns: 4,
  card_style: "default",
  section_title_size: "3xl",
  section_title_align: "left",
  page_bg: "none",
  page_bg_pattern: "none",
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

  const defaultSectionOrder = [
    { id: "slider", label: "Showcase Slider", icon: "🎠", visible: true, title: "", subtitle: "", product_count: 0, columns: 4, view_all_link: "" },
    { id: "discover", label: "Discover (Personalized)", icon: "🧭", visible: true, title: "Discover", subtitle: "Picked for the way you browse", product_count: 8, columns: 4, view_all_link: "" },
    { id: "categories", label: "Category Grid", icon: "📂", visible: true, title: "Shop by Category", subtitle: "", product_count: 6, columns: 3, view_all_link: "" },
    { id: "category-sections", label: "Category Product Sections", icon: "📦", visible: true, title: "", subtitle: "", product_count: 8, columns: 4, view_all_link: "" },
    { id: "featured", label: "Featured Products", icon: "⭐", visible: true, title: "Featured Products", subtitle: "Handpicked just for you", product_count: 8, columns: 4, view_all_link: "/inventory" },
    { id: "arrivals", label: "New Arrivals", icon: "✨", visible: true, title: "New Arrivals", subtitle: "Fresh drops just landed", product_count: 8, columns: 4, view_all_link: "/inventory" },
  ];

  const sectionSettingsConfig: Record<string, { hasTitle: boolean; hasSubtitle: boolean; hasProductCount: boolean; hasColumns: boolean; hasViewAllLink: boolean }> = {
    slider: { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false },
    discover: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: false, hasViewAllLink: false },
    categories: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: true, hasViewAllLink: false },
    "category-sections": { hasTitle: false, hasSubtitle: false, hasProductCount: true, hasColumns: true, hasViewAllLink: false },
    featured: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: true, hasViewAllLink: true },
    arrivals: { hasTitle: true, hasSubtitle: true, hasProductCount: true, hasColumns: true, hasViewAllLink: true },
  };

  const [catSections, setCatSections] = useState<{ category_id: string; sort_order: number; product_count: number }[]>([]);
  const [sales, setSales] = useState<SaleConfig[]>([]);
  const [newArrivals, setNewArrivals] = useState({ enabled: true, title: "New Arrivals", subtitle: "Fresh drops just landed", product_count: 8 });
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({ ...defaultLayoutConfig });
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
      if (config && typeof config === "object") setLayoutConfig((prev) => ({ ...prev, ...config }));
    }
  }, [layoutRow]);

  useEffect(() => {
    if (sectionOrderRow?.value) {
      const val = sectionOrderRow.value as any;
      const order = val?.value ?? val;
      if (Array.isArray(order) && order.length > 0) {
        // Merge saved order with defaults (in case new sections were added or visibility is missing)
        const merged = order.map((o: any) => {
          const defaultSection = defaultSectionOrder.find((d) => d.id === o.id);
          return defaultSection ? { ...defaultSection, ...o } : o;
        }).filter(Boolean);
        const missing = defaultSectionOrder.filter((d) => !order.some((o: any) => o.id === d.id));
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
      await saveSiteSettings({ data: { entries: [{ key: "home_layout_config", value: { value: layoutConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-layout"] });
      qc.invalidateQueries({ queryKey: ["home-layout-config"] });
      toast.success("Layout settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveSectionOrder = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "home_section_order", value: { value: sectionOrder } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-order"] });
      qc.invalidateQueries({ queryKey: ["home-section-order"] });
      toast.success("Section order saved");
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

  const [localCategories, setLocalCategories] = useState(categories);
  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => { setLocalCategories(categories); }, [categories]);
  useEffect(() => { setLocalProducts(products); }, [products]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Home Page Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="section-order">Section Reorder</TabsTrigger>
          <TabsTrigger value="cat-sections">Category Sections</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="new-arrivals">New Arrivals</TabsTrigger>
          <TabsTrigger value="specs">Craftsmanship Specs</TabsTrigger>
          <TabsTrigger value="lookbook">Campaign Lookbook</TabsTrigger>
          <TabsTrigger value="instagram">Instagram Feed</TabsTrigger>
          <TabsTrigger value="layout">Layout & Style</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Visible Sections", value: sectionOrder.filter((s) => s.visible !== false).length, total: sectionOrder.length, icon: "👁️", tab: "section-order" },
                { label: "Active Sales", value: sales.filter((s) => s.enabled).length, total: sales.length, icon: "🏷️", tab: "sales" },
                { label: "Category Sections", value: catSections.length, total: categories.length, icon: "📦", tab: "cat-sections" },
                { label: "Featured Products", value: localProducts.filter((p) => p.is_featured).length, total: localProducts.length, icon: "⭐", tab: "products" },
              ].map((stat) => (
                <Card key={stat.label} className="glass cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={() => setActiveTab(stat.tab)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{stat.icon}</span>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}<span className="text-sm font-normal text-muted-foreground">/{stat.total}</span></p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Section Status */}
            <Card className="glass">
              <CardHeader className="cursor-pointer hover:bg-primary/5 rounded-t-xl transition-all" onClick={() => setActiveTab("section-order")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Homepage Sections Status</CardTitle>
                    <p className="text-sm text-muted-foreground">Live view of all homepage sections and their current state</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Edit →</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sectionOrder.map((section, idx) => {
                    const isVisible = section.visible !== false;
                    const hasCustomTitle = !!section.title && section.title !== section.label;
                    const cols = section.columns || 4;
                    const count = section.product_count || 0;

                    return (
                      <div
                        key={section.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isVisible ? "border-border bg-secondary/20" : "border-border/40 bg-muted/20 opacity-60"}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-xl">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{section.title || section.label}</p>
                            {hasCustomTitle && (
                              <Badge variant="outline" className="text-[10px] shrink-0">Custom Title</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {section.subtitle && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{section.subtitle}</span>
                            )}
                            {count > 0 && (
                              <Badge variant="secondary" className="text-[10px]">{count} items</Badge>
                            )}
                            {section.id !== "slider" && (
                              <Badge variant="secondary" className="text-[10px]">{cols} cols</Badge>
                            )}
                            {section.view_all_link && (
                              <Badge variant="secondary" className="text-[10px]">→ {section.view_all_link}</Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={`shrink-0 ${isVisible ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`} variant="outline">
                          {isVisible ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Active Sales & Layout Summary side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Status */}
              <Card className="glass">
                <CardHeader className="cursor-pointer hover:bg-primary/5 rounded-t-xl transition-all" onClick={() => setActiveTab("sales")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg flex-1">Sales Banners</CardTitle>
                    <span className="text-xs text-primary font-medium">Edit →</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {sales.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sales configured</p>
                  ) : (
                    <div className="space-y-2">
                      {sales.map((sale) => {
                        const bgColor = sale.color?.startsWith("var") ? "hsl(var(--primary))" : `hsl(${sale.color})`;
                        const posLabel = positionOptions.find((p) => p.value === sale.position)?.label || sale.position;
                        return (
                          <div key={sale.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border ${sale.enabled ? "bg-secondary/20" : "bg-muted/20 opacity-60"}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${bgColor}20` }}>
                              {sale.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{sale.title}</p>
                              <p className="text-xs text-muted-foreground">{posLabel}</p>
                            </div>
                            <Badge className={`shrink-0 text-[10px] ${sale.enabled ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`} variant="outline">
                              {sale.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Layout Summary */}
              <Card className="glass">
                <CardHeader className="cursor-pointer hover:bg-primary/5 rounded-t-xl transition-all" onClick={() => setActiveTab("layout")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg flex-1">Layout Settings</CardTitle>
                    <span className="text-xs text-primary font-medium">Edit →</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Spacing", value: `${layoutConfig.section_spacing}px` },
                      { label: "Animation", value: layoutConfig.section_animation },
                      { label: "Card Style", value: layoutConfig.card_style },
                      { label: "Title Size", value: layoutConfig.section_title_size },
                      { label: "Title Align", value: layoutConfig.section_title_align },
                      { label: "Dividers", value: layoutConfig.show_section_dividers ? layoutConfig.divider_style : "off" },
                      { label: "Page Pattern", value: layoutConfig.page_bg_pattern },
                      { label: "Max Width", value: layoutConfig.container_max_width },
                    ].map((item) => (
                      <div key={item.label} className="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-foreground capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <HomepageAnalytics />
        </TabsContent>

        {/* Section Order with Sub-tabs */}
        <TabsContent value="section-order">
          <Tabs value={sectionSubTab} onValueChange={setSectionSubTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="order">Display Sections</TabsTrigger>
              <TabsTrigger value="feat-categories">Featured Categories</TabsTrigger>
              <TabsTrigger value="feat-products">Featured Products</TabsTrigger>
            </TabsList>

            {/* Sub-tab: Section Order */}
            <TabsContent value="order">
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Homepage Section Order</CardTitle>
                      <p className="text-sm text-muted-foreground">Drag to rearrange the order of sections on the homepage.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sectionOrder.map((section, idx) => {
                    const settingsCfg = sectionSettingsConfig[section.id] || { hasTitle: false, hasSubtitle: false, hasProductCount: false, hasColumns: false, hasViewAllLink: false };
                    const hasSettings = settingsCfg.hasTitle || settingsCfg.hasSubtitle || settingsCfg.hasProductCount || settingsCfg.hasColumns || settingsCfg.hasViewAllLink;
                    const isExpanded = expandedSection === section.id;

                    const updateSectionField = (field: string, value: any) => {
                      setSectionOrder(sectionOrder.map((s) => s.id === section.id ? { ...s, [field]: value } : s));
                    };

                    return (
                      <div key={section.id} className="rounded-xl border border-border bg-secondary/20 transition-all overflow-hidden">
                        <div
                          {...getSectionOrderDragProps(idx)}
                          className={`flex items-center gap-4 p-4 cursor-grab active:cursor-grabbing transition-all ${secOverIdx === idx && secDragIdx !== idx ? "border-primary bg-primary/10 scale-[1.01]" : ""}`}
                        >
                          <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-2xl">{section.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{section.title || section.label}</p>
                            <p className="text-xs text-muted-foreground">Position {idx + 1}{section.subtitle ? ` · ${section.subtitle}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasSettings && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); setExpandedSection(isExpanded ? null : section.id); }}
                              >
                                <Settings2 className={`w-4 h-4 transition-transform ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
                              </Button>
                            )}
                            <div className="flex flex-col items-end gap-1">
                              <Label htmlFor={`visible-${section.id}`} className="text-xs font-medium">
                                {(section as any).visible !== false ? "Visible" : "Hidden"}
                              </Label>
                              <Switch
                                id={`visible-${section.id}`}
                                checked={(section as any).visible !== false}
                                onCheckedChange={(checked) => updateSectionField("visible", checked)}
                              />
                            </div>
                          </div>
                        </div>

                        {isExpanded && hasSettings && (
                          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 bg-secondary/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {settingsCfg.hasTitle && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Section Title</Label>
                                  <Input
                                    value={section.title || ""}
                                    onChange={(e) => updateSectionField("title", e.target.value)}
                                    placeholder={section.label}
                                    className="h-9"
                                  />
                                </div>
                              )}
                              {settingsCfg.hasSubtitle && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Subtitle</Label>
                                  <Input
                                    value={section.subtitle || ""}
                                    onChange={(e) => updateSectionField("subtitle", e.target.value)}
                                    placeholder="Optional subtitle"
                                    className="h-9"
                                  />
                                </div>
                              )}
                              {settingsCfg.hasProductCount && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Product Count</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={section.product_count || 8}
                                    onChange={(e) => updateSectionField("product_count", parseInt(e.target.value) || 8)}
                                    className="h-9"
                                  />
                                </div>
                              )}
                              {settingsCfg.hasColumns && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Columns (Desktop)</Label>
                                  <Select value={String(section.columns || 4)} onValueChange={(v) => updateSectionField("columns", parseInt(v))}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="2">2 Columns</SelectItem>
                                      <SelectItem value="3">3 Columns</SelectItem>
                                      <SelectItem value="4">4 Columns</SelectItem>
                                      <SelectItem value="5">5 Columns</SelectItem>
                                      <SelectItem value="6">6 Columns</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {settingsCfg.hasViewAllLink && (
                                <div className="space-y-1.5 md:col-span-2">
                                  <Label className="text-xs">"View All" Link</Label>
                                  <Input
                                    value={section.view_all_link || ""}
                                    onChange={(e) => updateSectionField("view_all_link", e.target.value)}
                                    placeholder="/inventory"
                                    className="h-9"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button className="w-full mt-4" onClick={() => saveSectionOrder.mutate()} disabled={saveSectionOrder.isPending}>
                    {saveSectionOrder.isPending ? "Saving..." : "Save Section Order"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-tab: Featured Categories */}
            <TabsContent value="feat-categories">
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">🏷️</div>
                    <div>
                      <CardTitle>Featured Categories</CardTitle>
                      <p className="text-sm text-muted-foreground">Toggle and reorder which categories are featured on the homepage.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-2xl font-bold text-foreground">{localCategories.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <p className="text-2xl font-bold text-primary">{localCategories.filter(c => c.is_featured).length}</p>
                      <p className="text-xs text-muted-foreground">Featured</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{localCategories.filter(c => !c.is_featured).length}</p>
                      <p className="text-xs text-muted-foreground">Hidden</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => bulkToggleCategoriesFeatured(true)} className="flex-1">Feature All</Button>
                    <Button size="sm" variant="outline" onClick={() => bulkToggleCategoriesFeatured(false)} className="flex-1">Unfeature All</Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={featCatSearch} onChange={(e) => setFeatCatSearch(e.target.value)} placeholder="Search categories..." className="pl-9" />
                  </div>
                  <div className="space-y-2">
                    {localCategories
                      .filter(cat => !featCatSearch || cat.name.toLowerCase().includes(featCatSearch.toLowerCase()))
                      .map((cat, catIdx) => (
                        <div key={cat.id} {...getFeatCatDragProps(catIdx)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${featCatDragIdx === catIdx ? "opacity-50 scale-95" : featCatOverIdx === catIdx ? "ring-2 ring-primary/40 bg-primary/5" : cat.is_featured ? "border-primary/20 bg-primary/5" : "border-border/30 bg-secondary/10"}`}>
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{catIdx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                          </div>
                          <Badge variant={cat.is_featured ? "default" : "outline"} className="text-[10px] shrink-0">{cat.is_featured ? "Featured" : "Hidden"}</Badge>
                          <Switch checked={cat.is_featured} onCheckedChange={(v) => toggleCatFeatured.mutate({ id: cat.id, is_featured: v })} />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-tab: Featured Products */}
            <TabsContent value="feat-products">
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">🌟</div>
                    <div>
                      <CardTitle>Featured Products</CardTitle>
                      <p className="text-sm text-muted-foreground">Toggle and reorder which products are featured on the homepage.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-2xl font-bold text-foreground">{localProducts.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <p className="text-2xl font-bold text-primary">{localProducts.filter(p => p.is_featured).length}</p>
                      <p className="text-xs text-muted-foreground">Featured</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{localProducts.filter(p => !p.is_featured).length}</p>
                      <p className="text-xs text-muted-foreground">Not Featured</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={() => bulkToggleProductsFeatured(true)} className="flex-1">Feature All</Button>
                     <Button size="sm" variant="outline" onClick={() => bulkToggleProductsFeatured(false)} className="flex-1">Unfeature All</Button>
                   </div>
                   <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input value={featProdSearch} onChange={(e) => setFeatProdSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
                   </div>
                  <div className="space-y-2">
                    {localProducts
                      .filter(prod => !featProdSearch || prod.name.toLowerCase().includes(featProdSearch.toLowerCase()))
                      .map((prod, prodIdx) => (
                        <div key={prod.id} {...getFeatProdDragProps(prodIdx)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${featProdDragIdx === prodIdx ? "opacity-50 scale-95" : featProdOverIdx === prodIdx ? "ring-2 ring-primary/40 bg-primary/5" : prod.is_featured ? "border-primary/20 bg-primary/5" : "border-border/30 bg-secondary/10"}`}>
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{prodIdx + 1}</div>
                          {prod.thumbnail ? (
                            <img src={prod.thumbnail} alt="" className="w-8 h-8 object-cover rounded-lg border border-border/30 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0"><Star className="w-3.5 h-3.5 text-muted-foreground/30" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{prod.name}</p>
                            <p className="text-xs text-muted-foreground">${Number(prod.price).toFixed(2)}</p>
                          </div>
                          <Badge variant={prod.is_featured ? "default" : "outline"} className="text-[10px] shrink-0">{prod.is_featured ? "Featured" : "No"}</Badge>
                          <Switch checked={prod.is_featured} onCheckedChange={(v) => toggleProdFeatured.mutate({ id: prod.id, is_featured: v })} />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Category Sections */}
        <TabsContent value="cat-sections">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Home Category Product Sections</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Choose which categories display their products on the home page.</p>
                </div>
                <Button onClick={addSection} size="sm" disabled={availableCategories.length === 0}>
                  <Plus className="w-4 h-4 mr-1" />Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {catSections.length === 0 && <p className="text-center text-muted-foreground py-8">No category sections added yet.</p>}
              {catSections.map((section, index) => (
                <div key={index} {...getCatDragProps(index)} className={`rounded-xl border border-border bg-secondary/20 cursor-grab active:cursor-grabbing transition-colors p-4 ${catOverIdx === index && catDragIdx !== index ? "border-primary bg-primary/10" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1">{section.category_id ? getCatName(section.category_id) : "Select a category"}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeSection(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={section.category_id} onValueChange={(v) => updateSection(index, "category_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {section.category_id && <SelectItem value={section.category_id}>{getCatName(section.category_id)}</SelectItem>}
                          {availableCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Position</Label>
                      <Input type="number" value={section.sort_order} onChange={(e) => updateSection(index, "sort_order", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="text-xs">Products to Show</Label>
                      <Input type="number" value={section.product_count} onChange={(e) => updateSection(index, "product_count", Number(e.target.value))} min={1} max={20} />
                    </div>
                  </div>
                </div>
              ))}
              {catSections.length > 0 && (
                <Button className="w-full" onClick={() => saveCatSections.mutate(catSections)} disabled={saveCatSections.isPending}>
                  {saveCatSections.isPending ? "Saving..." : "Save Category Sections"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales */}
        <TabsContent value="sales">
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
              {sales.length > 0 && (
                <Button className="w-full" onClick={() => saveSales.mutate()} disabled={saveSales.isPending}>{saveSales.isPending ? "Saving..." : "Save All Sales"}</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Arrivals */}
        <TabsContent value="new-arrivals">
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
              <Button className="w-full" onClick={() => saveNewArrivals.mutate()} disabled={saveNewArrivals.isPending}>{saveNewArrivals.isPending ? "Saving..." : "Save New Arrivals"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Craftsmanship Specs */}
        <TabsContent value="specs">
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
        </TabsContent>

        {/* Campaign Lookbook Spotlight */}
        <TabsContent value="lookbook">
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

              <Button className="w-full" onClick={() => saveLookbook.mutate()} disabled={saveLookbook.isPending}>
                {saveLookbook.isPending ? "Saving..." : "Save Lookbook Spotlight"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Community Feed */}
        <TabsContent value="instagram">
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

              <Button className="w-full" onClick={() => saveInstagram.mutate()} disabled={saveInstagram.isPending}>
                {saveInstagram.isPending ? "Saving..." : "Save Community Feed"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout & Style */}
        <TabsContent value="layout">
          {/* Theme controls moved to Settings > Theme */}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Layout className="w-5 h-5" /> Spacing & Container</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Section Spacing (Tailwind gap): {layoutConfig.section_spacing}</Label>
                  <Select value={layoutConfig.section_spacing} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, section_spacing: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">Compact (8 / 2rem)</SelectItem>
                      <SelectItem value="12">Normal (12 / 3rem)</SelectItem>
                      <SelectItem value="16">Spacious (16 / 4rem)</SelectItem>
                      <SelectItem value="20">Wide (20 / 5rem)</SelectItem>
                      <SelectItem value="24">Extra Wide (24 / 6rem)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Container Max Width</Label>
                  <Select value={layoutConfig.container_max_width} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, container_max_width: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1200px">Narrow (1200px)</SelectItem>
                      <SelectItem value="1440px">Default (1440px)</SelectItem>
                      <SelectItem value="1600px">Wide (1600px)</SelectItem>
                      <SelectItem value="100%">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Section Dividers</Label>
                  <Switch checked={layoutConfig.show_section_dividers} onCheckedChange={(v) => setLayoutConfig({ ...layoutConfig, show_section_dividers: v })} />
                </div>
                {layoutConfig.show_section_dividers && (
                  <div>
                    <Label>Divider Style</Label>
                    <Select value={layoutConfig.divider_style} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, divider_style: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Thin Line</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="gradient">Gradient Fade</SelectItem>
                        <SelectItem value="dots">Dotted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Animations */}
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Animations</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Section Entrance Animation</Label>
                  <Select value={layoutConfig.section_animation} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, section_animation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade-up">Fade Up</SelectItem>
                      <SelectItem value="fade-in">Fade In</SelectItem>
                      <SelectItem value="scale-up">Scale Up</SelectItem>
                      <SelectItem value="slide-left">Slide from Left</SelectItem>
                      <SelectItem value="slide-right">Slide from Right</SelectItem>
                      <SelectItem value="stagger">Stagger Children</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Animation Stagger Delay: {layoutConfig.animation_delay}s</Label>
                  <Slider value={[layoutConfig.animation_delay]} onValueChange={([v]) => setLayoutConfig({ ...layoutConfig, animation_delay: v })} min={0} max={0.2} step={0.01} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            {/* Section Backgrounds */}
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Section Backgrounds</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "categories_bg" as const, label: "Categories Section" },
                  { key: "featured_bg" as const, label: "Featured Products Section" },
                  { key: "arrivals_bg" as const, label: "New Arrivals Section" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Select value={layoutConfig[key]} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, [key]: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Transparent</SelectItem>
                        <SelectItem value="subtle">Subtle Tint</SelectItem>
                        <SelectItem value="glass">Glassmorphism</SelectItem>
                        <SelectItem value="primary-tint">Primary Color Tint</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="dark">Dark Panel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div>
                  <Label>Page Background Pattern</Label>
                  <Select value={layoutConfig.page_bg_pattern} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, page_bg_pattern: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="dots">Dots</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="diagonal">Diagonal Lines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Grid & Typography */}
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg">Grid & Typography</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Featured Products Columns (desktop)</Label>
                  <Select value={String(layoutConfig.featured_columns)} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, featured_columns: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                      <SelectItem value="5">5 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>New Arrivals Columns (desktop)</Label>
                  <Select value={String(layoutConfig.arrivals_columns)} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, arrivals_columns: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                      <SelectItem value="5">5 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section Title Size</Label>
                  <Select value={layoutConfig.section_title_size} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, section_title_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2xl">Small (2xl)</SelectItem>
                      <SelectItem value="3xl">Medium (3xl)</SelectItem>
                      <SelectItem value="4xl">Large (4xl)</SelectItem>
                      <SelectItem value="5xl">Extra Large (5xl)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section Title Alignment</Label>
                  <Select value={layoutConfig.section_title_align} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, section_title_align: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product Card Style</Label>
                  <Select value={layoutConfig.card_style} onValueChange={(v) => setLayoutConfig({ ...layoutConfig, card_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="bordered">Bordered</SelectItem>
                      <SelectItem value="elevated">Elevated Shadow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

            {/* Live Preview */}
            <div className="xl:sticky xl:top-4 self-start">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <LayoutPreview config={layoutConfig} />
                </CardContent>
              </Card>
            </div>
          </div>

          <Button className="w-full mt-6" onClick={() => saveLayout.mutate()} disabled={saveLayout.isPending}>
            {saveLayout.isPending ? "Saving..." : "Save Layout Settings"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHome;
// code:4ce0
