"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  Headphones,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/25", icon: Clock },
  processing: { label: "Processing", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/25", icon: Layers },
  shipped: { label: "Shipped", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/25", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/25", icon: AlertTriangle },
};

export default function DashboardVisualPreviews() {
  const navigate = useNavigate();

  // 1. Recent Orders Query
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["dashboard-recent-orders-preview"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, shipping_address")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  // 2. Low stock & Catalog telemetry
  const { data: catalogHealth } = useQuery({
    queryKey: ["dashboard-catalog-health-preview"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [lowStockRes, totalActiveRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, stock_quantity, thumbnail")
          .eq("is_active", true)
          .lt("stock_quantity", 10)
          .order("stock_quantity", { ascending: true })
          .limit(4),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);
      return {
        lowStock: lowStockRes.data ?? [],
        totalActive: totalActiveRes.count ?? 0,
      };
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      {/* Visual Preview 1: Live Orders Flow */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Recent Order Flow</h4>
              <p className="text-[11px] text-muted-foreground">Latest fulfillment intake</p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/sales/orders" })}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            All Orders <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2 flex-1">
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent orders recorded.
            </div>
          ) : (
            recentOrders.map((ord: any) => {
              const cfg = STATUS_CONFIG[ord.status] || STATUS_CONFIG.pending;
              const customerName =
                (ord.shipping_address as any)?.full_name ||
                (ord.shipping_address as any)?.name ||
                "Customer";

              return (
                <div
                  key={ord.id}
                  onClick={() => navigate({ to: "/sales/orders" })}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-background hover:border-border/80 transition-all cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        #{ord.order_number || ord.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {customerName} · {formatDistanceToNow(new Date(ord.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-xs sm:text-sm text-foreground">
                      ৳{Number(ord.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Visual Preview 2: Catalog Health & Low Stock Warning */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Catalog & Stock Health</h4>
              <p className="text-[11px] text-muted-foreground">
                {catalogHealth?.totalActive ?? 0} active products in store
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/sales/products-management?tab=stock" })}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            Inventory Sync <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2 flex-1">
          {(!catalogHealth?.lowStock || catalogHealth.lowStock.length === 0) ? (
            <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-1" />
              <p className="font-semibold text-foreground">All items well-stocked</p>
              <p className="text-[11px]">No low stock alerts detected across active catalog.</p>
            </div>
          ) : (
            catalogHealth.lowStock.map((prod: any) => (
              <div
                key={prod.id}
                onClick={() => navigate({ to: "/sales/products-management?tab=stock" })}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-background hover:border-border/80 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {prod.thumbnail ? (
                    <img
                      src={prod.thumbnail}
                      alt={prod.name}
                      className="w-8 h-8 rounded-lg object-cover border border-border/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {prod.name}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      ID: {prod.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (prod.stock_quantity ?? 0) <= 2
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                  }`}>
                    {prod.stock_quantity ?? 0} in stock
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
