"use client";
import React, { useState, useEffect } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Clock,
  Search,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  User,
  Phone,
  FileText,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";
import LogoLoader from "@/components/LogoLoader";
import { toast } from "@/lib/app-toast";

const LiveTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Parse order ID / search query from URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || params.get("id") || params.get("order") || params.get("code") || params.get("t") || params.get("num");
      if (q) {
        setActiveQuery(q);
        setSearchInput(q);
      } else if (id) {
        setActiveQuery(id);
        setSearchInput(id);
      }
    }
  }, [id]);

  const { data: order, isLoading, isFetching } = useQuery<any>({
    queryKey: ["order_tracking", activeQuery],
    queryFn: async (): Promise<any> => {
      if (!activeQuery) return null;
      const q = activeQuery.trim();

      // 1. Direct match by Order ID, Order Number, or Courier Tracking Code
      const { data: directMatch } = await supabase
        .from("orders" as any)
        .select("*, order_items(*), pathao_shipments(*), steadfast_shipments(*)")
        .or(`id.eq.${q},order_number.eq.${q},tracking_number.eq.${q},tracking_token.eq.${q}`)
        .maybeSingle();

      if (directMatch) return directMatch;

      // 2. Match by Customer Phone Number
      const { data: phoneMatch } = await supabase
        .from("orders" as any)
        .select("*, order_items(*), pathao_shipments(*), steadfast_shipments(*)")
        .eq("customer_phone", q)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (phoneMatch) return phoneMatch;

      // 3. Match by Steadfast or Pathao consignment code
      const { data: sfMatch } = await supabase
        .from("steadfast_shipments" as any)
        .select("order_id")
        .eq("tracking_code", q)
        .maybeSingle();

      if ((sfMatch as any)?.order_id) {
        const { data: sfOrder } = await supabase
          .from("orders" as any)
          .select("*, order_items(*), pathao_shipments(*), steadfast_shipments(*)")
          .eq("id", (sfMatch as any).order_id)
          .maybeSingle();
        if (sfOrder) return sfOrder;
      }

      return null;
    },
    enabled: !!activeQuery,
    refetchInterval: 30_000,
  });

  // Trigger live backend courier API sync
  useEffect(() => {
    if (!order) return;
    const trigger = () => supabase.functions.invoke("sync-shipments", { body: { orderId: order.id } }).catch(() => {});
    trigger();
    const t = setInterval(trigger, 60_000);
    return () => clearInterval(t);
  }, [order?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast({ title: "Please enter an Order Number or Tracking Code", variant: "destructive" });
      return;
    }
    setActiveQuery(searchInput.trim());
  };

  const copyCode = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedCode(true);
    toast({ title: "Tracking ID copied to clipboard" });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const o = order as any;
  const pathao = o?.pathao_shipments?.[0];
  const steadfast = o?.steadfast_shipments?.[0];
  const provider = pathao ? "Pathao Courier" : steadfast ? "Steadfast Courier" : "Express Store Courier";
  const trackingCode = pathao?.consignment_id || steadfast?.tracking_code || o?.tracking_number;
  const status: string = pathao?.order_status || steadfast?.status || o?.status || "pending";
  const items: any[] = o?.order_items || [];

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">
        
        {/* Navigation Header Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Orders
          </Link>
          {user && (
            <Badge variant="outline" className="text-[10px] font-semibold border-border/80 text-muted-foreground bg-secondary/40">
              Account: {user.email}
            </Badge>
          )}
        </div>

        {/* Live Order Search Card */}
        <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card space-y-4 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground bg-secondary/40">
                  Live Dispatch Portal
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
                Live Package & Courier Tracking
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instant dispatch status updates for signed-in and guest customer orders
              </p>
            </div>
            <Badge variant="outline" className="w-fit text-[11px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1.5 py-1 px-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Real-Time Courier Sync Active
            </Badge>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Order # (e.g. ZM-MSJ67WD2), Courier CID, or Mobile Number..."
                className="pl-9 rounded-xl h-11 text-sm bg-background border-border/60"
              />
            </div>
            <Button type="submit" disabled={isFetching} className="rounded-xl h-11 px-6 font-semibold text-xs gap-2 shrink-0">
              {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track Package
            </Button>
          </form>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="min-h-[30vh] flex items-center justify-center">
            <LogoLoader />
          </div>
        )}

        {/* Active Order Tracking Result */}
        {order ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Header & Main Status Card */}
            <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground">#{order.order_number}</h2>
                    <button
                      type="button"
                      onClick={() => copyCode(order.order_number)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Order #"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Placed {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>·</span>
                    <span className="font-semibold text-foreground">Total: {formatPrice(order.total)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-semibold border-border/80 bg-secondary/40 text-foreground py-1 px-3">
                    {provider}
                  </Badge>
                  {trackingCode && (
                    <Badge variant="outline" className="text-xs font-mono font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 py-1 px-3">
                      CID: {trackingCode}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Multi-step Visual Progress Timeline */}
              <OrderTrackingTimeline
                status={status}
                trackingNumber={trackingCode}
                updatedAt={order.updated_at}
              />
            </div>

            {/* Two-Column Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Ordered Items */}
              <div className="lg:col-span-7 space-y-4">
                <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center justify-between border-b border-border/30 pb-3">
                    <span>Package Items ({items.length})</span>
                    <span className="text-xs font-normal text-muted-foreground">Order Contents</span>
                  </h3>

                  <div className="space-y-3">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3.5 p-3 rounded-2xl bg-secondary/30 border border-border/40">
                        <img
                          src={item.product_image || "/placeholder.svg"}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border border-border/40 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.product_name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Quantity: {item.quantity} · {formatPrice(item.unit_price)} each
                          </p>
                        </div>
                        <span className="text-xs font-bold text-foreground tabular-nums shrink-0">{formatPrice(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Summary */}
                  <div className="border-t border-border/30 pt-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-foreground font-medium">{formatPrice(order.subtotal || order.total)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee</span>
                      <span className="text-foreground font-medium">{formatPrice(order.shipping_fee || 0)}</span>
                    </div>
                    {Number(order.coupon_discount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-500 font-medium">
                        <span>Discount</span>
                        <span>-{formatPrice(order.coupon_discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-foreground font-bold border-t border-border/40 pt-2 text-sm">
                      <span>Total Amount</span>
                      <span className="tabular-nums">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Delivery Address & Courier Status */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Delivery Information */}
                <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-foreground tracking-tight border-b border-border/30 pb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-foreground" /> Delivery Destination
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{(order.shipping_address as any)?.full_name || (order as any).customer_name || "Valued Customer"}</span>
                    </div>

                    {(order.shipping_address as any)?.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground font-mono">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{(order.shipping_address as any).phone}</span>
                      </div>
                    )}

                    <div className="text-muted-foreground pl-5 space-y-0.5">
                      <p>{(order.shipping_address as any)?.street}</p>
                      <p>{[(order.shipping_address as any)?.city, (order.shipping_address as any)?.state, (order.shipping_address as any)?.country].filter(Boolean).join(", ")}</p>
                      {(order.shipping_address as any)?.zip && <p className="font-mono text-[11px]">Zip Code: {(order.shipping_address as any).zip}</p>}
                    </div>
                  </div>
                </div>

                {/* Payment Method Card */}
                <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-3 shadow-xs">
                  <h3 className="text-sm font-bold text-foreground tracking-tight border-b border-border/30 pb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-foreground" /> Payment Overview
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Method</span>
                      <span className="font-bold text-foreground uppercase">{(order as any).payment_method || "COD"}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">{(order as any).payment_status || "Unpaid"}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </motion.div>
        ) : activeQuery ? (
          <div className="border border-border/60 rounded-3xl p-12 bg-card text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Package Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn't find an order matching <span className="font-mono font-semibold text-foreground">"{activeQuery}"</span>. Please check your order number or phone number and try again.
            </p>
          </div>
        ) : null}

      </main>
    </div>
  );
};

export default LiveTrackingPage;
