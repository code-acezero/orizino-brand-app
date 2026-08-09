import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { runScheduledReport } from "@/lib/affiliate-report.functions";
import { validateCronOrigin } from "@/lib/cron-guard";

export const Route = createFileRoute("/api/public/hooks/affiliate-report-weekly")({
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
        try {
          const result = await runScheduledReport("weekly");
          return Response.json({ ok: true, ...result });
        } catch (err: any) {
          return Response.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
        }
      },
    },
  },
});
// code:4ce0
