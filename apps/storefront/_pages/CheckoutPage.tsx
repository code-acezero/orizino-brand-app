"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { ClientOnly } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CreditCard, Truck, Check, ArrowRight, Gift, Tag, Shield,
  Smartphone, Building2, ChevronRight, Home, MapPinned, Camera, Lock,
  Award, Sparkles, Package, Clock, School, GraduationCap, Plus, Undo2, Loader2,
  ChevronDown, ChevronUp, ShoppingBag, Pencil, ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyNewOrder } from "@/lib/order-notifications.functions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MFSPaymentProof from "@/components/checkout/MFSPaymentProof";
const StripeCardPayment = React.lazy(() => import("@/components/checkout/StripeCardPayment"));
import { useUserAddresses, useSaveAddress } from "@/hooks/use-user-addresses";
import { useUserLoyalty, useLoyaltyTiers, computeTierProgress } from "@/hooks/use-loyalty";
import { getGuestCart } from "@/lib/guest-cart";
import { StickyActionBar } from "@/components/mobile";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BD_COURIER_LOCATIONS, calculateCourierRate } from "@orizino/shared";

const MFS_METHODS = ["bkash", "nagad", "upay", "rocket"];
const addressTypeIcons: Record<string, any> = {
  home: Home,
  office: Building2,
  other: MapPinned,
};

const BD_DISTRICTS = [
  "Dhaka", "Chattogram", "Gazipur", "Narayanganj", "Sylhet", "Rajshahi",
  "Khulna", "Barishal", "Rangpur", "Mymensingh", "Cumilla", "Bogura",
  "Noakhali", "Feni", "Cox's Bazar", "Jashore", "Kushtia", "Pabna",
  "Tangail", "Faridpur", "Dinajpur", "Natore", "Sirajganj", "Jamalpur",
  "Brahmanbaria", "Chandpur", "Lakshmipur"
];

const ADDRESS_TYPES = [
  { id: "home", label: "Home", icon: Home },
  { id: "office", label: "Office", icon: Building2 },
  { id: "other", label: "Other", icon: MapPinned },
];

function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  className,
  maxHeight = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(42, nextHeight)}px`;
  }, [maxHeight]);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      placeholder={placeholder}
      rows={1}
      className={`w-full px-3 py-2.5 rounded-xl bg-transparent border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 text-xs overflow-y-auto resize-none transition-[height] duration-150 ease-out ${className || ""}`}
    />
  );
}

const CheckoutPage: React.FC = () => {
  useSeoMeta("checkout", "Checkout");
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const notifyOrder = useServerFn(notifyNewOrder);
  const cartState = (location.state as any) || {};
  
  // Rehydrate Buy Now state & item from location state, sessionStorage, or localStorage
  const activeBuyNowItem = useMemo(() => {
    if (cartState.buyNowItem) return cartState.buyNowItem;
    if (typeof window === "undefined") return null;
    try {
      const fromSession = sessionStorage.getItem("orizino_buy_now_item");
      if (fromSession) return JSON.parse(fromSession);
      const fromLocal = localStorage.getItem("orizino_buy_now_item");
      if (fromLocal) return JSON.parse(fromLocal);
    } catch (e) {
      console.warn("Failed to parse buyNowItem", e);
    }
    return null;
  }, [cartState.buyNowItem]);

  const isBuyNow = useMemo(() => {
    if (cartState.buyNow) return true;
    if (typeof window === "undefined") return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("buyNow") === "true") return true;
    if (sessionStorage.getItem("orizino_is_buy_now") === "true") return true;
    if (localStorage.getItem("orizino_is_buy_now") === "true") return true;
    return !!activeBuyNowItem;
  }, [cartState.buyNow, activeBuyNowItem]);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [address, setAddress] = useState({
    full_name: "",
    phone: "",
    secondary_phone: "",
    street: "",
    city: "Dhaka",
    state: "",
    area: "",
    zip: "",
    country: "Bangladesh",
  });
  const [notes, setNotes] = useState(cartState.orderNotes || "");
  const [giftWrap] = useState(cartState.giftWrap || false);
  const [giftMessage] = useState(cartState.giftMessage || "");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddressType, setNewAddressType] = useState<string>("home");
  const [newAddressLabel, setNewAddressLabel] = useState<string>("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [step, setStep] = useState(1);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
  const [mfsProofData, setMfsProofData] = useState<{ screenshotUrl: string; transactionId: string } | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Generate or rehydrate unique checkout session serial
  const [checkoutSerial] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session") || params.get("id");
    if (fromUrl) return fromUrl;
    if (!isBuyNow) {
      const savedActive = localStorage.getItem("orizino_checkout_active_session");
      if (savedActive) return savedActive;
    }
    return `CHK-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  });

  // Fetch payment gateway config
  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-gateways-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "payment_gateways_config").maybeSingle();
      return (data?.value as any) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableGateways = React.useMemo(() => {
    const gateways: { id: string; name: string; desc: string; icon: any }[] = [];

    if (!paymentConfig?.mfs_system_enabled || paymentConfig?.cod_enabled !== false) {
      gateways.push({ id: "cod", name: "Cash on Delivery", desc: "Pay upon delivery", icon: Truck });
    }

    if (paymentConfig?.personal_bkash?.enabled) {
      gateways.push({ id: "bkash", name: "bKash", desc: "Send money & upload proof", icon: Smartphone });
    }
    if (paymentConfig?.personal_nagad?.enabled) {
      gateways.push({ id: "nagad", name: "Nagad", desc: "Send money & upload proof", icon: Smartphone });
    }
    if (paymentConfig?.personal_upay?.enabled) {
      gateways.push({ id: "upay", name: "Upay", desc: "Send money & upload proof", icon: Smartphone });
    }
    if (paymentConfig?.personal_rocket?.enabled) {
      gateways.push({ id: "rocket", name: "Rocket", desc: "Send money & upload proof", icon: Smartphone });
    }

    if (paymentConfig?.stripe?.enabled) {
      gateways.push({ id: "card", name: "Credit/Debit Card", desc: "Visa, Mastercard, AMEX", icon: CreditCard });
    }

    return gateways;
  }, [paymentConfig]);

  useEffect(() => {
    if (availableGateways.length > 0 && !availableGateways.find((g) => g.id === paymentMethod)) {
      setPaymentMethod(availableGateways[0].id);
    }
  }, [availableGateways, paymentMethod]);

  const { data: savedPaymentMethods = [] } = useQuery({
    queryKey: ["user_payment_methods", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_payment_methods" as any)
        .select("provider, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      return (data || []) as unknown as Array<{ provider: string; is_default: boolean }>;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const [paymentAutoPicked, setPaymentAutoPicked] = useState(false);
  useEffect(() => {
    if (step !== 3 || paymentAutoPicked || availableGateways.length === 0 || savedPaymentMethods.length === 0) return;
    const def = savedPaymentMethods.find((m) => m.is_default) || savedPaymentMethods[0];
    if (def && availableGateways.find((g) => g.id === def.provider)) {
      setPaymentMethod(def.provider);
    }
    setPaymentAutoPicked(true);
  }, [step, savedPaymentMethods, availableGateways, paymentAutoPicked]);

  const isMFSMethod = MFS_METHODS.includes(paymentMethod);
  const mfsAccountInfo = paymentConfig?.[`personal_${paymentMethod}`] as any;

  const { data: userAddresses = [] } = useUserAddresses();
  const saveAddressMutation = useSaveAddress();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, address").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setAddress((prev) => ({
          ...prev,
          full_name: prev.full_name || data.full_name || "",
          phone: prev.phone || data.phone || "",
        }));
      }
    });
  }, [user]);

  useEffect(() => {
    if (userAddresses.length === 0) {
      setShowAddressForm(true);
      return;
    }
    const mapped = userAddresses.map((a) => ({
      id: a.id,
      label: a.label,
      type: a.address_type,
      name: a.full_name,
      phone: a.phone,
      street: [a.address_line1, a.address_line2].filter(Boolean).join(", "),
      city: a.city,
      state: a.area || "",
      zip: a.postal_code || "",
      country: a.country,
      isDefault: a.is_default,
    }));
    setSavedAddresses(mapped);
    if (!selectedSavedAddress) {
      const def = mapped.find((a) => a.isDefault) || mapped[0];
      if (def) {
        setSelectedSavedAddress(def.id);
        setAddress({
          full_name: def.name,
          phone: def.phone,
          street: def.street,
          city: def.city,
          state: def.state,
          zip: def.zip,
          country: def.country,
        });
        setShowAddressForm(false);
      }
    }
  }, [userAddresses]);

  const handleSaveNewAddress = async () => {
    if (!address.full_name || !address.phone || !address.street || !address.city) {
      toast({ title: "Please fill in all required address fields", variant: "destructive" });
      return;
    }
    setSavingAddress(true);
    try {
      const payload = {
        address_type: newAddressType,
        label: newAddressLabel || ADDRESS_TYPES.find((t) => t.id === newAddressType)?.label || "Address",
        full_name: address.full_name,
        phone: address.phone,
        address_line1: address.street,
        city: address.city,
        area: address.state,
        postal_code: address.zip,
        country: address.country || "Bangladesh",
        is_default: savedAddresses.length === 0,
      };
      const saved = await saveAddressMutation.mutateAsync(payload as any);
      toast({ title: "Address saved to your address book!" });
      if (saved?.id) {
        setSelectedSavedAddress(saved.id);
      }
      setShowAddressForm(false);
    } catch (e: any) {
      console.warn("Failed to save address to address book", e);
      setShowAddressForm(false);
    } finally {
      setSavingAddress(false);
    }
  };

  const selectSavedAddress = (addr: any) => {
    setSelectedSavedAddress(addr.id);
    setAddress({
      full_name: addr.name || "",
      phone: addr.phone || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || "",
      country: addr.country || "Bangladesh",
    });
    setShowAddressForm(false);
  };

  const buyNowItems = useMemo(() => {
    if (!isBuyNow || !activeBuyNowItem) return null;
    return [{
      id: "buy-now",
      product_id: activeBuyNowItem.productId,
      quantity: activeBuyNowItem.quantity || 1,
      variant_id: activeBuyNowItem.variantId || null,
      products: {
        id: activeBuyNowItem.productId,
        name: activeBuyNowItem.name,
        price: activeBuyNowItem.price,
        thumbnail: activeBuyNowItem.thumbnail || "",
        stock_quantity: 999,
      },
      product_variants: activeBuyNowItem.variantId ? {
        id: activeBuyNowItem.variantId,
        size: activeBuyNowItem.selectedSize ?? activeBuyNowItem.variantLabel ?? null,
        color: activeBuyNowItem.selectedColor ?? null,
        price_override: activeBuyNowItem.price,
      } : null,
    }];
  }, [isBuyNow, activeBuyNowItem]);

  const { data: dbCartItems } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(id, name, price, thumbnail, stock_quantity), product_variants(id, size, color, price_override)")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user && !isBuyNow,
  });

  const guestCartItems = useMemo(() => {
    if (isBuyNow) return [];
    const list = getGuestCart();
    if (!list || !list.length) return [];
    return list.map((item) => ({
      id: `guest-${item.product_id}-${item.variant_id || "no-var"}`,
      product_id: item.product_id,
      quantity: item.qty,
      variant_id: item.variant_id || null,
      products: {
        id: item.product_id,
        name: item.name,
        price: item.price,
        thumbnail: item.image || "",
        stock_quantity: item.max_stock || 999,
      },
      product_variants: item.variant_id ? {
        id: item.variant_id,
        size: item.variant_label || null,
        color: null,
        price_override: item.price,
      } : null,
    }));
  }, [isBuyNow]);

  const cartItems = useMemo(() => {
    if (isBuyNow && buyNowItems && buyNowItems.length > 0) {
      return buyNowItems;
    }
    if (dbCartItems && dbCartItems.length > 0) {
      return dbCartItems;
    }
    if (guestCartItems && guestCartItems.length > 0) {
      return guestCartItems;
    }
    return dbCartItems || guestCartItems || [];
  }, [isBuyNow, buyNowItems, dbCartItems, guestCartItems]);

  // Compute cart fingerprint for session validation
  const cartFingerprint = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return "";
    return cartItems.map((i) => `${i.product_id}:${i.quantity}:${i.variant_id || ""}`).join("|");
  }, [cartItems]);

  // Keep URL search params in sync with session serial
  useEffect(() => {
    if (typeof window === "undefined" || !checkoutSerial) return;
    if (!cartItems || cartItems.length === 0) {
      // Purge blank active session if cart is empty
      localStorage.removeItem("orizino_checkout_active_session");
      localStorage.removeItem(`orizino_checkout_session_${checkoutSerial}`);
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("session") !== checkoutSerial) {
      url.searchParams.set("session", checkoutSerial);
      window.history.replaceState(null, "", url.toString());
    }
    if (!isBuyNow) {
      localStorage.setItem("orizino_checkout_active_session", checkoutSerial);
    }
  }, [checkoutSerial, isBuyNow, cartItems]);

  // Rehydrate auto-saved checkout state on mount (only for regular cart checkouts with valid items)
  const [rehydrated, setRehydrated] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !checkoutSerial || rehydrated) return;
    if (isBuyNow || !cartItems || cartItems.length === 0) {
      if (cartItems?.length === 0) {
        localStorage.removeItem(`orizino_checkout_session_${checkoutSerial}`);
        localStorage.removeItem("orizino_checkout_active_session");
      }
      setRehydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(`orizino_checkout_session_${checkoutSerial}`);
      if (raw) {
        const data = JSON.parse(raw);
        // If saved draft has 0 items or cart fingerprint mismatch, purge it immediately
        if (data.itemCount === 0 || (cartFingerprint && data.cartFingerprint && data.cartFingerprint !== cartFingerprint)) {
          localStorage.removeItem(`orizino_checkout_session_${checkoutSerial}`);
          localStorage.removeItem("orizino_checkout_active_session");
          setRehydrated(true);
          return;
        }
        if (data.address) setAddress((prev) => ({ ...prev, ...data.address }));
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        if (data.selectedShippingMethodId) setSelectedShippingMethodId(data.selectedShippingMethodId);
        if (data.mfsProofData) setMfsProofData(data.mfsProofData);
        if (data.notes) setNotes(data.notes);
        if (data.step && [1, 2, 3].includes(data.step)) setStep(data.step);
      }
    } catch (e) {
      console.warn("Failed to rehydrate checkout session", e);
    } finally {
      setRehydrated(true);
    }
  }, [checkoutSerial, rehydrated, isBuyNow, cartItems, cartFingerprint]);

  // Auto-save checkout progress whenever state updates (only if cart has items)
  useEffect(() => {
    if (typeof window === "undefined" || !checkoutSerial || !rehydrated) return;
    if (!cartItems || cartItems.length === 0) {
      localStorage.removeItem(`orizino_checkout_session_${checkoutSerial}`);
      localStorage.removeItem("orizino_checkout_active_session");
      return;
    }
    try {
      const draft = {
        checkoutSerial,
        cartFingerprint,
        itemCount: cartItems.length,
        address,
        paymentMethod,
        selectedShippingMethodId,
        mfsProofData,
        notes,
        step,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`orizino_checkout_session_${checkoutSerial}`, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to auto-save checkout session", e);
    }
  }, [checkoutSerial, rehydrated, address, paymentMethod, selectedShippingMethodId, mfsProofData, notes, step, cartItems, cartFingerprint]);

  const { data: shippingMethods } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: deliveryOffers } = useQuery({
    queryKey: ["delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_offers").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const subtotal = cartItems?.reduce((sum, item) => {
    const variant = (item as any).product_variants as any;
    const price = variant?.price_override ?? (item.products as any)?.price ?? 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const appliedCoupon = cartState.coupon;
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      couponDiscount = subtotal * (Number(appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(appliedCoupon.max_discount_amount));
    } else couponDiscount = Number(appliedCoupon.discount_value);
  }

  // Fetch default delivery partner from Master Panel settings
  const { data: partnerConfig } = useQuery({
    queryKey: ["delivery-partners-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "delivery_partners_config").maybeSingle();
      return (data?.value as any) || { default_partner: "steadfast" };
    },
    staleTime: 5 * 60 * 1000,
  });

  const defaultPartner = partnerConfig?.default_partner || "steadfast";

  // Calculate dynamic courier rate & availability based on customer's address
  const courierRateInfo = React.useMemo(() => {
    return calculateCourierRate({
      district: address.city,
      thana: address.state,
      defaultPartner,
      itemSubtotal: subtotal,
    });
  }, [address.city, address.state, defaultPartner, subtotal]);

  // Available thanas list dynamically matched to selected district
  const availableThanas = React.useMemo(() => {
    const distClean = (address.city || "").toLowerCase().trim();
    const match = BD_COURIER_LOCATIONS.find(
      (l) => l.district.toLowerCase() === distClean || distClean.includes(l.district.toLowerCase())
    );
    return match ? match.thanas : [];
  }, [address.city]);

  // Real-time Courier Delivery Methods derived dynamically from Courier API & customer address
  const dynamicCourierMethods = React.useMemo(() => {
    return [
      {
        id: "courier-standard",
        name: `${courierRateInfo.courierName} Standard`,
        price: courierRateInfo.price,
        estimated_days: courierRateInfo.deliveryDays,
        subtitle: `Live courier API rate for ${address.city || "Dhaka"}`,
      },
      {
        id: "courier-priority",
        name: `${courierRateInfo.courierName} Priority Express`,
        price: courierRateInfo.price + 40,
        estimated_days: "Same Day / Next Day Express",
        subtitle: "Fast-track priority dispatch & handling",
      },
    ];
  }, [courierRateInfo, address.city]);

  const [activeCourierMethodId, setActiveCourierMethodId] = useState("courier-standard");
  const selectedCourierMethod = dynamicCourierMethods.find((m) => m.id === activeCourierMethodId) || dynamicCourierMethods[0];

  let baseShippingFee = selectedCourierMethod.price;

  let deliveryDiscount = 0;
  let appliedDeliveryOffer: any = null;
  if (deliveryOffers) {
    for (const offer of deliveryOffers) {
      if (Number(offer.min_order_amount) > 0 && subtotal < Number(offer.min_order_amount)) continue;
      const areas: string[] = offer.target_areas || [];
      if (areas.length > 0 && address.city) {
        const cityLower = address.city.toLowerCase();
        if (!areas.some((a: string) => cityLower.includes(a.toLowerCase()))) continue;
      }
      let disc = 0;
      if (offer.offer_type === "free_delivery") disc = Math.max(baseShippingFee, 1);
      else if (offer.offer_type === "reduced_delivery") disc = Math.min(Number(offer.discount_value), baseShippingFee);
      else if (offer.offer_type === "flat_rate") disc = Math.max(0, baseShippingFee - Number(offer.discount_value));
      if (disc >= deliveryDiscount) { deliveryDiscount = disc; appliedDeliveryOffer = offer; }
    }
  }

  const shippingFee = appliedDeliveryOffer?.offer_type === "free_delivery"
    ? 0
    : Math.max(0, baseShippingFee - deliveryDiscount);
  const giftWrapFee = giftWrap ? 50 : 0;

  // Loyalty tier auto-discount
  const { data: userLoyalty } = useUserLoyalty();
  const { data: loyaltyTiers } = useLoyaltyTiers();
  const tierInfo = computeTierProgress(userLoyalty, loyaltyTiers);
  const tierDiscountPct = Number(tierInfo?.current?.discount_percentage || 0);
  const tierDiscount = tierDiscountPct > 0 ? (subtotal - couponDiscount) * (tierDiscountPct / 100) : 0;
  const loyaltyDiscount = tierDiscount;

  const codExtraFee = paymentMethod === "cod" ? Number(paymentConfig?.cod_extra_fee || 0) : 0;
  const codMode = paymentConfig?.cod_mode || "normal"; // "normal" | "advance_delivery_charge"
  const isAdvanceCodMode = paymentMethod === "cod" && codMode === "advance_delivery_charge";

  const total = Math.max(
    0,
    subtotal - couponDiscount - loyaltyDiscount + (selectedCourierMethod ? shippingFee : 0) + codExtraFee + giftWrapFee
  );

  const canProceedToReview = () => {
    if (isMFSMethod && !mfsProofData) return false;
    if (isAdvanceCodMode && !mfsProofData) return false;
    return true;
  };

  const canProceedToPayment = () => {
    const hasAddress = address.full_name.trim().length > 0 && address.phone.trim().length >= 6 && address.street.trim().length > 0 && address.city.trim().length > 0;
    return hasAddress && !!selectedCourierMethod;
  };

  const handleOrder = async (eOrPiId?: React.FormEvent | string) => {
    let stripePaymentIntentId: string | null = null;
    if (typeof eOrPiId === "string") {
      stripePaymentIntentId = eOrPiId;
    } else if (eOrPiId && "preventDefault" in eOrPiId) {
      eOrPiId.preventDefault();
    }
    if (!cartItems || cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Please add products before checking out.", variant: "destructive" });
      return;
    }
    if (!address.full_name || !address.phone || !address.street || !address.city) {
      toast({ title: "Please fill in all required address fields", variant: "destructive" });
      setStep(1);
      return;
    }
    if (!selectedCourierMethod) {
      toast({ title: "Please select a delivery method", variant: "destructive" });
      setStep(1);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-order", {
      body: {
        shipping_address: address,
        notes,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
        coupon_discount: couponDiscount,
        gift_wrap: giftWrap,
        gift_message: giftMessage,
        shipping_method_id: shippingMethods?.[0]?.id || null,
        buy_now_item: isBuyNow ? activeBuyNowItem : null,
        transaction_id: stripePaymentIntentId || mfsProofData?.transactionId || null,
        preferred_courier: selectedCourierMethod?.name || defaultPartner,
        hub_pickup: false,
        pickup_hub_id: null,
        shipping_fee_override: shippingFee,
        cod_extra_fee: codExtraFee,
        loyalty_discount: loyaltyDiscount,
        loyalty_points_used: 0,
      },
    });

    if (error || !data?.success) {
      setLoading(false);
      toast({ title: "Order failed", description: data?.error || "Something went wrong", variant: "destructive" });
      return;
    }

    const { data: orderRow } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", data.order_number)
      .single();

    if (orderRow?.id && appliedDeliveryOffer) {
      const absorbed = appliedDeliveryOffer.offer_type === "free_delivery"
        ? baseShippingFee
        : Math.max(0, baseShippingFee - shippingFee);
      await supabase
        .from("orders")
        .update({
          delivery_offer_id: appliedDeliveryOffer.id,
          delivery_cost_actual: baseShippingFee,
          margin_absorbed: absorbed,
        } as any)
        .eq("id", orderRow.id);
    }

    if (orderRow?.id) {
      notifyOrder({ order_id: orderRow.id }).catch((e) =>
        console.warn("[checkout] notifyNewOrder failed", e),
      );
    }

    // Clear session and cart state on successful order placement
    if (typeof window !== "undefined") {
      if (data?.order_number) {
        try {
          const list = JSON.parse(localStorage.getItem("orizino_placed_orders") || "[]");
          if (!list.includes(data.order_number)) {
            list.unshift(data.order_number);
            localStorage.setItem("orizino_placed_orders", JSON.stringify(list));
          }
        } catch (e) {
          console.warn("Failed to record placed order number", e);
        }
      }

      sessionStorage.removeItem("orizino_is_buy_now");
      sessionStorage.removeItem("orizino_buy_now_item");
      localStorage.removeItem("orizino_is_buy_now");
      localStorage.removeItem("orizino_buy_now_item");
      localStorage.removeItem("orizino_checkout_active_session");

      if (checkoutSerial) {
        localStorage.removeItem(`orizino_checkout_session_${checkoutSerial}`);
      }

      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("orizino_checkout_session_")) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      if (!isBuyNow) {
        if (!user) {
          localStorage.removeItem("guest_cart");
          window.dispatchEvent(new CustomEvent("guest-cart-updated"));
        } else {
          // Clear DB cart for logged in user
          supabase.from("cart_items").delete().eq("user_id", user.id).then(() => {});
        }
      }
    }

    setLoading(false);

    if (isMFSMethod) {
      setOrderSuccess(data.order_number);
    } else {
      toast({ title: "🎉 Order placed!", description: `Order ${data.order_number} confirmed.` });
      navigate("/orders");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20 lg:pb-0">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto px-6 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Order Placed</h1>
          <p className="text-sm text-muted-foreground">
            Order <span className="font-mono font-bold text-foreground">{orderSuccess}</span> has been created successfully.
          </p>
          <div className="border border-border/50 rounded-xl p-4 text-xs text-muted-foreground space-y-2 text-left bg-card">
            <p className="font-semibold text-foreground">Next steps:</p>
            <p>Our team will verify your order details and reach out to confirm delivery dispatch.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {user ? (
              <Button onClick={() => navigate("/orders")} className="rounded-xl h-11 w-full font-semibold">
                View My Orders <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/")} className="rounded-xl h-11 w-full font-semibold">
                Continue Shopping <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "Address & Delivery", icon: MapPin },
    { num: 2, label: "Payment Method", icon: CreditCard },
    { num: 3, label: "Order Review", icon: Check },
  ];

  return (
    <div className="min-h-screen pb-40 md:pb-16">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        
        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} className="hidden md:block" />

        {/* Page Header */}
        <div className="border-b border-border/40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Checkout</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Complete your purchase securely</p>
          </div>
          <div className="flex items-center gap-3">
            {checkoutSerial && (
              <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground bg-secondary/40">
                Session: {checkoutSerial}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>256-bit Encrypted Checkout</span>
            </div>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 border-b border-border/30 pb-4">
          {steps.map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => isDone && setStep(s.num)}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "border-foreground/60 bg-secondary/80 text-foreground font-semibold shadow-xs"
                    : isDone
                      ? "border-border/60 bg-card text-foreground cursor-pointer hover:border-foreground/40"
                      : "border-border/30 bg-transparent text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                  isDone || isCurrent ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span className="text-xs font-medium truncate hidden sm:inline">{s.label}</span>
                <span className="text-[11px] font-medium truncate sm:hidden">{s.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Collapsible Order Summary Banner */}
        <div className="lg:hidden border border-border/60 rounded-xl bg-card overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-medium bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShoppingBag className="w-4 h-4 text-foreground" />
              <span>Order Summary ({cartItems?.length || 0})</span>
              {mobileSummaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <span className="font-bold text-sm text-foreground tabular-nums">{formatPrice(total)}</span>
          </button>

          <AnimatePresence>
            {mobileSummaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 space-y-3 border-t border-border/40 text-xs"
              >
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {cartItems?.map((item) => {
                    const product = item.products as any;
                    const variant = (item as any).product_variants as any;
                    if (!product) return null;
                    const price = variant?.price_override ?? product.price;
                    return (
                      <div key={item.id} className="flex items-center gap-2.5">
                        <img src={product.thumbnail || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-foreground tabular-nums">{formatPrice(price * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border/30 pt-2.5 space-y-1.5 text-muted-foreground text-[11px]">
                  <div className="flex justify-between"><span>Subtotal</span><span className="text-foreground">{formatPrice(subtotal)}</span></div>
                  {selectedCourierMethod && <div className="flex justify-between"><span>Delivery</span><span className="text-foreground">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span></div>}
                  {codExtraFee > 0 && <div className="flex justify-between"><span>COD Fee</span><span className="text-foreground">+{formatPrice(codExtraFee)}</span></div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Main Form Column */}
          <div className="lg:col-span-7 space-y-6">

            {/* STEP 1: Address & Delivery Method */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Saved Addresses Grid */}
                {savedAddresses.length > 0 && !showAddressForm && (
                  <div className="border border-border/60 rounded-xl p-5 bg-card space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-foreground" /> Saved Addresses
                      </h3>
                      <button
                        type="button"
                        onClick={() => { setSelectedSavedAddress(null); setShowAddressForm(true); }}
                        className="text-xs text-foreground hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New Address
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {savedAddresses.map((addr: any) => {
                        const TypeIcon = addressTypeIcons[addr.type] || MapPinned;
                        const isSelected = selectedSavedAddress === addr.id;
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => selectSavedAddress(addr)}
                            className={`text-left p-3.5 rounded-xl border transition-all ${
                              isSelected
                                ? "border-foreground/60 bg-secondary/40 shadow-xs"
                                : "border-border/60 hover:border-foreground/30 bg-background"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <TypeIcon className="w-3.5 h-3.5 text-foreground" />
                                <span className="text-xs font-semibold text-foreground capitalize">{addr.label || addr.type}</span>
                              </div>
                              {addr.isDefault && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border/60">Default</span>
                              )}
                            </div>
                            <p className="text-xs text-foreground font-semibold truncate">{addr.name}</p>
                            <p className="text-[11px] text-muted-foreground">{addr.phone}</p>
                            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 mt-0.5">{addr.street}, {addr.city}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add New Address Form */}
                {(showAddressForm || savedAddresses.length === 0) && (
                  <div className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-foreground" /> Add New Address
                      </h3>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(false)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Use saved address
                        </button>
                      )}
                    </div>

                    {/* Address Type Selector (Dense Straight Rectangle Panel on Mobile, Slim Capsule on Desktop) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Address Type</Label>
                      <div className="grid grid-cols-3 p-1 bg-secondary/40 border border-border/50 rounded-xl sm:flex sm:p-0 sm:bg-transparent sm:border-0 sm:gap-1.5 sm:w-auto">
                        {ADDRESS_TYPES.map((t) => {
                          const Icon = t.icon;
                          const isSelected = newAddressType === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setNewAddressType(t.id);
                                setNewAddressLabel(t.label);
                              }}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:py-1 sm:px-3 text-[11px] font-medium transition-all w-full sm:w-auto rounded-lg sm:rounded-full ${
                                isSelected
                                  ? "bg-foreground text-background font-semibold shadow-xs"
                                  : "text-muted-foreground hover:text-foreground bg-transparent sm:border sm:border-border/40 sm:hover:border-border/70"
                              }`}
                            >
                              <Icon className="w-3 h-3 shrink-0" />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Address Label (Optional)</Label>
                        <Input
                          value={newAddressLabel}
                          onChange={(e) => setNewAddressLabel(e.target.value)}
                          placeholder="e.g. My Home, Main Campus, Head Office"
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Recipient Name *</Label>
                        <Input
                          value={address.full_name}
                          onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                          required
                          placeholder="Full Name"
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Primary Mobile Number * (11 digits)</Label>
                        <Input
                          type="tel"
                          inputMode="tel"
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          required
                          placeholder="017XXXXXXXX"
                          className="rounded-xl h-11 sm:h-10 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Alternative Phone (Optional for Rider)</Label>
                        <Input
                          type="tel"
                          inputMode="tel"
                          value={address.secondary_phone || ""}
                          onChange={(e) => setAddress({ ...address, secondary_phone: e.target.value })}
                          placeholder="018XXXXXXXX"
                          className="rounded-xl h-11 sm:h-10 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">District / City *</Label>
                        <Input
                          list="bd-districts-list"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          required
                          placeholder="Select or type District (e.g. Dhaka, Chattogram)"
                          className="rounded-xl h-11 sm:h-10 text-sm"
                        />
                        <datalist id="bd-districts-list">
                          {BD_COURIER_LOCATIONS.map((l) => (
                            <option key={l.district} value={l.district} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Thana / Upazila / Zone *</Label>
                        <Input
                          list="bd-thanas-list"
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                          required
                          placeholder="e.g. Dhanmondi, Mirpur, Uttara, Savar"
                          className="rounded-xl h-11 sm:h-10 text-sm"
                        />
                        <datalist id="bd-thanas-list">
                          {availableThanas.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">Detailed Street Address * (House #, Road #, Flat, Landmark)</Label>
                        <Input
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          required
                          className="rounded-xl h-11 sm:h-10 text-sm"
                          placeholder="House #12, Road #4, Flat 3B, Block C, near City College"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Area / Sub-Zone / Ward (Optional)</Label>
                        <Input
                          value={address.area || ""}
                          onChange={(e) => setAddress({ ...address, area: e.target.value })}
                          placeholder="e.g. Sector 10, West Dhanmondi"
                          className="rounded-xl h-11 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Postal Code</Label>
                        <Input
                          inputMode="numeric"
                          value={address.zip}
                          onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                          placeholder="e.g. 1205"
                          className="rounded-xl h-11 sm:h-10 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* Dynamic Courier API Info & Pickup Point Card */}
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Truck className="w-4 h-4 text-foreground" />
                          <span>Delivery via {courierRateInfo.courierName}</span>
                        </div>
                        <Badge variant="outline" className="border-border/80 text-foreground font-bold text-[10px]">
                          ৳{courierRateInfo.price} ({courierRateInfo.deliveryDays})
                        </Badge>
                      </div>
                      
                      {courierRateInfo.pickupPoint && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>Nearby Pickup Point: <span className="font-semibold text-foreground">{courierRateInfo.pickupPoint}</span></span>
                        </p>
                      )}

                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Cash on Delivery is available for {address.city || "Dhaka"}</span>
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveNewAddress}
                      disabled={savingAddress}
                      className="w-full rounded-xl h-11 font-semibold text-xs mt-2"
                    >
                      {savingAddress ? (
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save & Select This Address
                    </Button>
                  </div>
                )}

                {/* Delivery Method Picker (Inline with Address - Live Courier API Driven) */}
                <div className="border border-border/60 rounded-2xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-foreground" /> Delivery Method
                    </h3>
                    <Badge variant="outline" className="text-[11px] font-semibold border-border/80 text-muted-foreground bg-secondary/40 px-2.5 py-0.5">
                      Real-time Courier API
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {dynamicCourierMethods.map((method) => {
                      const isSelected = activeCourierMethodId === method.id;
                      const isFree = subtotal >= 3000; // Free shipping above threshold
                      const methodPrice = isFree ? 0 : method.price;

                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setActiveCourierMethodId(method.id)}
                          className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all group ${
                            isSelected
                              ? "border-foreground/60 bg-secondary/40 ring-1 ring-foreground/30 shadow-xs"
                              : "border-border/60 hover:border-foreground/30 bg-background/60 hover:bg-background"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "bg-foreground text-background font-bold" : "bg-secondary text-muted-foreground group-hover:text-foreground"
                          }`}>
                            <Truck className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-bold text-foreground">{method.name}</p>
                              {isSelected && (
                                <Badge className="text-[9px] bg-foreground text-background font-bold uppercase tracking-wider py-0.5 px-2 rounded-full">
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-foreground">{method.estimated_days}</span>
                              <span className="text-muted-foreground">· {method.subtitle}</span>
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div className="text-right">
                              {isFree ? (
                                <span className="text-sm font-bold text-emerald-500">Free</span>
                              ) : (
                                <span className="text-base font-bold text-foreground tabular-nums">{formatPrice(methodPrice)}</span>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isSelected ? "bg-foreground text-background font-bold" : "border border-border/70 group-hover:border-foreground/40"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {appliedDeliveryOffer && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <Tag className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{appliedDeliveryOffer.title} applied — {appliedDeliveryOffer.offer_type === "free_delivery" ? "Free delivery!" : `Save ${formatPrice(deliveryDiscount)}`}</span>
                    </div>
                  )}
                </div>

                {/* Order Notes */}
                <div className="border border-border/60 rounded-xl p-4 sm:p-5 bg-card space-y-2 shadow-xs">
                  <Label className="text-xs font-medium text-muted-foreground">Delivery Instructions (Optional)</Label>
                  <AutoExpandingTextarea
                    value={notes}
                    onChange={setNotes}
                    placeholder="Special delivery instructions, gate codes, etc."
                    maxHeight={140}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToPayment()}
                  className="w-full rounded-xl h-12 font-semibold"
                >
                  Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* STEP 2: Payment Method & Master Panel COD System */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-foreground" /> Select Payment Method
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableGateways.map((gw) => {
                      const isSelected = paymentMethod === gw.id;
                      return (
                        <button
                          key={gw.id}
                          type="button"
                          onClick={() => { setPaymentMethod(gw.id); setMfsProofData(null); }}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-foreground/60 bg-secondary/40 shadow-xs"
                              : "border-border/60 hover:border-foreground/30 bg-background"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <gw.icon className="w-4 h-4 text-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">{gw.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{gw.desc}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-foreground shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* COD Handling: Normal vs Advance Delivery Charge Mode */}
                  {paymentMethod === "cod" && (
                    <div className="space-y-3 pt-2">
                      {isAdvanceCodMode ? (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
                          <div className="flex items-start gap-2 text-amber-600 font-semibold">
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold">Advance Delivery Payment Required</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                To confirm your Cash on Delivery order, please pay the delivery fee of <span className="font-semibold text-foreground">{formatPrice(shippingFee)}</span> in advance via MFS. The remaining balance of <span className="font-semibold text-foreground">{formatPrice(Math.max(0, total - shippingFee))}</span> will be collected upon delivery.
                              </p>
                            </div>
                          </div>
                          {mfsAccountInfo && (
                            <MFSPaymentProof
                              method="bkash"
                              accountInfo={mfsAccountInfo}
                              amount={shippingFee}
                              formatPrice={formatPrice}
                              onProofSubmitted={(screenshotUrl, transactionId) => {
                                setMfsProofData({ screenshotUrl, transactionId });
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground text-center">
                          Pay with cash when your package is delivered to your address.
                          {codExtraFee > 0 && <span className="text-foreground font-medium block mt-0.5">An extra COD handling charge of {formatPrice(codExtraFee)} is included.</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard MFS Proof Form */}
                  {isMFSMethod && mfsAccountInfo && (
                    <div className="pt-2">
                      <MFSPaymentProof
                        method={paymentMethod}
                        accountInfo={mfsAccountInfo}
                        amount={total}
                        formatPrice={formatPrice}
                        onProofSubmitted={(screenshotUrl, transactionId) => {
                          setMfsProofData({ screenshotUrl, transactionId });
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl h-12 font-semibold">Back</Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canProceedToReview()}
                    className="flex-1 rounded-xl h-12 font-semibold"
                  >
                    {((isMFSMethod || isAdvanceCodMode) && !mfsProofData) ? (
                      <><Camera className="w-4 h-4 mr-2" /> Upload Proof First</>
                    ) : (
                      <>Review Order <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Order Review & Confirmation */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="border border-border/60 rounded-2xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3.5">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-foreground" /> Order Review
                    </h3>
                    <Badge variant="outline" className="text-[11px] font-semibold border-border/80 text-muted-foreground bg-secondary/40 px-2.5 py-0.5">
                      Final Step
                    </Badge>
                  </div>

                  {/* Shipping Address & Delivery Summary Card */}
                  <div className="w-full p-4.5 rounded-2xl border border-border/70 bg-background/80 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-foreground" /> Shipping Address & Delivery
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] font-semibold text-foreground/90 hover:text-foreground bg-secondary/80 hover:bg-secondary px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border border-border/60 shadow-2xs"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" /> Edit
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        {address.full_name} <span className="text-muted-foreground font-mono text-xs font-normal">· {address.phone}</span>
                      </p>
                      <p className="text-xs text-muted-foreground/90 mt-0.5 leading-relaxed">
                        {address.street}, {address.city}, {address.state} {address.zip || ""}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/60 text-xs font-semibold text-foreground">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{selectedCourierMethod?.name || "Standard Delivery"}</span>
                      </div>
                      <span className="text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full select-none pointer-events-none">
                        {shippingFee === 0 ? "Free Shipping" : formatPrice(shippingFee)}
                      </span>
                    </div>

                    {notes && (
                      <p className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-xl italic">
                        Note: "{notes}"
                      </p>
                    )}
                  </div>

                  {/* Payment Method Summary Card */}
                  <div className="w-full p-4.5 rounded-2xl border border-border/70 bg-background/80 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-foreground" /> Payment Method
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[11px] font-semibold text-foreground/90 hover:text-foreground bg-secondary/80 hover:bg-secondary px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border border-border/60 shadow-2xs"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" /> Edit
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">
                        {availableGateways.find((g) => g.id === paymentMethod)?.name}
                      </p>
                      {paymentMethod === "cod" && isAdvanceCodMode && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold">
                          Advance Delivery Fee Paid
                        </Badge>
                      )}
                    </div>

                    {(isMFSMethod || isAdvanceCodMode) && mfsProofData && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium pt-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Payment verification proof attached
                      </p>
                    )}
                  </div>

                  {appliedCoupon && (
                    <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/60 text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-muted-foreground" /> Coupon Discount: {appliedCoupon.code}</span>
                      <span className="text-sm font-bold text-emerald-500">-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                </div>

                {paymentMethod === "card" ? (
                  <div className="space-y-3">
                    <ClientOnly fallback={<div className="border border-border/50 rounded-xl p-6 text-xs text-muted-foreground text-center">Loading card checkout…</div>}>
                      <React.Suspense fallback={<div className="border border-border/50 rounded-xl p-6 text-xs text-muted-foreground text-center">Loading card checkout…</div>}>
                        <StripeCardPayment
                          amount={total}
                          currency="USD"
                          description={`Order for ${address.full_name || user?.email || "customer"}`}
                          metadata={{ user_id: user?.id || "", channel: "web-checkout" }}
                          onSuccess={(piId) => handleOrder(piId)}
                          disabled={loading || !cartItems?.length}
                          submitLabel={`Pay ${formatPrice(total)}`}
                        />
                      </React.Suspense>
                    </ClientOnly>
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full rounded-xl h-11 text-xs">
                      Back to Payment
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl h-12 font-semibold">Back</Button>
                    <Button type="submit" disabled={loading || !cartItems?.length} className="flex-1 rounded-xl h-12 font-semibold">
                      {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <>Place Order <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                  </div>
                )}

                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Guaranteed Safe & Secure Checkout
                </p>
              </motion.div>
            )}

          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
            <div className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
              <h3 className="text-sm font-semibold text-foreground tracking-tight border-b border-border/30 pb-3">
                Order Summary ({cartItems?.length || 0})
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cartItems?.map((item) => {
                  const product = item.products as any;
                  const variant = (item as any).product_variants as any;
                  if (!product) return null;
                  const price = variant?.price_override ?? product.price;
                  const variantLabel = [variant?.size, variant?.color].filter(Boolean).join(" / ");
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={product.thumbnail || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/40" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                        {variantLabel && <p className="text-[11px] text-muted-foreground">{variantLabel}</p>}
                        <p className="text-[11px] text-muted-foreground/80">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{formatPrice(price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Price Calculation Lines */}
              <div className="border-t border-border/30 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Delivery Fee
                  </span>
                  {selectedCourierMethod ? (
                    shippingFee === 0 ? (
                      <span className="text-emerald-500 font-semibold">Free</span>
                    ) : (
                      <span className="text-foreground font-medium">{formatPrice(shippingFee)}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground/60 italic text-[11px]">Select in Step 1</span>
                  )}
                </div>

                {paymentMethod === "cod" && codExtraFee > 0 && (
                  <div className="flex justify-between text-foreground font-medium">
                    <span>COD Fee</span>
                    <span>+{formatPrice(codExtraFee)}</span>
                  </div>
                )}

                {tierDiscount > 0 && (
                  <div className="flex justify-between text-amber-500 font-medium">
                    <span className="flex items-center gap-1 text-[11px]"><Award className="w-3 h-3" /> {tierInfo?.current.name} Tier ({tierDiscountPct}%)</span>
                    <span>-{formatPrice(tierDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t border-border/40 pt-3.5 flex items-baseline justify-between text-foreground">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-xl font-bold tracking-tight">{formatPrice(total)}</span>
              </div>

            </div>
          </div>

          {/* Mobile Sticky Action Bar */}
          {!(step === 3 && paymentMethod === "card") && (
            <div className="md:hidden">
              <StickyActionBar aboveBottomNav>
                <div className="flex items-center gap-2.5 w-full">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      className="rounded-xl h-12 px-3 font-semibold shrink-0"
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  )}
                  {step === 1 && (
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canProceedToPayment()}
                      className="flex-1 rounded-xl h-12 font-semibold text-xs sm:text-sm"
                    >
                      Continue to Payment <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                  {step === 2 && (
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!canProceedToReview()}
                      className="flex-1 rounded-xl h-12 font-semibold text-xs sm:text-sm"
                    >
                      {((isMFSMethod || isAdvanceCodMode) && !mfsProofData) ? (
                        <><Camera className="w-4 h-4 mr-1.5" /> Upload Proof First</>
                      ) : (
                        <>Review Order <ArrowRight className="w-4 h-4 ml-1.5" /></>
                      )}
                    </Button>
                  )}
                  {step === 3 && (
                    <Button type="submit" disabled={loading || !cartItems?.length} className="flex-1 rounded-xl h-12 font-semibold text-xs sm:text-sm">
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Place Order · {formatPrice(total)} <ArrowRight className="w-4 h-4 ml-1.5" /></>
                      )}
                    </Button>
                  )}
                </div>
              </StickyActionBar>
            </div>
          )}

        </form>
      </main>
    </div>
  );
};

export default CheckoutPage;
