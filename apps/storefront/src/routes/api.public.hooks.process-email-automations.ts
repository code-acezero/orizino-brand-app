import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { sendBatch, getDefaultSender, logDispatch } from "@/lib/resend.server";
import { validateCronOrigin } from "@/lib/cron-guard";

export const Route = createFileRoute("/api/public/hooks/process-email-automations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const wrongHost = validateCronOrigin(request);
        if (wrongHost) return wrongHost;
        const provided =
          request.headers.get("apikey") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        const expected = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
        if (!expected || provided !== expected) return new Response("unauthorized", { status: 401 });

        const sb = createClient(
          process.env.SUPABASE_URL!,
          (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: events } = await sb
          .from("email_automation_events")
          .select("*")
          .is("processed_at", null)
          .order("created_at")
          .limit(50);
        const processed: string[] = [];
        const sender = await getDefaultSender();
        const fromAddr = `${sender.from_name} <${sender.from_email}>`;
        const supportFrom = `${sender.from_name} Support <${sender.from_email}>`;
        for (const ev of events ?? []) {
          const { data: rules } = await sb
            .from("email_automations")
            .select("*, template:email_templates(*)")
            .eq("event", ev.event)
            .eq("is_active", true);
          for (const rule of rules ?? []) {
            if (!rule.template) continue;
            const now = new Date();
            const hour = now.getHours();
            if (rule.quiet_hours_start != null && rule.quiet_hours_end != null) {
              const s = rule.quiet_hours_start,
                e = rule.quiet_hours_end;
              const inQuiet = s <= e ? hour >= s && hour < e : hour >= s || hour < e;
              if (inQuiet) continue;
            }
            const tpl: any = rule.template;
            const subject = rule.subject_override || tpl.subject || ev.payload?.title || ev.payload?.subject || "Update";
            const html = (tpl.html || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_: any, k: string) => {
              const v = (ev.payload ?? {})[k];
              return v == null ? "" : String(v);
            });
            if (rule.audience_type === "staff_support") {
              const { data: roles } = await sb
                .from("user_roles")
                .select("user_id")
                .in("role", ["admin", "moderator", "support"]);
              const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id as string)));
              if (ids.length > 0) {
                const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
                const emails = (list?.users ?? [])
                  .filter((u: any) => u.email && ids.includes(u.id))
                  .map((u: any) => u.email as string);
                if (emails.length > 0) {
                  const results = await sendBatch(
                    emails.map((to: string) => ({ from: supportFrom, to: [to], subject, html }))
                  );
                  await Promise.all(
                    results.map((r, i) =>
                      logDispatch({
                        purpose: "automation",
                        event: ev.event,
                        rule_id: rule.id,
                        recipient: emails[i],
                        subject,
                        status: r.error ? "failed" : "sent",
                        provider_id: r.id ?? null,
                        error: r.error ?? null,
                      })
                    )
                  );
                }
              }
            } else if (rule.audience_type === "order_customer") {
              // Send directly to the single order's customer.
              let to: string | null = ev.payload?.customer_email || null;
              if (!to && ev.payload?.user_id) {
                const { data: u } = await sb.auth.admin.getUserById(ev.payload.user_id);
                to = u?.user?.email ?? null;
              }
              if (to) {
                const [r] = await sendBatch([{ from: fromAddr, to: [to], subject, html }]);
                await logDispatch({
                  purpose: "automation",
                  event: ev.event,
                  rule_id: rule.id,
                  recipient: to,
                  subject,
                  status: r?.error ? "failed" : "sent",
                  provider_id: r?.id ?? null,
                  error: r?.error ?? null,
                });
              } else {
                await logDispatch({
                  purpose: "automation",
                  event: ev.event,
                  rule_id: rule.id,
                  recipient: "",
                  subject,
                  status: "failed",
                  error: "no recipient (missing customer_email/user_id)",
                });
              }
            } else {
              const scheduleAt = new Date(Date.now() + (rule.delay_minutes ?? 0) * 60_000).toISOString();
              await sb.from("email_campaigns").insert({
                name: `[Auto] ${rule.name}`,
                subject,
                html,
                template_id: tpl.id,
                audience_type: rule.audience_type,
                audience_filter: {},
                status: "scheduled",
                schedule_at: scheduleAt,
              });
            }
            await sb
              .from("email_automations")
              .update({ last_run_at: now.toISOString(), run_count: (rule.run_count ?? 0) + 1 })
              .eq("id", rule.id);
          }
          await sb
            .from("email_automation_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", ev.id);
          processed.push(ev.id);
        }
        return Response.json({ ok: true, processed: processed.length });
      },
    },
  },
});
// code:4ce0
