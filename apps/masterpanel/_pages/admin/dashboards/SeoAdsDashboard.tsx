"use client";
import { Search, TrendingUp, Megaphone, Eye, Radio, BarChart3 } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SeoAdsDashboard() {
  const announcements = useKpiCount(["announcements", "active"], "banners", (q) => q.eq("is_active", true));
  const popups = useKpiCount(["popups", "active"], "popups", (q) => q.eq("is_active", true));
  const pages = useKpiCount(["cms-pages"], "cms_pages");
  const pageViews7d = useQuery({
    queryKey: ["page-analytics", "7d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { count } = await supabase.from("page_analytics").select("*", { count: "exact", head: true }).gte("created_at", since);
      return count ?? 0;
    },
    refetchInterval: 120_000,
  });
  const tracking = useQuery({
    queryKey: ["tracking-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "tracking").maybeSingle();
      const v = (data?.value ?? {}) as Record<string, any>;
      return {
        fb: !!v.facebook_pixel_id,
        ga: !!v.google_analytics_id,
        gsc: !!v.google_search_console,
        gads: !!v.google_ads_id,
      };
    },
  });
  const active = tracking.data ? Object.values(tracking.data).filter(Boolean).length : 0;

  return (
    <SectionDashboardShell
      title="Marketing Management"
      description="Search visibility, ad tracking, and site-wide announcements"
      icon={Search}
      color="#f97316"
    >
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Search & content</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="SEO Control" value="Open" sub="Meta, schema, sitemap, audit" icon={Search} color="#f97316" href="/marketing/seo" />
          <KpiCard title="Indexed pages" value={pages.data ?? "—"} sub="CMS pages published" icon={Eye} color="#38bdf8" href="/brand/cms-pages" loading={pages.isLoading} />
          <KpiCard title="Page views (7d)" value={pageViews7d.data ?? "—"} sub="Tracked visits" icon={BarChart3} color="#8b5cf6" href="/sales/customer-analytics" loading={pageViews7d.isLoading} />
          <KpiCard title="Trackers active" value={`${active}/4`} sub="FB · GA · GSC · Google Ads" icon={TrendingUp} color="#10b981" href="/marketing/tracking" loading={tracking.isLoading} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Announcements & popups</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Active banners" value={announcements.data ?? 0} sub="Site-wide announcements" icon={Megaphone} color="#f59e0b" href="/marketing/announcements?tab=announcements" loading={announcements.isLoading} />
          <KpiCard title="Active popups" value={popups.data ?? 0} sub="Modal campaigns" icon={Radio} color="#ec4899" href="/marketing/announcements?tab=popups" loading={popups.isLoading} />
        </div>
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
