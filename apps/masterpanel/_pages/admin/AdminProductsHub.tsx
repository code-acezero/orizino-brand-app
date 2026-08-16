"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Package, FolderTree, Star, MessageSquare, Layers, Tag, Gift, Percent, ChevronRight, Heart } from "lucide-react";

const SECTIONS = [
  {
    group: "Catalogue",
    items: [
      { title: "Products",    url: "/sales/products-management?tab=products",   icon: Package,     desc: "Inventory, variants & pricing" },
      { title: "Categories",  url: "/sales/products-management?tab=categories", icon: FolderTree,  desc: "Product taxonomy & hierarchy" },
      { title: "Stock & Serials", url: "/sales/products-management?tab=stock",  icon: Package,     desc: "Serial numbers, barcodes & Sheets sync" },
      { title: "Product Scanner", url: "/sales/products-management?tab=scanner", icon: Package, desc: "Serial & product scanner" },
      { title: "Reviews",     url: "/sales/reviews",     icon: Star,        desc: "Customer product reviews" },
      { title: "Wishlists & Demand", url: "/sales/requests", icon: Heart, desc: "Customer wishlists & restock alerts" },

    ],
  },
  {
    group: "Promotions & Discounts",
    items: [
      { title: "Coupons & Vouchers", url: "/sales/coupons?tab=coupons", icon: Tag, desc: "Discount codes, limits & targeting" },
      { title: "Targeted User Promos", url: "/sales/coupons?tab=user-promos", icon: Gift, desc: "Audience conditions & popup triggers" },
      { title: "Delivery Offers", url: "/sales/delivery-offers", icon: Percent, desc: "Free shipping rules & courier waivers" },
    ],
  },
];

const ia = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.24, ease: "easeOut" } }),
} as Variants;

export default function AdminProductsHub() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["products-hub-stats"],
    queryFn: async () => {
      const [productsRes, reviewsRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase.from("product_reviews" as never) as any).select("id", { count: "exact", head: true }).eq("approved", false),
      ]);
      return { products: productsRes.count ?? 0, pendingReviews: reviewsRes.count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
          Products Management
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">Catalogue, categories, promotions, coupons & storefront showcase</p>
      </div>

      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3">
          {[
            { label: "Active Products",  value: stats.products,       icon: Package, url: "/sales/products" },
            { label: "Pending Reviews",  value: stats.pendingReviews, icon: Star,    url: "/sales/reviews" },
          ].map(({ label, value, icon: Icon, url }) => (
            <button key={label} onClick={() => navigate(url)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-card/60 p-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground leading-none">{value.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {SECTIONS.map((group, gi) => (
        <div key={group.group}>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">{group.group}</p>
          <div className="space-y-2">
            {group.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button key={item.url} custom={gi * 10 + i} variants={ia} initial="hidden" animate="visible"
                  onClick={() => navigate(item.url)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
// code:4ce0
