"use client";
import { Settings, Bot, Bell, Phone, ExternalLink, Sparkles, MessageSquare } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsAiDashboard() {
  const notifications = useKpiCount(["notifications", "24h"], "notifications", (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()));
  const telegram = useKpiCount(["telegram-chats"], "telegram_chats");
  const aiMemory = useKpiCount(["ai-memory"], "ai_user_memory");
  const aiWidget = useQuery({
    queryKey: ["ai-widget"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_widget_settings").select("welcome_enabled").limit(1).maybeSingle();
      return { configured: !!data, enabled: !!data?.welcome_enabled };
    },
  });

  return (
    <SectionDashboardShell
      title="Settings & AI"
      description="System preferences, AI assistant, and integrations"
      icon={Settings}
      color="#94a3b8"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="AI assistant" value={aiWidget.data?.enabled ? "On" : "Off"} sub={aiWidget.data?.configured ? "Configured" : "Not set"} icon={Bot} color={aiWidget.data?.enabled ? "#10b981" : "#94a3b8"} href="/settings-ai/ai-settings" loading={aiWidget.isLoading} />
        <KpiCard title="AI memory" value={aiMemory.data ?? "—"} sub="Stored user notes" icon={Sparkles} color="#a855f7" href="/settings-ai/ai-settings" loading={aiMemory.isLoading} />
        <KpiCard title="Notifications (24h)" value={notifications.data ?? 0} sub="Dispatched" icon={Bell} color="#f59e0b" href="/settings-ai/notifications" loading={notifications.isLoading} />
        <KpiCard title="Telegram chats" value={telegram.data ?? 0} sub="Linked recipients" icon={MessageSquare} color="#0ea5e9" href="/settings-ai/telegram" loading={telegram.isLoading} />
        <KpiCard title="Call settings" value="Open" sub="Voice & IVR" icon={Phone} color="#ec4899" href="/settings-ai/call-settings" />
        <KpiCard title="Redirects" value="Open" sub="URL forwarding rules" icon={ExternalLink} color="#84cc16" href="/settings-ai/redirects" />
        <KpiCard title="Recommendations" value="Open" sub="AI-powered suggestions" icon={Sparkles} color="#8b5cf6" href="/settings-ai/recommendations" />
        <KpiCard title="General" value="Open" sub="Site & commerce" icon={Settings} color="#94a3b8" href="/settings-ai/general" />
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
