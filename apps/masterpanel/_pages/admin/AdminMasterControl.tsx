"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ShoppingCart, Search, Tag, Palette, Activity, Settings, Users2, ChevronRight, LayoutGrid, Package } from "lucide-react";

const ALL_SECTIONS = [
  { key: "sales",      title: "Customer & Sales",     url: "/sales",                                     icon: ShoppingCart, color: "#f59e0b", sections: ["orders","offline_orders","customers","analytics"] },
  { key: "products",   title: "Products, Shipping & Offers",   url: "/sales/products-management?tab=products",    icon: Package,      color: "#10b981", sections: ["products","orders"] },
  { key: "seo",        title: "Marketing Management", url: "/marketing",                                 icon: Search,       color: "#f97316", sections: ["seo","customers"] },
  { key: "affiliate",  title: "Affiliate Program",    url: "/affiliate",                                 icon: Tag,          color: "#84cc16", sections: ["affiliate"] },
  { key: "brandconfig",title: "Brand & Storefront",   url: "/brand",                                     icon: Palette,      color: "#ec4899", sections: ["storefront_ui","portfolio"] },
  { key: "backend",    title: "Backend & System",     url: "/system",                                    icon: Activity,     color: "#38bdf8", sections: ["settings"] },
  { key: "settings",   title: "Settings & AI",        url: "/settings-ai",                              icon: Settings,     color: "#94a3b8", sections: ["settings","ai"] },
  { key: "corporate",  title: "Team & Access",        url: "/team",                                     icon: Users2,       color: "#a855f7", sections: ["employees"] },
];

const ia = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.26, ease: "easeOut" } }),
} as Variants;

export default function AdminMasterControl() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const isAdmin = role === "admin" || !!staff?.isAdmin;

  // Show sections the user has access to
  const visibleSections = ALL_SECTIONS.filter((s) => {
    if (isAdmin) return true;
    return s.sections.some((key) => staff?.hasAccess(key));
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
            Master Control
          </motion.h1>
        </div>
        <p className="text-sm text-muted-foreground">
          All your accessible sections in one place
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">
          Your Sections
        </p>
        <div className="space-y-2">
          {visibleSections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <motion.button
                key={sec.key}
                custom={i}
                variants={ia}
                initial="hidden"
                animate="visible"
                onClick={() => navigate(sec.url)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${sec.color}18`, border: `1px solid ${sec.color}30` }}>
                  <Icon className="w-4 h-4" style={{ color: sec.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{sec.title}</p>
                  <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">{sec.url}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// code:4ce0
