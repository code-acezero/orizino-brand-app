"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Users, Headphones, BarChart3, MessageSquare, Megaphone, Mail, AtSign, Send, FileText, Workflow, ChevronRight, UserCheck, Clock, TrendingUp, AppWindow, Star } from "lucide-react";

const SECTIONS = [
  {
    group: "Customers",
    items: [
      { title: "Customers",          url: "/sales/customers",          icon: Users,       desc: "Accounts, contacts & purchase history" },
      { title: "Customer Reviews",   url: "/sales/reviews",            icon: Star,        desc: "Product star ratings, reviews & moderation" },
      { title: "Customer Analytics", url: "/sales/customer-analytics", icon: BarChart3,   desc: "Cohorts, churn, retention & heatmaps" },
      { title: "Live Activity",      url: "/sales/live-activity",      icon: TrendingUp,  desc: "Realtime orders, visitors & ops" },
    ],
  },
  {
    group: "Support",
    items: [
      { title: "Support Inbox",        url: "/sales/support",           icon: Headphones, desc: "Live chat conversations & tickets" },
    ],
  },
  {
    group: "Email",
    items: [
      { title: "Email Provider",   url: "/settings-ai/email-provider",       icon: Mail,          desc: "Resend API key, sender profiles & deliverability" },
      { title: "Subscribers",      url: "/email/subscribers",    icon: AtSign,        desc: "Newsletter signup list" },
      { title: "Campaigns",        url: "/email/campaigns",      icon: Send,          desc: "Bulk email blasts" },
      { title: "Templates",        url: "/email/templates",      icon: FileText,      desc: "Reusable email designs" },
      { title: "Automations",      url: "/email/automations",    icon: Workflow,      desc: "Event-driven automated emails" },
    ],
  },
];

const ia = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.24, ease: "easeOut" } }),
} as Variants;

export default function AdminCustomersHub() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["customers-hub-stats"],
    queryFn: async () => {
      const [customersRes, openSupportRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("support_conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return { customers: customersRes.count ?? 0, openSupport: openSupportRes.count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
          Customer Support
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">Customers, support inbox, analytics & email communications</p>
      </div>

      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Customers", value: stats.customers, icon: Users, url: "/sales/customers" },
            { label: "Open Tickets",    value: stats.openSupport, icon: MessageSquare, url: "/sales/support" },
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
