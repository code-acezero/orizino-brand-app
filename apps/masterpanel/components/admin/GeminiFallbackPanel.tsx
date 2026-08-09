"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/app-toast";
import { KeyRound, CheckCircle2, XCircle, Loader2, RefreshCw, Copy } from "lucide-react";

const TEST_MODEL = "gemini-flash-latest";
const ENV_VAR_NAMES = ["GEMINI_API_KEY_1", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5"];

async function testGeminiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, message: "Empty key" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": trimmed },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "OK";
      return { ok: true, message: `OK — ${String(text).slice(0, 40)}` };
    }
    const err = json?.error?.message || `HTTP ${res.status}`;
    return { ok: false, message: err };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Admin panel: Gemini fallback status + key tester.
 *
 * As of this version, fallback keys are no longer stored in the database —
 * they live as Supabase Edge Function secrets (env vars), read directly by
 * the `ai-chat` function's own key-rotation logic. That keeps them out of
 * any database table an admin UI query could ever surface. This panel just
 * (a) reports how many keys the edge function currently sees, via a small
 * status probe, and (b) lets you paste a candidate key to verify it works
 * against Google's API *before* you add it as a secret — the pasted value
 * is never sent anywhere but Google, and is never saved.
 */
export default function GeminiFallbackPanel() {
  const { data: status, isFetching, refetch } = useQuery({
    queryKey: ["gemini-fallback-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-chat", { body: { action: "status" } });
      if (error) throw error;
      return data as { enabled: boolean; keyCount: number; lovableConfigured: boolean };
    },
  });

  const [testKey, setTestKey] = useState("");
  const [testState, setTestState] = useState<{ state: "idle" | "testing" | "ok" | "fail"; message?: string }>({ state: "idle" });

  const runTest = async () => {
    setTestState({ state: "testing" });
    const r = await testGeminiKey(testKey);
    setTestState({ state: r.ok ? "ok" : "fail", message: r.message });
    if (r.ok) toast.success("Key works");
    else toast.error(r.message);
  };

  const copyVarName = (name: string) => {
    navigator.clipboard.writeText(name).catch(() => {});
    toast.success(`Copied ${name}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" /> Gemini API Fallback
        </CardTitle>
        <CardDescription>
          If the default Lovable AI Gateway is rate-limited, out of credits, or unreachable, the chat silently
          retries against your own Google Gemini API keys — configured as environment variables on the edge
          function, not in this database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Live status */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div className="flex items-center gap-3">
            {isFetching ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : status?.enabled ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isFetching ? "Checking…" : status?.enabled ? "Fallback active" : "No fallback keys configured"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isFetching
                  ? "Asking the edge function what it can see"
                  : `${status?.keyCount ?? 0} Gemini key${status?.keyCount === 1 ? "" : "s"} configured · Lovable Gateway ${status?.lovableConfigured ? "connected" : "not configured"}`}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* How to add keys */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How to add a key</p>
          <p className="text-xs text-muted-foreground">
            Set these as Supabase Edge Function secrets (Project Settings → Edge Functions → Secrets, or{" "}
            <code className="text-foreground">supabase secrets set</code>) — add as many numbered ones as you have
            keys for. Get free keys at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Google AI Studio
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-2">
            {ENV_VAR_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => copyVarName(name)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-xs hover:bg-muted transition-colors"
              >
                {name} <Copy className="w-3 h-3 opacity-60" />
              </button>
            ))}
            <span className="text-xs text-muted-foreground self-center">… up to GEMINI_API_KEY_20</span>
          </div>
        </div>

        {/* Test a candidate key before adding it */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-sm font-medium">Test a key before adding it</p>
          <p className="text-xs text-muted-foreground">Pasted here only to ping Google directly — never saved or sent to Orizino's servers.</p>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              value={testKey}
              onChange={(e) => { setTestKey(e.target.value); setTestState({ state: "idle" }); }}
              placeholder="AIza..."
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={runTest}
              disabled={testState.state === "testing" || !testKey.trim()}
              className="gap-1.5 min-w-[88px] shrink-0"
            >
              {testState.state === "testing" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : testState.state === "ok" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : testState.state === "fail" ? (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              ) : null}
              Test
            </Button>
          </div>
          {testState.message && (
            <p className={`text-[11px] ${testState.state === "ok" ? "text-emerald-600" : "text-destructive"}`}>{testState.message}</p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          See <code className="text-foreground">supabase/functions/ai-chat/.env.example</code> in the repo for the full variable list and setup command.
        </p>
      </CardContent>
    </Card>
  );
}
// code:4ce0
