import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { dispatchDueCampaigns } from "@/lib/email-campaigns.functions";
import { validateCronOrigin } from "@/lib/cron-guard";

export const Route = createFileRoute("/api/public/hooks/dispatch-email-campaigns")({
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
          const out = await dispatchDueCampaigns();
          return Response.json({ ok: true, processed: out.length, results: out });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message }, { status: 500 });
        }
      },
    },
  },
});
// code:4ce0
