"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/lib/app-toast";
import {
  Truck,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Clock,
  Building2,
  Search,
  Gift,
  Tag,
  BadgePercent,
  CheckCircle2,
  AlertCircle,
  Copy,
  LayoutGrid,
  List,
  RotateCcw,
  Percent,
  Calendar,
  X,
  Compass,
  ArrowRight,
  Zap,
  Sliders,
  ShieldCheck,
  Check,
  Coins,
  Store,
  Layers,
  ChevronRight,
  Flame,
} from "lucide-react";
import { format } from "date-fns";
import { BD_ALL_DISTRICTS } from "@orizino/shared";

type OfferSource = "self" | "courier" | "any";

const COURIER_OPTIONS = [
  { id: "steadfast", label: "Steadfast Courier", icon: Truck, color: "text-red-500" },
  { id: "pathao", label: "Pathao Express", icon: Truck, color: "text-orange-500" },
  { id: "orizino", label: "Orizino In-House Fleet", icon: Building2, color: "text-primary" },
];

const OFFER_TYPES = [
  {
    value: "free_delivery",
    label: "100% Free Delivery",
    desc: "Waives 100% of shipping fees on qualifying orders",
    icon: Gift,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  {
    value: "reduced_delivery",
    label: "Fixed Discount (৳ Off)",
    desc: "Deducts a fixed amount (e.g. ৳30 off) from delivery",
    icon: Tag,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  },
  {
    value: "flat_rate",
    label: "Flat Subsidized Rate",
    desc: "Sets a uniform rate (e.g. ৳50 flat delivery nationwide)",
    icon: BadgePercent,
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400",
  },
];

const BD_DIVISIONS: Record<string, string[]> = {
  "Dhaka Division": [
    "Dhaka", "Gazipur", "Narayanganj", "Tangail", "Faridpur", "Manikganj",
    "Munshiganj", "Narsingdi", "Gopalganj", "Kishoreganj", "Madaripur", "Rajbari", "Shariatpur",
  ],
  "Chattogram Division": [
    "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Brahmanbaria", "Chandpur",
    "Noakhali", "Lakshmipur", "Rangamati", "Bandarban", "Khagrachhari",
  ],
  "Rajshahi Division": [
    "Rajshahi", "Bogura", "Pabna", "Sirajganj", "Naogaon", "Natore", "Chapainawabganj", "Joypurhat",
  ],
  "Khulna Division": [
    "Khulna", "Jashore", "Kushtia", "Jhenaidah", "Satkhira", "Bagerhat", "Chuadanga", "Meherpur", "Magura", "Narail",
  ],
  "Sylhet Division": [
    "Sylhet", "Moulvibazar", "Habiganj", "Sunamganj",
  ],
  "Barishal Division": [
    "Barishal", "Patuakhali", "Bhola", "Pirojpur", "Barguna", "Jhalokati",
  ],
  "Rangpur Division": [
    "Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon",
  ],
  "Mymensingh Division": [
    "Mymensingh", "Jamalpur", "Netrokona", "Sherpur",
  ],
};

interface OfferForm {
  title: string;
  description: string;
  offer_type: string;
  discount_value: number;
  min_order_amount: number;
  target_areas: string[];
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  source: OfferSource;
  applicable_couriers: string[];
}

const emptyForm: OfferForm = {
  title: "",
  description: "",
  offer_type: "free_delivery",
  discount_value: 0,
  min_order_amount: 2500,
  target_areas: [],
  is_active: true,
  starts_at: "",
  expires_at: "",
  source: "any",
  applicable_couriers: [],
};

const AdminDeliveryOffers = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courierFilter, setCourierFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // District input buffer for manual tags & search
  const [districtSearch, setDistrictSearch] = useState("");

  // ── Universal Free Shipping Settings from site_settings ──
  const [universalFreeEnabled, setUniversalFreeEnabled] = useState(true);
  const [universalThreshold, setUniversalThreshold] = useState("2500");
  const [simulatedCart, setSimulatedCart] = useState<number>(1800);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["free_shipping_threshold", "free_shipping_enabled"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
  });

  useEffect(() => {
    if (siteSettings) {
      if (siteSettings.free_shipping_enabled !== undefined) {
        setUniversalFreeEnabled(siteSettings.free_shipping_enabled !== false);
      }
      if (siteSettings.free_shipping_threshold !== undefined) {
        setUniversalThreshold(String(siteSettings.free_shipping_threshold));
      }
    }
  }, [siteSettings]);

  const saveUniversalMutation = useMutation({
    mutationFn: async ({ enabled, threshold }: { enabled: boolean; threshold: string }) => {
      const items = [
        { key: "free_shipping_enabled", value: enabled },
        { key: "free_shipping_threshold", value: Number(threshold) || 2500 },
      ];
      for (const item of items) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: item.key, value: item.value as any }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings-delivery-offers"] });
      qc.invalidateQueries({ queryKey: ["admin-shipping-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Universal free delivery threshold updated sitewide!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update threshold"),
  });

  const { data: offers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-delivery-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        offer_type: form.offer_type,
        discount_value: Number(form.discount_value) || 0,
        min_order_amount: Number(form.min_order_amount) || 0,
        target_areas: form.target_areas,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        source: form.source,
        applicable_couriers: form.applicable_couriers,
      };

      if (editId) {
        const { error } = await supabase.from("delivery_offers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delivery_offers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] });
      toast.success(editId ? "Delivery campaign updated" : "Delivery campaign created successfully");
      setShowDialog(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save offer"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] });
      toast.success("Delivery campaign removed");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete offer"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("delivery_offers")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] });
      toast.success(variables.active ? "Campaign activated" : "Campaign paused");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (offer: any) => {
    setEditId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description || "",
      offer_type: offer.offer_type || "free_delivery",
      discount_value: Number(offer.discount_value) || 0,
      min_order_amount: Number(offer.min_order_amount) || 0,
      target_areas: Array.isArray(offer.target_areas)
        ? offer.target_areas
        : offer.target_areas
        ? String(offer.target_areas).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      is_active: offer.is_active ?? true,
      starts_at: offer.starts_at ? offer.starts_at.slice(0, 16) : "",
      expires_at: offer.expires_at ? offer.expires_at.slice(0, 16) : "",
      source: (offer.source as OfferSource) || "any",
      applicable_couriers: offer.applicable_couriers || [],
    });
    setShowDialog(true);
  };

  const handleDuplicate = (offer: any) => {
    setEditId(null);
    setForm({
      title: `${offer.title} (Copy)`,
      description: offer.description || "",
      offer_type: offer.offer_type || "free_delivery",
      discount_value: Number(offer.discount_value) || 0,
      min_order_amount: Number(offer.min_order_amount) || 0,
      target_areas: Array.isArray(offer.target_areas) ? [...offer.target_areas] : [],
      is_active: false,
      starts_at: "",
      expires_at: "",
      source: (offer.source as OfferSource) || "any",
      applicable_couriers: [...(offer.applicable_couriers || [])],
    });
    setShowDialog(true);
  };

  const toggleCourierSelection = (courierId: string) => {
    setForm((prev) => {
      const exists = prev.applicable_couriers.includes(courierId);
      const next = exists
        ? prev.applicable_couriers.filter((c) => c !== courierId)
        : [...prev.applicable_couriers, courierId];
      return { ...prev, applicable_couriers: next };
    });
  };

  const addDistrictArea = (dist: string) => {
    if (!dist) return;
    setForm((prev) => {
      if (prev.target_areas.includes(dist)) return prev;
      return { ...prev, target_areas: [...prev.target_areas, dist] };
    });
  };

  const removeDistrictArea = (dist: string) => {
    setForm((prev) => ({
      ...prev,
      target_areas: prev.target_areas.filter((a) => a !== dist),
    }));
  };

  const addDivisionDistricts = (divisionName: string) => {
    const districts = BD_DIVISIONS[divisionName] || [];
    setForm((prev) => {
      const merged = Array.from(new Set([...prev.target_areas, ...districts]));
      return { ...prev, target_areas: merged };
    });
  };

  // Filtered dataset
  const filteredOffers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const now = new Date();

    return offers.filter((offer: any) => {
      if (query) {
        const matchTitle = (offer.title || "").toLowerCase().includes(query);
        const matchDesc = (offer.description || "").toLowerCase().includes(query);
        const areas = Array.isArray(offer.target_areas)
          ? offer.target_areas.join(" ").toLowerCase()
          : "";
        if (!matchTitle && !matchDesc && !areas.includes(query)) return false;
      }

      if (typeFilter !== "all" && offer.offer_type !== typeFilter) {
        return false;
      }

      const isExpired = offer.expires_at && new Date(offer.expires_at) < now;
      const isScheduled = offer.starts_at && new Date(offer.starts_at) > now;
      const isActiveNow = offer.is_active && !isExpired && !isScheduled;

      if (statusFilter === "active" && !isActiveNow) return false;
      if (statusFilter === "scheduled" && !isScheduled) return false;
      if (statusFilter === "expired" && !isExpired) return false;
      if (statusFilter === "inactive" && offer.is_active) return false;

      if (courierFilter !== "all") {
        if (offer.source === "self" && courierFilter !== "orizino") return false;
        if (
          offer.applicable_couriers &&
          offer.applicable_couriers.length > 0 &&
          !offer.applicable_couriers.includes(courierFilter)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [offers, searchQuery, typeFilter, statusFilter, courierFilter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const active = offers.filter(
      (o: any) =>
        o.is_active &&
        (!o.expires_at || new Date(o.expires_at) >= now) &&
        (!o.starts_at || new Date(o.starts_at) <= now)
    ).length;

    const freeCount = offers.filter((o: any) => o.offer_type === "free_delivery").length;
    const flatOrReduced = offers.filter(
      (o: any) => o.offer_type === "flat_rate" || o.offer_type === "reduced_delivery"
    ).length;

    return {
      total: offers.length,
      active,
      freeCount,
      flatOrReduced,
    };
  }, [offers]);

  // Quick reset for filters
  const hasActiveFilters = searchQuery !== "" || typeFilter !== "all" || statusFilter !== "all" || courierFilter !== "all";
  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCourierFilter("all");
  };

  const thresholdNum = Number(universalThreshold) || 2500;
  const progressPercent = Math.min(100, Math.round((simulatedCart / thresholdNum) * 100));
  const amountNeeded = Math.max(0, thresholdNum - simulatedCart);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              <Zap className="w-3 h-3 text-primary" /> Delivery Promotion Engine
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
              64 Districts Ready
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Delivery Offers &amp; Free Shipping
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage sitewide free delivery thresholds, promotional discount campaigns, and regional shipping subsidies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted/50"
            title="Refresh offers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={openCreate}
            size="sm"
            className="h-9 rounded-xl px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Delivery Offer
          </Button>
        </div>
      </div>

      {/* ── UNIFIED TABS BAR ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-2">
          <TabsList className="bg-muted/40 p-1 rounded-xl h-10 border border-border/40">
            <TabsTrigger
              value="campaigns"
              className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-primary" />
              Promotional Offers
              <Badge variant="secondary" className="ml-1 text-[10px] font-mono px-1.5 py-0">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="universal"
              className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-500" />
              Universal Free Shipping
              {universalFreeEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              COD &amp; Financial Rules
            </TabsTrigger>
          </TabsList>

          {/* Quick summary stats in tab header */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <strong className="text-foreground">{stats.active}</strong> Active Now
            </span>
            <span className="text-border">•</span>
            <span>
              Universal Threshold: <strong className="text-foreground font-mono">৳{universalThreshold}</strong>
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: PROMOTIONAL OFFERS (Campaigns Grid / Table)
           ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="campaigns" className="space-y-6 mt-0">
          {/* KPI Telemetry Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-border/60 bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Campaigns
                  </p>
                  <p className="text-2xl font-black text-foreground">{stats.total}</p>
                  <p className="text-[10px] text-muted-foreground">Configured promos</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Truck className="w-4.5 h-4.5 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-emerald-500/[0.03] shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Active Live
                  </p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.active}
                  </p>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live at checkout
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    100% Free Shipping
                  </p>
                  <p className="text-2xl font-black text-foreground">{stats.freeCount}</p>
                  <p className="text-[10px] text-muted-foreground">Full subsidy rules</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Gift className="w-4.5 h-4.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Flat &amp; Subsidized
                  </p>
                  <p className="text-2xl font-black text-foreground">{stats.flatOrReduced}</p>
                  <p className="text-[10px] text-muted-foreground">Promotional rates</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <BadgePercent className="w-4.5 h-4.5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-3 sm:p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by offer title, district, or keyword..."
                  className="pl-9 pr-8 h-9.5 rounded-xl text-xs bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9.5 rounded-xl text-xs font-semibold min-w-[130px] bg-background/80">
                    <SelectValue placeholder="All Promo Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">All Promo Models</SelectItem>
                    <SelectItem value="free_delivery">100% Free Shipping</SelectItem>
                    <SelectItem value="reduced_delivery">Discount (৳ Off)</SelectItem>
                    <SelectItem value="flat_rate">Flat Subsidized Rate</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9.5 rounded-xl text-xs font-semibold min-w-[115px] bg-background/80">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Now</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="inactive">Paused</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={courierFilter} onValueChange={setCourierFilter}>
                  <SelectTrigger className="h-9.5 rounded-xl text-xs font-semibold min-w-[125px] bg-background/80">
                    <SelectValue placeholder="All Couriers" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">All Carriers</SelectItem>
                    <SelectItem value="steadfast">Steadfast</SelectItem>
                    <SelectItem value="pathao">Pathao</SelectItem>
                    <SelectItem value="orizino">In-House Fleet</SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset button */}
                {hasActiveFilters && (
                  <Button
                    onClick={resetFilters}
                    variant="ghost"
                    size="sm"
                    className="h-9.5 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}

                {/* Grid / Table Toggle */}
                <div className="flex items-center rounded-xl border border-border/60 p-0.5 bg-background/80 ml-auto">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Card Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      viewMode === "table"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign List View */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-52 animate-pulse bg-card/40 border-border/40 rounded-2xl" />
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card/40 py-16 text-center rounded-2xl">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">No Delivery Offers Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {hasActiveFilters
                      ? "No promotional campaigns match your active search and filter criteria."
                      : "Create a promotional shipping rate or free delivery campaign to boost conversions."}
                  </p>
                </div>
                <div className="pt-2">
                  {hasActiveFilters ? (
                    <Button onClick={resetFilters} variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                      Clear Search Filters
                    </Button>
                  ) : (
                    <Button onClick={openCreate} size="sm" className="rounded-xl text-xs font-bold gap-2">
                      <Plus className="w-4 h-4" /> Create First Offer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((offer: any) => {
                const now = new Date();
                const isExpired = offer.expires_at && new Date(offer.expires_at) < now;
                const isScheduled = offer.starts_at && new Date(offer.starts_at) > now;
                const isActive = offer.is_active && !isExpired && !isScheduled;

                const typeConfig = OFFER_TYPES.find((t) => t.value === offer.offer_type) || OFFER_TYPES[0];
                const TypeIcon = typeConfig.icon;
                const areas: string[] = Array.isArray(offer.target_areas)
                  ? offer.target_areas
                  : offer.target_areas
                  ? String(offer.target_areas).split(",").map((s) => s.trim()).filter(Boolean)
                  : [];
                const couriers: string[] = offer.applicable_couriers || [];

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full overflow-hidden ${
                        !offer.is_active || isExpired
                          ? "opacity-60 bg-card/40 border-border/50"
                          : "bg-card/90 border-border/80 hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/15 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold py-0.5 px-2 gap-1 rounded-md border ${typeConfig.badgeColor}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </Badge>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                              </span>
                            ) : isScheduled ? (
                              <span className="text-[10px] font-bold text-blue-500">Scheduled</span>
                            ) : isExpired ? (
                              <span className="text-[10px] font-bold text-destructive">Expired</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-muted-foreground">Paused</span>
                            )}
                            <Switch
                              checked={offer.is_active}
                              onCheckedChange={(active) => toggleActive.mutate({ id: offer.id, active })}
                              className="data-[state=checked]:bg-emerald-600 scale-85"
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-foreground leading-snug">
                            {offer.title}
                          </h3>
                          {offer.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {offer.description}
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                        <div className="space-y-2.5">
                          {/* Metrics Box */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Promo Benefit
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {offer.offer_type === "free_delivery"
                                  ? "100% FREE Delivery"
                                  : offer.offer_type === "flat_rate"
                                  ? `৳${offer.discount_value} Flat Rate`
                                  : `৳${offer.discount_value} Discount`}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Min Cart Subtotal
                              </span>
                              <span className="text-xs font-bold text-foreground font-mono">
                                {Number(offer.min_order_amount) > 0
                                  ? `৳${offer.min_order_amount}`
                                  : "No Minimum"}
                              </span>
                            </div>
                          </div>

                          {/* Geographic Target */}
                          <div className="flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              {areas.length === 0 ? (
                                <span className="font-medium text-foreground text-[11px]">Nationwide (All 64 Districts)</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {areas.slice(0, 3).map((a) => (
                                    <Badge key={a} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                      {a}
                                    </Badge>
                                  ))}
                                  {areas.length > 3 && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                      +{areas.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Carriers & Channels */}
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">
                              {couriers.length === 0
                                ? "All Carriers (Steadfast, Pathao, Fleet)"
                                : couriers.map((c) => (c === "self" ? "Orizino" : c)).join(", ")}
                            </span>
                          </div>

                          {/* Schedule */}
                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/40 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>
                                {offer.expires_at
                                  ? `Until ${format(new Date(offer.expires_at), "MMM d, yyyy")}`
                                  : "Ongoing / Permanent"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-border/40">
                          <Button
                            type="button"
                            onClick={() => handleDuplicate(offer)}
                            variant="ghost"
                            size="sm"
                            className="h-7.5 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                            title="Duplicate Offer"
                          >
                            <Copy className="w-3 h-3" /> Duplicate
                          </Button>
                          <Button
                            type="button"
                            onClick={() => openEdit(offer)}
                            variant="outline"
                            size="sm"
                            className="h-7.5 px-2.5 text-xs font-semibold gap-1 rounded-lg border-border/60"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete delivery offer "${offer.title}"?`)) {
                                deleteMutation.mutate(offer.id);
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7.5 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <Card className="rounded-2xl border border-border/70 overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs">
                    <TableHead className="font-bold">Campaign Name</TableHead>
                    <TableHead className="font-bold">Promo Model</TableHead>
                    <TableHead className="font-bold">Discount / Benefit</TableHead>
                    <TableHead className="font-bold">Min Spend</TableHead>
                    <TableHead className="font-bold">Regions</TableHead>
                    <TableHead className="font-bold">Carriers</TableHead>
                    <TableHead className="font-bold">Schedule</TableHead>
                    <TableHead className="font-bold text-center">Active</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer: any) => {
                    const typeConfig = OFFER_TYPES.find((t) => t.value === offer.offer_type) || OFFER_TYPES[0];
                    const areas: string[] = Array.isArray(offer.target_areas)
                      ? offer.target_areas
                      : offer.target_areas
                      ? String(offer.target_areas).split(",").map((s) => s.trim()).filter(Boolean)
                      : [];

                    return (
                      <TableRow key={offer.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="font-bold text-foreground">
                          <div>
                            <p>{offer.title}</p>
                            {offer.description && (
                              <p className="text-[10px] text-muted-foreground font-normal truncate max-w-[200px]">
                                {offer.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${typeConfig.badgeColor}`}>
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">
                          {offer.offer_type === "free_delivery"
                            ? "100% Free"
                            : offer.offer_type === "flat_rate"
                            ? `৳${offer.discount_value} Flat`
                            : `-৳${offer.discount_value}`}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {Number(offer.min_order_amount) > 0 ? `৳${offer.min_order_amount}` : "No Min"}
                        </TableCell>
                        <TableCell>
                          {areas.length === 0 ? (
                            <span className="text-muted-foreground font-medium">Nationwide</span>
                          ) : (
                            <span className="truncate max-w-[120px] block font-medium">
                              {areas.join(", ")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {offer.applicable_couriers?.length > 0
                            ? offer.applicable_couriers.join(", ")
                            : "All"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {offer.expires_at ? format(new Date(offer.expires_at), "MMM d, yyyy") : "Ongoing"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={offer.is_active}
                            onCheckedChange={(active) => toggleActive.mutate({ id: offer.id, active })}
                            className="data-[state=checked]:bg-emerald-600 scale-85"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => handleDuplicate(offer)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => openEdit(offer)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg text-foreground"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (confirm(`Delete offer "${offer.title}"?`)) deleteMutation.mutate(offer.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                              title="Delete"
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
            TAB 2: UNIVERSAL FREE SHIPPING RULES
           ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="universal" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Card */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-emerald-500/25 bg-card/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b border-emerald-500/15 bg-emerald-500/[0.04]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Sitewide Free Shipping Threshold
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Automated rule across all 64 districts &amp; courier integrations
                        </CardDescription>
                      </div>
                    </div>

                    <Switch
                      checked={universalFreeEnabled}
                      onCheckedChange={(checked) => {
                        setUniversalFreeEnabled(checked);
                        saveUniversalMutation.mutate({ enabled: checked, threshold: universalThreshold });
                      }}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-foreground">
                      Free Shipping Cart Subtotal Threshold (৳)
                    </Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ৳
                      </span>
                      <Input
                        type="number"
                        value={universalThreshold}
                        onChange={(e) => setUniversalThreshold(e.target.value)}
                        onBlur={() => saveUniversalMutation.mutate({ enabled: universalFreeEnabled, threshold: universalThreshold })}
                        className="h-10 pl-8 rounded-xl text-xs font-bold font-mono bg-background"
                        placeholder="2500"
                      />
                    </div>
                  </div>

                  {/* Preset quick chips */}
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                      Common Threshold Presets:
                    </Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[1500, 2000, 2500, 3000, 3500, 5000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setUniversalThreshold(String(preset));
                            saveUniversalMutation.mutate({ enabled: universalFreeEnabled, threshold: String(preset) });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                            universalThreshold === String(preset)
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-secondary/60 border-border/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          ৳{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 text-muted-foreground text-[11px] leading-relaxed">
                    <strong className="text-foreground">How it works:</strong> When any customer adds items totaling <strong>৳{universalThreshold}</strong> or more to their cart, the delivery fee at checkout is automatically discounted to <strong>৳0.00</strong> across all 64 districts.
                  </div>

                  <Button
                    onClick={() => saveUniversalMutation.mutate({ enabled: universalFreeEnabled, threshold: universalThreshold })}
                    disabled={saveUniversalMutation.isPending}
                    className="w-full h-9.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saveUniversalMutation.isPending ? "Saving changes..." : "Save Sitewide Rule"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Live Interactive Storefront Banner Preview */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-border/60 bg-card/90 shadow-sm rounded-2xl">
                <CardHeader className="p-5 border-b border-border/40 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" /> Storefront Checkout Progress Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulate customer cart totals to inspect dynamic progress bars &amp; encouragement banners.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-5 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Simulate Customer Cart Total:</span>
                      <span className="font-mono text-primary font-black text-sm">৳{simulatedCart}</span>
                    </div>
                    <Slider
                      value={[simulatedCart]}
                      onValueChange={(val) => setSimulatedCart(val[0])}
                      min={0}
                      max={Math.max(5000, thresholdNum * 1.5)}
                      step={50}
                      className="py-1"
                    />
                  </div>

                  {/* Customer Banner Preview Box */}
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {progressPercent >= 100 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">🎉 Congratulations! You unlocked FREE DELIVERY</span>
                        ) : (
                          <span>
                            Add <strong className="text-emerald-600 dark:text-emerald-400 font-mono">৳{amountNeeded}</strong> more to unlock FREE DELIVERY!
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-xs text-muted-foreground">{progressPercent}%</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progressPercent >= 100 ? "bg-emerald-500" : "bg-emerald-500/80"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {progressPercent >= 100
                        ? "Delivery fee of ৳60–৳150 will be completely waived at checkout."
                        : `Current cart is ৳${simulatedCart}. Minimum requirement is ৳${universalThreshold}.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                    <div className="p-3 rounded-xl border border-border/40 bg-secondary/30">
                      <span className="text-muted-foreground block">Inside Dhaka:</span>
                      <strong className="text-foreground">৳60 → ৳0 (100% Free)</strong>
                    </div>
                    <div className="p-3 rounded-xl border border-border/40 bg-secondary/30">
                      <span className="text-muted-foreground block">Outside Dhaka (63 Districts):</span>
                      <strong className="text-foreground">৳120–৳150 → ৳0 (100% Free)</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: FINANCIAL SETTLEMENT & COD RULES
           ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="financial" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 bg-card/90 shadow-sm rounded-2xl">
              <CardHeader className="p-5 border-b border-border/40 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Delivery Discount vs COD Collection Fee
                </CardTitle>
                <CardDescription className="text-xs">
                  Separation of pure shipping charges and third-party cash collection fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs text-muted-foreground leading-relaxed">
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.03] space-y-1.5">
                  <p className="font-bold text-foreground">Rule 1: Pure Delivery Fee Waiver</p>
                  <p>
                    Delivery offers strictly discount or waive the merchant delivery fee (e.g. ৳60 Dhaka, ৳120 OSD). The customer pays ৳0 for transportation.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] space-y-1.5">
                  <p className="font-bold text-amber-600 dark:text-amber-400">Rule 2: Independent 1% COD Fee</p>
                  <p>
                    Cash on Delivery (COD) collection commission charged by courier partners (e.g. Steadfast/Pathao 1%) remains independent and is accounted for in order settlements.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-1.5">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Rule 3: Product GMV Revenue Integrity</p>
                  <p>
                    Promotions on delivery do not deduct from your core product sales revenue or order invoice items.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 shadow-sm rounded-2xl">
              <CardHeader className="p-5 border-b border-border/40 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Carrier Settlement Workflow
                </CardTitle>
                <CardDescription className="text-xs">
                  How courier accounts and payment disbursements are matched with promotional orders.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      <strong className="text-foreground">Customer Checkout:</strong> When a campaign matches the buyer&#39;s cart, the delivery fee line item is reduced or set to ৳0.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      <strong className="text-foreground">Consignment Booking:</strong> The consignment is dispatched via Steadfast or Pathao API with standard base tariffs.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      <strong className="text-foreground">Merchant Settlement:</strong> The carrier deducts standard courier shipping fee from COD collection, accurately accounted for in Order Management.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Want to adjust courier base rates?</span>
                  <a href="/sales/shipping">
                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold gap-1">
                      Shipping Rates <ArrowRight className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════
          CREATE / EDIT CAMPAIGN MODAL (Streamlined & Clean)
         ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditId(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/15 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                <Truck className="w-3 h-3 text-primary" /> Delivery Campaign Configurator
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editId ? "Edit Delivery Campaign" : "Create Delivery Campaign"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set promotion model, cart requirements, geographic coverage, and supported couriers.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 text-xs">
            {/* 1. Campaign Details */}
            <div className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold">Campaign Name *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Free Delivery Weekend, Eid Special Shipping ৳50 Flat"
                  className="h-10 rounded-xl text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Customer Encouragement / Checkout Banner Text</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Automatic 100% free delivery unlocked on cart total ৳2500+ nationwide"
                  rows={2}
                  className="rounded-xl text-xs mt-1 leading-relaxed"
                />
              </div>
            </div>

            {/* 2. Promo Model Selector Cards */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Promotion Model *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {OFFER_TYPES.map((type) => {
                  const isSelected = form.offer_type === type.value;
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm({ ...form, offer_type: type.value })}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                          : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-xs font-bold text-foreground">{type.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-1">{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Discount Amount & Min Spend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border/60 bg-secondary/20">
              {form.offer_type !== "free_delivery" && (
                <div>
                  <Label className="text-xs font-bold">
                    {form.offer_type === "flat_rate"
                      ? "Subsidized Flat Delivery Fee (৳) *"
                      : "Discount Amount (৳) *"}
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ৳
                    </span>
                    <Input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                      className="h-10 pl-8 rounded-xl text-xs font-bold font-mono bg-background"
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              )}

              <div className={form.offer_type === "free_delivery" ? "sm:col-span-2" : ""}>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Minimum Cart Subtotal (৳)</Label>
                  <span className="text-[10px] text-muted-foreground">0 = No minimum spend</span>
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                    className="h-10 pl-8 rounded-xl text-xs font-bold font-mono bg-background"
                    placeholder="2500"
                  />
                </div>
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground mr-1">Presets:</span>
                  {[0, 1000, 2000, 2500, 3500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, min_order_amount: preset })}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                        form.min_order_amount === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset === 0 ? "No Min" : `৳${preset}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Geographic Target Areas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Target Geographic Coverage
                </Label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, target_areas: [] })}
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border transition-colors ${
                    form.target_areas.length === 0
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Bangladesh (Nationwide)
                </button>
              </div>

              {/* Division Quick Select Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground block">Quick add division districts:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(BD_DIVISIONS).map((divName) => (
                    <button
                      key={divName}
                      type="button"
                      onClick={() => addDivisionDistricts(divName)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/70 border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      + {divName.replace(" Division", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected districts chip container */}
              {form.target_areas.length > 0 && (
                <div className="p-3 rounded-2xl border border-border/60 bg-background/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Selected Districts ({form.target_areas.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, target_areas: [] })}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Reset to Nationwide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {form.target_areas.map((dist) => (
                      <span
                        key={dist}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary border border-border/60 text-xs text-foreground font-medium"
                      >
                        {dist}
                        <button
                          type="button"
                          onClick={() => removeDistrictArea(dist)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* District Dropdown Selector */}
              <Select
                value=""
                onValueChange={(dist) => {
                  if (dist) addDistrictArea(dist);
                }}
              >
                <SelectTrigger className="h-9.5 rounded-xl text-xs font-semibold bg-background">
                  <SelectValue placeholder="Add individual district from 64 districts list..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {BD_ALL_DISTRICTS.map((dist) => (
                    <SelectItem
                      key={dist}
                      value={dist}
                      disabled={form.target_areas.includes(dist)}
                    >
                      {dist} {form.target_areas.includes(dist) ? "✓ (Added)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Courier Carriers */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Supported Carrier Channels
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {COURIER_OPTIONS.map((c) => {
                  const isChecked =
                    form.applicable_couriers.length === 0 ||
                    form.applicable_couriers.includes(c.id);
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourierSelection(c.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isChecked
                          ? "border-primary/60 bg-primary/5 text-foreground"
                          : "border-border/50 bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${c.color} shrink-0`} />
                        <span className="text-xs font-bold">{c.label}</span>
                      </div>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Leave all selected to apply uniformly across Steadfast, Pathao, and in-house fleet.
              </p>
            </div>

            {/* 6. Schedule & Activation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-border/60 bg-secondary/20">
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Start Date (Optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="h-9.5 rounded-xl text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> End Date (Optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="h-9.5 rounded-xl text-xs mt-1 bg-background"
                />
              </div>
            </div>

            {/* Active Toggle & Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <Label className="text-xs font-bold cursor-pointer">
                  {form.is_active ? "Campaign is Active" : "Campaign is Paused"}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="rounded-xl h-9.5 px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.title.trim() || saveMutation.isPending}
                  className="rounded-xl h-9.5 px-5 text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
                >
                  {saveMutation.isPending ? "Saving..." : editId ? "Update Campaign" : "Save Campaign"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryOffers;
