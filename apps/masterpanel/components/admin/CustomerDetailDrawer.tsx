"use client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { getCustomerDetail, getCustomerEngagement } from "@/lib/customers.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Mail, MailOpen, MousePointerClick, AlertTriangle, ShoppingBag, Phone } from "lucide-react";
import { format } from "date-fns";

export default function CustomerDetailDrawer({ customerId, open, onOpenChange }: { customerId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const fetchDetail = useServerFn(getCustomerDetail);
  const fetchEngagement = useServerFn(getCustomerEngagement);

  const { data: detail } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: () => fetchDetail({ data: { customerId: customerId! } }),
    enabled: !!customerId && open,
  });
  const { data: engagement } = useQuery({
    queryKey: ["customer-engagement", customerId],
    queryFn: () => fetchEngagement({ data: { customerId: customerId! } }),
    enabled: !!customerId && open,
  });

  const p = detail?.profile as any;
  const stats = engagement?.email_stats;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            {p?.avatar_url ? (
              <img src={p.avatar_url} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-base font-medium">
                {(p?.full_name || detail?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <SheetTitle className="text-lg">{p?.full_name || "Unnamed customer"}</SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-3 mt-0.5">
                {detail?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{detail.email}</span>}
                {p?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
              </SheetDescription>
            </div>
          </div>
          {detail?.tags && detail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {detail.tags.map((t: any) => (
                <Badge key={t.id} variant="secondary" style={{ background: t.color + "20", color: t.color }}>{t.name}</Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">Email</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders ({detail?.orders?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="returns" className="flex-1">Returns ({detail?.returns?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={<ShoppingBag className="w-4 h-4" />} label="Orders" value={detail?.orders?.length ?? 0} />
              <Stat icon={<Mail className="w-4 h-4" />} label="Emails" value={stats?.sent ?? 0} />
              <Stat icon={<MousePointerClick className="w-4 h-4" />} label="Click rate" value={`${stats?.click_rate ?? 0}%`} />
            </div>
            <div className="rounded-lg border border-border p-3 bg-card">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Activity (6 months)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagement?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="sent" stroke="#94a3b8" strokeWidth={2} />
                    <Line type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat icon={<Mail className="w-4 h-4" />} label="Sent" value={stats?.sent ?? 0} />
              <Stat icon={<MailOpen className="w-4 h-4" />} label="Opens" value={`${stats?.opened ?? 0} (${stats?.open_rate ?? 0}%)`} />
              <Stat icon={<MousePointerClick className="w-4 h-4" />} label="Clicks" value={`${stats?.clicked ?? 0} (${stats?.click_rate ?? 0}%)`} />
              <Stat icon={<AlertTriangle className="w-4 h-4" />} label="Bounces" value={stats?.bounced ?? 0} />
            </div>
            <div className="rounded-lg border border-border p-3 bg-card">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Email engagement timeline</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagement?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sent" fill="#94a3b8" />
                    <Bar dataKey="opened" fill="#10b981" />
                    <Bar dataKey="clicked" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="pt-3">
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(detail?.orders ?? []).length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No orders yet</p>}
              {(detail?.orders ?? []).map((o: any) => (
                <div key={o.id} className="rounded-xl border border-border/70 p-3.5 text-sm bg-card/80 flex items-center justify-between hover:border-border transition-colors">
                  <div>
                    <div className="font-semibold text-foreground">#{o.order_number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(o.created_at), "MMM d, yyyy · HH:mm")}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold text-foreground">৳{Number(o.total).toFixed(2)}</div>
                    <Badge variant="outline" className="text-[10px] capitalize font-medium">{o.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="returns" className="pt-3">
            <div className="space-y-2.5 max-h-[60vh] overflow-auto">
              {(detail?.returns ?? []).length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No return or refund requests recorded</p>}
              {(detail?.returns ?? []).map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border/70 p-3.5 text-xs bg-card/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">Order #{r.orders?.order_number || r.order_id?.slice(0, 8)}</span>
                      <span className="text-muted-foreground ml-2">({r.type || "return"})</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                      r.status === "approved" ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10" :
                      r.status === "rejected" ? "border-rose-500/40 text-rose-500 bg-rose-500/10" :
                      "border-amber-500/40 text-amber-500 bg-amber-500/10"
                    }`}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground"><span className="text-foreground font-medium">Reason:</span> {r.reason || "Not specified"}</p>
                  {r.refund_status && (
                    <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-muted-foreground">Refund Status: </span>
                        <span className="font-semibold text-foreground uppercase">{r.refund_status}</span>
                        {r.refund_method && <span className="text-muted-foreground"> · via {r.refund_method}</span>}
                        {r.refund_reference && <span className="text-muted-foreground"> (Trx: {r.refund_reference})</span>}
                      </div>
                      <div className="font-bold text-foreground">
                        ৳{Number(r.refund_amount || 0).toFixed(2)}
                        {r.refund_delivery_charge ? (
                          <span className="text-[10px] text-rose-400 font-normal ml-1">(inc. delivery loss)</span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-normal ml-1">(delivery retained)</span>
                        )}
                      </div>
                    </div>
                  )}
                  {r.return_tracking && (
                    <div className="text-[11px] text-muted-foreground">
                      Courier Tracking: <span className="font-mono font-medium text-foreground">{r.return_tracking}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    Requested: {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="pt-3">
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(detail?.notes ?? []).length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No staff notes</p>}
              {(detail?.notes ?? []).map((n: any) => (
                <div key={n.id} className="rounded border border-border p-3 text-sm bg-card">
                  <p>{n.body}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, yyyy HH:mm")}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
// code:4ce0
