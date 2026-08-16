"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  AlertTriangle,
  ExternalLink,
  Activity,
} from "lucide-react";

// Official AI Provider Logos
export function GeminiLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill="url(#gemini-sparkle-grad)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4E82EE" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GroqLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#F55036" fillOpacity="0.15" />
      <path
        d="M16.5 7.5H7.5V16.5H16.5V12H12"
        stroke="#F55036"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpenRouterLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#8B5CF6" strokeWidth="2" strokeOpacity="0.3" />
      <path
        d="M12 4L4 9V15L12 20L20 15V9L12 4Z"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="#8B5CF6" />
    </svg>
  );
}

async function testApiKey(key: string, provider: "gemini" | "groq" | "openrouter"): Promise<{ ok: boolean; message: string; status?: number }> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, message: "Empty key" };

  if (provider === "gemini") {
    // Probe official active Google Gemini Flash models (1,500 RPD Free Tier)
    for (const model of ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-flash-latest"]) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmed}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Ping status test" }] }] }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          return { ok: true, message: `Connected to ${model} (Operational · Max Free Quota)`, status: 200 };
        }
        if (res.status === 429) {
          return {
            ok: false,
            status: 429,
            message: "429 Quota Exceeded: Free tier daily limit reached on this project. Key added to rotation for auto-reset.",
          };
        }
        if (res.status === 403) {
          return { ok: false, status: 403, message: "403 Access Denied: Check Google AI Studio permissions or API key restrictions." };
        }
      } catch (e: any) {
        // continue next candidate
      }
    }
    return { ok: false, message: "Google API rejected this key (404/403/429)" };
  }

  if (provider === "groq") {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${trimmed}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 5,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, message: "Connected to Groq Llama 3.3 (14,400 RPD free limit active)", status: 200 };
      return { ok: false, message: json?.error?.message || `HTTP ${res.status}`, status: res.status };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Groq connection error" };
    }
  }

  if (provider === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${trimmed}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 5,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, message: "Connected to OpenRouter", status: 200 };
      return { ok: false, message: json?.error?.message || `HTTP ${res.status}`, status: res.status };
    } catch (e: any) {
      return { ok: false, message: e?.message || "OpenRouter connection error" };
    }
  }

  return { ok: false, message: "Unknown provider" };
}

export default function GeminiFallbackPanel() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"gemini" | "groq" | "openrouter">("gemini");
  const [newKeyInput, setNewKeyInput] = useState("");
  const [testState, setTestState] = useState<{ state: "idle" | "testing" | "ok" | "fail"; message?: string }>({ state: "idle" });
  const [pingingKey, setPingingKey] = useState<string | null>(null);
  const [keyPingResults, setKeyPingResults] = useState<Record<string, { ok: boolean; message: string; status?: number }>>({});

  const configKey = activeTab === "gemini" ? "gemini_fallback_config" : activeTab === "groq" ? "groq_fallback_config" : "openrouter_fallback_config";

  const { data: dbKeysData, isLoading: isLoadingKeys, refetch: refetchDbKeys } = useQuery({
    queryKey: ["admin-llm-keys", configKey],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", configKey).maybeSingle();
      const raw = (data?.value as any) || {};
      const val = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      const keys = Array.isArray(val?.keys) ? val.keys : typeof val?.key === "string" ? [val.key] : [];
      return keys.filter((k: any) => typeof k === "string" && k.trim().length > 0) as string[];
    },
  });

  const saveKeysMutation = useMutation({
    mutationFn: async (updatedKeys: string[]) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: configKey,
        value: { value: { keys: updatedKeys, enabled: true } },
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-llm-keys", configKey] });
      toast.success("API keys updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAddKey = async () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) {
      toast.error("Please enter an API key");
      return;
    }

    const currentKeys = dbKeysData || [];
    if (currentKeys.includes(trimmed)) {
      toast.error("This key is already in the rotation list");
      return;
    }

    setTestState({ state: "testing" });
    const testResult = await testApiKey(trimmed, activeTab);
    setTestState({ state: testResult.ok ? "ok" : "fail", message: testResult.message });

    if (testResult.ok) {
      await saveKeysMutation.mutateAsync([trimmed, ...currentKeys]);
      setNewKeyInput("");
      toast.success("Key verified & saved to rotation!");
    } else {
      // If 429 quota, still allow saving with warning
      if (testResult.status === 429) {
        await saveKeysMutation.mutateAsync([trimmed, ...currentKeys]);
        setNewKeyInput("");
        toast.warning("Key saved in rotation pool. Free tier quota resets daily at midnight PT.");
      } else {
        toast.error(`Key test failed: ${testResult.message}`);
      }
    }
  };

  const handlePingKey = async (k: string) => {
    setPingingKey(k);
    const res = await testApiKey(k, activeTab);
    setKeyPingResults((prev) => ({ ...prev, [k]: res }));
    setPingingKey(null);
    if (res.ok) {
      toast.success(`Key #${maskKey(k)}: Operational (${res.message})`);
    } else {
      toast.error(`Key #${maskKey(k)}: ${res.message}`);
    }
  };

  const handleRemoveKey = async (keyToRemove: string) => {
    const currentKeys = dbKeysData || [];
    const filtered = currentKeys.filter((k) => k !== keyToRemove);
    await saveKeysMutation.mutateAsync(filtered);
  };

  const maskKey = (key: string) => {
    if (key.length < 12) return "••••••••••••";
    return `${key.slice(0, 6)}••••••••••••${key.slice(-4)}`;
  };

  const keys = dbKeysData || [];

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <KeyRound className="w-4 h-4 text-primary" /> Multi-Provider LLM Key Studio & Failover Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Rotate Google Gemini, Groq, or OpenRouter keys with auto-failover to keep the concierge online 24/7.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 py-0.5 px-2 text-[10px] font-semibold shrink-0 self-start sm:self-auto">
            <Zap className="w-3 h-3" /> High Availability Rotation
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Compact, Sleek Provider Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setNewKeyInput(""); setTestState({ state: "idle" }); }}>
          <TabsList className="inline-flex h-8 items-center justify-start rounded-full bg-secondary/40 p-0.5 text-muted-foreground border border-border/40">
            <TabsTrigger
              value="gemini"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <GeminiLogo className="w-3.5 h-3.5 shrink-0" />
              <span>Google Gemini</span>
            </TabsTrigger>
            <TabsTrigger
              value="groq"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <GroqLogo className="w-3.5 h-3.5 shrink-0" />
              <span>Groq (Llama 3.3)</span>
            </TabsTrigger>
            <TabsTrigger
              value="openrouter"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <OpenRouterLogo className="w-3.5 h-3.5 shrink-0" />
              <span>OpenRouter</span>
            </TabsTrigger>
          </TabsList>

          <div className="pt-3">
            {activeTab === "gemini" && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <GeminiLogo className="w-3.5 h-3.5 shrink-0" />
                  Google Gemini Free Tier Quota Architecture:
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Gemini 2.5 Flash / 2.0 Flash / 1.5 Flash:</strong> Full <strong>1,500 requests per day</strong> (15 RPM) per project completely free.</li>
                  <li><strong>Gemini Pro (2.5 & 1.5 Pro):</strong> 50 requests per day (2 RPM) on free tier.</li>
                  <li><strong>Pro Tip:</strong> Add multiple Gemini API keys below from different Google AI Studio projects—the system automatically load-balances and rotates across all of them!</li>
                </ul>
              </div>
            )}

            {activeTab === "groq" && (
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <GroqLogo className="w-3.5 h-3.5 shrink-0" />
                  Groq Ultra-Fast Free Tier (14,400 requests/day):
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Groq offers lightning-fast inference on Llama 3.3 70B with up to 14,400 free requests per day. Get a free key at{" "}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                    console.groq.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            )}

            {activeTab === "openrouter" && (
              <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <OpenRouterLogo className="w-3.5 h-3.5 shrink-0" />
                  OpenRouter Universal Fallback:
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Access 100+ models with generous free models. Get an API key at{" "}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                    openrouter.ai <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            )}

            {/* Configured Keys List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active {activeTab.toUpperCase()} Keys ({keys.length})
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetchDbKeys()}
                  disabled={isLoadingKeys}
                  className="h-6 text-[11px] gap-1 px-2"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLoadingKeys ? "animate-spin" : ""}`} /> Sync Keys
                </Button>
              </div>

              {keys.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-border/70 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">No {activeTab} keys configured yet.</p>
                  <p className="text-[11px] text-muted-foreground">Add your API key below to activate rotation for this provider.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {keys.map((k, index) => {
                    const ping = keyPingResults[k];
                    const isPinging = pingingKey === k;
                    return (
                      <div
                        key={k}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-border/50 bg-background/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-foreground truncate">{maskKey(k)}</p>
                            {ping ? (
                              <p className={`text-[10px] flex items-center gap-1 font-medium ${ping.ok ? "text-emerald-500" : ping.status === 429 ? "text-amber-500" : "text-destructive"}`}>
                                {ping.ok ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> : ping.status === 429 ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> : <XCircle className="w-2.5 h-2.5 shrink-0" />}
                                <span className="truncate">{ping.message}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                Ready in failover pool
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePingKey(k)}
                            disabled={isPinging}
                            className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
                          >
                            <Activity className={`w-2.5 h-2.5 ${isPinging ? "animate-spin text-primary" : ""}`} />
                            {isPinging ? "Testing..." : "Test Ping"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveKey(k)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0 cursor-pointer"
                            title="Remove key"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Key */}
            <div className="space-y-1.5 pt-3 border-t border-border/50 mt-3">
              <Label className="text-xs font-medium">Add New {activeTab.toUpperCase()} API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value={newKeyInput}
                  onChange={(e) => {
                    setNewKeyInput(e.target.value);
                    setTestState({ state: "idle" });
                  }}
                  placeholder={
                    activeTab === "gemini"
                      ? "Paste AIza... or Google Gemini Key"
                      : activeTab === "groq"
                      ? "Paste gsk_... Groq API Key"
                      : "Paste sk-or-... OpenRouter API Key"
                  }
                  className="font-mono text-xs h-8"
                />
                <Button
                  type="button"
                  onClick={handleAddKey}
                  disabled={saveKeysMutation.isPending || testState.state === "testing" || !newKeyInput.trim()}
                  className="gap-1.5 h-8 text-xs min-w-[110px] shrink-0 cursor-pointer font-bold"
                >
                  {testState.state === "testing" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Verify & Add
                </Button>
              </div>

              {testState.message && (
                <p className={`text-[10px] ${testState.state === "ok" ? "text-emerald-500 font-semibold" : "text-destructive"}`}>
                  {testState.message}
                </p>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
// code:4ce0
