"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit3,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  Users,
  Package,
  FolderTree,
  Ticket,
  Copy,
  Check,
  Search,
  Star,
  Gift,
  Layers,
  TrendingUp,
  LayoutGrid,
  List,
  Eye,
  ArrowRight,
  ExternalLink,
  Flame,
  Clock,
  ShieldCheck,
  ChevronRight,
  Zap,
  Sliders,
  Megaphone,
  Palette,
  ShoppingBag,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import MobileListCard from "@/components/admin/MobileListCard";
import ColorPicker from "@/components/ui/color-picker";
import { format } from "date-fns";

/* ══════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const CONDITION_TYPES = [
  { value: "manual", label: "Manual (Select Users)", desc: "Manually assign to specific users", icon: Users },
  { value: "first_time_buyer", label: "First-Time Buyer", desc: "Users who haven't placed an order yet", icon: Zap },
  { value: "order_count", label: "Order Count", desc: "Users with X+ orders", icon: Package },
  { value: "total_spent", label: "Total Spent", desc: "Users who spent ৳X+ total", icon: DollarSign },
  { value: "review_count", label: "Review Count", desc: "Users with X+ approved reviews", icon: Star },
  { value: "premium_buyer", label: "VIP Buyer", desc: "Top spenders (auto-detected)", icon: Flame },
  { value: "most_visited", label: "Most Visited", desc: "Frequent visitors (by page views)", icon: Eye },
];

const POPUP_THEMES = [
  { name: "Dark Luxury", bg: "#121214", text: "#FFFFFF" },
  { name: "Champagne Gold", bg: "#1C1917", text: "#FEF08A" },
  { name: "Royal Emerald", bg: "#064E3B", text: "#ECFDF5" },
  { name: "Midnight Navy", bg: "#0F172A", text: "#F8FAFC" },
  { name: "Crimson Velvet", bg: "#450A0A", text: "#FEF2F2" },
];

const emptyCoupon = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: null as number | null,
  usage_limit: null as number | null,
  is_active: true,
  expires_at: "",
  starts_at: "",
  first_order_only: false,
  per_user_limit: null as number | null,
  min_items: null as number | null,
  target_categories: [] as string[],
  target_products: [] as string[],
};

const emptyPromoForm = {
  title: "",
  description: "",
  coupon_code: "",
  discount_type: "percentage",
  discount_value: 10,
  max_discount_amount: null as number | null,
  condition_type: "first_time_buyer",
  condition_value: {} as any,
  popup_title: "Welcome Special Offer!",
  popup_message: "Enjoy your exclusive discount on today's order.",
  popup_image_url: "",
  popup_bg_color: "#121214",
  popup_text_color: "#FFFFFF",
  is_active: true,
  starts_at: "",
  expires_at: "",
  usage_limit: null as number | null,
  min_order_amount: 0,
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT: Promotions & Discounts Hub
   ══════════════════════════════════════════════════════════════ */

const AdminCoupons: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useTabParam("coupons", "/sales/coupons");

  // ── Coupon Dialog & Search State ──
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [couponSearch, setCouponSearch] = useState("");
  const [couponTypeFilter, setCouponTypeFilter] = useState("all");
  const [couponStatusFilter, setCouponStatusFilter] = useState("all");
  const [couponViewMode, setCouponViewMode] = useState<"grid" | "table">("grid");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ── User Promo Dialog & Search State ──
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [promoConditionFilter, setPromoConditionFilter] = useState("all");
  const [promoSearch, setPromoSearch] = useState("");

  // ── Supabase Queries ──
  const { data: coupons = [], isLoading: loadingCoupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userPromos = [], isLoading: loadingPromos } = useQuery({
    queryKey: ["admin-user-promos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_promos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, thumbnail")
        .eq("is_active", true)
        .order("name")
        .limit(200);
      return data || [];
    },
  });

  const { data: deliveryOffers = [] } = useQuery({
    queryKey: ["admin-delivery-offers-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_offers")
        .select("id, is_active");
      return data || [];
    },
  });

  // ── Telemetry Stats ──
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
  const activePromosCount = userPromos.filter((p: any) => p.is_active).length;
  const activeDeliveryOffersCount = (deliveryOffers as any[]).filter((o) => o.is_active).length;

  // ── Clipboard Copy Helper ──
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Coupon Mutations ──
  const saveCouponMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: couponForm.code.toUpperCase().trim(),
        description: couponForm.description || null,
        discount_type: couponForm.discount_type,
        discount_value: couponForm.discount_value,
        min_order_amount: couponForm.min_order_amount || 0,
        max_discount_amount: couponForm.max_discount_amount || null,
        usage_limit: couponForm.usage_limit || null,
        is_active: couponForm.is_active,
        expires_at: couponForm.expires_at || null,
        starts_at: couponForm.starts_at || null,
        first_order_only: couponForm.first_order_only,
        per_user_limit: couponForm.per_user_limit || null,
        min_items: couponForm.min_items || null,
        target_categories: couponForm.target_categories.length > 0 ? couponForm.target_categories : [],
        target_products: couponForm.target_products.length > 0 ? couponForm.target_products : [],
      };
      if (editingCoupon) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setCouponDialogOpen(false);
      toast.success(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
  });

  const toggleCouponActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    toast.success(current ? "Coupon disabled" : "Coupon activated");
  };

  const duplicateCoupon = (c: any) => {
    setEditingCoupon(null);
    setCouponForm({
      code: `${c.code}_COPY`,
      description: c.description ? `${c.description} (Copy)` : "",
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount) || 0,
      max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
      usage_limit: c.usage_limit,
      is_active: true,
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : "",
      first_order_only: c.first_order_only || false,
      per_user_limit: c.per_user_limit || null,
      min_items: c.min_items || null,
      target_categories: c.target_categories || [],
      target_products: c.target_products || [],
    });
    setCouponDialogOpen(true);
  };

  const openAddCoupon = () => {
    setEditingCoupon(null);
    setCouponForm(emptyCoupon);
    setCouponDialogOpen(true);
  };

  const openEditCoupon = (c: any) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount) || 0,
      max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
      usage_limit: c.usage_limit,
      is_active: c.is_active,
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : "",
      first_order_only: c.first_order_only || false,
      per_user_limit: c.per_user_limit || null,
      min_items: c.min_items || null,
      target_categories: c.target_categories || [],
      target_products: c.target_products || [],
    });
    setCouponDialogOpen(true);
  };

  // ── User Promo Mutations ──
  const savePromoMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: promoForm.title,
        description: promoForm.description || null,
        coupon_code: promoForm.coupon_code.toUpperCase().trim(),
        discount_type: promoForm.discount_type,
        discount_value: promoForm.discount_value,
        max_discount_amount: promoForm.max_discount_amount || null,
        condition_type: promoForm.condition_type,
        condition_value: promoForm.condition_value,
        popup_title: promoForm.popup_title || null,
        popup_message: promoForm.popup_message || null,
        popup_image_url: promoForm.popup_image_url || null,
        popup_bg_color: promoForm.popup_bg_color || "#121214",
        popup_text_color: promoForm.popup_text_color || "#FFFFFF",
        is_active: promoForm.is_active,
        starts_at: promoForm.starts_at || null,
        expires_at: promoForm.expires_at || null,
        usage_limit: promoForm.usage_limit || null,
        min_order_amount: promoForm.min_order_amount || 0,
      };

      if (editingPromoId) {
        const { error } = await supabase.from("user_promos").update(payload).eq("id", editingPromoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_promos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-promos"] });
      setPromoDialogOpen(false);
      toast.success(editingPromoId ? "User Promo updated" : "User Promo created");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_promos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-promos"] });
      toast.success("User promo deleted");
    },
  });

  const togglePromoActive = async (id: string, active: boolean) => {
    await supabase.from("user_promos").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-user-promos"] });
    toast.success(!active ? "Promo activated" : "Promo paused");
  };

  const openAddPromo = () => {
    setEditingPromoId(null);
    setPromoForm(emptyPromoForm);
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: any) => {
    setEditingPromoId(promo.id);
    setPromoForm({
      title: promo.title,
      description: promo.description || "",
      coupon_code: promo.coupon_code,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      max_discount_amount: promo.max_discount_amount ? Number(promo.max_discount_amount) : null,
      condition_type: promo.condition_type,
      condition_value: promo.condition_value || {},
      popup_title: promo.popup_title || "",
      popup_message: promo.popup_message || "",
      popup_image_url: promo.popup_image_url || "",
      popup_bg_color: promo.popup_bg_color || "#121214",
      popup_text_color: promo.popup_text_color || "#FFFFFF",
      is_active: promo.is_active,
      starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : "",
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : "",
      usage_limit: promo.usage_limit,
      min_order_amount: Number(promo.min_order_amount) || 0,
    });
    setPromoDialogOpen(true);
  };

  // ── Filtered Coupons ──
  const filteredCoupons = coupons.filter((c) => {
    const q = couponSearch.toLowerCase().trim();
    const matchQuery = !q || c.code.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
    const matchType = couponTypeFilter === "all" || c.discount_type === couponTypeFilter;
    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
    const matchStatus =
      couponStatusFilter === "all" ||
      (couponStatusFilter === "active" && c.is_active && !isExpired) ||
      (couponStatusFilter === "inactive" && !c.is_active) ||
      (couponStatusFilter === "expired" && isExpired);
    return matchQuery && matchType && matchStatus;
  });

  // ── Filtered User Promos ──
  const filteredPromos = userPromos.filter((p: any) => {
    const q = promoSearch.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.coupon_code.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);
    const matchCondition = promoConditionFilter === "all" || p.condition_type === promoConditionFilter;
    return matchQuery && matchCondition;
  });

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        icon={<Tag className="w-5 h-5 text-primary" />}
        title="Promotions & Discounts Hub"
        description="Unified e-commerce vouchers, targeted behavioral campaigns, and storefront promotion popups"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={tab === "user-promos" ? openAddPromo : openAddCoupon}
              className="gap-2 shadow-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              <span>{tab === "user-promos" ? "New Targeted Promo" : "Create Coupon Code"}</span>
            </Button>
          </div>
        }
      />

      {/* ── Telemetry KPI Ribbon ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Coupons</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{activeCouponsCount}</span>
                <span className="text-xs text-muted-foreground">/ {coupons.length} total</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Ticket className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Targeted Promos</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{activePromosCount}</span>
                <span className="text-xs text-purple-400 font-medium">Active Modals</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Redemptions</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalRedemptions}</span>
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Live
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Delivery Offers</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{activeDeliveryOffersCount}</span>
                <span className="text-xs text-muted-foreground">rules active</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Unified Tab Switcher ── */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <div className="border-b border-border/60 pb-px">
          <TabsList className="bg-secondary/40 p-1 rounded-xl h-auto gap-1">
            <TabsTrigger
              value="coupons"
              className="gap-2 px-4 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              <Ticket className="w-4 h-4" />
              <span>Discount Coupons</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-normal">
                {coupons.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="user-promos"
              className="gap-2 px-4 py-2 text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              <Users className="w-4 h-4" />
              <span>Targeted User Promos</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-normal">
                {userPromos.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: DISCOUNT COUPONS
            ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="coupons" className="space-y-4 focus-visible:outline-none">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  placeholder="Search code or description..."
                  className="pl-9 h-9 text-xs bg-background/50 border-border/70 rounded-xl"
                />
              </div>

              <Select value={couponTypeFilter} onValueChange={setCouponTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl bg-background/50 border-border/70">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={couponStatusFilter} onValueChange={setCouponStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-background/50 border-border/70">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Disabled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/60 self-end md:self-auto">
              <Button
                variant={couponViewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCouponViewMode("grid")}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={couponViewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCouponViewMode("table")}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Main Coupons Content */}
          {loadingCoupons ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading discount coupons...</div>
          ) : filteredCoupons.length === 0 ? (
            <Card className="border-dashed border-border/80">
              <CardContent className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <Ticket className="w-6 h-6" />
                </div>
                <p className="font-semibold text-foreground">No coupons found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create your first discount coupon code to incentivize customer purchases.
                </p>
                <Button onClick={openAddCoupon} size="sm" className="gap-1.5 rounded-xl mt-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Coupon</span>
                </Button>
              </CardContent>
            </Card>
          ) : couponViewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => {
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();

                return (
                  <Card
                    key={coupon.id}
                    className={`relative overflow-hidden transition-all duration-200 border-border/70 hover:border-primary/40 hover:shadow-md ${
                      !coupon.is_active || isExpired ? "opacity-75 bg-card/60" : "bg-card"
                    }`}
                  >
                    <div
                      className={`h-1 w-full ${
                        !coupon.is_active || isExpired
                          ? "bg-muted"
                          : coupon.discount_type === "percentage"
                          ? "bg-gradient-to-r from-primary to-amber-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500"
                      }`}
                    />

                    <CardContent className="p-4 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black tracking-wider text-foreground">
                              {coupon.code}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(coupon.code)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              title="Copy Code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{coupon.description}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 font-black text-sm px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% OFF`
                              : `৳${Number(coupon.discount_value).toFixed(0)} OFF`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {coupon.first_order_only && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-500 border-amber-500/30">
                            <Zap className="w-3 h-3" /> First Order
                          </Badge>
                        )}
                        {coupon.min_order_amount > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-secondary/80 font-mono">
                            Min ৳{coupon.min_order_amount}
                          </Badge>
                        )}
                        {coupon.max_discount_amount && (
                          <Badge variant="outline" className="text-[10px] bg-secondary/80 font-mono">
                            Cap ৳{coupon.max_discount_amount}
                          </Badge>
                        )}
                        {coupon.min_items && (
                          <Badge variant="outline" className="text-[10px] bg-secondary/80">
                            Min {coupon.min_items} Items
                          </Badge>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {isExpired
                              ? "Expired"
                              : coupon.expires_at
                              ? `Expires ${format(new Date(coupon.expires_at), "MMM d, yyyy")}`
                              : "No Expiry"}
                          </span>
                        </div>

                        <div className="font-mono">
                          <span>Redeemed: {coupon.used_count || 0}</span>
                          {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.is_active && !isExpired}
                            disabled={isExpired}
                            onCheckedChange={() => toggleCouponActive(coupon.id, coupon.is_active)}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {isExpired ? "Expired" : coupon.is_active ? "Live" : "Paused"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateCoupon(coupon)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCoupon(coupon)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete coupon "${coupon.code}"?`)) deleteCouponMutation.mutate(coupon.id);
                            }}
                            className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border/60 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead className="w-[180px]">Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Restrictions</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon) => {
                    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                    return (
                      <TableRow key={coupon.id} className={!coupon.is_active || isExpired ? "opacity-70" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                            <span>{coupon.code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(coupon.code)}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{coupon.description}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="font-bold text-xs text-primary">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% OFF`
                              : `৳${Number(coupon.discount_value).toFixed(0)} OFF`}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1 text-[11px]">
                            {coupon.first_order_only && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                                First Order
                              </Badge>
                            )}
                            {coupon.min_order_amount > 0 && <span>Min ৳{coupon.min_order_amount}</span>}
                            {coupon.max_discount_amount && <span>· Cap ৳{coupon.max_discount_amount}</span>}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {coupon.used_count || 0}
                          {coupon.usage_limit ? `/${coupon.usage_limit}` : ""}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {isExpired
                            ? "Expired"
                            : coupon.expires_at
                            ? format(new Date(coupon.expires_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <Switch
                            checked={coupon.is_active && !isExpired}
                            disabled={isExpired}
                            onCheckedChange={() => toggleCouponActive(coupon.id, coupon.is_active)}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCoupon(coupon)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete coupon "${coupon.code}"?`)) deleteCouponMutation.mutate(coupon.id);
                              }}
                              className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: TARGETED USER PROMOS
            ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="user-promos" className="space-y-4 focus-visible:outline-none">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  placeholder="Search promo title or coupon code..."
                  className="pl-9 h-9 text-xs bg-background/50 border-border/70 rounded-xl"
                />
              </div>

              <Select value={promoConditionFilter} onValueChange={setPromoConditionFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl bg-background/50 border-border/70">
                  <SelectValue placeholder="Audience Rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Audience Rules</SelectItem>
                  {CONDITION_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingPromos ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading targeted promos...</div>
          ) : filteredPromos.length === 0 ? (
            <Card className="border-dashed border-border/80">
              <CardContent className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="font-semibold text-foreground">No targeted user promos configured</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Deliver personalized discount popups based on customer behaviors (e.g. First-Time Buyer, Loyal Shopper).
                </p>
                <Button onClick={openAddPromo} size="sm" className="gap-1.5 rounded-xl mt-2 bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4" />
                  <span>Create Targeted Promo</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPromos.map((promo: any) => {
                const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                const cond = CONDITION_TYPES.find((c) => c.value === promo.condition_type);
                const CondIcon = cond?.icon || Users;

                return (
                  <Card
                    key={promo.id}
                    className={`relative overflow-hidden transition-all duration-200 border-border/70 hover:border-purple-500/40 hover:shadow-md ${
                      !promo.is_active || isExpired ? "opacity-75 bg-card/60" : "bg-card"
                    }`}
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500" />

                    <CardContent className="p-4 space-y-3.5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                            <CondIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground line-clamp-1">{promo.title}</p>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{cond?.label || promo.condition_type}</span>
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className="font-mono text-xs bg-secondary/80">
                          {promo.coupon_code}
                        </Badge>
                      </div>

                      {/* Reward details */}
                      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">Discount Reward</span>
                          <strong className="text-primary font-bold">
                            {promo.discount_type === "percentage"
                              ? `${promo.discount_value}% OFF`
                              : `৳${Number(promo.discount_value).toFixed(0)} OFF`}
                          </strong>
                          {promo.min_order_amount > 0 && (
                            <span className="text-[10px] text-muted-foreground ml-1.5">
                              (Min ৳{promo.min_order_amount})
                            </span>
                          )}
                        </div>

                        <div className="text-right font-mono text-[11px] text-muted-foreground">
                          <span>Used: {promo.used_count || 0}{promo.usage_limit ? `/${promo.usage_limit}` : ""}</span>
                        </div>
                      </div>

                      {/* Storefront Popup Appearance Preview miniature */}
                      {promo.popup_title && (
                        <div
                          className="rounded-xl p-3 text-xs space-y-1 shadow-xs border border-border/30"
                          style={{
                            backgroundColor: promo.popup_bg_color || "#121214",
                            color: promo.popup_text_color || "#FFFFFF",
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3 h-3 opacity-70" />
                            <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                              Storefront Modal Preview
                            </span>
                          </div>
                          <p className="font-bold text-xs line-clamp-1">{promo.popup_title}</p>
                          {promo.popup_message && (
                            <p className="text-[10px] opacity-80 line-clamp-2">{promo.popup_message}</p>
                          )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={promo.is_active}
                            onCheckedChange={() => togglePromoActive(promo.id, promo.is_active)}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {promo.is_active ? "Live" : "Paused"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPromo(promo)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete promo "${promo.title}"?`)) deletePromoMutation.mutate(promo.id);
                            }}
                            className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════
          DIALOG: ADD / EDIT COUPON
          ══════════════════════════════════════════════════════════════ */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 border-b border-border/60 bg-card">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Ticket className="w-4 h-4" />
              </div>
              <span>{editingCoupon ? "Edit Discount Coupon" : "Create New Coupon Code"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3 max-h-[calc(85vh-110px)] overflow-y-auto bg-card/50">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Coupon Code *</Label>
                <Input
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SUMMER2026"
                  className="font-mono text-xs uppercase tracking-wider font-bold h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Description</Label>
                <Input
                  value={couponForm.description}
                  onChange={(e) => setCouponForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. 15% off summer collection"
                  className="text-xs h-8 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Discount Type</Label>
                <Select
                  value={couponForm.discount_type}
                  onValueChange={(val) => setCouponForm((f) => ({ ...f, discount_type: val }))}
                >
                  <SelectTrigger className="text-xs h-8 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Discount Value ({couponForm.discount_type === "percentage" ? "%" : "৳"}) *
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={couponForm.discount_value}
                  onChange={(e) => setCouponForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                  className="font-mono text-xs font-bold h-8 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Min Order Subtotal (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={couponForm.min_order_amount}
                  onChange={(e) => setCouponForm((f) => ({ ...f, min_order_amount: Number(e.target.value) }))}
                  className="text-xs font-mono h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Max Discount Cap (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={couponForm.max_discount_amount || ""}
                  onChange={(e) =>
                    setCouponForm((f) => ({
                      ...f,
                      max_discount_amount: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="No limit"
                  className="text-xs font-mono h-8 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Usage Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={couponForm.usage_limit || ""}
                  onChange={(e) =>
                    setCouponForm((f) => ({
                      ...f,
                      usage_limit: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Unlimited"
                  className="text-xs font-mono h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Expiry Date</Label>
                <Input
                  type="datetime-local"
                  value={couponForm.expires_at}
                  onChange={(e) => setCouponForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="text-xs h-8 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/50">
              <div>
                <p className="text-xs font-semibold text-foreground">First Order Only</p>
                <p className="text-[10px] text-muted-foreground">Restrict usage to customers with zero previous orders.</p>
              </div>
              <Switch
                checked={couponForm.first_order_only}
                onCheckedChange={(c) => setCouponForm((f) => ({ ...f, first_order_only: c }))}
              />
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-border/60 bg-card flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCouponDialogOpen(false)} className="h-8 text-xs rounded-lg">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveCouponMutation.mutate()}
              disabled={saveCouponMutation.isPending || !couponForm.code.trim()}
              className="h-8 text-xs rounded-lg font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingCoupon ? "Save Changes" : "Create Coupon"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          DIALOG: ADD / EDIT TARGETED USER PROMO (COMPACT FIT)
          ══════════════════════════════════════════════════════════════ */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl">
          <DialogHeader className="p-3.5 border-b border-border/60 bg-card">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Users className="w-4 h-4" />
              </div>
              <span>{editingPromoId ? "Edit Targeted Promo" : "Create Targeted Promo Campaign"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-3.5 space-y-2.5 max-h-[calc(85vh-100px)] overflow-y-auto bg-card/50">
            {/* Row 1: Title & Code */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Campaign Title *</Label>
                <Input
                  value={promoForm.title}
                  onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. First-Time Buyer Welcome"
                  className="text-xs h-8 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Coupon Code *</Label>
                <Input
                  value={promoForm.coupon_code}
                  onChange={(e) => setPromoForm((f) => ({ ...f, coupon_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. WELCOME15"
                  className="font-mono text-xs uppercase tracking-wider font-bold h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Row 2: Target Audience Condition */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">Target Audience Condition</Label>
              <Select
                value={promoForm.condition_type}
                onValueChange={(val) => setPromoForm((f) => ({ ...f, condition_type: val }))}
              >
                <SelectTrigger className="text-xs h-8 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Discount Type & Value */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Discount Type</Label>
                <Select
                  value={promoForm.discount_type}
                  onValueChange={(val) => setPromoForm((f) => ({ ...f, discount_type: val }))}
                >
                  <SelectTrigger className="text-xs h-8 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Discount Value ({promoForm.discount_type === "percentage" ? "%" : "৳"}) *
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                  className="font-mono text-xs font-bold h-8 rounded-lg"
                />
              </div>
            </div>

            {/* Storefront Modal Appearance Card */}
            <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
              <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Storefront Modal Appearance</span>
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Modal Headline</Label>
                  <Input
                    value={promoForm.popup_title}
                    onChange={(e) => setPromoForm((f) => ({ ...f, popup_title: e.target.value }))}
                    placeholder="Welcome Special Offer!"
                    className="text-xs h-7.5 rounded-lg"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Banner Image URL</Label>
                  <Input
                    value={promoForm.popup_image_url}
                    onChange={(e) => setPromoForm((f) => ({ ...f, popup_image_url: e.target.value }))}
                    placeholder="https://..."
                    className="text-xs h-7.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Modal Subtitle / Message</Label>
                <Input
                  value={promoForm.popup_message}
                  onChange={(e) => setPromoForm((f) => ({ ...f, popup_message: e.target.value }))}
                  placeholder="Enjoy your exclusive discount on today's order."
                  className="text-xs h-7.5 rounded-lg"
                />
              </div>

              <div className="space-y-1 pt-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Theme Palette Presets</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                  {POPUP_THEMES.map((theme) => {
                    const isSelected = promoForm.popup_bg_color === theme.bg;
                    return (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() =>
                          setPromoForm((f) => ({
                            ...f,
                            popup_bg_color: theme.bg,
                            popup_text_color: theme.text,
                          }))
                        }
                        className={`text-[9.5px] px-1.5 py-1 rounded-md border flex items-center gap-1 transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/10 font-bold text-foreground"
                            : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                          style={{ background: theme.bg }}
                        />
                        <span className="truncate">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-border/60 bg-card flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPromoDialogOpen(false)}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => savePromoMutation.mutate()}
              disabled={savePromoMutation.isPending || !promoForm.title.trim() || !promoForm.coupon_code.trim()}
              className="h-8 text-xs rounded-lg font-semibold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingPromoId ? "Save Changes" : "Publish Promo"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
