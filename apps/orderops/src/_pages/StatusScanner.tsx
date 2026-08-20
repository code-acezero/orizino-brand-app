import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMasterPanelDesigns } from "@/lib/design-presets";
import { printInvoicePdf, printThermalSlip, printShippingSticker } from "@/lib/invoice-pdf";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { lookupSerial, type SerialLookupRow } from "@/lib/serials";
import { createOfflineOrder, type OfflineSource } from "@/lib/offline-orders";
import { supabase } from "@/lib/supabase";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import { Label } from "@ui/components/ui/label";
import { Textarea } from "@ui/components/ui/textarea";
import { Checkbox } from "@ui/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast } from "sonner";
import {
  Camera,
  X,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Printer,
  FileText,
  Mail,
  Download,
  Save,
  ScanLine,
  RotateCcw,
  Sparkles,
  Barcode,
  Package,
  Boxes,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Phone,
  MapPin,
  Store,
  ShoppingCart,
  AlertTriangle,
  RotateCcw as ReturnIcon,
  Ban,
  AlertCircle,
  Share2,
  MessageCircle,
  Music2,
  Receipt,
  Truck,
  Compass,
  ClipboardPaste,
  Copy,
  Tag
} from "lucide-react";
import {
  extractSerialCode,
  parseChatForCustomerInfo,
  detectLocationFromAddress,
  calculateCourierRate,
  BD_COURIER_LOCATIONS,
  type ParsedCustomerInfo,
} from "@orizino/shared";
import { generateInvoice, printInvoiceHtml, printThermalSlipHtml } from "@/lib/invoice";
import { format } from "date-fns";

const sb = supabase as any;

export type BatchMode = "available" | "sold" | null;

export type ScannerStage =
  | "camera"
  | "review_list"
  | "select_order"
  | "connected_orders"
  | "order_status_actions"
  | "offline_order_form"
  | "order_confirmed_actions";

export interface ScannedUnit {
  serialId: string;
  serialCode: string;
  productId: string;
  variantId: string | null;
  productName: string;
  unitPrice: number;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  status: "available" | "sold" | "cancelled" | "returned" | "defective";
  isDefective?: boolean;
  soldOrderId?: string | null;
  orderInfo?: {
    id: string;
    order_number: string;
    customer_name: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    status: string;
    total: number;
    created_at: string;
    shipping_address?: any;
  } | null;
}

interface OrderRecord {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  order_source?: string;
  created_at: string;
  customer_name?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  shipping_address?: any;
  order_items: {
    id: string;
    product_id: string;
    variant_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    products?: { name: string; sku: string; price: number };
  }[];
  product_serials?: { id: string; serial_code: string; product_id: string }[];
}

import { FacebookIcon, WhatsAppIcon, TikTokIcon, InstagramIcon } from "./WalkInOrders";

const OFFLINE_CHANNEL_OPTIONS: { value: OfflineSource; label: string; short: string; icon: any }[] = [
  { value: "offline", label: "Walk-in Store (Counter)", short: "Walk-in", icon: Store },
  { value: "page", label: "Facebook Page", short: "Facebook", icon: FacebookIcon },
  { value: "whatsapp", label: "WhatsApp Order", short: "WhatsApp", icon: WhatsAppIcon },
  { value: "tiktok", label: "TikTok Shop / Live", short: "TikTok", icon: TikTokIcon },
  { value: "instagram", label: "Instagram Direct", short: "Instagram", icon: InstagramIcon },
];

export function StatusScanner() {
  const qc = useQueryClient();
  const { brand, invoiceSettings, posSettings, shippingStickerPreset } = useMasterPanelDesigns();

  // Active navigation stage
  const [stage, setStage] = useState<ScannerStage>("camera");

  // Mode C (Offline Order Direct) - Persisted across consecutive scans in temporary session
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("orderops.scanner.offline_mode") === "true";
    } catch {
      return false;
    }
  });

  const toggleOfflineMode = (val: boolean) => {
    setIsOfflineMode(val);
    try {
      sessionStorage.setItem("orderops.scanner.offline_mode", String(val));
    } catch {}
  };

  // Batch Mode locked by the 1st scanned item
  const [batchMode, setBatchMode] = useState<BatchMode>(null);

  // Scanned items collection
  const [scannedUnits, setScannedUnits] = useState<ScannedUnit[]>([]);
  const [expandedProductKeys, setExpandedProductKeys] = useState<Record<string, boolean>>({});

  // Manual code entry inside camera stage
  const [manualCode, setManualCode] = useState("");
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);

  // Mode A: Selected Order for Allocation
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("pending");
  const [customTargetStatus, setCustomTargetStatus] = useState<string>("confirmed");

  // Mode B: Returns / Order Disposition States
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [orderDispositionActions, setOrderDispositionActions] = useState<
    Record<
      string,
      {
        orderStatus: string;
        serialAction: "returned" | "rejected_or_cancelled";
        isDefective: boolean;
      }
    >
  >({});

  // Mode C: Offline Order Direct Form States
  const [offlineSource, setOfflineSource] = useState<OfflineSource>("offline");
  const [offlineCustomerName, setOfflineCustomerName] = useState("");
  const [offlinePhone, setOfflinePhone] = useState("");
  const [offlineEmail, setOfflineEmail] = useState("");
  const [offlineAddress, setOfflineAddress] = useState("");
  const [offlineDistrict, setOfflineDistrict] = useState("Dhaka");
  const [offlineThana, setOfflineThana] = useState("Dhanmondi");
  const [offlinePostalCode, setOfflinePostalCode] = useState("");
  const [offlineNotes, setOfflineNotes] = useState("");
  const [offlineShippingFee, setOfflineShippingFee] = useState<number>(0);
  const [offlineIsCod, setOfflineIsCod] = useState<boolean>(true);
  const [offlineIsPrepaid, setOfflineIsPrepaid] = useState<boolean>(false);
  const [offlinePaymentMethod, setOfflinePaymentMethod] = useState<string>("cash");
  const [offlineDiscount, setOfflineDiscount] = useState<number>(0);
  const [offlinePushToCourier, setOfflinePushToCourier] = useState<boolean>(true);
  const [offlineCourierProvider, setOfflineCourierProvider] = useState<"steadfast" | "pathao">("steadfast");

  // Mode C: Chat Extractor States
  const [offlineChatText, setOfflineChatText] = useState("");
  const [offlineChatBoxOpen, setOfflineChatBoxOpen] = useState(true);
  const [offlineParsedChat, setOfflineParsedChat] = useState<ParsedCustomerInfo | null>(null);

  // Completed Order Result (for Mode C confirmation)
  const [createdOrderResult, setCreatedOrderResult] = useState<{ order: any; items: any[]; courierResult?: any } | null>(null);
  const [offlineEmailOverride, setOfflineEmailOverride] = useState("");

  // Mutation loader states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Fetch only actionable orders for Mode A (pending / processing / confirmed / saved)
  const { data: rawOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery<OrderRecord[]>({
    queryKey: ["orderops-scanner-target-orders"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("orders")
        .select(`
          id, order_number, status, total, subtotal, order_source, created_at,
          customer_name, guest_name, guest_phone, guest_email, shipping_address,
          order_items (
            id, product_id, variant_id, product_name, quantity, unit_price,
            products ( name, sku, price )
          ),
          product_serials (
            id, serial_code, product_id
          )
        `)
        .not("status", "in", '("delivered","rejected","returned","cancelled","in_transit","dispatched")')
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        toast.error("Failed to load eligible orders");
        return [];
      }
      return data || [];
    },
  });

  // Filtered target orders for Mode A
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((o) => {
      if (orderStatusFilter === "pending" && !["pending", "pending_payment", "processing"].includes(o.status)) {
        return false;
      }
      if (orderStatusFilter === "confirmed" && o.status !== "confirmed") {
        return false;
      }

      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      const num = (o.order_number || "").toLowerCase();
      const name = (o.customer_name || o.guest_name || "").toLowerCase();
      const phone = (o.guest_phone || "").toLowerCase();
      return num.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [rawOrders, orderStatusFilter, orderSearch]);

  // Dynamic available thanas for Mode C district
  const availableThanas = useMemo(() => {
    const loc = BD_COURIER_LOCATIONS.find(
      (l) => l.district.toLowerCase() === (offlineDistrict || "Dhaka").toLowerCase()
    );
    return loc?.thanas || ["Sadar", "Mirpur", "Uttara", "Gulshan", "Dhanmondi"];
  }, [offlineDistrict]);

  // Grouped products representation
  const groupedProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        productId: string;
        variantId: string | null;
        productName: string;
        unitPrice: number;
        sku?: string | null;
        size?: string | null;
        color?: string | null;
        serials: ScannedUnit[];
      }
    >();

    for (const unit of scannedUnits) {
      const key = `${unit.productId}::${unit.variantId || "default"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: unit.productId,
          variantId: unit.variantId,
          productName: unit.productName,
          unitPrice: unit.unitPrice,
          sku: unit.sku,
          size: unit.size,
          color: unit.color,
          serials: [],
        });
      }
      map.get(key)!.serials.push(unit);
    }

    return [...map.values()];
  }, [scannedUnits]);

  // Connected orders for Mode B (Returns)
  const connectedOrdersGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        orderId: string;
        orderNumber: string;
        orderStatus: string;
        customerName: string;
        guestPhone: string;
        totalBill: number;
        createdAt: string;
        scannedItems: ScannedUnit[];
      }
    >();

    for (const unit of scannedUnits) {
      const orderId = unit.soldOrderId || unit.orderInfo?.id || "unknown";
      const orderNum = unit.orderInfo?.order_number || (orderId !== "unknown" ? `#${orderId.substring(0, 8)}` : "Unassigned");
      const customer = unit.orderInfo?.customer_name || unit.orderInfo?.guest_name || "Customer";
      const phone = unit.orderInfo?.guest_phone || "N/A";
      const total = Number(unit.orderInfo?.total || unit.unitPrice || 0);
      const created = unit.orderInfo?.created_at || new Date().toISOString();
      const status = unit.orderInfo?.status || "sold";

      if (!map.has(orderId)) {
        map.set(orderId, {
          orderId,
          orderNumber: orderNum,
          orderStatus: status,
          customerName: customer,
          guestPhone: phone,
          totalBill: total,
          createdAt: created,
          scannedItems: [],
        });
      }
      map.get(orderId)!.scannedItems.push(unit);
    }

    return [...map.values()];
  }, [scannedUnits]);

  // Grand Total of scanned batch
  const totalBatchCount = scannedUnits.length;
  const totalBatchAmount = scannedUnits.reduce((sum, u) => sum + (u.unitPrice || 0), 0);

  // Remove a single individual serial from batch
  const removeIndividualSerial = (serialCode: string) => {
    const next = scannedUnits.filter((u) => u.serialCode !== serialCode);
    setScannedUnits(next);
    if (next.length === 0) {
      setBatchMode(null);
    }
  };

  // Remove all serials of a product group
  const removeProductGroup = (groupKey: string) => {
    const next = scannedUnits.filter((u) => `${u.productId}::${u.variantId || "default"}` !== groupKey);
    setScannedUnits(next);
    if (next.length === 0) {
      setBatchMode(null);
    }
  };

  const toggleExpandProduct = (key: string) => {
    setExpandedProductKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CORE SCAN HANDLER WITH FIRST-SCAN MODE LOCKING
  // ═════════════════════════════════════════════════════════════════════════
  const handleProductScan = useCallback(
    async (rawCode: string) => {
      const code = extractSerialCode(rawCode);
      if (!code) {
        toast.error("Invalid barcode / QR code format");
        return;
      }

      // Check duplicate scan
      if (scannedUnits.some((u) => u.serialCode.toLowerCase() === code.toLowerCase())) {
        toast.info(`Serial ${code} is already in the current batch`);
        return;
      }

      try {
        const lookup = await lookupSerial(code);
        if (!lookup) {
          toast.error(`Serial ${code} not found`);
          return;
        }

        // Determine if serial is sold vs available
        const isItemSold = lookup.status === "sold" || (!!lookup.sold_order_id && lookup.status !== "cancelled");
        const isItemAvailable = lookup.status === "available" || lookup.status === "cancelled" || (lookup.status === "returned" && !(lookup as any).is_defective);

        // FIRST SCAN MODE LOCKING
        if (batchMode === null) {
          if (isItemSold) {
            setBatchMode("sold");
            toast.info("Returns Mode Active: Order-binded product detected.");
          } else {
            setBatchMode("available");
            toast.success(isOfflineMode ? "Offline Order item added." : "Fulfillment Mode Active: Item added.");
          }
        } else if (batchMode === "available" && !isItemAvailable) {
          toast.error(`Rejected: Serial ${code} is SOLD / bound to an order. Cannot mix with available items.`);
          return;
        } else if (batchMode === "sold" && !isItemSold) {
          toast.error(`Rejected: Serial ${code} is AVAILABLE. Cannot mix with sold items in a Returns batch.`);
          return;
        }

        const variantLabel = [lookup.product_variants?.size, lookup.product_variants?.color].filter(Boolean).join(" / ");
        const displayName = variantLabel ? `${lookup.products?.name ?? "Product"} (${variantLabel})` : (lookup.products?.name ?? "Product");

        const newUnit: ScannedUnit = {
          serialId: lookup.id,
          serialCode: lookup.serial_code,
          productId: lookup.product_id,
          variantId: lookup.variant_id,
          productName: displayName,
          unitPrice: Number(lookup.products?.price ?? 0),
          sku: lookup.products?.sku ?? null,
          size: lookup.product_variants?.size ?? null,
          color: lookup.product_variants?.color ?? null,
          status: lookup.status as any,
          isDefective: (lookup as any).is_defective || lookup.status === "defective",
          soldOrderId: lookup.sold_order_id,
          orderInfo: lookup.orders || null,
        };

        setScannedUnits((prev) => [newUnit, ...prev]);

        // Auto initialize Mode B default disposition
        if (newUnit.soldOrderId) {
          setOrderDispositionActions((prev) => {
            if (prev[newUnit.soldOrderId!]) return prev;
            return {
              ...prev,
              [newUnit.soldOrderId!]: {
                orderStatus: "returned",
                serialAction: "returned",
                isDefective: false,
              },
            };
          });
        }
      } catch (err: any) {
        toast.error("Serial Lookup Error", { description: err.message || "Failed to query serial" });
      }
    },
    [scannedUnits, batchMode, isOfflineMode]
  );

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProductScan(manualCode.trim());
    setManualCode("");
    setIsManualDrawerOpen(false);
  };

  // Mode C Chat Auto-Extractor Handlers
  const handleOfflineChatTextChange = (text: string) => {
    setOfflineChatText(text);
    if (text.trim().length > 5) {
      const parsed = parseChatForCustomerInfo(text);
      setOfflineParsedChat(parsed);
    } else {
      setOfflineParsedChat(null);
    }
  };

  const applyOfflineChatInfo = () => {
    const info = offlineParsedChat || parseChatForCustomerInfo(offlineChatText);
    if (!info) return;

    if (info.name) setOfflineCustomerName(info.name);
    if (info.phone) setOfflinePhone(info.phone);
    if (info.email) setOfflineEmail(info.email);
    if (info.fullAddress) {
      setOfflineAddress(info.fullAddress);
      const loc = detectLocationFromAddress(info.fullAddress);
      if (loc.district) {
        setOfflineDistrict(loc.district);
        if (loc.thana) setOfflineThana(loc.thana);
      }
      if (loc.postalCode) setOfflinePostalCode(loc.postalCode);
    }
    if (info.notes) setOfflineNotes((prev) => (prev ? `${prev} · ${info.notes}` : info.notes));
    if (info.detectedSource) setOfflineSource(info.detectedSource as OfflineSource);

    toast.success("Auto-filled customer details from message!", {
      description: `${info.matchedFields.join(", ")} (${info.confidenceScore}% confidence)`,
    });
  };

  // Mode C: Confirm & Create Offline Order
  const handleConfirmOfflineOrder = async () => {
    if (scannedUnits.length === 0) {
      toast.error("Please scan at least 1 product");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createOfflineOrder({
        customerName: offlineCustomerName.trim() || (offlineSource === "offline" ? "Walk-in Customer" : "Customer"),
        phone: offlinePhone.trim() || undefined,
        email: offlineEmail.trim() || undefined,
        address: offlineAddress.trim() || undefined,
        district: offlineSource !== "offline" ? offlineDistrict : undefined,
        thana: offlineSource !== "offline" ? offlineThana : undefined,
        postalCode: offlinePostalCode.trim() || undefined,
        source: offlineSource,
        notes: offlineNotes.trim() || undefined,
        serialIds: scannedUnits.map((u) => u.serialId),
        shippingFee: offlineSource === "offline" ? 0 : offlineShippingFee,
        isDeliveryPrepaid: offlineSource !== "offline" && offlineIsPrepaid,
        deliveryPrepaidAmount: offlineIsPrepaid ? offlineShippingFee : 0,
        paymentMethod:
          offlineSource === "offline"
            ? offlinePaymentMethod
            : offlineIsCod
            ? "cod"
            : offlinePaymentMethod === "cash" || offlinePaymentMethod === "cod"
            ? "mfs"
            : offlinePaymentMethod,
        discount: offlineDiscount,
        pushToCourier: offlineSource !== "offline" && offlinePushToCourier,
        courierProvider: offlineCourierProvider,
      });

      setCreatedOrderResult(res);
      setStage("order_confirmed_actions");
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      toast.success(`✓ Order #${res.order.order_number} confirmed with ${scannedUnits.length} items bound!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create offline order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode A: Confirm Order & Save Allocation
  const handleConfirmAllocation = async (targetStatus: string) => {
    if (!selectedOrder) {
      toast.error("Please select an order first");
      return;
    }
    if (scannedUnits.length === 0) {
      toast.error("No scanned products to allocate");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const serialIds = scannedUnits.map((u) => u.serialId);

      // 1. Update product serials
      const { error: serErr } = await sb
        .from("product_serials")
        .update({
          status: "sold",
          sold_order_id: selectedOrder.id,
          sold_at: now,
          updated_at: now,
        })
        .in("id", serialIds);

      if (serErr) throw new Error(serErr.message);

      // 2. Log serial events
      const { data: auth } = await sb.auth.getUser();
      const eventRows = scannedUnits.map((unit) => ({
        serial_id: unit.serialId,
        action: "sell",
        from_status: unit.status,
        to_status: "sold",
        actor_id: auth?.user?.id || null,
        order_id: selectedOrder.id,
        metadata: {
          order_number: selectedOrder.order_number,
          scanner_action: "batch_allocation",
        },
      }));
      await sb.from("product_serial_events").insert(eventRows);

      // 3. Update order status
      const { error: ordErr } = await sb
        .from("orders")
        .update({
          status: targetStatus,
          updated_at: now,
        })
        .eq("id", selectedOrder.id);

      if (ordErr) throw new Error(ordErr.message);

      // 4. Stock count synchronizations
      await sb.rpc("sync_stock_from_serials");

      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      await qc.invalidateQueries({ queryKey: ["orderops-scanner-target-orders"] });

      toast.success(`✓ Order #${selectedOrder.order_number} confirmed with ${scannedUnits.length} serials bound!`);
      resetAndRestartScanner();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm order allocation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode A: Save progress only (without changing status)
  const handleSaveProgressOnly = async () => {
    if (!selectedOrder) return;
    setIsSavingDraft(true);
    try {
      const now = new Date().toISOString();
      const serialIds = scannedUnits.map((u) => u.serialId);

      const { error } = await sb
        .from("product_serials")
        .update({
          status: "sold",
          sold_order_id: selectedOrder.id,
          sold_at: now,
          updated_at: now,
        })
        .in("id", serialIds);

      if (error) throw new Error(error.message);

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orderops-scanner-target-orders"] });
      toast.success(`Progress saved: ${scannedUnits.length} serials bound to #${selectedOrder.order_number}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save progress");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Mode B: Process single order disposition
  const handleProcessOrderDisposition = async (orderGroup: (typeof connectedOrdersGrouped)[0]) => {
    const disposition = orderDispositionActions[orderGroup.orderId] || {
      orderStatus: "returned",
      serialAction: "returned",
      isDefective: false,
    };

    setIsSubmitting(true);
    try {
      const isDefective = disposition.isDefective;
      const newSerialAction = disposition.serialAction;
      const newOrderStatus = disposition.orderStatus;

      let finalSerialStatus = "returned";
      if (newSerialAction === "rejected_or_cancelled") {
        finalSerialStatus = "cancelled";
      } else {
        finalSerialStatus = "returned";
      }

      for (const item of orderGroup.scannedItems) {
        const updatePayload: Record<string, any> = {
          status: finalSerialStatus,
          sold_order_id: null,
          is_defective: isDefective,
          updated_at: new Date().toISOString(),
        };

        await sb
          .from("product_serials")
          .update(updatePayload)
          .eq("id", item.serialId);

        await sb.from("product_serial_events").insert({
          serial_id: item.serialId,
          action: isDefective ? "scanner_disposition_defective" : `scanner_disposition_${newSerialAction}`,
          from_status: item.status,
          to_status: finalSerialStatus,
          order_id: orderGroup.orderId !== "unknown" ? orderGroup.orderId : null,
          metadata: {
            order_status: newOrderStatus,
            is_defective: isDefective,
            display_status: isDefective ? "returned-defective" : "returned",
          },
        });
      }

      if (orderGroup.orderId && orderGroup.orderId !== "unknown") {
        await sb
          .from("orders")
          .update({
            status: newOrderStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderGroup.orderId);
      }

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      await qc.invalidateQueries({ queryKey: ["orderops-scanner-target-orders"] });

      toast.success(
        `✓ Order #${orderGroup.orderNumber} set to "${newOrderStatus}" & ${orderGroup.scannedItems.length} serials marked as "${finalSerialStatus}" (${isDefective ? "Defective" : "Ready for Re-sale"})!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update order disposition");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and return to initial camera scanner for the next batch
  const resetAndRestartScanner = () => {
    setScannedUnits([]);
    setBatchMode(null);
    setSelectedOrder(null);
    setExpandedProductKeys({});
    setExpandedOrderIds({});
    setOrderDispositionActions({});
    setCreatedOrderResult(null);
    setStage("camera");
  };

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 1: DIRECT CAMERA SCANNER (DEFAULT ON OPEN)
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "camera") {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-black select-none overflow-hidden">
        <BarcodeScanner
          active
          defaultMode="qr"
          onToggle={() => {
            if (scannedUnits.length > 0) setStage("review_list");
            else toast.info("Scan items or use manual code entry.");
          }}
          onScan={(code) => {
            handleProductScan(code);
          }}
          overlayContent={
            <div className="space-y-2.5">
              {/* Mode C Toggle Pill */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOfflineMode}
                    onChange={(e) => toggleOfflineMode(e.target.checked)}
                    className="rounded border-white/30 text-primary w-4 h-4"
                  />
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Offline / POS Order Direct
                  </span>
                </label>
                <span className="text-[10px] text-white/70 font-mono">
                  {isOfflineMode ? "Active (POS Reverse Flow)" : "Normal Fulfillment"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-white">
                <span className="font-bold flex items-center gap-1.5">
                  {batchMode === "sold" ? (
                    <>
                      <ReturnIcon className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300">Returns Batch: {totalBatchCount} Items</span>
                    </>
                  ) : (
                    <>
                      <Boxes className="w-4 h-4 text-emerald-400" />
                      <span>{isOfflineMode ? "Offline Order Batch:" : "Fulfillment Batch:"} {totalBatchCount} Items</span>
                    </>
                  )}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  ৳{totalBatchAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManualDrawerOpen(!isManualDrawerOpen)}
                  className="rounded-xl h-9 px-3 text-xs font-bold bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-pointer"
                >
                  <span>Type Code</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setStage("review_list")}
                  disabled={scannedUnits.length === 0}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-md transition-all ${
                    scannedUnits.length > 0
                      ? isOfflineMode
                        ? "bg-amber-500 hover:bg-amber-600 text-black font-bold"
                        : batchMode === "sold"
                        ? "bg-amber-500 hover:bg-amber-600 text-black font-bold"
                        : "bg-primary text-primary-foreground"
                      : "bg-white/15 text-white/50"
                  }`}
                >
                  <span>Review Items ({totalBatchCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {isManualDrawerOpen && (
                <form
                  onSubmit={handleManualCodeSubmit}
                  className="flex items-center gap-2 bg-white/10 rounded-2xl p-2 mt-2 border border-white/20 shadow-lg animate-in slide-in-from-bottom-2"
                >
                  <input
                    autoFocus
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter serial or barcode number…"
                    className="flex-1 bg-transparent text-white placeholder:text-white/40 text-xs px-2 py-1 outline-none font-mono"
                    autoCapitalize="characters"
                  />
                  <Button type="submit" size="sm" disabled={!manualCode.trim()} className="rounded-xl text-xs font-bold h-7">
                    Add
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsManualDrawerOpen(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 2: SCANNED PRODUCTS REVIEW LIST (SHARED FOR ALL MODES)
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "review_list") {
    return (
      <div className="space-y-4 pt-1 pb-16 animate-in fade-in duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStage("camera")}
              className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Camera</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                try {
                  window.history.back();
                } catch {
                  setStage("camera");
                }
              }}
              className="rounded-xl h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            >
              <span>Exit</span>
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => setStage("camera")}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <Plus className="w-3.5 h-3.5 -ml-1" />
            <span>Scan More</span>
          </Button>
        </div>

        {/* Batch Overview Banner */}
        <div className="p-4 sm:p-5 rounded-3xl border border-border/70 bg-card shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                {isOfflineMode ? (
                  <>
                    <Store className="w-5 h-5 text-amber-500" />
                    <span>Offline / POS Order</span>
                  </>
                ) : batchMode === "sold" ? (
                  <>
                    <ReturnIcon className="w-5 h-5 text-amber-500" />
                    <span>Returns &amp; Disposition Batch</span>
                  </>
                ) : (
                  <>
                    <Boxes className="w-5 h-5 text-primary" />
                    <span>Scanned Products Batch</span>
                  </>
                )}
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase">
                {isOfflineMode ? "Direct POS" : batchMode === "sold" ? "Sold / Returns" : "Available"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalBatchCount} unit(s) scanned across {groupedProducts.length} unique product line(s).
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground">Total Batch</span>
            <p className="text-lg font-bold text-primary font-mono tabular-nums">
              ৳{totalBatchAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Scanned Products Grouped List */}
        <div className="space-y-2.5">
          {groupedProducts.length === 0 ? (
            <div className="text-center py-16 border border-border/70 rounded-3xl bg-card/40 text-xs text-muted-foreground space-y-2">
              <Package className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="font-semibold text-sm text-foreground">No products scanned yet</p>
              <Button size="sm" onClick={() => setStage("camera")} className="rounded-xl mt-2 font-bold cursor-pointer">
                Open Camera Scanner
              </Button>
            </div>
          ) : (
            groupedProducts.map((g) => {
              const isExpanded = !!expandedProductKeys[g.key];
              const qty = g.serials.length;

              return (
                <div
                  key={g.key}
                  className="rounded-3xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all"
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpandProduct(g.key)}
                      className="min-w-0 flex-1 flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {qty}×
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-foreground text-sm truncate">{g.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          <span>SKU: {g.sku || "N/A"}</span>
                          <span className="text-border mx-1.5">•</span>
                          <span>৳{g.unitPrice.toLocaleString()} each</span>
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground font-mono">
                        ৳{(g.unitPrice * qty).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProductGroup(g.key)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remove product line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpandProduct(g.key)}
                        className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-muted/20 space-y-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Scanned Serial Identifiers ({qty})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.serials.map((s) => (
                          <span
                            key={s.serialCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/80 text-xs font-mono text-foreground shadow-2xs"
                          >
                            <Barcode className="w-3 h-3 text-primary" />
                            <span>{s.serialCode}</span>
                            {s.orderInfo && (
                              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                                #{s.orderInfo.order_number}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeIndividualSerial(s.serialCode)}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/15 cursor-pointer ml-0.5"
                              title="Remove serial"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Floating Bar */}
        {groupedProducts.length > 0 && (
          <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 flex items-center justify-between gap-3 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScannedUnits([]);
                setBatchMode(null);
              }}
              className="rounded-xl h-11 px-3 text-xs text-destructive hover:bg-destructive/10 cursor-pointer font-semibold"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              <span>Clear</span>
            </Button>

            <Button
              onClick={() => {
                if (isOfflineMode) {
                  setStage("offline_order_form");
                } else if (batchMode === "sold") {
                  setStage("connected_orders");
                } else {
                  setStage("select_order");
                }
              }}
              className={`flex-1 h-11 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-md cursor-pointer ${
                isOfflineMode ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-primary text-primary-foreground"
              }`}
            >
              {isOfflineMode ? (
                <>
                  <span>Next: Create Offline Order ({totalBatchCount} items)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : batchMode === "sold" ? (
                <>
                  <span>Next: Process Connected Orders ({connectedOrdersGrouped.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next: Select Order to Allocate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 3 (MODE C): OFFLINE / POS ORDER CREATION FORM
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "offline_order_form") {
    const effectiveTotal = Math.max(0, totalBatchAmount + (offlineSource === "offline" ? 0 : offlineShippingFee) - offlineDiscount);

    return (
      <div className="w-full space-y-4 pt-1 pb-16 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStage("review_list")}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Items</span>
          </Button>

          <Badge variant="outline" className="text-xs font-bold text-amber-500 bg-amber-500/10 border-amber-500/30">
            Direct POS Order
          </Badge>
        </div>

        {/* Channel Selector */}
        <section className="rounded-3xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between px-1">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Channel Origin</Label>
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              Active: <b className="text-foreground">{OFFLINE_CHANNEL_OPTIONS.find((o) => o.value === offlineSource)?.short || "Walk-in"}</b>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full">
            {OFFLINE_CHANNEL_OPTIONS.map((o) => {
              const Icon = o.icon;
              const active = offlineSource === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setOfflineSource(o.value);
                    if (o.value === "offline") {
                      setOfflineShippingFee(0);
                      setOfflineIsPrepaid(false);
                      setOfflinePaymentMethod("cash");
                    } else {
                      setOfflinePaymentMethod("cod");
                    }
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer truncate ${
                    active
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{o.short}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Chat Extractor (Visible ONLY for non-walk-in channels) */}
        {offlineSource !== "offline" && (
          <section className="rounded-3xl border border-border/70 bg-card/50 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    Customer Message Parser
                    <Badge variant="outline" className="text-[10px] bg-muted/60 text-foreground border-border/70 font-mono">
                      NLP
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Paste chat copied from Facebook, WhatsApp or TikTok</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOfflineChatBoxOpen((o) => !o)}
                className="text-xs h-7 text-primary cursor-pointer"
              >
                {offlineChatBoxOpen ? "Collapse" : "Open"}
              </Button>
            </div>

            {offlineChatBoxOpen && (
              <div className="space-y-2.5 pt-1">
                <Textarea
                  value={offlineChatText}
                  onChange={(e) => handleOfflineChatTextChange(e.target.value)}
                  placeholder="Paste message here...&#10;e.g. 'নাম: মো: রহিম, ফোন: 01712345678, ঠিকানা: বাড়ি ১২, রোড ৫, উত্তরা, ঢাকা'"
                  rows={2}
                  className="rounded-xl text-xs sm:text-sm bg-background border-primary/30 focus:border-primary resize-none font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {offlineParsedChat?.name && <Badge variant="secondary" className="text-[10px]">👤 {offlineParsedChat.name}</Badge>}
                    {offlineParsedChat?.phone && <Badge variant="secondary" className="text-[10px] font-mono">📱 {offlineParsedChat.phone}</Badge>}
                    {offlineParsedChat?.district && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                        📍 {offlineParsedChat.district} → {offlineParsedChat.thana}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {offlineChatText.trim() && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOfflineChatText("");
                          setOfflineParsedChat(null);
                        }}
                        className="text-xs h-8 text-muted-foreground cursor-pointer"
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyOfflineChatInfo}
                      disabled={!offlineChatText.trim()}
                      className="text-xs h-8 gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Auto-Fill Form
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Customer & Address Form */}
        <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">
              Customer Name {offlineSource !== "offline" && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={offlineCustomerName}
              onChange={(e) => setOfflineCustomerName(e.target.value)}
              placeholder={offlineSource === "offline" ? "Walk-in Customer (Optional)" : "e.g. Rahim Uddin"}
              className="h-11 rounded-xl text-[15px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Mobile Phone</Label>
              <Input
                value={offlinePhone}
                onChange={(e) => setOfflinePhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                className="h-11 rounded-xl text-[15px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Email Address (Optional)</Label>
              <Input
                value={offlineEmail}
                onChange={(e) => setOfflineEmail(e.target.value)}
                placeholder="customer@email.com"
                inputMode="email"
                className="h-11 rounded-xl text-[15px]"
              />
            </div>
          </div>

          {offlineSource !== "offline" ? (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" /> Courier Delivery Location
                </Label>
                <span className="text-[10px] text-primary font-semibold">Steadfast &amp; Pathao</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">District / City *</Label>
                  <SearchableSelect
                    value={offlineDistrict}
                    onChange={(val) => {
                      setOfflineDistrict(val);
                      const loc = BD_COURIER_LOCATIONS.find((l) => l.district.toLowerCase() === val.toLowerCase());
                      if (loc && loc.thanas.length > 0) setOfflineThana(loc.thanas[0]);
                    }}
                    options={BD_COURIER_LOCATIONS.map((l) => l.district)}
                    placeholder="Select District"
                    searchPlaceholder="Search 64 districts..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Thana / Zone *</Label>
                  <SearchableSelect
                    value={offlineThana}
                    onChange={setOfflineThana}
                    options={availableThanas}
                    placeholder="Select Thana"
                    searchPlaceholder="Search thana / area..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-medium">Detailed Street Address *</Label>
                <Textarea
                  value={offlineAddress}
                  onChange={(e) => setOfflineAddress(e.target.value)}
                  placeholder="House, Road, Block, Flat/Floor..."
                  rows={2}
                  className="rounded-xl text-[15px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Delivery Charge (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={offlineShippingFee}
                    onChange={(e) => setOfflineShippingFee(Math.max(0, Number(e.target.value) || 0))}
                    className="h-11 rounded-xl text-[15px] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Courier Partner</Label>
                  <Select value={offlineCourierProvider} onValueChange={(val: any) => setOfflineCourierProvider(val)}>
                    <SelectTrigger className="w-full h-11 rounded-2xl border border-border/80 bg-card text-foreground text-sm font-bold shadow-2xs hover:border-zinc-500">
                      <SelectValue placeholder="Select Courier Partner" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-border/80 bg-[#18181b] text-foreground p-1.5 shadow-2xl backdrop-blur-xl">
                      <SelectItem value="steadfast" className="rounded-xl py-2.5 px-3 text-xs font-semibold cursor-pointer focus:bg-zinc-800 focus:text-white">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-400" />
                          <span>Steadfast Courier (Default)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pathao" className="rounded-xl py-2.5 px-3 text-xs font-semibold cursor-pointer focus:bg-zinc-800 focus:text-white">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-red-400" />
                          <span>Pathao Logistics</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2.5 p-3.5 rounded-2xl border border-border/70 bg-card/60">
                <div
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                  onClick={() => setOfflinePushToCourier(!offlinePushToCourier)}
                >
                  <Checkbox
                    checked={offlinePushToCourier}
                    onCheckedChange={(val) => setOfflinePushToCourier(!!val)}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Push to {offlineCourierProvider === "steadfast" ? "Steadfast" : "Pathao"} automatically
                  </span>
                </div>

                <div className="pt-2.5 border-t border-border/40 space-y-2">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                    onClick={() => {
                      const next = !offlineIsCod;
                      setOfflineIsCod(next);
                      if (!next && (offlinePaymentMethod === "cash" || offlinePaymentMethod === "cod")) {
                        setOfflinePaymentMethod("mfs");
                      }
                    }}
                  >
                    <Checkbox
                      checked={offlineIsCod}
                      onCheckedChange={(val) => {
                        const next = !!val;
                        setOfflineIsCod(next);
                        if (!next && (offlinePaymentMethod === "cash" || offlinePaymentMethod === "cod")) {
                          setOfflinePaymentMethod("mfs");
                        }
                      }}
                    />
                    <span className="text-xs font-bold text-foreground">Cash on Delivery (COD)</span>
                  </div>

                  {offlineIsCod && (
                    <div className="pl-7 pt-0.5 animate-in fade-in duration-150">
                      <div
                        className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl bg-card/60 border border-border/60 hover:bg-card transition-colors"
                        onClick={() => setOfflineIsPrepaid(!offlineIsPrepaid)}
                      >
                        <Checkbox
                          checked={offlineIsPrepaid}
                          onCheckedChange={(val) => setOfflineIsPrepaid(!!val)}
                        />
                        <span className="text-xs font-medium text-foreground">Prepaid Delivery Fee</span>
                      </div>
                    </div>
                  )}

                  {!offlineIsCod && (
                    <div className="pl-1 pt-1.5 space-y-1.5 animate-in fade-in duration-150">
                      <Label className="text-[11px] text-muted-foreground font-medium">Prepaid Payment Method</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "mfs", label: "MFS (bKash/Nagad)" },
                          { id: "card", label: "Card" },
                          { id: "bank", label: "Bank" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setOfflinePaymentMethod(m.id)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              offlinePaymentMethod === m.id
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground font-medium">Payment Method</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "cash", label: "Cash" },
                  { id: "mfs", label: "MFS" },
                  { id: "card", label: "Card" },
                  { id: "bank", label: "Bank" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOfflinePaymentMethod(m.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                      offlinePaymentMethod === m.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Order Summary Box */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm shadow-xs">
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Items Subtotal ({totalBatchCount} units)</span>
            <span className="font-mono font-bold">৳{totalBatchAmount.toLocaleString()}</span>
          </div>
          {offlineSource !== "offline" && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Delivery Charge</span>
              <span className="font-mono font-bold">৳{offlineShippingFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50 text-foreground">
            <span>Grand Total</span>
            <span className="text-primary font-mono text-lg">৳{effectiveTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Floating Confirm Button */}
        <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 flex items-center gap-2.5 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl">
          <Button
            variant="outline"
            onClick={() => setStage("review_list")}
            className="h-12 rounded-xl px-4 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleConfirmOfflineOrder}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl text-[15px] font-bold bg-primary text-primary-foreground shadow-md cursor-pointer"
          >
            {isSubmitting ? "Creating & Binding Order..." : `Confirm Order · ৳${effectiveTotal.toLocaleString()}`}
          </Button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 4 (MODE C): ORDER CONFIRMED ACTIONS SCREEN
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "order_confirmed_actions" && createdOrderResult) {
    const { order, items, courierResult } = createdOrderResult;

    return (
      <div className="w-full space-y-4 pt-1 pb-16 animate-in zoom-in-95 duration-200">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Order Created &amp; Serials Bound</h2>
          <p className="text-xs font-mono text-muted-foreground font-bold tracking-wider">{order.order_number}</p>
          {courierResult?.consignment_id && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold mt-1">
              <Truck className="w-3.5 h-3.5" /> Consignment ID: {courierResult.consignment_id}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            onClick={() => printInvoicePdf(order, items, brand, invoiceSettings)}
            className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4" /> A4 Invoice
          </Button>

          <Button
            onClick={() => printThermalSlip(order, items, brand, posSettings)}
            variant="outline"
            className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer"
          >
            <Receipt className="w-4 h-4" /> 80mm POS Slip
          </Button>

          <Button
            onClick={() => printShippingSticker(order, brand, shippingStickerPreset)}
            variant="outline"
            className="h-11 rounded-2xl gap-1.5 font-bold cursor-pointer"
          >
            <Tag className="w-4 h-4" /> Shipping Sticker
          </Button>
        </div>

        {order.order_source !== "offline" && (
          <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-2.5">
            <Label className="text-xs text-muted-foreground">Email invoice to customer</Label>
            <div className="flex gap-2">
              <Input
                value={offlineEmailOverride}
                onChange={(e) => setOfflineEmailOverride(e.target.value)}
                placeholder={order.guest_email || "customer@email.com"}
                className="h-11 rounded-xl"
              />
              <Button
                onClick={async () => {
                  try {
                    const r = await generateInvoice(order.id, true, offlineEmailOverride.trim() || undefined);
                    if (r.emailed) toast.success("Invoice emailed");
                    else toast.error("Could not send email", { description: r.emailError });
                  } catch (e: any) {
                    toast.error("Failed to email invoice", { description: e.message });
                  }
                }}
                variant="outline"
                className="h-11 rounded-xl shrink-0 font-bold cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-1.5" /> Send
              </Button>
            </div>
          </section>
        )}

        <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 flex flex-col sm:flex-row items-center gap-2 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl">
          <Button
            variant="outline"
            onClick={() => {
              try {
                window.history.back();
              } catch {
                resetAndRestartScanner();
              }
            }}
            className="w-full sm:w-auto h-12 rounded-2xl text-xs font-bold cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Orders</span>
          </Button>

          <Button
            onClick={resetAndRestartScanner}
            className="flex-1 w-full h-12 rounded-2xl text-[15px] font-bold cursor-pointer bg-primary text-primary-foreground shadow-md"
          >
            <span>Done / Scan Next Batch</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 3 (MODE A): SELECT ORDER TO ALLOCATE
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "select_order") {
    return (
      <div className="space-y-4 pt-1 pb-16 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStage("review_list")}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scanned Items</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAndRestartScanner}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Batch</span>
          </Button>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-border/70 bg-card shadow-xs">
          <h1 className="text-xl font-bold text-foreground font-display">
            Select Order to Allocate
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Binding {totalBatchCount} scanned serials (Total ৳{totalBatchAmount.toLocaleString()}) to an existing order.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by order #, customer name, phone…"
                className="pl-9 h-11 rounded-2xl text-xs sm:text-sm bg-background border-border"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary border border-border/60 shrink-0">
              {["pending", "confirmed", "all"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    orderStatusFilter === st
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {loadingOrders ? (
            <div className="text-center py-16 text-xs text-muted-foreground">Loading actionable orders…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 border border-border/70 rounded-3xl bg-card/40 text-xs text-muted-foreground space-y-2">
              <Package className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="font-semibold text-sm text-foreground">No matching orders found</p>
              <p>Try searching for a different order number or phone</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              const customer = o.customer_name || o.guest_name || "Customer";
              const itemCount = o.order_items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
              const boundSerialCount = o.product_serials?.length || 0;

              return (
                <div
                  key={o.id}
                  className="p-4 sm:p-5 rounded-3xl border border-border/70 bg-card hover:border-primary/50 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground font-mono text-sm">#{o.order_number}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold ${
                          o.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {o.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(o.created_at), "dd MMM, h:mm a")}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="font-semibold text-foreground">{customer}</span>
                      {o.guest_phone && <span>• 📱 {o.guest_phone}</span>}
                    </div>

                    <div className="text-xs text-muted-foreground pt-1">
                      <span>Items: {itemCount} pcs</span>
                      <span className="text-border mx-1.5">•</span>
                      <span>Total: <b className="text-primary font-mono">৳{Number(o.total || 0).toLocaleString()}</b></span>
                      <span className="text-border mx-1.5">•</span>
                      <span className="font-mono text-[11px]">{boundSerialCount} serials already bound</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedOrder(o);
                      setCustomTargetStatus(o.status === "pending" ? "confirmed" : o.status);
                      setStage("order_status_actions");
                    }}
                    className="w-full sm:w-auto h-11 px-5 rounded-2xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Select &amp; Allocate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 3 (MODE B): CONNECTED ORDERS DISPOSITION
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "connected_orders") {
    return (
      <div className="space-y-4 pt-1 pb-16 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStage("review_list")}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scanned Items</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAndRestartScanner}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Batch</span>
          </Button>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-border/70 bg-card shadow-xs">
          <h1 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <ReturnIcon className="w-5 h-5 text-amber-500" />
            <span>Connected Orders Disposition</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            The {totalBatchCount} scanned serials belong to {connectedOrdersGrouped.length} order(s).
          </p>
        </div>

        <div className="space-y-3">
          {connectedOrdersGrouped.map((og) => {
            const isExpanded = !!expandedOrderIds[og.orderId];
            const currentDisp = orderDispositionActions[og.orderId] || {
              orderStatus: "returned",
              serialAction: "returned",
              isDefective: false,
            };

            return (
              <div
                key={og.orderId}
                className="rounded-3xl border border-border/70 bg-card shadow-xs overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground font-mono text-sm">
                        {og.orderNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-500">
                        {og.orderStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(og.createdAt), "dd MMM yyyy")}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Customer: <b className="text-foreground">{og.customerName}</b> ({og.guestPhone})
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Scanned items in this batch: <b className="text-primary font-mono">{og.scannedItems.length}</b> pcs • Total: ৳{og.totalBill.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandOrder(og.orderId)}
                      className="rounded-xl text-xs gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Details" : "View Items"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleProcessOrderDisposition(og)}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial rounded-xl text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-black shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Disposition</span>
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-border/50 bg-muted/20 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Scanned Serials in this Order ({og.scannedItems.length})
                      </p>
                      <div className="space-y-1.5">
                        {og.scannedItems.map((item) => (
                          <div
                            key={item.serialCode}
                            className="p-2.5 rounded-2xl bg-background border border-border/70 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{item.productName}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">{item.serialCode}</p>
                            </div>
                            <span className="font-mono font-bold text-primary">৳{item.unitPrice.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-background border border-border/80 space-y-3">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Select Order &amp; Serial Disposition
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">Order Target Status</Label>
                          <Select
                            value={currentDisp.orderStatus}
                            onValueChange={(val) =>
                              setOrderDispositionActions((prev) => ({
                                ...prev,
                                [og.orderId]: { ...currentDisp, orderStatus: val },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full h-11 rounded-2xl border border-border/80 bg-card text-foreground text-xs font-bold shadow-2xs focus:ring-2 focus:ring-primary/40 focus:border-primary">
                              <SelectValue placeholder="Select Order Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border/80 bg-[#18181b] text-foreground p-1.5 shadow-2xl backdrop-blur-xl">
                              <SelectItem value="returned" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                returned (Order Returned)
                              </SelectItem>
                              <SelectItem value="cancelled" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                cancelled (Order Cancelled)
                              </SelectItem>
                              <SelectItem value="delivery_failed" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                delivery_failed
                              </SelectItem>
                              <SelectItem value="refunded" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                refunded
                              </SelectItem>
                              <SelectItem value="processing" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                processing
                              </SelectItem>
                              <SelectItem value="confirmed" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                confirmed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">Serial Action</Label>
                          <Select
                            value={currentDisp.serialAction}
                            onValueChange={(val: any) =>
                              setOrderDispositionActions((prev) => ({
                                ...prev,
                                [og.orderId]: {
                                  ...currentDisp,
                                  serialAction: val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full h-11 rounded-2xl border border-border/80 bg-card text-foreground text-xs font-bold shadow-2xs focus:ring-2 focus:ring-primary/40 focus:border-primary">
                              <SelectValue placeholder="Select Serial Action" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border/80 bg-[#18181b] text-foreground p-1.5 shadow-2xl backdrop-blur-xl">
                              <SelectItem value="returned" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                Returned (Warehouse Return)
                              </SelectItem>
                              <SelectItem value="rejected_or_cancelled" className="rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer focus:bg-primary/20 focus:text-primary">
                                Rejected / Cancelled (Restock Available)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={currentDisp.isDefective}
                            onChange={(e) =>
                              setOrderDispositionActions((prev) => ({
                                ...prev,
                                [og.orderId]: {
                                  ...currentDisp,
                                  isDefective: e.target.checked,
                                },
                              }))
                            }
                            className="rounded border-border text-primary w-4 h-4"
                          />
                          <span className={currentDisp.isDefective ? "text-red-400 font-bold" : "text-muted-foreground"}>
                            Mark Items as Damaged / Defective (Blocks Resale)
                          </span>
                        </label>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setOrderDispositionActions((prev) => ({
                              ...prev,
                              [og.orderId]: {
                                orderStatus: "cancelled",
                                serialAction: "rejected_or_cancelled",
                                isDefective: false,
                              },
                            }));
                            toast.info(`Configured #${og.orderNumber} to Cancel & Restock serials.`);
                          }}
                          className="rounded-xl text-[11px] h-8 font-bold cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Set to Cancel Order
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStage("review_list")} className="h-11 rounded-xl text-xs font-bold">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Back to Items</span>
          </Button>

          <Button
            onClick={resetAndRestartScanner}
            className="h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
          >
            <span>Finish &amp; Reset Scanner</span>
          </Button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STAGE 4 (MODE A): ORDER STATUS & CONFIRMATION ACTIONS
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === "order_status_actions" && selectedOrder) {
    const isPendingOrder = ["pending", "pending_payment", "processing"].includes(selectedOrder.status);

    return (
      <div className="space-y-4 pt-1 pb-16 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStage("select_order")}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Choose Different Order</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAndRestartScanner}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Batch</span>
          </Button>
        </div>

        <div className="p-4 sm:p-6 rounded-3xl border border-border/70 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground font-display font-mono">
                  #{selectedOrder.order_number}
                </h1>
                <Badge
                  variant="secondary"
                  className={`text-[10px] uppercase font-bold ${
                    selectedOrder.status === "confirmed"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  Current: {selectedOrder.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer: <b className="text-foreground">{selectedOrder.customer_name || selectedOrder.guest_name || "Customer"}</b> • {selectedOrder.guest_phone || "No phone"}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-muted-foreground">Order Total</span>
              <p className="text-lg font-bold text-primary font-mono">
                ৳{Number(selectedOrder.total || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Order Status after Confirmation
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {["confirmed", "processing", "pending", "saved"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCustomTargetStatus(st)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                    customTargetStatus === st
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-border/70 bg-card shadow-xs space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Print &amp; Export Quick Tools
          </Label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await generateInvoice(selectedOrder.id, false);
                  printInvoiceHtml(r.invoice_html);
                } catch (e: any) {
                  toast.error(e.message || "Failed to generate invoice");
                }
              }}
              className="h-11 rounded-2xl text-xs font-bold gap-1.5 bg-background hover:bg-muted cursor-pointer"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Print Invoice</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                printThermalSlipHtml(selectedOrder, selectedOrder.order_items || []);
              }}
              className="h-11 rounded-2xl text-xs font-bold gap-1.5 bg-background hover:bg-muted cursor-pointer"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>POS Slip</span>
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const email = selectedOrder.guest_email || "";
                  if (!email) {
                    toast.error("No customer email address on this order.");
                    return;
                  }
                  await generateInvoice(selectedOrder.id, true, email);
                  toast.success(`Invoice emailed to ${email}`);
                } catch (e: any) {
                  toast.error(e.message || "Failed to send email");
                }
              }}
              className="h-11 rounded-2xl text-xs font-bold gap-1.5 bg-background hover:bg-muted cursor-pointer"
            >
              <Mail className="w-4 h-4 text-primary" />
              <span>Send Email</span>
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await generateInvoice(selectedOrder.id, false);
                  printInvoiceHtml(r.invoice_html);
                  toast.info("Use system print dialog to Save as PDF/Image.");
                } catch (e: any) {
                  toast.error(e.message || "Failed to download PDF");
                }
              }}
              className="h-11 rounded-2xl text-xs font-bold gap-1.5 bg-background hover:bg-muted cursor-pointer"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Save PDF / JPG</span>
            </Button>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 border-t sm:border border-border/80 bg-card/95 backdrop-blur-xl px-4 py-3.5 shadow-xl z-30 rounded-t-3xl sm:rounded-2xl">
          {isPendingOrder ? (
            <>
              <Button
                variant="outline"
                onClick={handleSaveProgressOnly}
                disabled={isSavingDraft || isSubmitting}
                className="h-12 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-primary" />
                <span>{isSavingDraft ? "Saving…" : "Save"}</span>
              </Button>

              <Button
                onClick={() => handleConfirmAllocation("confirmed")}
                disabled={isSubmitting || isSavingDraft}
                className="flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Confirming Order…" : "Confirm Order & Save"}</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleConfirmAllocation(customTargetStatus)}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-primary text-primary-foreground shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Updating Order…" : `Confirm & Save Status (${customTargetStatus})`}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={resetAndRestartScanner}
            className="h-12 rounded-xl text-xs font-bold cursor-pointer"
          >
            <span>Scan Next Batch</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
