"use client";
import { Tag, Users2, MousePointerClick, DollarSign, Briefcase, Image } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AffiliateDashboard() {
  const accounts = useKpiCount(["aff-accounts", "active"], "affiliate_accounts", (q) => q.eq("status", "active"));
  const clicks7d = useQuery({
    queryKey: ["aff-clicks", "7d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { count } = await supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }).gte("created_at", since);
      return count ?? 0;
    },
    refetchInterval: 120_000,
  });
  const payoutsPending = useKpiCount(["aff-payouts", "pending"], "affiliate_payouts", (q) => q.eq("status", "pending"));
  const commissions = useQuery({
    queryKey: ["aff-commissions", "owed"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_commissions").select("amount").in("status", ["pending", "approved"]);
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    },
  });
  const creatives = useKpiCount(["aff-creatives"], "affiliate_creatives");
  const products = useKpiCount(["aff-products"], "affiliate_products");

  const currency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <SectionDashboardShell
      title="Affiliate Program"
      description="Partners, referral activity, and payouts"
      icon={Briefcase}
      color="#84cc16"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Active partners" value={accounts.data ?? "—"} sub="Approved affiliates" icon={Users2} color="#84cc16" href="/affiliate/overview?tab=accounts" loading={accounts.isLoading} />
        <KpiCard title="Clicks (7d)" value={clicks7d.data ?? "—"} sub="Referral link visits" icon={MousePointerClick} color="#38bdf8" href="/affiliate/overview?tab=clicks" loading={clicks7d.isLoading} />
        <KpiCard title="Payouts pending" value={payoutsPending.data ?? 0} sub="Awaiting approval" icon={DollarSign} color="#f59e0b" href="/affiliate/overview?tab=payouts" alert={!!payoutsPending.data} loading={payoutsPending.isLoading} />
        <KpiCard title="Commission owed" value={currency(commissions.data ?? 0)} sub="Pending + approved" icon={Tag} color="#a855f7" href="/affiliate/overview?tab=commissions" loading={commissions.isLoading} />
        <KpiCard title="Creatives" value={creatives.data ?? "—"} sub="Marketing assets" icon={Image} color="#ec4899" href="/affiliate/overview?tab=creatives" loading={creatives.isLoading} />
        <KpiCard title="Linked products" value={products.data ?? "—"} sub="In program" icon={Briefcase} color="#0ea5e9" href="/affiliate/overview?tab=products" loading={products.isLoading} />
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
