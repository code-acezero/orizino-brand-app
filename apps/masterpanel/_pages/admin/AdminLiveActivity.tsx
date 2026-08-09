"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, ShoppingCart, UserPlus, MessageSquare, Star, Package,
  FolderTree, Bell, RotateCcw, Mail, Eye, Pause, Play, Filter,
  Radio, TrendingUp, Users, Clock, AlertCircle,
} from "lucide-react";

type ActivityKind =
  | "order" | "user" | "support" | "support_msg" | "review"
  | "product" | "category" | "notification" | "return"
  | "campaign" | "page_view";

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  href?: string;
  meta?: string;
  created_at: string;
}

const kindConfig: Record<ActivityKind, { icon: typeof Activity; label: string; color: string; bg: string }> = {
  order:        { icon: ShoppingCart,  label: "Order",        color: "text-emerald-400", bg: "bg-emerald-500/10" },
  user:         { icon: UserPlus,      label: "New user",     color: "text-blue-400",    bg: "bg-blue-500/10" },
  support:      { icon: MessageSquare, label: "Support",      color: "text-amber-400",   bg: "bg-amber-500/10" },
  support_msg:  { icon: MessageSquare, label: "Reply",        color: "text-amber-300",   bg: "bg-amber-500/10" },
  review:       { icon: Star,          label: "Review",       color: "text-yellow-400",  bg: "bg-yellow-500/10" },
  product:      { icon: Package,       label: "Product",      color: "text-violet-400",  bg: "bg-violet-500/10" },
  category:     { icon: FolderTree,    label: "Category",     color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  notification: { icon: Bell,          label: "Notification", color: "text-pink-400",    bg: "bg-pink-500/10" },
  return:       { icon: RotateCcw,     label: "Return",       color: "text-rose-400",    bg: "bg-rose-500/10" },
  campaign:     { icon: Mail,          label: "Campaign",     color: "text-cyan-400",    bg: "bg-cyan-500/10" },
  page_view:    { icon: Eye,           label: "Page view",    color: "text-sky-400",     bg: "bg-sky-500/10" },
};

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n || 0);

const filterOptions: { value: ActivityKind | "all"; label: string; icon: typeof Activity }[] = [
  { value: "all", label: "All", icon: Activity },
  { value: "order", label: "Orders", icon: ShoppingCart },
  { value: "user", label: "Users", icon: UserPlus },
  { value: "support", label: "Support", icon: MessageSquare },
  { value: "review", label: "Reviews", icon: Star },
  { value: "product", label: "Catalog", icon: Package },
  { value: "return", label: "Returns", icon: RotateCcw },
  { value: "notification", label: "Notifications", icon: Bell },
  { value: "campaign", label: "Campaigns", icon: Mail },
  { value: "page_view", label: "Page views", icon: Eye },
];

const AdminLiveActivity = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<ActivityKind | "all">("all");
  const [stats, setStats] = useState({
    activeSessions: 0,
    ordersToday: 0,
    revenueToday: 0,
    pendingSupport: 0,
    pendingReturns: 0,
    eventsPerMin: 0,
  });
  const eventsRef = useRef<ActivityEvent[]>([]);
  eventsRef.current = events;

  const push = (e: ActivityEvent) => {
    setEvents((prev) => {
      if (prev.some((x) => x.id === e.id)) return prev;
      return [e, ...prev].slice(0, 100);
    });
  };

  /* ── Initial backfill ──────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [orders, profiles, support, reviews, products, returns, campaigns, notifs, pageViews, todayOrders, openSupport, openReturns, activePV] = await Promise.all([
        supabase.from("orders").select("id,total_amount,status,created_at,order_number").gte("created_at", since).order("created_at", { ascending: false }).limit(15),
        supabase.from("profiles").select("id,full_name,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("support_conversations").select("id,subject,type,status,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("reviews").select("id,rating,title,created_at,product_id").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("products").select("id,name,slug,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("return_requests").select("id,status,created_at,reason").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("email_campaigns").select("id,name,status,created_at,sent_count").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("notifications").select("id,title,type,created_at").is("user_id", null).gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        (supabase as any).from("page_analytics").select("id,event_type,page,session_id,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
        supabase.from("orders").select("total_amount,created_at", { count: "exact" }).gte("created_at", todayStart.toISOString()),
        supabase.from("support_conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("return_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("page_analytics").select("session_id").gte("created_at", fiveMinAgo),
      ]);

      const merged: ActivityEvent[] = [];

      orders.data?.forEach((o: any) => merged.push({
        id: `order-${o.id}`, kind: "order",
        title: `New order #${o.order_number || o.id.slice(0, 8)}`,
        description: `${fmtMoney(o.total_amount)} • ${o.status}`,
        href: `/sales/orders?id=${o.id}`, created_at: o.created_at,
      }));
      profiles.data?.forEach((p: any) => merged.push({
        id: `user-${p.id}`, kind: "user",
        title: p.full_name || "New customer registered",
        href: `/sales/customers?id=${p.id}`, created_at: p.created_at,
      }));
      support.data?.forEach((s: any) => merged.push({
        id: `support-${s.id}`, kind: "support",
        title: s.subject || `New ${s.type || "chat"} request`,
        description: s.status, href: `/sales/support?c=${s.id}`, created_at: s.created_at,
      }));
      reviews.data?.forEach((r: any) => merged.push({
        id: `review-${r.id}`, kind: "review",
        title: r.title || "New review submitted",
        description: `${"★".repeat(r.rating || 0)}${"☆".repeat(5 - (r.rating || 0))}`,
        href: `/sales/reviews`, created_at: r.created_at,
      }));
      products.data?.forEach((p: any) => merged.push({
        id: `product-${p.id}`, kind: "product",
        title: `Product added: ${p.name}`,
        href: `/sales/products?slug=${p.slug}`, created_at: p.created_at,
      }));
      returns.data?.forEach((r: any) => merged.push({
        id: `return-${r.id}`, kind: "return",
        title: "Return requested",
        description: r.reason || r.status,
        href: `/sales/returns`, created_at: r.created_at,
      }));
      campaigns.data?.forEach((c: any) => merged.push({
        id: `campaign-${c.id}`, kind: "campaign",
        title: c.name || "Email campaign",
        description: `${c.status}${c.sent_count ? ` • ${c.sent_count} sent` : ""}`,
        href: `/marketing/email-campaigns`, created_at: c.created_at,
      }));
      notifs.data?.forEach((n: any) => merged.push({
        id: `notif-${n.id}`, kind: "notification",
        title: n.title, description: n.type,
        href: `/marketing/announcements`, created_at: n.created_at,
      }));
      pageViews.data?.forEach((pv: any) => {
        if (pv.event_type === "page_view") merged.push({
          id: `pv-${pv.id}`, kind: "page_view",
          title: `Visitor on ${pv.page}`,
          meta: pv.session_id?.slice(0, 8),
          created_at: pv.created_at,
        });
      });

      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(merged.slice(0, 100));

      const revenueToday = (todayOrders.data || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const activeSessions = new Set((activePV.data || []).map((x: any) => x.session_id).filter(Boolean)).size;

      setStats((s) => ({
        ...s,
        activeSessions,
        ordersToday: todayOrders.count || 0,
        revenueToday,
        pendingSupport: openSupport.count || 0,
        pendingReturns: openReturns.count || 0,
      }));
    };
    load();
  }, []);

  /* ── Realtime subscriptions ────────────────────────────── */
  useEffect(() => {
    if (!isLive) return;

    const handlers: Array<{ table: string; map: (row: any) => ActivityEvent | null }> = [
      { table: "orders", map: (o) => ({ id: `order-${o.id}`, kind: "order", title: `New order #${o.order_number || o.id.slice(0, 8)}`, description: `${fmtMoney(o.total_amount)} • ${o.status}`, href: `/sales/orders?id=${o.id}`, created_at: o.created_at }) },
      { table: "profiles", map: (p) => ({ id: `user-${p.id}`, kind: "user", title: p.full_name || "New customer registered", href: `/sales/customers?id=${p.id}`, created_at: p.created_at }) },
      { table: "support_conversations", map: (s) => ({ id: `support-${s.id}`, kind: "support", title: s.subject || `New ${s.type || "chat"} request`, description: s.status, href: `/sales/support?c=${s.id}`, created_at: s.created_at }) },
      { table: "support_messages", map: (m) => m.sender_type === "user" ? ({ id: `sm-${m.id}`, kind: "support_msg", title: "Customer replied in support", description: (m.content || "").slice(0, 80), href: `/sales/support?c=${m.conversation_id}`, created_at: m.created_at }) : null },
      { table: "reviews", map: (r) => ({ id: `review-${r.id}`, kind: "review", title: r.title || "New review submitted", description: `${"★".repeat(r.rating || 0)}${"☆".repeat(5 - (r.rating || 0))}`, href: `/sales/reviews`, created_at: r.created_at }) },
      { table: "products", map: (p) => ({ id: `product-${p.id}`, kind: "product", title: `Product added: ${p.name}`, href: `/sales/products?slug=${p.slug}`, created_at: p.created_at }) },
      { table: "categories", map: (c) => ({ id: `cat-${c.id}`, kind: "category", title: `Category added: ${c.name}`, href: `/sales/categories`, created_at: c.created_at }) },
      { table: "return_requests", map: (r) => ({ id: `return-${r.id}`, kind: "return", title: "Return requested", description: r.reason || r.status, href: `/sales/returns`, created_at: r.created_at }) },
      { table: "email_campaigns", map: (c) => ({ id: `campaign-${c.id}`, kind: "campaign", title: c.name || "Email campaign", description: c.status, href: `/marketing/email-campaigns`, created_at: c.created_at }) },
      { table: "notifications", map: (n) => n.user_id ? null : ({ id: `notif-${n.id}`, kind: "notification", title: n.title, description: n.type, href: `/marketing/announcements`, created_at: n.created_at }) },
      { table: "page_analytics", map: (pv) => pv.event_type === "page_view" ? ({ id: `pv-${pv.id}`, kind: "page_view", title: `Visitor on ${pv.page}`, meta: pv.session_id?.slice(0, 8), created_at: pv.created_at }) : null },
    ];

    const channel = supabase.channel("live-activity-dashboard");
    handlers.forEach(({ table, map }) => {
      channel.on("postgres_changes" as any, { event: "INSERT", schema: "public", table }, (payload: any) => {
        const ev = map(payload.new);
        if (ev) push(ev);
      });
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLive]);

  /* ── Tick for time labels + events/min ─────────────────── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
      const oneMinAgo = Date.now() - 60_000;
      const count = eventsRef.current.filter((e) => new Date(e.created_at).getTime() >= oneMinAgo).length;
      setStats((s) => ({ ...s, eventsPerMin: count }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter || (filter === "support" && e.kind === "support_msg"))),
    [events, filter]
  );

  const statCards = [
    { label: "Active visitors", value: stats.activeSessions, icon: Users, color: "text-emerald-400", hint: "Last 5 min" },
    { label: "Events / min", value: stats.eventsPerMin, icon: TrendingUp, color: "text-blue-400", hint: "Live stream" },
    { label: "Orders today", value: stats.ordersToday, icon: ShoppingCart, color: "text-violet-400", hint: fmtMoney(stats.revenueToday) },
    { label: "Open support", value: stats.pendingSupport, icon: MessageSquare, color: "text-amber-400", hint: "Awaiting reply" },
    { label: "Pending returns", value: stats.pendingReturns, icon: RotateCcw, color: "text-rose-400", hint: "Needs review" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Live Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All ongoing processes and customer activity across the store, in real time.</p>
        </div>
        <button
          onClick={() => setIsLive((l) => !l)}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-border/50 hover:bg-secondary/30 w-fit"
        >
          <span className={`relative flex h-2 w-2 ${isLive ? "" : "opacity-40"}`}>
            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          </span>
          {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isLive ? "Live — pause" : "Paused — resume"}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.hint}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity stream
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Showing last 24h • {filtered.length} of {events.length}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {filterOptions.map((opt) => {
              const count =
                opt.value === "all"
                  ? events.length
                  : events.filter((e) => {
                      if (opt.value === "support") return e.kind === "support" || e.kind === "support_msg";
                      if (opt.value === "product") return e.kind === "product" || e.kind === "category";
                      return e.kind === opt.value;
                    }).length;
              const active = filter === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    active
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                      : "bg-secondary/20 border-border/40 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex w-7 h-7 items-center justify-center rounded-lg shrink-0 transition-colors ${
                      active ? "bg-primary/20 text-primary" : "bg-background/60 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  <span
                    className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-md ${
                      active ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm gap-2">
                <AlertCircle className="w-8 h-8 opacity-50" />
                {events.length === 0 ? "No activity in the last 24 hours yet." : "No events match this filter."}
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {filtered.map((event) => {
                    const cfg = kindConfig[event.kind];
                    const Icon = cfg.icon;
                    const content = (
                      <motion.div
                        layout
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/30 transition-colors group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 hidden md:inline-flex">
                          {cfg.label}
                        </Badge>
                        {event.meta && (
                          <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 hidden md:inline">{event.meta}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums w-16 text-right">
                          {timeAgo(event.created_at)}
                        </span>
                      </motion.div>
                    );
                    return event.href ? (
                      <a key={event.id} href={event.href} className="block">{content}</a>
                    ) : (
                      <div key={event.id}>{content}</div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLiveActivity;
// code:4ce0
