"use client";
import { Palette, Layout, Image, Layers, Home, Globe, FileText, Smartphone } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";

export default function BrandDashboard() {
  const banners = useKpiCount(["banners", "active"], "banners", (q) => q.eq("is_active", true));
  const showcase = useKpiCount(["showcase"], "showcase_slides", (q) => q.eq("is_active", true));
  const cms = useKpiCount(["cms"], "cms_pages", (q) => q.eq("published", true));

  return (
    <SectionDashboardShell
      title="Brand & Storefront"
      description="Identity, theme, and every surface a customer sees"
      icon={Palette}
      color="#ec4899"
    >
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Identity & theme</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Branding" value="Open" sub="Logo, colors, typography" icon={Palette} color="#ec4899" href="/brand/branding" />
          <KpiCard title="Per-app branding" value="Open" sub="Override logo/title/favicon per app + sync" icon={Layers} color="#22d3ee" href="/brand/per-app" />
          <KpiCard title="Appearance" value="Open" sub="Layout per surface" icon={Layout} color="#a855f7" href="/brand/appearance" />
          <KpiCard title="Mobile UI" value="Open" sub="Mobile-only widgets" icon={Smartphone} color="#38bdf8" href="/brand/mobile-ui" />
          <KpiCard title="Footer" value="Open" sub="Site-wide footer" icon={Layers} color="#f59e0b" href="/brand/footer" />

        </div>
      </div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Content surfaces</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Active banners" value={banners.data ?? 0} sub="Hero & promo" icon={Image} color="#f97316" href="/brand/banners" loading={banners.isLoading} />
          <KpiCard title="Showcase slides" value={showcase.data ?? 0} sub="Homepage carousel" icon={Layers} color="#eab308" href="/sales/showcase" loading={showcase.isLoading} />
          <KpiCard title="Published CMS pages" value={cms.data ?? 0} sub="Custom pages" icon={FileText} color="#84cc16" href="/brand/cms-pages" loading={cms.isLoading} />
          <KpiCard title="Home page" value="Open" sub="Sections & layout" icon={Home} color="#0ea5e9" href="/brand/home" />
          <KpiCard title="Landing page" value="Open" sub="Builder" icon={Globe} color="#8b5cf6" href="/brand/landing" />
        </div>
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
