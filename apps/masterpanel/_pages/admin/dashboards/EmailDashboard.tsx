"use client";
import { Mail, Send, AtSign, FileText, Workflow, KeyRound, Activity } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function EmailDashboard() {
  const subs = useKpiCount(["email-subs"], "email_subscriptions", (q) => q.eq("status", "active"));
  const campaigns = useKpiCount(["email-campaigns"], "email_campaigns");
  const templates = useKpiCount(["email-templates"], "email_templates");
  const automations = useKpiCount(["email-automations", "active"], "email_automations", (q) => q.eq("is_active", true));
  const sent7d = useQuery({
    queryKey: ["email-dispatch", "7d"],
    queryFn: async (): Promise<number> => {
      const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { count } = await (supabase as any)
        .from("email_dispatch_log")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);
      return count ?? 0;
    },
    refetchInterval: 120_000,
  });
  const suppressions = useKpiCount(["email-suppress"], "email_suppressions");
  const provider = useQuery({
    queryKey: ["email-provider-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "email_provider").maybeSingle();
      const v = (data?.value ?? {}) as Record<string, any>;
      return { configured: !!v.api_key_present || !!v.provider, provider: v.provider ?? "—" };
    },
  });

  return (
    <SectionDashboardShell
      title="Email Marketing"
      description="Subscribers, campaigns, automations, and delivery health"
      icon={Mail}
      color="#0ea5e9"
    >
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Reach</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Subscribers" value={subs.data ?? "—"} sub="Active newsletter signups" icon={AtSign} color="#38bdf8" href="/email/subscribers" loading={subs.isLoading} />
          <KpiCard title="Sent (7d)" value={sent7d.data ?? "—"} sub="Dispatched emails" icon={Send} color="#a855f7" href="/email/provider?tab=log" loading={sent7d.isLoading} />
          <KpiCard title="Suppressions" value={suppressions.data ?? 0} sub="Bounced or unsubscribed" icon={Activity} color="#ef4444" href="/email/provider?tab=stats" alert={!!suppressions.data && suppressions.data > 10} loading={suppressions.isLoading} />
          <KpiCard title="Provider" value={provider.data?.configured ? "OK" : "Not set"} sub={provider.data?.provider ?? "—"} icon={KeyRound} color={provider.data?.configured ? "#10b981" : "#ef4444"} href="/email/provider" alert={!provider.data?.configured} loading={provider.isLoading} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Content</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Campaigns" value={campaigns.data ?? "—"} sub="All-time" icon={Send} color="#f59e0b" href="/email/campaigns" loading={campaigns.isLoading} />
          <KpiCard title="Templates" value={templates.data ?? "—"} sub="Reusable designs" icon={FileText} color="#84cc16" href="/email/templates" loading={templates.isLoading} />
          <KpiCard title="Automations" value={automations.data ?? 0} sub="Active event triggers" icon={Workflow} color="#8b5cf6" href="/email/automations" loading={automations.isLoading} />
        </div>
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
