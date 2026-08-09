"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { getIdentityAnalytics } from "@/lib/identity-governance.functions";
import { Eye, QrCode, Share2, TrendingUp } from "lucide-react";

interface Props {
  identityId?: string;
  compact?: boolean;
}

const StatTile: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-border/60 bg-card/60 p-3">
    <div className="flex items-center justify-between">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <span className="text-muted-foreground">{icon}</span>
    </div>
    <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
  </div>
);

const IdentityAnalytics: React.FC<Props> = ({ identityId, compact }) => {
  const fetchFn = useServerFn(getIdentityAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["identity-analytics", identityId ?? "all"],
    queryFn: () => fetchFn({ data: { identity_id: identityId, days: 30 } as any }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading analytics…</div>;
  }
  if (!data) return null;

  const maxDay = Math.max(1, ...data.series.map((s: any) => s.count));
  const days = data.series.slice(-30);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total views" value={data.totalViews.toLocaleString()} icon={<Eye className="w-3.5 h-3.5" />} />
        <StatTile label="QR / NFC scans" value={data.totalScans.toLocaleString()} icon={<QrCode className="w-3.5 h-3.5" />} />
        <StatTile label="Events · 30d" value={data.windowEvents.toLocaleString()} icon={<TrendingUp className="w-3.5 h-3.5" />} />
        <StatTile label="Shares · 30d" value={(data.bySource.share ?? 0).toLocaleString()} icon={<Share2 className="w-3.5 h-3.5" />} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Views · last 30 days</p>
        {days.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No events in this window yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {days.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">By source · 30d</p>
          <div className="space-y-1.5">
            {(["qr", "nfc", "share", "direct"] as const).map((src) => {
              const v = data.bySource[src] ?? 0;
              const pct = data.windowEvents ? (v / data.windowEvents) * 100 : 0;
              return (
                <div key={src} className="flex items-center gap-2 text-xs">
                  <span className="w-14 uppercase text-muted-foreground">{src}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        {!compact && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Top shared links · 30d</p>
            {data.topSlugs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nothing yet.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.topSlugs.map((s: any) => (
                  <li key={s.slug} className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate text-muted-foreground">/id/{s.slug}</span>
                    <span className="tabular-nums font-semibold">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityAnalytics;
