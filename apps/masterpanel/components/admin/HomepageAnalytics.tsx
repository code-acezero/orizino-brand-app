"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { useState, useMemo, useCallback } from "react";
import { Eye, MousePointerClick, Clock, TrendingUp, BarChart3, Target, Users, Download } from "lucide-react";
import { useRealtimeVisitors } from "@/hooks/use-realtime-visitors";
import { Button } from "@/components/ui/button";
import LiveActivityFeed from "./LiveActivityFeed";
import GeoBreakdown from "./GeoBreakdown";

const timeRanges = [
  { value: "24h", label: "Last 24 Hours", hours: 24 },
  { value: "7d", label: "Last 7 Days", hours: 168 },
  { value: "30d", label: "Last 30 Days", hours: 720 },
  { value: "all", label: "All Time", hours: 0 },
];

const sectionLabels: Record<string, string> = {
  slider: "Showcase Slider",
  categories: "Category Grid",
  "category-sections": "Category Sections",
  featured: "Featured Products",
  arrivals: "New Arrivals",
};

const HomepageAnalytics = () => {
  const [range, setRange] = useState("7d");
  const liveVisitors = useRealtimeVisitors("/home");
  const rangeHours = timeRanges.find((r) => r.value === range)?.hours || 168;

  const { data: analyticsData = [], isLoading } = useQuery({
    queryKey: ["homepage-analytics", range],
    queryFn: async () => {
      let query = (supabase as any)
        .from("page_analytics")
        .select("*")
        .eq("page", "/home")
        .order("created_at", { ascending: false });

      if (rangeHours > 0) {
        const since = new Date(Date.now() - rangeHours * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", since);
      }

      query = query.limit(5000);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const stats = useMemo(() => {
    const pageViews = analyticsData.filter((e: any) => e.event_type === "page_view");
    const sectionViews = analyticsData.filter((e: any) => e.event_type === "section_view");
    const engagements = analyticsData.filter((e: any) => e.event_type === "section_engagement");
    const clicks = analyticsData.filter((e: any) => e.event_type === "click");
    const uniqueSessions = new Set(analyticsData.map((e: any) => e.session_id)).size;

    // Section engagement breakdown
    const sectionStats: Record<string, { views: number; totalDuration: number; engagements: number }> = {};
    sectionViews.forEach((e: any) => {
      if (!e.section_id) return;
      if (!sectionStats[e.section_id]) sectionStats[e.section_id] = { views: 0, totalDuration: 0, engagements: 0 };
      sectionStats[e.section_id].views++;
    });
    engagements.forEach((e: any) => {
      if (!e.section_id) return;
      if (!sectionStats[e.section_id]) sectionStats[e.section_id] = { views: 0, totalDuration: 0, engagements: 0 };
      sectionStats[e.section_id].totalDuration += e.duration_ms || 0;
      sectionStats[e.section_id].engagements++;
    });

    const sectionBreakdown = Object.entries(sectionStats)
      .map(([id, s]) => ({
        id,
        label: sectionLabels[id] || id,
        views: s.views,
        avgDuration: s.engagements > 0 ? Math.round(s.totalDuration / s.engagements / 1000) : 0,
        totalDuration: Math.round(s.totalDuration / 1000),
        engagements: s.engagements,
      }))
      .sort((a, b) => b.views - a.views);

    // Click breakdown
    const clickLabels: Record<string, string> = {
      product_card: "Product Card Clicks",
      slider_cta: "Slider CTA Clicks",
      sale_cta: "Sale Banner CTA Clicks",
      view_all: "View All Clicks",
    };
    const clickStats: Record<string, { count: number; targets: Record<string, number> }> = {};
    clicks.forEach((e: any) => {
      const clickType = e.metadata?.click_type || e.section_id || "unknown";
      if (!clickStats[clickType]) clickStats[clickType] = { count: 0, targets: {} };
      clickStats[clickType].count++;
      const targetId = e.metadata?.target_id || "unknown";
      clickStats[clickType].targets[targetId] = (clickStats[clickType].targets[targetId] || 0) + 1;
    });

    const clickBreakdown = Object.entries(clickStats)
      .map(([type, s]) => ({
        type,
        label: clickLabels[type] || type,
        count: s.count,
        topTargets: Object.entries(s.targets).sort((a, b) => b[1] - a[1]).slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count);

    const totalClicks = clicks.length;
    const clickRate = pageViews.length > 0 ? ((totalClicks / pageViews.length) * 100).toFixed(1) : "0";

    // Time-series data for chart
    const timeGrouping = rangeHours <= 24 ? "hour" : "day";
    const timeMap: Record<string, number> = {};

    pageViews.forEach((e: any) => {
      const d = new Date(e.created_at);
      const key =
        timeGrouping === "hour"
          ? `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`
          : `${d.getMonth() + 1}/${d.getDate()}`;
      timeMap[key] = (timeMap[key] || 0) + 1;
    });

    const timeSeries = Object.entries(timeMap)
      .map(([label, views]) => ({ label, views }))
      .reverse();

    return {
      totalPageViews: pageViews.length,
      totalSectionViews: sectionViews.length,
      uniqueSessions,
      avgSectionsPerView: uniqueSessions > 0 ? (sectionViews.length / uniqueSessions).toFixed(1) : "0",
      sectionBreakdown,
      timeSeries,
      totalClicks,
      clickRate,
      clickBreakdown,
    };
  }, [analyticsData, rangeHours]);

  const maxSectionViews = Math.max(...stats.sectionBreakdown.map((s) => s.views), 1);

  const exportCSV = useCallback(() => {
    const escapeCSV = (val: any) => {
      const str = String(val ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    // Summary rows
    const summaryRows = [
      "# SUMMARY",
      `# Time Range,${timeRanges.find((r) => r.value === range)?.label || range}`,
      `# Page Views,${stats.totalPageViews}`,
      `# Unique Visitors,${stats.uniqueSessions}`,
      `# Section Impressions,${stats.totalSectionViews}`,
      `# Total Clicks,${stats.totalClicks}`,
      `# Click Rate,${stats.clickRate}%`,
      `# Avg Sections/Visit,${stats.avgSectionsPerView}`,
      "#",
      ...stats.sectionBreakdown.map((s) => `# ${s.label},${s.views} views,${s.avgDuration}s avg time,${s.engagements} engagements`),
      "#",
      ...stats.clickBreakdown.map((c) => `# ${c.label},${c.count} clicks,${stats.totalPageViews > 0 ? ((c.count / stats.totalPageViews) * 100).toFixed(1) : 0}% conv. rate`),
      "#",
    ];

    const headers = ["event_type", "page", "section_id", "duration_ms", "session_id", "metadata", "created_at"];
    const rows = analyticsData.map((row: any) =>
      headers.map((h) => escapeCSV(h === "metadata" ? JSON.stringify(row[h]) : row[h])).join(",")
    );

    const csv = [...summaryRows, headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const rangeLabel = timeRanges.find((r) => r.value === range)?.label?.replace(/\s+/g, "_") || range;
    a.download = `homepage_analytics_${rangeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analyticsData, range]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Homepage Analytics</h3>
            <p className="text-xs text-muted-foreground">Track page views and section engagement metrics</p>
          </div>
          <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{liveVisitors}</span>
            <span className="text-xs text-muted-foreground">live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={analyticsData.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Page Views", value: stats.totalPageViews, icon: Eye, color: "text-blue-400" },
          { label: "Unique Visitors", value: stats.uniqueSessions, icon: MousePointerClick, color: "text-emerald-400" },
          { label: "Section Impressions", value: stats.totalSectionViews, icon: TrendingUp, color: "text-violet-400" },
          { label: "Avg Sections/Visit", value: stats.avgSectionsPerView, icon: Clock, color: "text-amber-400" },
          { label: "Total Clicks", value: stats.totalClicks, icon: Target, color: "text-rose-400" },
          { label: "Click Rate", value: `${stats.clickRate}%`, icon: BarChart3, color: "text-cyan-400" },
        ].map((stat) => (
          <Card key={stat.label} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Page Views Over Time */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Page Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.timeSeries}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#viewsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              {isLoading ? "Loading analytics data..." : "No page view data yet. Visit the homepage to generate data."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Section Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.sectionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.sectionBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={130} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                No section data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Engagement Table */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Section Engagement Details</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.sectionBreakdown.length > 0 ? (
              <div className="space-y-3">
                {stats.sectionBreakdown.map((section) => (
                  <div key={section.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{section.label}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{section.views} views</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{section.avgDuration}s avg time</span>
                      </div>
                      {/* Engagement bar */}
                      <div className="mt-2 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(section.views / maxSectionViews) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{section.engagements} engagements</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                Scroll through the homepage to generate engagement data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Click Tracking Breakdown */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-400" />
            Click Tracking & Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.clickBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.clickBreakdown.map((click) => (
                <div key={click.type} className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{click.label}</p>
                    <Badge variant="secondary" className="text-xs">{click.count}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {click.topTargets.map(([target, count]) => (
                      <div key={target} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[140px]" title={target}>{target}</span>
                        <span className="text-foreground font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                  {stats.totalPageViews > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        Conv. rate: <span className="text-primary font-medium">{((click.count / stats.totalPageViews) * 100).toFixed(1)}%</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
              No click data yet. Interact with CTAs and product cards on the homepage to generate data.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geographic Breakdown */}
      <GeoBreakdown analyticsData={analyticsData} />

      {/* Live Activity Feed */}
      <LiveActivityFeed />
    </div>
  );
};

export default HomepageAnalytics;
// code:4ce0
