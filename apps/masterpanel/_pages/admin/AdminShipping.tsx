import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Truck,
  Building2,
  Sliders,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Save,
  Check,
  Search,
  Eye,
  EyeOff,
  ShoppingBag,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Package,
  FileText,
  BookOpen,
  Zap,
  Scale,
  Gift,
  Copy,
  RefreshCw,
  Send,
  AlertTriangle,
  Tag,
  Store,
  Compass,
  Radio,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { BD_COURIER_LOCATIONS, calculateCourierRate } from "@orizino/shared";
import {
  testPathaoConnection,
  getPathaoStores,
  getPathaoCities,
  getPathaoZones,
  calculatePathaoPrice,
  syncPathaoPriceMatrix,
  type PathaoStore,
  type PathaoCity,
  type PathaoZone,
} from "@/lib/pathao.functions";

interface Hub {
  id: string;
  hub_name: string;
  city: string;
  area: string | null;
  address: string;
  contact_phone: string | null;
  is_pickup_point: boolean;
  provider: string;
}

const emptyHub: Omit<Hub, "id"> = {
  hub_name: "",
  city: "Dhaka",
  area: "",
  address: "",
  contact_phone: "",
  is_pickup_point: true,
  provider: "steadfast",
};

export default function AdminShipping() {
  const queryClient = useQueryClient();

  // ── 1. Store Origin Hub & Dispatch Location ──
  const [merchantHubName, setMerchantHubName] = useState("Orizino Central Warehouse");
  const [merchantOriginCity, setMerchantOriginCity] = useState("Dhaka");
  const [merchantOriginThana, setMerchantOriginThana] = useState("Dhanmondi");
  const [merchantOriginAddress, setMerchantOriginAddress] = useState("House 12, Road 4, Dhanmondi, Dhaka");
  const [merchantOriginPhone, setMerchantOriginPhone] = useState("+880 1700-000000");

  // ── 2. Zone Rates & Global Logistics Settings ──
  const [rateInsideDhaka, setRateInsideDhaka] = useState("70");
  const [rateSameCityOsd, setRateSameCityOsd] = useState("60");
  const [rateIntraSuburbs, setRateIntraSuburbs] = useState("60");
  const [rateSuburbs, setRateSuburbs] = useState("105");
  const [rateOutsideDhakaSadar, setRateOutsideDhakaSadar] = useState("115");
  const [rateOutsideDhaka, setRateOutsideDhaka] = useState("130");
  const [rateInterDistrict, setRateInterDistrict] = useState("135");
  const [rateSameDay, setRateSameDay] = useState("105");
  const [extraKgFee, setExtraKgFee] = useState("20");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("2500");
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true);
  const [codPercentage, setCodPercentage] = useState("1");
  const [codFee, setCodFee] = useState("0");
  const [codEnabled, setCodEnabled] = useState(true);
  const [defaultCourier, setDefaultCourier] = useState("steadfast");
  const [autoCreateShipment, setAutoCreateShipment] = useState(false);

  // Service Active Toggles
  const [steadfastStdActive, setSteadfastStdActive] = useState(true);
  const [steadfastSameDayActive, setSteadfastSameDayActive] = useState(true);
  const [steadfastHubPickupActive, setSteadfastHubPickupActive] = useState(true);
  const [steadfastBookActive, setSteadfastBookActive] = useState(true);
  const [steadfastDocActive, setSteadfastDocActive] = useState(true);
  const [steadfastPriorityActive, setSteadfastPriorityActive] = useState(true);
  const [pathaoExpActive, setPathaoExpActive] = useState(true);
  const [pathaoSameDayActive, setPathaoSameDayActive] = useState(true);
  const [pathaoHubPickupActive, setPathaoHubPickupActive] = useState(true);
  const [pathaoPriorityActive, setPathaoPriorityActive] = useState(true);
  const [pathaoDocActive, setPathaoDocActive] = useState(true);
  const [pathaoOnDemandActive, setPathaoOnDemandActive] = useState(true);
  const [storePickupActive, setStorePickupActive] = useState(true);

  // Auto-save sync status
  const [autoSaveStatus, setAutoSaveStatus] = useState<"synced" | "saving" | "idle">("idle");
  const isInitialMount = useRef(true);

  // ── 3. Courier API Secrets & Status ──
  const [steadfastApiKey, setSteadfastApiKey] = useState("");
  const [steadfastSecretKey, setSteadfastSecretKey] = useState("");
  const [pathaoClientId, setPathaoClientId] = useState("");
  const [pathaoClientSecret, setPathaoClientSecret] = useState("");
  const [pathaoUsername, setPathaoUsername] = useState("");
  const [pathaoPassword, setPathaoPassword] = useState("");
  const [pathaoStoreId, setPathaoStoreId] = useState("");
  const [pathaoEnv, setPathaoEnv] = useState<"live" | "sandbox">("live");

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggleReveal = (k: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // ── 4. Webhook Health & Verification ──
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookLastTested, setWebhookLastTested] = useState<{
    success: boolean;
    time: string;
    message: string;
  } | null>(null);

  const [pathaoTesting, setPathaoTesting] = useState(false);
  const [pathaoTestResult, setPathaoTestResult] = useState<{
    success: boolean;
    time: string;
    message: string;
  } | null>(null);
  const [pathaoStores, setPathaoStores] = useState<PathaoStore[]>([]);
  const [pathaoLiveRates, setPathaoLiveRates] = useState<any>(null);
  const [pathaoSyncingRates, setPathaoSyncingRates] = useState(false);
  const [pathaoCitiesList, setPathaoCitiesList] = useState<PathaoCity[]>([]);
  const [pathaoZonesList, setPathaoZonesList] = useState<PathaoZone[]>([]);
  const [pathaoSimCityId, setPathaoSimCityId] = useState<string>("1");
  const [pathaoSimZoneId, setPathaoSimZoneId] = useState<string>("52");
  const [pathaoSimWeight, setPathaoSimWeight] = useState<string>("0.5");
  const [pathaoSimItemType, setPathaoSimItemType] = useState<string>("2");
  const [pathaoSimDeliveryType, setPathaoSimDeliveryType] = useState<string>("48");
  const [pathaoSimLoading, setPathaoSimLoading] = useState(false);
  const [pathaoSimResult, setPathaoSimResult] = useState<any>(null);

  const [pathaoWebhookTesting, setPathaoWebhookTesting] = useState(false);
  const [pathaoWebhookSecret, setPathaoWebhookSecret] = useState("f3992ecc-59da-4cbe-a049-a13da2018d51");
  const [pathaoWebhookLastTested, setPathaoWebhookLastTested] = useState<{
    success: boolean;
    time: string;
    message: string;
  } | null>(null);

  // ── Hubs State ──
  const [hubDialogOpen, setHubDialogOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<(Omit<Hub, "id"> & { id?: string }) | null>(null);

  // ── 7. Live Simulator & Real-time Tracking ──
  const [simOriginDistrict, setSimOriginDistrict] = useState("Dhaka");
  const [simDistrict, setSimDistrict] = useState("Dhaka");
  const [simThana, setSimThana] = useState("Dhanmondi");
  const [simWeight, setSimWeight] = useState("1.0");
  const [simSubtotal, setSimSubtotal] = useState("1500");
  const [simIsCod, setSimIsCod] = useState(true);

  const [trackInput, setTrackInput] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // ── Queries ──
  const { data: siteSettings } = useQuery({
    queryKey: ["admin-shipping-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "merchant_origin_city",
          "merchant_origin_thana",
          "merchant_origin_address",
          "merchant_origin_phone",
          "merchant_hub_name",
          "shipping_fee",
          "shipping_fee_same_city_osd",
          "shipping_fee_intra_suburbs",
          "shipping_fee_suburbs",
          "shipping_fee_outside_sadar",
          "shipping_fee_outside",
          "shipping_fee_inter_district",
          "shipping_fee_sameday",
          "shipping_extra_kg_fee",
          "free_shipping_threshold",
          "free_shipping_enabled",
          "cod_percentage",
          "cod_fee",
          "cod_enabled",
          "delivery_partners_config",
          "pathao_public_config",
          "pathao_credentials",
          "pathao_webhook_secret",
          "pathao_live_rates",
          "STEADFAST_API_KEY",
          "STEADFAST_SECRET_KEY",
          "payment_gateways_config",
        ]);

      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
  });

  const { data: secretStatus } = useQuery({
    queryKey: ["courier-secret-status"],
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("courier-secrets", { body: { action: "status" } });
        return ((data as any)?.status || {}) as Record<string, boolean>;
      } catch {
        return {};
      }
    },
  });

  const { data: hubs = [], isLoading: loadingHubs } = useQuery({
    queryKey: ["admin-courier-hubs"],
    queryFn: async () => {
      const { data } = await supabase.from("courier_hubs").select("*").order("city").order("hub_name");
      return (data || []) as Hub[];
    },
  });

  const { data: recentWebhookEvents = [] } = useQuery({
    queryKey: ["admin-recent-webhook-events"],
    queryFn: async () => {
      const [sfRes, ptRes] = await Promise.all([
        supabase
          .from("steadfast_shipments")
          .select("id, order_id, consignment_id, tracking_code, invoice, status, tracking_message, delivery_charge, cod_amount, updated_at")
          .order("updated_at", { ascending: false })
          .limit(4),
        supabase
          .from("pathao_shipments")
          .select("id, order_id, consignment_id, merchant_order_id, order_status, order_status_slug, delivery_fee, cod_amount, updated_at")
          .order("updated_at", { ascending: false })
          .limit(4),
      ]);

      const sfList = (sfRes.data || []).map((e: any) => ({
        ...e,
        courier: "steadfast",
        displayInvoice: e.invoice || `#${e.consignment_id}`,
        displayStatus: e.status || "in_review",
        displayMessage: e.tracking_message || "Steadfast event synced",
        displayFee: e.delivery_charge,
      }));

      const ptList = (ptRes.data || []).map((e: any) => ({
        ...e,
        courier: "pathao",
        displayInvoice: e.merchant_order_id || `#${e.consignment_id}`,
        displayStatus: e.order_status || e.order_status_slug || "pending",
        displayMessage: `Pathao status: ${e.order_status || e.order_status_slug || "updated"}`,
        displayFee: e.delivery_fee,
      }));

      return [...sfList, ...ptList]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6);
    },
    refetchInterval: 15 * 1000,
  });

  // Recent orders query for internal connection & live verification
  const { data: recentOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-recent-shipping-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, subtotal, shipping_fee, shipping_address, preferred_courier, tracking_number, created_at, pathao_shipments(*), steadfast_shipments(*)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 30 * 1000,
  });

  // Real-time subscription: auto-refresh orders when new orders arrive
  useEffect(() => {
    const channel = supabase
      .channel("shipping-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-recent-shipping-orders"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sync loaded settings into local form state
  useEffect(() => {
    if (siteSettings) {
      setMerchantHubName(String(siteSettings.merchant_hub_name ?? "Orizino Central Warehouse"));
      setMerchantOriginCity(String(siteSettings.merchant_origin_city ?? "Dhaka"));
      setMerchantOriginThana(String(siteSettings.merchant_origin_thana ?? "Dhanmondi"));
      setMerchantOriginAddress(String(siteSettings.merchant_origin_address ?? "House 12, Road 4, Dhanmondi, Dhaka"));
      setMerchantOriginPhone(String(siteSettings.merchant_origin_phone ?? "+880 1700-000000"));

      setRateInsideDhaka(String(siteSettings.shipping_fee ?? "70"));
      setRateSameCityOsd(String(siteSettings.shipping_fee_same_city_osd ?? "60"));
      setRateIntraSuburbs(String(siteSettings.shipping_fee_intra_suburbs ?? "60"));
      setRateSuburbs(String(siteSettings.shipping_fee_suburbs ?? "105"));
      setRateOutsideDhakaSadar(String(siteSettings.shipping_fee_outside_sadar ?? "115"));
      setRateOutsideDhaka(String(siteSettings.shipping_fee_outside ?? "130"));
      setRateInterDistrict(String(siteSettings.shipping_fee_inter_district ?? "135"));
      setRateSameDay(String(siteSettings.shipping_fee_sameday ?? "105"));
      setExtraKgFee(String(siteSettings.shipping_extra_kg_fee ?? "20"));
      setFreeShippingThreshold(String(siteSettings.free_shipping_threshold ?? "2500"));
      setFreeShippingEnabled(siteSettings.free_shipping_enabled !== false);
      setCodPercentage(String(siteSettings.cod_percentage ?? "1"));
      setCodFee(String(siteSettings.cod_fee ?? siteSettings.payment_gateways_config?.cod_extra_fee ?? "0"));
      setCodEnabled(siteSettings.cod_enabled !== false && siteSettings.payment_gateways_config?.cod_enabled !== false);

      const dp = siteSettings.delivery_partners_config || {};
      setDefaultCourier(dp.default_partner || "steadfast");
      setAutoCreateShipment(!!dp.auto_create_shipment);
      if (dp.steadfast_std_active !== undefined) setSteadfastStdActive(dp.steadfast_std_active !== false);
      if (dp.steadfast_sameday_active !== undefined) setSteadfastSameDayActive(dp.steadfast_sameday_active !== false);
      if (dp.steadfast_hub_active !== undefined) setSteadfastHubPickupActive(dp.steadfast_hub_active !== false);
      if (dp.steadfast_book_active !== undefined) setSteadfastBookActive(dp.steadfast_book_active !== false);
      if (dp.steadfast_doc_active !== undefined) setSteadfastDocActive(dp.steadfast_doc_active !== false);
      if (dp.steadfast_priority_active !== undefined) setSteadfastPriorityActive(dp.steadfast_priority_active !== false);
      if (dp.pathao_exp_active !== undefined) setPathaoExpActive(dp.pathao_exp_active !== false);
      if (dp.pathao_sameday_active !== undefined) setPathaoSameDayActive(dp.pathao_sameday_active !== false);
      if (dp.pathao_hub_active !== undefined) setPathaoHubPickupActive(dp.pathao_hub_active !== false);
      if (dp.pathao_priority_active !== undefined) setPathaoPriorityActive(dp.pathao_priority_active !== false);
      if (dp.pathao_doc_active !== undefined) setPathaoDocActive(dp.pathao_doc_active !== false);
      if (dp.pathao_ondemand_active !== undefined) setPathaoOnDemandActive(dp.pathao_ondemand_active !== false);
      if (dp.store_pickup_active !== undefined) setStorePickupActive(dp.store_pickup_active !== false);

      if (siteSettings.STEADFAST_API_KEY) setSteadfastApiKey(siteSettings.STEADFAST_API_KEY);
      if (siteSettings.STEADFAST_SECRET_KEY) setSteadfastSecretKey(siteSettings.STEADFAST_SECRET_KEY);

      const pathaoPub = siteSettings.pathao_public_config || {};
      const configuredEnv = pathaoPub.environment === "sandbox" ? "sandbox" : "live";
      setPathaoEnv(configuredEnv);
      if (pathaoPub.sandbox_store_id && !pathaoStoreId) setPathaoStoreId(String(pathaoPub.sandbox_store_id));
      if (pathaoPub.live_store_id && configuredEnv === "live") setPathaoStoreId(String(pathaoPub.live_store_id));

      if (siteSettings.pathao_live_rates) {
        setPathaoLiveRates(siteSettings.pathao_live_rates);
      }
      setPathaoEnv(configuredEnv);
      if (pathaoPub.live_store_id || pathaoPub.sandbox_store_id) {
        setPathaoStoreId(String(configuredEnv === "sandbox" ? pathaoPub.sandbox_store_id : pathaoPub.live_store_id));
      }

      const pathaoCreds = siteSettings.pathao_credentials || {};
      if (configuredEnv === "live") {
        if (pathaoCreds.live_client_id) setPathaoClientId(pathaoCreds.live_client_id);
        if (pathaoCreds.live_client_secret) setPathaoClientSecret(pathaoCreds.live_client_secret);
        if (pathaoCreds.live_username) setPathaoUsername(pathaoCreds.live_username);
        if (pathaoCreds.live_password) setPathaoPassword(pathaoCreds.live_password);
      } else {
        setPathaoClientId(pathaoCreds.sandbox_client_id || "7N1aMJQbWm");
        setPathaoClientSecret(pathaoCreds.sandbox_client_secret || "wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39");
        setPathaoUsername(pathaoCreds.sandbox_username || "test@pathao.com");
        setPathaoPassword(pathaoCreds.sandbox_password || "lovePathao");
      }

      if (siteSettings.pathao_webhook_secret) {
        setPathaoWebhookSecret(String(siteSettings.pathao_webhook_secret));
      }
    }
  }, [siteSettings]);

  // ── Auto-save Mutation with Instant Sitewide Sync ──
  const saveAllSettingsMutation = useMutation({
    mutationFn: async (showToast: boolean = true) => {
      setAutoSaveStatus("saving");

      const existingPaymentConfig = siteSettings?.payment_gateways_config || {};
      const updatedPaymentConfig = {
        ...existingPaymentConfig,
        cod_enabled: codEnabled,
        cod_extra_fee: Number(codFee) || 0,
      };

      const items = [
        { key: "merchant_hub_name", value: merchantHubName },
        { key: "merchant_origin_city", value: merchantOriginCity },
        { key: "merchant_origin_thana", value: merchantOriginThana },
        { key: "merchant_origin_address", value: merchantOriginAddress },
        { key: "merchant_origin_phone", value: merchantOriginPhone },
        { key: "shipping_fee", value: rateInsideDhaka },
        { key: "shipping_fee_same_city_osd", value: rateSameCityOsd },
        { key: "shipping_fee_intra_suburbs", value: rateIntraSuburbs },
        { key: "shipping_fee_suburbs", value: rateSuburbs },
        { key: "shipping_fee_outside_sadar", value: rateOutsideDhakaSadar },
        { key: "shipping_fee_outside", value: rateOutsideDhaka },
        { key: "shipping_fee_inter_district", value: rateInterDistrict },
        { key: "shipping_fee_sameday", value: rateSameDay },
        { key: "shipping_extra_kg_fee", value: extraKgFee },
        { key: "free_shipping_threshold", value: freeShippingThreshold },
        { key: "free_shipping_enabled", value: freeShippingEnabled },
        { key: "cod_percentage", value: codPercentage },
        { key: "cod_fee", value: codFee },
        { key: "cod_enabled", value: codEnabled },
        { key: "payment_gateways_config", value: updatedPaymentConfig },
        {
          key: "delivery_partners_config",
          value: {
            default_partner: defaultCourier,
            auto_create_shipment: autoCreateShipment,
            steadfast_enabled: true,
            pathao_enabled: true,
            steadfast_std_active: steadfastStdActive,
            steadfast_sameday_active: steadfastSameDayActive,
            steadfast_hub_active: steadfastHubPickupActive,
            steadfast_book_active: steadfastBookActive,
            steadfast_doc_active: steadfastDocActive,
            steadfast_priority_active: steadfastPriorityActive,
            pathao_exp_active: pathaoExpActive,
            pathao_sameday_active: pathaoSameDayActive,
            pathao_hub_active: pathaoHubPickupActive,
            pathao_priority_active: pathaoPriorityActive,
            pathao_doc_active: pathaoDocActive,
            pathao_ondemand_active: pathaoOnDemandActive,
            store_pickup_active: storePickupActive,
          },
        },
        {
          key: "pathao_public_config",
          value: {
            environment: pathaoEnv,
            live_store_id: pathaoEnv === "live" ? Number(pathaoStoreId) || null : siteSettings?.pathao_public_config?.live_store_id,
            sandbox_store_id: pathaoEnv === "sandbox" ? Number(pathaoStoreId) || null : siteSettings?.pathao_public_config?.sandbox_store_id,
          },
        },
      ];

      if (steadfastApiKey) items.push({ key: "STEADFAST_API_KEY", value: steadfastApiKey });
      if (steadfastSecretKey) items.push({ key: "STEADFAST_SECRET_KEY", value: steadfastSecretKey });

      const existingCreds = siteSettings?.pathao_credentials || {};
      const updatedCreds = {
        ...existingCreds,
        ...(pathaoEnv === "live"
          ? {
              live_client_id: pathaoClientId || existingCreds.live_client_id,
              live_client_secret: pathaoClientSecret || existingCreds.live_client_secret,
              live_username: pathaoUsername || existingCreds.live_username,
              live_password: pathaoPassword || existingCreds.live_password,
            }
          : {
              sandbox_client_id: pathaoClientId || existingCreds.sandbox_client_id,
              sandbox_client_secret: pathaoClientSecret || existingCreds.sandbox_client_secret,
              sandbox_username: pathaoUsername || existingCreds.sandbox_username,
              sandbox_password: pathaoPassword || existingCreds.sandbox_password,
            }),
      };
      items.push({ key: "pathao_credentials", value: updatedCreds });
      items.push({ key: "pathao_webhook_secret", value: pathaoWebhookSecret });

      for (const item of items) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: item.key, value: item.value as any }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setAutoSaveStatus("synced");
      toast.success("Logistics & Store Origin Hub saved successfully!");
      setTimeout(() => setAutoSaveStatus("idle"), 2500);
    },
    onError: (e: any) => {
      setAutoSaveStatus("idle");
      toast.error(e.message || "Failed to update shipping settings");
    },
  });

  // ── Webhook Ping Health Tester ──
  const handleTestWebhookPing = async () => {
    setWebhookTesting(true);
    try {
      const res = await fetch("/api/webhooks/steadfast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer 7a546582cfefd4faf812e3b921f50aa4ab089dcef2423c58279f1699a29be6af",
        },
        body: JSON.stringify({
          notification_type: "delivery_status",
          consignment_id: 999999,
          invoice: "PING-TEST",
          status: "delivered",
          cod_amount: 0,
          delivery_charge: 70,
          tracking_message: "Steadfast webhook health check ping from Masterpanel",
          updated_at: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setWebhookLastTested({
          success: true,
          time: new Date().toLocaleTimeString(),
          message: "Active & Verified (HTTP 200 OK)",
        });
        toast.success("Webhook verified! Steadfast listener is healthy.");
        queryClient.invalidateQueries({ queryKey: ["admin-recent-webhook-events"] });
      } else {
        throw new Error(json.message || "Webhook test returned unexpected response");
      }
    } catch (err: any) {
      setWebhookLastTested({
        success: false,
        time: new Date().toLocaleTimeString(),
        message: err.message || "Connection failed",
      });
      toast.error(`Steadfast Webhook ping error: ${err.message}`);
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleTestPathaoWebhookPing = async () => {
    setPathaoWebhookTesting(true);
    try {
      const res = await fetch("/api/webhooks/pathao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PATHAO-Signature": pathaoWebhookSecret,
        },
        body: JSON.stringify({
          event: "webhook_integration",
        }),
      });

      const json = await res.json().catch(() => ({}));
      const secretHeader = res.headers.get("X-Pathao-Merchant-Webhook-Integration-Secret") || res.headers.get("x-pathao-merchant-webhook-integration-secret");

      if ((res.status === 202 || res.status === 200) && (json.status === "success" || json.ok || secretHeader)) {
        setPathaoWebhookLastTested({
          success: true,
          time: new Date().toLocaleTimeString(),
          message: `Active (HTTP 202 Accepted • Secret Header Verified)`,
        });
        toast.success("Pathao Webhook Handshake verified! (HTTP 202 Accepted & Secret Header OK)");
        queryClient.invalidateQueries({ queryKey: ["admin-recent-webhook-events"] });
      } else {
        throw new Error(json.message || `Unexpected response status: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setPathaoWebhookLastTested({
        success: false,
        time: new Date().toLocaleTimeString(),
        message: err.message || "Connection failed",
      });
      toast.error(`Pathao Webhook ping error: ${err.message}`);
    } finally {
      setPathaoWebhookTesting(false);
    }
  };

  const handleFillPathaoSandboxPreset = () => {
    setPathaoEnv("sandbox");
    setPathaoClientId("7N1aMJQbWm");
    setPathaoClientSecret("wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39");
    setPathaoUsername("test@pathao.com");
    setPathaoPassword("lovePathao");
    toast.success("Loaded official Pathao Sandbox Test Credentials Preset!");
  };

  const handleTestPathaoConnection = async () => {
    setPathaoTesting(true);
    setPathaoTestResult(null);
    try {
      const res = await testPathaoConnection({
        environment: pathaoEnv,
        clientId: pathaoClientId,
        clientSecret: pathaoClientSecret,
        username: pathaoUsername,
        password: pathaoPassword,
      });
      if (res.ok) {
        const storeList = res.stores || [];
        setPathaoStores(storeList);
        setPathaoTestResult({
          success: true,
          time: new Date().toLocaleTimeString(),
          message: res.message || `Pathao ${pathaoEnv.toUpperCase()} connection successful. Token verified.`,
        });
        if (storeList.length > 0 && !pathaoStoreId) {
          setPathaoStoreId(String(storeList[0].store_id));
        }
        toast.success(`Pathao Connected! Found ${storeList.length} store(s).`);
      } else {
        throw new Error(res.error || "Connection failed");
      }
    } catch (err: any) {
      setPathaoTestResult({
        success: false,
        time: new Date().toLocaleTimeString(),
        message: err.message || "Connection failed",
      });
      toast.error(`Pathao Connection Error: ${err.message}`);
    } finally {
      setPathaoTesting(false);
    }
  };

  const handleSyncPathaoRates = async () => {
    setPathaoSyncingRates(true);
    try {
      const res = await syncPathaoPriceMatrix({
        environment: pathaoEnv,
        store_id: pathaoStoreId ? Number(pathaoStoreId) : undefined,
      });
      if (res.data) {
        setPathaoLiveRates(res.data);
        toast.success("Successfully synchronized live rates from Pathao API!");
      }
    } catch (err: any) {
      toast.error(`Pathao Sync Failed: ${err.message}`);
    } finally {
      setPathaoSyncingRates(false);
    }
  };

  const handleRunPathaoSim = async () => {
    if (!pathaoSimCityId) return;
    setPathaoSimLoading(true);
    setPathaoSimResult(null);
    try {
      const res = await calculatePathaoPrice({
        store_id: pathaoStoreId ? Number(pathaoStoreId) : undefined,
        recipient_city: Number(pathaoSimCityId),
        recipient_zone: Number(pathaoSimZoneId || 52),
        item_type: Number(pathaoSimItemType),
        delivery_type: Number(pathaoSimDeliveryType),
        item_weight: Number(pathaoSimWeight),
      });
      setPathaoSimResult(res);
      toast.success(`Pathao Live Price: ৳${res.final_price ?? res.price}`);
    } catch (err: any) {
      toast.error(`Pathao Rate Calculation Failed: ${err.message}`);
    } finally {
      setPathaoSimLoading(false);
    }
  };

  // ── Derived: is Pathao configured? (must be declared before effects that depend on it) ──
  const isPathaoConfigured = pathaoEnv === "sandbox"
    ? !!(
        (pathaoClientId && pathaoClientSecret) ||
        (siteSettings?.pathao_credentials?.sandbox_client_id && siteSettings?.pathao_credentials?.sandbox_client_secret) ||
        (secretStatus?.PATHAO_SANDBOX_CLIENT_ID && secretStatus?.PATHAO_SANDBOX_CLIENT_SECRET)
      )
    : !!(
        (pathaoClientId && pathaoClientSecret) ||
        (siteSettings?.pathao_credentials?.live_client_id && siteSettings?.pathao_credentials?.live_client_secret) ||
        (secretStatus?.PATHAO_LIVE_CLIENT_ID && secretStatus?.PATHAO_LIVE_CLIENT_SECRET)
      );

  // Load Pathao cities on mount or when API is connected
  useEffect(() => {
    if (isPathaoConfigured && pathaoCitiesList.length === 0) {
      getPathaoCities()
        .then((cities) => {
          if (cities && cities.length > 0) setPathaoCitiesList(cities);
        })
        .catch(() => {});
    }
  }, [isPathaoConfigured, pathaoCitiesList.length]);

  // Cascade load zones when simulator city changes
  useEffect(() => {
    if (pathaoSimCityId) {
      getPathaoZones(Number(pathaoSimCityId))
        .then((zones) => {
          setPathaoZonesList(zones);
          if (zones && zones.length > 0 && !zones.find((z) => String(z.zone_id) === pathaoSimZoneId)) {
            setPathaoSimZoneId(String(zones[0].zone_id));
          }
        })
        .catch(() => {});
    }
  }, [pathaoSimCityId]);
  const saveHubMutation = useMutation({
    mutationFn: async (hub: Omit<Hub, "id"> & { id?: string }) => {
      if (hub.id) {
        const { error } = await supabase.from("courier_hubs").update(hub).eq("id", hub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courier_hubs").insert(hub);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courier-hubs"] });
      setHubDialogOpen(false);
      toast.success("Dispatch hub updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteHubMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_hubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courier-hubs"] });
      toast.success("Hub deleted");
    },
  });

  // ── Live Simulator Calculation Engine ──
  const simulatedRate = useMemo(() => {
    return calculateCourierRate({
      originDistrict: simOriginDistrict,
      district: simDistrict,
      thana: simThana,
      defaultPartner: defaultCourier,
      itemSubtotal: Number(simSubtotal) || 0,
      weightKg: Number(simWeight) || 1,
      insideDhakaRate: Number(rateInsideDhaka) || 70,
      sameCityOsdRate: Number(rateSameCityOsd) || 60,
      intraSuburbsRate: Number(rateIntraSuburbs) || 60,
      suburbsRate: Number(rateSuburbs) || 105,
      outsideDhakaSadarRate: Number(rateOutsideDhakaSadar) || 115,
      outsideDhakaRate: Number(rateOutsideDhaka) || 130,
      interDistrictRate: Number(rateInterDistrict) || 135,
      sameDayRate: Number(rateSameDay) || 105,
      extraKgFee: Number(extraKgFee) || 20,
      freeShippingThreshold: Number(freeShippingThreshold) || 2500,
      freeShippingEnabled,
      universalCodEnabled: codEnabled,
      codFee: Number(codFee) || 0,
      codPercentage: Number(codPercentage) || 1,
      isCod: simIsCod,
    });
  }, [
    simOriginDistrict,
    simDistrict,
    simThana,
    simWeight,
    simSubtotal,
    simIsCod,
    defaultCourier,
    rateInsideDhaka,
    rateSameCityOsd,
    rateIntraSuburbs,
    rateSuburbs,
    rateOutsideDhakaSadar,
    rateOutsideDhaka,
    rateInterDistrict,
    rateSameDay,
    extraKgFee,
    freeShippingThreshold,
    freeShippingEnabled,
    codFee,
    codPercentage,
    codEnabled,
  ]);

  // ── Real-time Tracking Tester ──
  const handleLiveTrack = async () => {
    if (!trackInput.trim()) {
      toast.error("Please enter an Order ID or Courier Tracking Code");
      return;
    }
    setTrackingLoading(true);
    setTrackResult(null);

    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, order_items(*), pathao_shipments(*), steadfast_shipments(*)")
        .or(`order_number.eq.${trackInput.trim()},tracking_number.eq.${trackInput.trim()},id.eq.${trackInput.trim()}`)
        .maybeSingle();

      if (orderData) {
        const pathao: any = (orderData as any).pathao_shipments?.[0];
        const steadfast: any = (orderData as any).steadfast_shipments?.[0];
        setTrackResult({
          type: "order",
          orderNumber: orderData.order_number,
          orderStatus: orderData.status,
          total: orderData.total,
          shippingAddress: orderData.shipping_address,
          courier: pathao ? "Pathao Courier" : steadfast ? "Steadfast Courier" : "Standard Delivery",
          trackingCode: pathao?.consignment_id || steadfast?.tracking_code || orderData.tracking_number || "Pending",
          courierStatus: pathao?.order_status || steadfast?.status || "Pending Pickup",
          timestamp: new Date().toLocaleTimeString(),
        });
        toast.success(`Found Order: ${orderData.order_number}`);
      } else {
        const { data: sfData } = await supabase.functions
          .invoke("steadfast", {
            body: { action: "status", tracking_code: trackInput.trim() },
          })
          .catch(() => ({ data: null }));

        if (sfData?.delivery_status) {
          setTrackResult({
            type: "courier",
            courier: "Steadfast Courier",
            trackingCode: trackInput.trim(),
            courierStatus: sfData.delivery_status,
            raw: sfData,
            timestamp: new Date().toLocaleTimeString(),
          });
          toast.success("Tracking loaded from Steadfast");
        } else {
          toast.error("No shipment found for this code");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Tracking lookup failed");
    } finally {
      setTrackingLoading(false);
    }
  };

  const isSteadfastConfigured = !!(
    steadfastApiKey ||
    siteSettings?.STEADFAST_API_KEY ||
    (secretStatus?.STEADFAST_API_KEY && secretStatus?.STEADFAST_SECRET_KEY)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Shipping & Courier Logistics
                </h1>
                {autoSaveStatus === "saving" ? (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving changes…
                  </Badge>
                ) : autoSaveStatus === "synced" ? (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                    <Check className="w-2.5 h-2.5" /> Auto-saved sitewide
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-origin Bangladesh tariff matrix, Steadfast & Pathao APIs, live tracking webhook & promotional free delivery campaigns.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => saveAllSettingsMutation.mutate(true)}
            disabled={saveAllSettingsMutation.isPending}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg active:scale-95 transition-all gap-2"
          >
            {saveAllSettingsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Logistics Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: Store Dispatch Origin & Physical Fulfillment Hub ── */}
      <Card className="rounded-2xl border border-primary/25 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary text-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  Store Dispatch Origin & Fulfillment Hub
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    📍 Calculation Anchor Point
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  The physical warehouse location from which all customer delivery charges, route matrices, and courier pickups are computed.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto bg-background">
              Origin: {merchantOriginCity} ({merchantOriginThana})
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold">Fulfillment Hub / Warehouse Name</Label>
              <Input
                value={merchantHubName}
                onChange={(e) => setMerchantHubName(e.target.value)}
                placeholder="e.g. Orizino Central Hub"
                className="h-9 rounded-xl text-xs mt-1 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Origin City / District *</Label>
              <Select
                value={merchantOriginCity}
                onValueChange={(v) => {
                  setMerchantOriginCity(v);
                  const match = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === v.toLowerCase());
                  if (match && match.thanas.length > 0) setMerchantOriginThana(match.thanas[0]);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs mt-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {BD_COURIER_LOCATIONS.map((l) => (
                    <SelectItem key={l.district} value={l.district}>
                      {l.district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Origin Thana / Police Station *</Label>
              <Select value={merchantOriginThana} onValueChange={setMerchantOriginThana}>
                <SelectTrigger className="h-9 rounded-xl text-xs mt-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {(BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === merchantOriginCity.toLowerCase())?.thanas || ["Dhanmondi"]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Dispatch Contact Phone</Label>
              <Input
                value={merchantOriginPhone}
                onChange={(e) => setMerchantOriginPhone(e.target.value)}
                placeholder="+880 1700-000000"
                className="h-9 rounded-xl text-xs mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Full Warehouse Street Address</Label>
            <Input
              value={merchantOriginAddress}
              onChange={(e) => setMerchantOriginAddress(e.target.value)}
              placeholder="House #, Road #, Sector, Area, City..."
              className="h-9 rounded-xl text-xs mt-1"
            />
          </div>

          <div className="p-3 rounded-xl border border-border/70 bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>How this affects pricing:</strong> When a customer in <em>{merchantOriginCity}</em> orders, the system applies the local same-city rate (৳{merchantOriginCity === "Dhaka" ? rateInsideDhaka : rateSameCityOsd}). When shipping across divisions, the inter-district matrix (৳{rateInterDistrict}) is automatically applied at checkout.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: Standard Bangladesh Delivery Zones & Multi-Origin Matrix ── */}
      <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Storefront Delivery Zones & Dynamic Pricing Conditions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Official Steadfast Courier multi-origin matrix connected directly to Storefront Checkout & Orders.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto bg-background/80">
              Auto-Synced to Checkout API
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* 8 Comprehensive Route & Zone Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Route 1: Inside Dhaka */}
            <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  🏙️ Dhaka City Metro
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] h-4.5 px-1.5 border-none">
                  24h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Standard Rate (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateInsideDhaka}
                    onChange={(e) => setRateInsideDhaka(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Dhaka Metro (Gulshan, Dhanmondi, Mirpur, Uttara. ≤1kg: ৳70, ≤500g: ৳60, ≤150g: ৳55).</p>
            </div>

            {/* Route 2: Within Same City Outside Dhaka */}
            <div className="p-4 rounded-2xl border border-teal-500/25 bg-teal-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  🏙️ Same City Outside Dhaka
                </span>
                <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] h-4.5 px-1.5 border-none">
                  24h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Intra-City Rate (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateSameCityOsd}
                    onChange={(e) => setRateSameCityOsd(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Within the same district outside Dhaka (e.g. Ctg $\rightarrow$ Ctg, Sylhet $\rightarrow$ Sylhet, Rajshahi $\rightarrow$ Rajshahi).</p>
            </div>

            {/* Route 3: Dhaka Sub-Urban */}
            <div className="p-4 rounded-2xl border border-blue-500/25 bg-blue-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  🏡 Dhaka $\leftrightarrow$ Sub-Urban
                </span>
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] h-4.5 px-1.5 border-none">
                  24-48h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Sub-Urban Rate (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateSuburbs}
                    onChange={(e) => setRateSuburbs(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Dhaka to Savar, Gazipur, Narayanganj, Tongi, Keraniganj, Dhamrai, Ashulia.</p>
            </div>

            {/* Route 4: Intra-Sub-Urban */}
            <div className="p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                  🏡 Intra-Sub-Urban
                </span>
                <Badge className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] h-4.5 px-1.5 border-none">
                  24-48h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Suburbs-to-Suburbs (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateIntraSuburbs}
                    onChange={(e) => setRateIntraSuburbs(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Sub-Urban to Sub-Urban delivery (e.g. Savar $\rightarrow$ Gazipur, Tongi $\rightarrow$ Narayanganj).</p>
            </div>

            {/* Route 5: Outside Dhaka Sadar */}
            <div className="p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  🏢 OSD District Sadar
                </span>
                <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] h-4.5 px-1.5 border-none">
                  48-72h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">District Headquarter (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateOutsideDhakaSadar}
                    onChange={(e) => setRateOutsideDhakaSadar(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Dhaka to all 63 District Sadar headquarters & metropolitan centers.</p>
            </div>

            {/* Route 6: Outside Dhaka Rural / Upazila */}
            <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  🚚 OSD Rural / Upazila
                </span>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] h-4.5 px-1.5 border-none">
                  72-96h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Upazila Rate (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateOutsideDhaka}
                    onChange={(e) => setRateOutsideDhaka(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Dhaka to all interior sub-districts and rural union points.</p>
            </div>

            {/* Route 7: Inter-District Outside Dhaka */}
            <div className="p-4 rounded-2xl border border-purple-500/25 bg-purple-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  🌐 Inter-District (OSD $\leftrightarrow$ OSD)
                </span>
                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] h-4.5 px-1.5 border-none">
                  72-96h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Inter-District Rate (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateInterDistrict}
                    onChange={(e) => setRateInterDistrict(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Cross-divisional delivery between outside-Dhaka districts (e.g. Ctg $\rightarrow$ Sylhet).</p>
            </div>

            {/* Route 8: Same Day Express */}
            <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.03] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  ⚡ Same Day Express
                </span>
                <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] h-4.5 px-1.5 border-none">
                  5-8h
                </Badge>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Same Day Express (৳)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={rateSameDay}
                    onChange={(e) => setRateSameDay(e.target.value)}
                    className="h-9 pl-7 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">5-8 hour rush delivery inside Dhaka Metro & Chittagong City.</p>
            </div>
          </div>

          {/* Slabs & Policy Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            {/* Excess Weight Surcharge */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold">Excess Weight Condition Rate (৳/kg)</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                <Input
                  type="number"
                  value={extraKgFee}
                  onChange={(e) => setExtraKgFee(e.target.value)}
                  className="h-9 pl-7 rounded-xl text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Automatically added per additional kg when total order weight exceeds 1.0 kg.</p>
            </div>

            {/* Cash on Delivery & Risk Charge */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-bold">COD & Risk Fee (%)</Label>
                </div>
                <Switch checked={codEnabled} onCheckedChange={setCodEnabled} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">%</span>
                <Input
                  type="number"
                  value={codPercentage}
                  onChange={(e) => setCodPercentage(e.target.value)}
                  className="h-9 pl-7 rounded-xl text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">1% standard Steadfast COD & Risk Management fee applied on cash collection amount.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: Promotional Delivery Offers & Free Shipping Link ── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              Delivery Offers & Free Shipping Campaigns
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Dedicated Tab
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Universal free shipping thresholds, location subsidies, and dynamic checkout banners are configured in the dedicated Delivery Offers tab.
            </p>
          </div>
        </div>
        <a href="/sales/delivery-offers">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-9 text-xs font-bold gap-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 shrink-0"
          >
            Manage Delivery Offers <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </a>
      </div>

      {/* ── SECTION 4: Courier Delivery Services ── */}
      <div className="space-y-4">
        {/* ── SERVICE 1: 🔴 Steadfast Courier Services ── */}
        <Card className="rounded-2xl border border-red-500/25 bg-card/90 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-red-500/20 bg-red-500/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center font-bold text-red-600 text-xs">
                  SF
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    Steadfast Courier Delivery Services
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                      🔴 Nationwide API Partner
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Doorstep parcel logistics and hub dispatch covering all 64 districts across Bangladesh.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto bg-background">
                {isSteadfastConfigured ? "🟢 API Connected" : "⚪ API Keys Pending"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="text-xs">
                    <TableHead className="font-bold min-w-[200px]">Steadfast Service Name</TableHead>
                    <TableHead className="font-bold">Inside Dhaka (৳)</TableHead>
                    <TableHead className="font-bold">Sub-Urban (৳)</TableHead>
                    <TableHead className="font-bold">OSD Sadar (৳)</TableHead>
                    <TableHead className="font-bold">OSD Upazila (৳)</TableHead>
                    <TableHead className="font-bold">Timeline</TableHead>
                    <TableHead className="font-bold">COD Support</TableHead>
                    <TableHead className="font-bold">Active at Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {/* Service 1A: Steadfast Standard Delivery */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          📦 Steadfast Standard Delivery
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          All 64 districts regular doorstep parcel delivery (≤1kg standard)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳{rateInsideDhaka}</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">৳{rateSuburbs}</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳{rateOutsideDhakaSadar}</TableCell>
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">৳{rateOutsideDhaka}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">24h Dhaka · 48-72h National</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active (1%)" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastStdActive}
                          onCheckedChange={setSteadfastStdActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastStdActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 1B: Steadfast Same Day Express */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          ⚡ Steadfast Same Day Express
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          5–8 hour same-day express delivery within Dhaka Metro & Chittagong City
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳{rateSameDay}</TableCell>
                    <TableCell className="text-muted-foreground italic text-[10px]">Excluded (Metro)</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳{rateSameDay} <span className="text-[9px] font-normal text-muted-foreground">(Ctg)</span></TableCell>
                    <TableCell className="text-muted-foreground italic text-[10px]">Excluded (Metro)</TableCell>
                    <TableCell className="text-muted-foreground font-medium">5–8 Hours (Same Day)</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastSameDayActive}
                          onCheckedChange={setSteadfastSameDayActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastSameDayActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 1C: Steadfast Hub Point Pickup (Pick & Drop) */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          🏢 Steadfast Hub / Point Pickup
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Self-pickup from Steadfast nationwide delivery points (Pick &amp; Drop base)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳80</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">৳80</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳80</TableCell>
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">৳80</TableCell>
                    <TableCell className="text-muted-foreground font-medium">Pickup at Hub Point</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastHubPickupActive}
                          onCheckedChange={setSteadfastHubPickupActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastHubPickupActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 1D: Steadfast Priority Express */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          🚀 Steadfast Priority Express
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Fast-track priority handling &amp; expedited queue dispatch (+৳40)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳{Number(rateInsideDhaka) + 40}</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">৳{Number(rateSuburbs) + 40}</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳{Number(rateOutsideDhakaSadar) + 40}</TableCell>
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">৳{Number(rateOutsideDhaka) + 40}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">24–48 Hours Fast Track</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastPriorityActive}
                          onCheckedChange={setSteadfastPriorityActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastPriorityActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 1E: Steadfast Book Delivery */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          📚 Steadfast Book Delivery
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Special subsidized discount shipping for books &amp; printed literature
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳55</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">৳55</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳95</TableCell>
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">৳95</TableCell>
                    <TableCell className="text-muted-foreground font-medium">48-72 Hours</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastBookActive}
                          onCheckedChange={setSteadfastBookActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastBookActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 1F: Steadfast Document Delivery */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          📄 Steadfast Document Delivery
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Flat rate letter, envelope &amp; document dispatch across all Bangladesh
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳50</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">৳50</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳50</TableCell>
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">৳50</TableCell>
                    <TableCell className="text-muted-foreground font-medium">24-48 Hours</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-4.5 px-1.5 ${codEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none" : "bg-muted text-muted-foreground"}`}>
                        {codEnabled ? "COD Active" : "Prepaid Only"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={steadfastDocActive}
                          onCheckedChange={setSteadfastDocActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {steadfastDocActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── SERVICE 2: 🟢 Pathao Courier Delivery Services (Live API Dynamic Engine) ── */}
        <Card className="rounded-2xl border border-emerald-500/25 bg-card/90 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-emerald-500/20 bg-emerald-500/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-600 text-xs">
                  PT
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                    Pathao Courier Delivery Services
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      🟢 Live API Dynamic Pricing
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Connected to Pathao Aladdin API pricing engine for live intra-city &amp; inter-district rate calculation.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleSyncPathaoRates}
                  disabled={pathaoSyncingRates}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pathaoSyncingRates ? "animate-spin" : ""}`} />
                  {pathaoSyncingRates ? "Syncing API..." : "Auto-Sync Pathao Rates"}
                </Button>
                <Badge variant="outline" className="text-[10px] font-mono bg-background border-emerald-500/30">
                  {pathaoLiveRates?.last_synced_at
                    ? `🟢 Synced ${new Date(pathaoLiveRates.last_synced_at).toLocaleTimeString()}`
                    : isPathaoConfigured
                    ? "🟢 API Connected"
                    : "⚪ API Keys Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="text-xs">
                    <TableHead className="font-bold">Pathao Service Tier</TableHead>
                    <TableHead className="font-bold">Intra-City (0.5kg)</TableHead>
                    <TableHead className="font-bold">Intra-City (1.0kg)</TableHead>
                    <TableHead className="font-bold">Inter-City (0.5kg)</TableHead>
                    <TableHead className="font-bold">Inter-City (1.0kg)</TableHead>
                    <TableHead className="font-bold">Weight Extra</TableHead>
                    <TableHead className="font-bold">Timeline</TableHead>
                    <TableHead className="font-bold">COD Rate</TableHead>
                    <TableHead className="font-bold">Active at Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {/* Service 2A: Pathao 48h Next-Day Standard Parcel */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          🟢 Pathao 48h Standard Delivery (Parcel)
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Official Next-Day doorstep delivery across all 64 Bangladesh districts (Item Type: 2, Delivery Type: 48)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoLiveRates?.intra_city?.parcel_standard_half_kg ?? 60}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoLiveRates?.intra_city?.parcel_standard_1kg ?? 70}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{pathaoLiveRates?.inter_city?.parcel_standard_half_kg ?? 110}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{pathaoLiveRates?.inter_city?.parcel_standard_1kg ?? 130}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px]">
                      +৳{pathaoLiveRates?.extra_kg_charge ?? 20}/kg
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">24–48 Hours</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] h-4.5 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-mono">
                        {pathaoLiveRates?.intra_city?.cod_percentage ? `${(pathaoLiveRates.intra_city.cod_percentage * 100).toFixed(0)}% COD` : "1% COD"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pathaoExpActive}
                          onCheckedChange={setPathaoExpActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {pathaoExpActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 2B: Pathao 12h On-Demand Same-Day Express */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          ⚡ Pathao 12h On-Demand Express (Same Day)
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Urgent same-day parcel delivery inside city metro (Item Type: 2, Delivery Type: 12)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoLiveRates?.intra_city?.parcel_ondemand_half_kg ?? 120}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{(pathaoLiveRates?.intra_city?.parcel_ondemand_half_kg ?? 120) + (pathaoLiveRates?.extra_kg_charge ?? 20)}
                    </TableCell>
                    <TableCell className="text-muted-foreground italic text-[10px]">Excluded (Metro Only)</TableCell>
                    <TableCell className="text-muted-foreground italic text-[10px]">Excluded (Metro Only)</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px]">
                      +৳{pathaoLiveRates?.extra_kg_charge ?? 20}/kg
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">6–12 Hours (Same Day)</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] h-4.5 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-mono">
                        {pathaoLiveRates?.intra_city?.cod_percentage ? `${(pathaoLiveRates.intra_city.cod_percentage * 100).toFixed(0)}% COD` : "1% COD"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pathaoSameDayActive}
                          onCheckedChange={setPathaoSameDayActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {pathaoSameDayActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Service 2C: Pathao 48h Document Dispatch */}
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-bold text-foreground">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          📄 Pathao Document &amp; Envelope Dispatch
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Flat rate letter, envelope, voucher &amp; invoice dispatch across Bangladesh (Item Type: 1, Delivery Type: 48)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoLiveRates?.intra_city?.document_standard ?? 25}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoLiveRates?.intra_city?.document_standard ?? 25}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{pathaoLiveRates?.inter_city?.document_standard ?? 60}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{pathaoLiveRates?.inter_city?.document_standard ?? 60}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px]">+৳10/kg</TableCell>
                    <TableCell className="text-muted-foreground font-medium">24–48 Hours</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] h-4.5 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-mono">
                        {pathaoLiveRates?.intra_city?.cod_percentage ? `${(pathaoLiveRates.intra_city.cod_percentage * 100).toFixed(0)}% COD` : "1% COD"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pathaoDocActive}
                          onCheckedChange={setPathaoDocActive}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {pathaoDocActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* ── Pathao Live Rate Calculator & Zone Inspector Panel ── */}
            <div className="p-4 sm:p-5 bg-muted/15 border-t border-border/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    Pathao Price-Plan API Calculator &amp; Live Zone Inspector
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Select any destination city and zone to test the live pricing calculated by Pathao&apos;s Aladdin pricing engine.
                  </p>
                </div>
                {pathaoSimResult && (
                  <Badge className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    Live Rate: ৳{pathaoSimResult.final_price ?? pathaoSimResult.price} (Plan #{pathaoSimResult.plan_id || 5})
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {/* Destination City */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Destination City</Label>
                  <Select value={pathaoSimCityId} onValueChange={setPathaoSimCityId}>
                    <SelectTrigger className="h-8 rounded-xl text-xs">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {pathaoCitiesList.length === 0 ? (
                        <>
                          <SelectItem value="1">Dhaka</SelectItem>
                          <SelectItem value="2">Chittagong</SelectItem>
                          <SelectItem value="3">Sylhet</SelectItem>
                          <SelectItem value="4">Rajshahi</SelectItem>
                          <SelectItem value="5">Khulna</SelectItem>
                          <SelectItem value="52">Bagerhat</SelectItem>
                        </>
                      ) : (
                        pathaoCitiesList.map((c) => (
                          <SelectItem key={c.city_id} value={String(c.city_id)}>
                            {c.city_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Zone */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Destination Zone</Label>
                  <Select value={pathaoSimZoneId} onValueChange={setPathaoSimZoneId}>
                    <SelectTrigger className="h-8 rounded-xl text-xs">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {pathaoZonesList.length === 0 ? (
                        <SelectItem value="52">Adabor (Dhaka)</SelectItem>
                      ) : (
                        pathaoZonesList.map((z) => (
                          <SelectItem key={z.zone_id} value={String(z.zone_id)}>
                            {z.zone_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Item Type */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Item Type</Label>
                  <Select value={pathaoSimItemType} onValueChange={setPathaoSimItemType}>
                    <SelectTrigger className="h-8 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="2">Parcel (Type 2)</SelectItem>
                      <SelectItem value="1">Document (Type 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Type */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Delivery Type</Label>
                  <Select value={pathaoSimDeliveryType} onValueChange={setPathaoSimDeliveryType}>
                    <SelectTrigger className="h-8 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="48">48h Normal Next-Day</SelectItem>
                      <SelectItem value="12">12h On-Demand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Weight + Action */}
                <div className="space-y-1 col-span-2 sm:col-span-1 flex flex-col justify-end">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className="h-8 rounded-xl text-xs font-mono w-20"
                      value={pathaoSimWeight}
                      onChange={(e) => setPathaoSimWeight(e.target.value)}
                      placeholder="kg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={handleRunPathaoSim}
                      disabled={pathaoSimLoading}
                    >
                      {pathaoSimLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Query API
                    </Button>
                  </div>
                </div>
              </div>

              {pathaoSimResult && (
                <div className="mt-2 p-3 rounded-xl bg-background border border-emerald-500/25 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Base Delivery:</span>
                    <p className="font-mono font-bold text-foreground">৳{pathaoSimResult.price}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Additional Charge:</span>
                    <p className="font-mono font-bold text-foreground">৳{pathaoSimResult.additional_charge || 0}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Merchant Plan:</span>
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Plan #{pathaoSimResult.plan_id || 5}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Total Charge:</span>
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{pathaoSimResult.final_price ?? pathaoSimResult.price}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── SERVICE 3: 🏪 Physical Store & Warehouse Self-Pickup ── */}
        <Card className="rounded-2xl border border-blue-500/25 bg-card/90 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-blue-500/20 bg-blue-500/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-bold text-blue-600 text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    In-Store &amp; Warehouse Pickup Services
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                      🏪 100% Free Self-Collection
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Allow buyers to pick up their orders in person with zero shipping fee at official brand outlets &amp; dispatch hubs.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {storePickupActive ? "Active at Checkout" : "Disabled"}
                </span>
                <Switch checked={storePickupActive} onCheckedChange={setStorePickupActive} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-foreground">Flagship Storefront Pickup</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                    ৳0 Free
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Buyers visit the main showroom location to inspect and collect orders directly.
                </p>
                <div className="text-[10px] font-mono text-muted-foreground pt-1 flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-blue-500" />
                  <span>{merchantOriginAddress || "Dhanmondi, Dhaka"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-border/80 bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Branch Dispatch Hubs ({hubs.length})</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6.5 text-[10px] rounded-lg gap-1 border-primary/30 text-primary"
                    onClick={() => {
                      setEditingHub({
                        hub_name: "",
                        city: "Dhaka",
                        area: "",
                        address: "",
                        contact_phone: "",
                        is_pickup_point: true,
                        provider: "self",
                      });
                      setHubDialogOpen(true);
                    }}
                  >
                    <Plus className="w-3 h-3" /> Add Hub
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Configured physical branch hubs in the dispatch manager where customer self-collection is permitted.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hubs.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">No branch hubs configured yet.</span>
                  ) : (
                    hubs.map((h) => (
                      <Badge key={h.id} variant="secondary" className="text-[9px] font-normal">
                        📍 {h.hub_name} ({h.city})
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 5: Courier API Credentials & Real-Time Tracking Webhook ── */}
      <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                Courier API Credentials & Real-Time Webhook Health
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Steadfast & Pathao merchant API credentials, webhook callbacks, and live status verification.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Default Partner:</span>
              <Select value={defaultCourier} onValueChange={setDefaultCourier}>
                <SelectTrigger className="w-[140px] h-8 rounded-xl text-xs font-bold font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="steadfast">Steadfast Courier</SelectItem>
                  <SelectItem value="pathao">Pathao Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Dual Webhook Status & Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steadfast Webhook Listener Card */}
            <div className="p-4 rounded-2xl border border-red-500/25 bg-red-500/[0.03] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    Steadfast Webhook Listener
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Live delivery status updates (in transit, delivered, cancelled)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    🟢 Active
                  </Badge>
                  <Button
                    onClick={handleTestWebhookPing}
                    disabled={webhookTesting}
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-7 text-[11px] font-bold gap-1 border-red-500/40 text-red-600 hover:bg-red-500/10"
                  >
                    {webhookTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Ping Test
                  </Button>
                </div>
              </div>

              {webhookLastTested && (
                <div className={`p-2 rounded-xl text-[11px] flex items-center justify-between ${
                  webhookLastTested.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
                }`}>
                  <span>{webhookLastTested.message}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{webhookLastTested.time}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground">Callback Endpoint URL:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Input
                      readOnly
                      value="https://shop.orizino.com/api/webhooks/steadfast"
                      className="h-8 rounded-lg text-[10px] font-mono bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-[11px] shrink-0 gap-1 font-semibold"
                      onClick={() => {
                        navigator.clipboard.writeText("https://shop.orizino.com/api/webhooks/steadfast");
                        toast.success("Steadfast callback URL copied!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground">Secret Token (Bearer Auth):</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Input
                      readOnly
                      value="7a546582cfefd4faf812e3b921f50aa4ab089dcef2423c58279f1699a29be6af"
                      className="h-8 rounded-lg text-[10px] font-mono bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-[11px] shrink-0 gap-1 font-semibold"
                      onClick={() => {
                        navigator.clipboard.writeText("7a546582cfefd4faf812e3b921f50aa4ab089dcef2423c58279f1699a29be6af");
                        toast.success("Secret token copied!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pathao Webhook Listener Card */}
            <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    Pathao Webhook Listener
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Live delivery status updates &amp; automated COD payment settlement
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    🟢 Active
                  </Badge>
                  <Button
                    onClick={handleTestPathaoWebhookPing}
                    disabled={pathaoWebhookTesting}
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-7 text-[11px] font-bold gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    {pathaoWebhookTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Ping Test
                  </Button>
                </div>
              </div>

              {pathaoWebhookLastTested && (
                <div className={`p-2 rounded-xl text-[11px] flex items-center justify-between ${
                  pathaoWebhookLastTested.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
                }`}>
                  <span>{pathaoWebhookLastTested.message}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{pathaoWebhookLastTested.time}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground">Callback Endpoint URL (Public HTTPS):</span>
                    <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                      HTTP 202 Handshake Ready
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Input
                      readOnly
                      value="https://shop.orizino.com/api/webhooks/pathao"
                      className="h-8 rounded-lg text-[10px] font-mono bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-[11px] shrink-0 gap-1 font-semibold"
                      onClick={() => {
                        navigator.clipboard.writeText("https://shop.orizino.com/api/webhooks/pathao");
                        toast.success("Pathao callback URL copied!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground">Webhook Secret Token:</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Header: X-PATHAO-Signature</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Input
                      value={pathaoWebhookSecret}
                      onChange={(e) => setPathaoWebhookSecret(e.target.value)}
                      placeholder="f3992ecc-59da-4cbe-a049-a13da2018d51"
                      className="h-8 rounded-lg text-[10px] font-mono bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-[11px] shrink-0 gap-1 font-semibold"
                      onClick={() => {
                        navigator.clipboard.writeText(pathaoWebhookSecret);
                        toast.success("Pathao webhook secret copied!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Auto-returns header <code className="font-mono text-emerald-600 bg-muted px-1 py-0.5 rounded">X-Pathao-Merchant-Webhook-Integration-Secret</code> with status <strong className="text-foreground">202 Accepted</strong> during Pathao portal verification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Webhook Events Stream */}
          {recentWebhookEvents.length > 0 && (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Live Courier Webhook Telemetry Stream ({recentWebhookEvents.length} Events):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recentWebhookEvents.map((event: any) => (
                  <div key={event.id} className="p-2.5 rounded-xl bg-background/90 border border-border/70 text-[11px] space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] font-mono px-1 py-0 ${event.courier === "pathao" ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"}`}>
                          {event.courier === "pathao" ? "PT" : "SF"}
                        </Badge>
                        <span className="font-mono font-bold text-foreground truncate max-w-[100px]">{event.displayInvoice}</span>
                      </div>
                      <Badge className="text-[9px] h-4 px-1 capitalize bg-primary/10 text-primary border-none">{event.displayStatus}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{event.displayMessage}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{new Date(event.updated_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courier Credentials 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steadfast Courier Box */}
            <div className="p-4 rounded-2xl border border-red-500/25 bg-red-500/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center font-bold text-red-600 text-xs">
                    SF
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Steadfast Courier API</h3>
                    <p className="text-[10px] text-muted-foreground">Nationwide doorstep &amp; hub dispatch</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    isSteadfastConfigured
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isSteadfastConfigured ? "🟢 Active" : "⚪ Missing Keys"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-semibold">API Key (Api-Key)</Label>
                  <div className="relative mt-1">
                    <Input
                      type={revealed.has("sf_key") ? "text" : "password"}
                      value={steadfastApiKey}
                      onChange={(e) => setSteadfastApiKey(e.target.value)}
                      placeholder={secretStatus?.STEADFAST_API_KEY ? "•••••••••••••••• (Configured)" : "Paste Steadfast API Key"}
                      className="h-9 pr-9 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("sf_key")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {revealed.has("sf_key") ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Secret Key (Secret-Key)</Label>
                  <div className="relative mt-1">
                    <Input
                      type={revealed.has("sf_sec") ? "text" : "password"}
                      value={steadfastSecretKey}
                      onChange={(e) => setSteadfastSecretKey(e.target.value)}
                      placeholder={secretStatus?.STEADFAST_SECRET_KEY ? "•••••••••••••••• (Configured)" : "Paste Steadfast Secret Key"}
                      className="h-9 pr-9 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("sf_sec")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {revealed.has("sf_sec") ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pathao Courier Box */}
            <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.02] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-600 text-xs">
                    PT
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">Pathao Courier API v1</h3>
                    <p className="text-[10px] text-muted-foreground">Instant dispatch &amp; express metro deliveries</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pathaoEnv} onValueChange={(v: any) => {
                    setPathaoEnv(v);
                    const pathaoCreds = siteSettings?.pathao_credentials || {};
                    const pathaoPub = siteSettings?.pathao_public_config || {};
                    if (v === "sandbox") {
                      setPathaoClientId(pathaoCreds.sandbox_client_id || "7N1aMJQbWm");
                      setPathaoClientSecret(pathaoCreds.sandbox_client_secret || "wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39");
                      setPathaoUsername(pathaoCreds.sandbox_username || "test@pathao.com");
                      setPathaoPassword(pathaoCreds.sandbox_password || "lovePathao");
                      if (pathaoPub.sandbox_store_id) setPathaoStoreId(String(pathaoPub.sandbox_store_id));
                    } else {
                      setPathaoClientId(pathaoCreds.live_client_id || "");
                      setPathaoClientSecret(pathaoCreds.live_client_secret || "");
                      setPathaoUsername(pathaoCreds.live_username || "");
                      setPathaoPassword(pathaoCreds.live_password || "");
                      if (pathaoPub.live_store_id) setPathaoStoreId(String(pathaoPub.live_store_id));
                    }
                  }}>
                    <SelectTrigger className="w-[105px] h-7 rounded-lg text-[10px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="live">Live API</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      isPathaoConfigured
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPathaoConfigured ? "🟢 Active" : "⚪ Missing Keys"}
                  </Badge>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {pathaoEnv === "sandbox" && (
                  <Button
                    type="button"
                    onClick={handleFillPathaoSandboxPreset}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] rounded-lg border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                  >
                    Fill Sandbox Test Preset
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleTestPathaoConnection}
                  disabled={pathaoTesting}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] rounded-lg border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1"
                >
                  {pathaoTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Test Connection &amp; Fetch Stores
                </Button>
              </div>

              {pathaoTestResult && (
                <div className={`p-2.5 rounded-xl text-[11px] flex items-center justify-between ${
                  pathaoTestResult.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
                }`}>
                  <span>{pathaoTestResult.message}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{pathaoTestResult.time}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">Store ID (Pickup Location)</Label>
                    {pathaoStores.length > 0 && (
                      <span className="text-[9px] text-emerald-600 font-bold">{pathaoStores.length} Stores Synced</span>
                    )}
                  </div>
                  {pathaoStores.length > 0 ? (
                    <Select value={pathaoStoreId} onValueChange={setPathaoStoreId}>
                      <SelectTrigger className="h-9 rounded-xl text-xs font-mono mt-1">
                        <SelectValue placeholder="Select Pickup Store" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {pathaoStores.map((st) => (
                          <SelectItem key={st.store_id} value={String(st.store_id)}>
                            {st.store_name} (ID: {st.store_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      value={pathaoStoreId}
                      onChange={(e) => setPathaoStoreId(e.target.value)}
                      placeholder="e.g. 12948"
                      className="h-9 rounded-xl text-xs font-mono mt-1"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Username / Login Email</Label>
                  <Input
                    value={pathaoUsername}
                    onChange={(e) => setPathaoUsername(e.target.value)}
                    placeholder={secretStatus?.PATHAO_LIVE_USERNAME ? "Configured" : "test@pathao.com"}
                    className="h-9 rounded-xl text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Client ID</Label>
                  <div className="relative mt-1">
                    <Input
                      type={revealed.has("pt_id") ? "text" : "password"}
                      value={pathaoClientId}
                      onChange={(e) => setPathaoClientId(e.target.value)}
                      placeholder="Pathao Client ID"
                      className="h-9 pr-9 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("pt_id")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {revealed.has("pt_id") ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Client Secret</Label>
                  <div className="relative mt-1">
                    <Input
                      type={revealed.has("pt_sec") ? "text" : "password"}
                      value={pathaoClientSecret}
                      onChange={(e) => setPathaoClientSecret(e.target.value)}
                      placeholder="Pathao Client Secret"
                      className="h-9 pr-9 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("pt_sec")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {revealed.has("pt_sec") ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={revealed.has("pt_pwd") ? "text" : "password"}
                      value={pathaoPassword}
                      onChange={(e) => setPathaoPassword(e.target.value)}
                      placeholder="Pathao Login Password"
                      className="h-9 pr-9 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal("pt_pwd")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {revealed.has("pt_pwd") ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Dispatch Toggle */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/[0.02] flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Automatic Consignment Creation on Order Confirmation
              </p>
              <p className="text-[11px] text-muted-foreground">
                When enabled, marking an order as &quot;Processing&quot; or &quot;Confirmed&quot; will automatically book the parcel with your default courier.
              </p>
            </div>
            <Switch
              checked={autoCreateShipment}
              onCheckedChange={setAutoCreateShipment}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 6: Live Route & Tariff Simulator ── */}
      <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <CalculatorIcon className="w-4 h-4 text-primary" />
            Live Route & Delivery Fee Simulator
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Test and preview calculated delivery rates for any origin-destination route in Bangladesh.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Simulator Input Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-[11px] font-semibold">Dispatch Origin</Label>
              <Select value={simOriginDistrict} onValueChange={setSimOriginDistrict}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs mt-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {BD_COURIER_LOCATIONS.map((l) => (
                    <SelectItem key={l.district} value={l.district}>
                      {l.district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Destination District</Label>
              <Select value={simDistrict} onValueChange={(v) => {
                setSimDistrict(v);
                const match = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === v.toLowerCase());
                if (match && match.thanas.length > 0) setSimThana(match.thanas[0]);
              }}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs mt-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {BD_COURIER_LOCATIONS.map((l) => (
                    <SelectItem key={l.district} value={l.district}>
                      {l.district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Destination Thana</Label>
              <Select value={simThana} onValueChange={setSimThana}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {(BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === simDistrict.toLowerCase())?.thanas || ["Sadar"]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={simWeight}
                onChange={(e) => setSimWeight(e.target.value)}
                className="h-8.5 rounded-xl text-xs font-mono mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Subtotal (৳)</Label>
              <Input
                type="number"
                value={simSubtotal}
                onChange={(e) => setSimSubtotal(e.target.value)}
                className="h-8.5 rounded-xl text-xs font-mono font-bold mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Payment Option</Label>
              <Select value={simIsCod ? "cod" : "prepaid"} onValueChange={(v) => setSimIsCod(v === "cod")}>
                <SelectTrigger className="h-8.5 rounded-xl text-xs mt-1 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="prepaid">Online Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/[0.04] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                  {simulatedRate.zoneType === "inside_dhaka" ? "🏙️ Inside Dhaka / Same City" : simulatedRate.zoneType === "suburbs" ? "🏡 Sub-Urban Route" : simulatedRate.zoneType === "outside_dhaka_sadar" ? "🏢 District Sadar Headquarter" : "🚚 Rural Upazila / Inter-District"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  SLA: {simulatedRate.deliveryDays}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Partner: {simulatedRate.courierName}
                </Badge>
                {simulatedRate.isFreeQualified && (
                  <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                    🎁 Free Shipping Qualified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Base Fee: ৳{simulatedRate.baseZonePrice} {simulatedRate.isFreeQualified ? "(Discounted to ৳0)" : ""} · Excess Weight: +৳{simulatedRate.weightSurcharge} ({simWeight}kg) · COD Fee: +৳{simulatedRate.appliedCodFee}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Calculated Delivery Fee</span>
              <p className="text-2xl font-black text-foreground font-mono text-emerald-600 dark:text-emerald-400">
                {simulatedRate.price === 0 ? "FREE" : `৳${simulatedRate.price}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 7: Internal Order Connection & Live Dispatch Stream ── */}
      <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Internal Order Connection & Live Dispatch Stream
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Real-time connection stream showing store customer orders and their courier consignment statuses.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchOrders()}
              className="rounded-xl h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="font-bold">Order #</TableHead>
                  <TableHead className="font-bold">Customer & City</TableHead>
                  <TableHead className="font-bold">Total (৳)</TableHead>
                  <TableHead className="font-bold">Delivery Fee (৳)</TableHead>
                  <TableHead className="font-bold">Courier & Tracking</TableHead>
                  <TableHead className="font-bold">Order Status</TableHead>
                  <TableHead className="font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {loadingOrders ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-primary" /> Loading live dispatch orders…
                    </TableCell>
                  </TableRow>
                ) : recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders found yet. Customer orders placed at storefront checkout will appear here automatically.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order: any) => {
                    const addr: any = order.shipping_address || {};
                    const pathao: any = order.pathao_shipments?.[0];
                    const steadfast: any = order.steadfast_shipments?.[0];
                    const trackingCode = pathao?.consignment_id || steadfast?.tracking_code || order.tracking_number;
                    const courierName = pathao ? "Pathao" : steadfast ? "Steadfast" : order.preferred_courier || "Standard";

                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-foreground">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-foreground">{addr.full_name || "Guest Customer"}</span>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {addr.city || "Dhaka"} {addr.state ? `· ${addr.state}` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          ৳{order.total}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {Number(order.shipping_fee) === 0 ? "FREE" : `৳${order.shipping_fee}`}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="text-[10px] font-bold capitalize">
                              {courierName}
                            </Badge>
                            {trackingCode && (
                              <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[130px]">
                                {trackingCode}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] h-4.5 px-1.5 capitalize ${
                              order.status === "delivered"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none"
                                : order.status === "cancelled"
                                  ? "bg-destructive/15 text-destructive border-none"
                                  : "bg-primary/10 text-primary border-none"
                            }`}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary"
                            onClick={() => {
                              setTrackInput(order.order_number || trackingCode || order.id);
                              handleLiveTrack();
                            }}
                          >
                            Track <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 8: Real-Time Parcel Tracking & Consignment Tester ── */}
      <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Live Courier Tracking & Consignment Tester
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Test and verify parcel tracking directly against courier API endpoints.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="Enter Order # (e.g. OZ-1049) or Courier Tracking Code..."
              className="h-10 rounded-xl text-xs font-mono flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleLiveTrack()}
            />
            <Button
              onClick={handleLiveTrack}
              disabled={trackingLoading}
              className="rounded-xl h-10 px-5 text-xs font-bold gap-2 w-full sm:w-auto"
            >
              {trackingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track Shipment
            </Button>
          </div>

          {trackResult && (
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3 mt-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">{trackResult.courier}</span>
                </div>
                <Badge className="bg-primary/15 text-primary text-[10px] font-bold border-none">
                  {trackResult.courierStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground">Tracking Code</span>
                  <p className="font-mono font-bold text-foreground">{trackResult.trackingCode}</p>
                </div>
                {trackResult.orderNumber && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Order Number</span>
                    <p className="font-mono font-bold text-foreground">{trackResult.orderNumber}</p>
                  </div>
                )}
                {trackResult.total && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Order Total</span>
                    <p className="font-bold text-foreground">৳{trackResult.total}</p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-muted-foreground">Checked At</span>
                  <p className="text-muted-foreground font-mono">{trackResult.timestamp}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Add/Edit Hub ── */}
      <Dialog open={hubDialogOpen} onOpenChange={setHubDialogOpen}>
        <DialogContent className="w-[94vw] sm:max-w-lg p-5 rounded-2xl sm:rounded-3xl border border-border/80 shadow-2xl flex flex-col bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {editingHub?.id ? "Edit Dispatch Hub" : "Add Dispatch Hub"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure physical dispatch locations and customer pickup points.
            </DialogDescription>
          </DialogHeader>

          {editingHub && (
            <div className="space-y-3.5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Hub / Branch Name *</Label>
                  <Input
                    value={editingHub.hub_name}
                    onChange={(e) => setEditingHub({ ...editingHub, hub_name: e.target.value })}
                    placeholder="e.g. Dhanmondi Warehouse"
                    className="h-9 rounded-xl text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Partner Provider</Label>
                  <Select
                    value={editingHub.provider}
                    onValueChange={(v) => setEditingHub({ ...editingHub, provider: v })}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="steadfast">Steadfast Hub</SelectItem>
                      <SelectItem value="pathao">Pathao Hub</SelectItem>
                      <SelectItem value="self">Self / In-House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">City / District *</Label>
                  <Input
                    value={editingHub.city}
                    onChange={(e) => setEditingHub({ ...editingHub, city: e.target.value })}
                    placeholder="e.g. Dhaka"
                    className="h-9 rounded-xl text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Thana / Area</Label>
                  <Input
                    value={editingHub.area ?? ""}
                    onChange={(e) => setEditingHub({ ...editingHub, area: e.target.value })}
                    placeholder="e.g. Dhanmondi 27"
                    className="h-9 rounded-xl text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Full Address *</Label>
                <Input
                  value={editingHub.address}
                  onChange={(e) => setEditingHub({ ...editingHub, address: e.target.value })}
                  placeholder="House #, Road #, Sector/Block..."
                  className="h-9 rounded-xl text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Contact Phone</Label>
                  <Input
                    value={editingHub.contact_phone ?? ""}
                    onChange={(e) => setEditingHub({ ...editingHub, contact_phone: e.target.value })}
                    placeholder="+880 1700-000000"
                    className="h-9 rounded-xl text-xs mt-1"
                  />
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    checked={editingHub.is_pickup_point}
                    onCheckedChange={(v) => setEditingHub({ ...editingHub, is_pickup_point: v })}
                  />
                  <Label className="text-xs font-medium cursor-pointer">Allow Customer Pickup</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHubDialogOpen(false)}
              className="rounded-xl h-8.5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editingHub?.hub_name?.trim() || !editingHub?.city?.trim()) {
                  toast.error("Hub name and city are required");
                  return;
                }
                saveHubMutation.mutate(editingHub);
              }}
              disabled={saveHubMutation.isPending}
              className="rounded-xl h-8.5 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Hub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalculatorIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  );
}
