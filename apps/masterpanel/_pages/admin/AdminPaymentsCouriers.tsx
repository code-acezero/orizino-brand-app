"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Key, Truck, Building2, Percent, Package, CreditCard, ChevronRight, ShoppingCart } from "lucide-react";

const SECTIONS = [
  {
    group: "Payments",
    items: [
      { title: "Payment Gateways", url: "/sales/payment-gateways", icon: Key,        desc: "Personal accounts, Stripe & merchant APIs" },
      { title: "Orders",           url: "/sales/orders",           icon: ShoppingCart, desc: "All orders & payment verifications" },
      { title: "Returns",          url: "/sales/returns",          icon: Package,    desc: "Return requests & refunds" },
    ],
  },
  {
    group: "Couriers & Shipping",
    items: [
      { title: "Shipping Zones",      url: "/sales/shipping",            icon: Truck,      desc: "Zones, rates & delivery rules" },
      { title: "Couriers",            url: "/sales/couriers",            icon: Truck,      desc: "Pathao, Steadfast & courier integrations" },
      { title: "Hubs & Pricing",      url: "/sales/courier-management",  icon: Building2,  desc: "Pickup hubs & pricing rules" },
      { title: "Delivery Offers",     url: "/sales/delivery-offers",     icon: Percent,    desc: "Free & flat-rate shipping promotions" },
    ],
  },
];

const ia = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.24, ease: "easeOut" } }),
} as Variants;

export default function AdminPaymentsCouriers() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["payments-couriers-stats"],
    queryFn: async () => {
      const [pendingRes, returnsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status" as never, "pending" as never),
        supabase.from("return_requests").select("id", { count: "exact", head: true }).eq("status", "pending").maybeSingle().then(r => ({ count: 0 })),
      ]);
      return { pendingPayments: pendingRes.count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
          Payments & Couriers
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">Payment gateways, shipping zones, courier integrations & delivery offers</p>
      </div>

      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Payments", value: stats.pendingPayments, icon: CreditCard, url: "/sales/orders?tab=payments" },
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
