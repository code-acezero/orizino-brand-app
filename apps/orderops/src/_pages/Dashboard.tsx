import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats } from "@/lib/orders";
import { TrendingUp, PackageCheck, Store, Globe } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  page: "Facebook Page",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  instagram: "Instagram",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  processing: "bg-indigo-500",
  shipped: "bg-cyan-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 60_000 });

  return (
    <div className="space-y-5 pt-1">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Today's activity across every channel</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <p className="text-xs text-muted-foreground">Today's revenue</p>
          <p className="text-xl font-semibold">{isLoading ? "…" : `৳${(data?.todayRevenue ?? 0).toLocaleString()}`}</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PackageCheck className="w-4.5 h-4.5" />
          </div>
          <p className="text-xs text-muted-foreground">Orders today</p>
          <p className="text-xl font-semibold">{isLoading ? "…" : data?.todayCount ?? 0}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">By source (last 500 orders)</p>
        </div>
        <div className="space-y-2">
          {(data?.bySource ?? []).map((s) => {
            const max = Math.max(...(data?.bySource ?? []).map((x) => x.count), 1);
            return (
              <div key={s.source} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{SOURCE_LABEL[s.source] ?? s.source}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
                <span className="text-xs font-medium w-8 text-right shrink-0">{s.count}</span>
              </div>
            );
          })}
          {!isLoading && (data?.bySource ?? []).length === 0 && <p className="text-xs text-muted-foreground">No orders yet</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">By status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(data?.byStatus ?? []).map((s) => (
            <span key={s.status} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[s.status] ?? "bg-muted-foreground"}`} />
              {s.status} · {s.count}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b border-border/60">
          <p className="text-sm font-medium">Recent orders</p>
        </div>
        <div className="divide-y divide-border/60">
          {(data?.recent ?? []).slice(0, 6).map((o: any) => (
            <div key={o.id} className="flex items-center justify-between px-4 sm:px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">৳{Number(o.total).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{SOURCE_LABEL[o.order_source] ?? o.order_source}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[o.status] ?? "bg-muted"} text-white`}>{o.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
