"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo, useState } from "react";
import { Monitor, Smartphone, Tablet, Globe, Laptop } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 80%, 55%)",
  "hsl(270, 70%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(180, 60%, 50%)",
  "hsl(320, 70%, 55%)",
  "hsl(100, 60%, 45%)",
];

const deviceIcons: Record<string, any> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

const osIcons: Record<string, string> = {
  Windows: "🪟",
  macOS: "🍎",
  Linux: "🐧",
  Android: "🤖",
  iOS: "📱",
  Other: "💻",
};

const DeviceBrowserBreakdown = () => {
  const [view, setView] = useState<"device" | "browser" | "os">("device");

  const { data: analyticsData = [] } = useQuery({
    queryKey: ["device-browser-analytics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("page_analytics")
        .select("metadata")
        .eq("event_type", "page_view")
        .gte("created_at", since)
        .limit(5000);
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const breakdowns = useMemo(() => {
    const devices: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const oses: Record<string, number> = {};

    analyticsData.forEach((e: any) => {
      const m = e.metadata;
      if (!m) return;
      if (m.device_type) devices[m.device_type] = (devices[m.device_type] || 0) + 1;
      if (m.browser) browsers[m.browser] = (browsers[m.browser] || 0) + 1;
      if (m.os) oses[m.os] = (oses[m.os] || 0) + 1;
    });

    const toArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { device: toArr(devices), browser: toArr(browsers), os: toArr(oses) };
  }, [analyticsData]);

  const currentData = breakdowns[view];
  const total = currentData.reduce((s, d) => s + d.value, 0);

  const tabs = [
    { key: "device" as const, label: "Device" },
    { key: "browser" as const, label: "Browser" },
    { key: "os" as const, label: "OS" },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Laptop className="w-4 h-4 text-primary" />
            Device & Browser
          </CardTitle>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/50">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  view === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm gap-2">
            <Globe className="w-8 h-8 opacity-40" />
            <p>No device data yet</p>
            <p className="text-xs">Visit the site to generate analytics</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Pie chart */}
            <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={62}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {currentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`, "Visits"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend list */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {currentData.map((item, i) => {
                const pct = total ? ((item.value / total) * 100).toFixed(1) : "0";
                const DeviceIcon = view === "device" ? deviceIcons[item.name] || Monitor : null;
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {view === "device" && DeviceIcon && <DeviceIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                      {view === "os" && <span className="text-xs">{osIcons[item.name] || "💻"}</span>}
                      <span className="text-sm text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.value}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceBrowserBreakdown;
// code:4ce0
