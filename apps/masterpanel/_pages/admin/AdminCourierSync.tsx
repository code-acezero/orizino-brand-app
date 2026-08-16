import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/app-toast";
import { rescheduleCourierSync } from "@/lib/courier-sync.functions";
import { getCourierSyncStatus } from "@/lib/courier-sync-status.functions";
import { formatDistanceToNow } from "date-fns";

// Supports the two shapes admin_reschedule_courier_sync produces:
//   "*/N * * * *"  (every N minutes, N in 1..59)
//   "0 */H * * *"  (every H hours on the hour, H in 1..23)
// Falls back to hourly if we can't parse it.
function computeNextRun(schedule: string | null, fromISO: string): Date | null {
  if (!schedule) return null;
  const now = new Date(fromISO);
  const minuteEvery = schedule.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (minuteEvery) {
    const n = Math.max(1, parseInt(minuteEvery[1]!, 10));
    const next = new Date(now);
    next.setSeconds(0, 0);
    const cur = now.getMinutes();
    const add = n - (cur % n);
    next.setMinutes(cur + add);
    return next;
  }
  const hourEvery = schedule.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourEvery) {
    const h = Math.max(1, parseInt(hourEvery[1]!, 10));
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    const cur = now.getHours();
    const add = h - (cur % h);
    next.setHours(cur + add);
    return next;
  }
  // Default assumption: top of the next hour
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

type CourierSettings = {
  enabled: boolean;
  sync_interval_minutes: number;
};

const DEFAULTS: CourierSettings = { enabled: true, sync_interval_minutes: 60 };

export default function AdminCourierSync() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["courier_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "courier_settings").maybeSingle();
      if (error) throw error;
      return { ...DEFAULTS, ...((data?.value as Partial<CourierSettings>) || {}) } as CourierSettings;
    },
  });

  const [form, setForm] = useState<CourierSettings>(DEFAULTS);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const reschedule = useServerFn(rescheduleCourierSync);
  const save = useMutation({
    mutationFn: async (v: CourierSettings) => {
      const clean: CourierSettings = {
        enabled: !!v.enabled,
        sync_interval_minutes: Math.max(5, Math.min(1440, Math.round(v.sync_interval_minutes || 60))),
      };
      // Persist the toggle + interval
      const { error } = await supabase.from("site_settings").upsert({ key: "courier_settings", value: clean as any });
      if (error) throw error;
      // Reschedule the pg_cron job to match the new interval
      const result = await reschedule({ data: { minutes: clean.sync_interval_minutes } });
      return { clean, expr: result.cron_expression };
    },
    onSuccess: ({ clean, expr }) => {
      toast.success(`Saved. Cron schedule set to "${expr}".`);
      qc.setQueryData(["courier_settings"], clean);
      qc.invalidateQueries({ queryKey: ["courier_sync_status"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const getStatus = useServerFn(getCourierSyncStatus);
  const { data: status } = useQuery({
    queryKey: ["courier_sync_status"],
    queryFn: () => getStatus(),
    refetchInterval: 60_000,
  });

  // Tick every 30s so the "in X minutes" label stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const nextRun = status?.schedule
    ? computeNextRun(status.schedule, status.server_now || new Date().toISOString())
    : null;

  if (isLoading) return <div className="p-6">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Courier Sync</h1>
        <p className="text-sm text-muted-foreground">Automatic tracking status refresh for Pathao and Steadfast shipments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Current pg_cron job status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-[140px_1fr] gap-y-2">
            <span className="text-muted-foreground">Status</span>
            <span>
              {status?.active === false || form.enabled === false ? (
                <span className="text-amber-600">Paused</span>
              ) : (
                <span className="text-emerald-600">Active</span>
              )}
            </span>

            <span className="text-muted-foreground">Cron expression</span>
            <code className="font-mono">{status?.schedule ?? "—"}</code>

            <span className="text-muted-foreground">Next run</span>
            <span>
              {nextRun && form.enabled !== false && status?.active !== false ? (
                <>
                  <span className="font-medium">in {formatDistanceToNow(nextRun)}</span>{" "}
                  <span className="text-muted-foreground">({nextRun.toLocaleString()})</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>

            <span className="text-muted-foreground">Last run</span>
            <span>
              {status?.last_run_at ? (
                <>
                  {formatDistanceToNow(new Date(status.last_run_at))} ago{" "}
                  <span className="text-muted-foreground">
                    ({status.last_status ?? "unknown"})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Never</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Sync settings</CardTitle>
          <CardDescription>Runs on a schedule and fetches the latest status from each courier's API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enabled</Label>
              <p className="text-sm text-muted-foreground">Turn off to pause automatic sync globally.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Sync interval (minutes)</Label>
            <Input
              id="interval"
              type="number"
              min={5}
              max={1440}
              value={form.sync_interval_minutes}
              onChange={(e) => setForm((f) => ({ ...f, sync_interval_minutes: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">
              Default is 60 minutes. Values are clamped between 5 and 1440. Saving automatically reschedules the pg_cron job <code>sync-all-shipments-hourly</code>.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => data && setForm(data)} disabled={save.isPending}>Reset</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
