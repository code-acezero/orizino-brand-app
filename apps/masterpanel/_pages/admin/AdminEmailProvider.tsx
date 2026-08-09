"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getEmailProviderSettings,
  updateEmailProviderSettings,
  verifyResendKey,
  sendProviderTestEmail,
  getEmailProviderStats,
  listEmailDispatchLog,
  clearEmailDispatchLog,
  sendSampleWebhookEvent,
  updateSiteUrlOverride,
} from "@/lib/email-provider.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { APP_URLS } from "@orizino/shared";
import { useTabParam } from "@/hooks/use-tab-param";
import { toast } from "@/lib/app-toast";
import {
  AtSign,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  ShieldCheck,
  Activity,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Star,
  Users,
  AlertTriangle,
  ListChecks,
} from "lucide-react";

type Sender = {
  id: string;
  category: string;
  label: string;
  from_name: string;
  from_email: string;
  reply_to?: string | null;
  is_default?: boolean;
};

const ORIZINO_DEFAULTS = {
  from_email: "team@orizino.com",
  from_name: "Orizino",
  reply_to: "contact.orizino@gmail.com",
  footer_address: "Orizino Co.",
  tracking_opens: true,
  tracking_clicks: true,
  senders: [
    { id: "s_team", category: "team", label: "Universal default (team)", from_name: "Orizino", from_email: "team@orizino.com", reply_to: "contact.orizino@gmail.com", is_default: true },
    { id: "s_updates", category: "updates", label: "Product updates & newsletters", from_name: "Orizino Updates", from_email: "updates@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_contact", category: "contact", label: "Contact & support replies", from_name: "Orizino Support", from_email: "contact@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_admin", category: "admin", label: "Admin / transactional", from_name: "Orizino Admin", from_email: "admin-name@orizino.com", reply_to: "contact.orizino@gmail.com" },
  ] as Sender[],
};

export default function AdminEmailProvider() {
  const getSettings = useServerFn(getEmailProviderSettings);
  const saveSettings = useServerFn(updateEmailProviderSettings);
  const verify = useServerFn(verifyResendKey);
  const sendTest = useServerFn(sendProviderTestEmail);
  const getStats = useServerFn(getEmailProviderStats);
  const listLog = useServerFn(listEmailDispatchLog);
  const clearLog = useServerFn(clearEmailDispatchLog);
  const sendSample = useServerFn(sendSampleWebhookEvent);
  const saveSiteUrl = useServerFn(updateSiteUrlOverride);
  const qc = useQueryClient();
  const [siteUrlDraft, setSiteUrlDraft] = useState<string>("");
  const [editingSiteUrl, setEditingSiteUrl] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["email-provider"],
    queryFn: () => getSettings(),
    retry: false,
  });
  const { data: stats } = useQuery({ queryKey: ["email-provider-stats"], queryFn: () => getStats() });
  const { data: logRows, refetch: refetchLog, isFetching: logLoading } = useQuery({
    queryKey: ["email-dispatch-log"],
    queryFn: () => listLog({ data: { limit: 100 } }),
  });

  const [form, setForm] = useState<{
    from_email: string;
    from_name: string;
    reply_to: string;
    footer_address: string;
    tracking_opens: boolean;
    tracking_clicks: boolean;
    senders: Sender[];
  } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Test from Resend integration");
  const [testResponse, setTestResponse] = useState<null | { ok: boolean; id?: string | null; error?: string | null }>(null);
  const [domains, setDomains] = useState<any[] | null>(null);
  const [epTab, setEpTab] = useTabParam("sender", "/email/provider");

  // hydrate form once settings load
  if (data && !form) {
    const s: any = data.settings ?? {};
    const hasAny = s && Object.keys(s).length > 0;
    setForm({
      from_email: s.from_email ?? (hasAny ? "" : ORIZINO_DEFAULTS.from_email),
      from_name: s.from_name ?? (hasAny ? "" : ORIZINO_DEFAULTS.from_name),
      reply_to: s.reply_to ?? (hasAny ? "" : ORIZINO_DEFAULTS.reply_to),
      footer_address: s.footer_address ?? (hasAny ? "" : ORIZINO_DEFAULTS.footer_address),
      tracking_opens: s.tracking_opens ?? true,
      tracking_clicks: s.tracking_clicks ?? true,
      senders: Array.isArray(s.senders) && s.senders.length ? s.senders : ORIZINO_DEFAULTS.senders,
    });
  }

  const saveMut = useMutation({
    mutationFn: () => saveSettings({ data: form! }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["email-provider"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verify(),
    onSuccess: (r: any) => {
      if (r.ok) {
        setDomains(r.domains);
      } else {
        toast.error(r.error || "Verification failed");
      }
    },
  });

  const sampleMut = useMutation({
    mutationFn: () => sendSample({ data: { type: "email.delivered", to: "test@example.com" } }),
    onSuccess: (r: any) => {
      if (r.ok) {
        toast.success(`Sample ${r.type} accepted (HTTP ${r.status})`);
        qc.invalidateQueries({ queryKey: ["email-dispatch-log"] });
      } else {
        toast.error(r.error || `Webhook rejected: HTTP ${r.status ?? "?"}`);
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Sample send failed"),
  });

  const siteUrlMut = useMutation({
    mutationFn: (site_url: string | null) => saveSiteUrl({ data: { site_url } }),
    onSuccess: () => {
      toast.success("Base URL saved");
      setEditingSiteUrl(false);
      qc.invalidateQueries({ queryKey: ["email-provider"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  // Auto-verify domains once the key is configured so the status pill is live.
  useEffect(() => {
    if (data?.env?.resendKeyConfigured && domains == null && !verifyMut.isPending) {
      verifyMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.env?.resendKeyConfigured]);

  const testMut = useMutation({
    mutationFn: () => sendTest({ data: { to: testTo, subject: testSubject || "Test from Resend integration" } }),
    onSuccess: (r: any) => {
      setTestResponse(r);
      qc.invalidateQueries({ queryKey: ["email-dispatch-log"] });
      if (r.ok) toast.success(`Sent · id ${r.id?.slice(0, 8) ?? "-"}`);
      else toast.error(r.error || "Send failed");
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Send failed";
      setTestResponse({ ok: false, error: msg });
      toast.error(msg);
    },
  });

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  if (error) {
    const msg = (error as any)?.message ?? String(error);
    return (
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Failed to load provider settings
            </CardTitle>
            <CardDescription className="break-all">{msg}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              This usually means you are not signed in as an admin, or the server function threw an error. Check the
              server logs, then retry.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !form || !data) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  const { env, urls, siteUrl: siteUrlInfo } = data as any;
  const verifiedDomains = (domains ?? []).filter((d: any) => d.status === "verified");
  const hasVerifiedDomain = verifiedDomains.length > 0;

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <AtSign className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Email Provider — Resend</h1>
            <p className="text-sm text-muted-foreground">
              API keys, sender identity, webhooks and live deliverability stats.
            </p>
          </div>
        </div>
      </header>

      {/* Domain verification warning */}
      {env.resendKeyConfigured && domains != null && !hasVerifiedDomain && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-700">No verified sending domain</p>
            <p className="text-muted-foreground">
              Emails will fail to deliver until you verify a domain in Resend. Add DNS records at{" "}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                resend.com/domains
              </a>{" "}
              then click <strong>Re-check</strong>.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => verifyMut.mutate()} disabled={verifyMut.isPending}>
            <RefreshCw className="size-3 mr-1" />
            Re-check
          </Button>
        </div>
      )}

      {/* SITE_URL config warning */}
      {siteUrlInfo?.warn && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-700">Base URL not configured</p>
            <p className="text-muted-foreground">
              <code className="text-xs px-1 bg-muted rounded">SITE_URL</code> is not set and no admin override is saved.
              Webhook and unsubscribe links currently fall back to{" "}
              <code className="text-xs px-1 bg-muted rounded">{siteUrlInfo.effective}</code>. Set{" "}
              <code className="text-xs px-1 bg-muted rounded">SITE_URL</code> in Netlify env, or use{" "}
              <strong>Override</strong> in the API &amp; Webhooks tab.
            </p>
          </div>
        </div>
      )}

      {/* Status strip */}
      <div className="grid sm:grid-cols-4 gap-3">
        <StatusPill label="Resend API key" ok={env.resendKeyConfigured} okText="Configured" badText="Missing" />
        <StatusPill
          label="Sending domain"
          ok={hasVerifiedDomain}
          okText={hasVerifiedDomain ? `${verifiedDomains.map((d: any) => d.name).join(", ")}` : "Verified"}
          badText={domains == null ? "Checking…" : "Not verified"}
        />
        <StatusPill label="Webhook secret" ok={env.webhookSecretConfigured} okText="Configured" badText="Not set" />
        <StatusPill label="Service role" ok={env.serviceRoleConfigured} okText="Configured" badText="Missing" />
      </div>

      <Tabs value={epTab} onValueChange={setEpTab}>
        <TabsList className="hidden">
          <TabsTrigger value="sender">Sender</TabsTrigger>
          <TabsTrigger value="senders">Senders</TabsTrigger>
          <TabsTrigger value="keys">API & Webhooks</TabsTrigger>
          <TabsTrigger value="test">Send test</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>

        {/* Sender identity */}
        <TabsContent value="sender" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default sender identity</CardTitle>
              <CardDescription>Used by campaigns and automations unless overridden.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="From name">
                  <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Acme" />
                </Field>
                <Field label="From email">
                  <Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="hello@yourdomain.com" type="email" />
                </Field>
                <Field label="Reply-to (optional)">
                  <Input value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} placeholder="support@yourdomain.com" type="email" />
                </Field>
                <Field label="Physical address (CAN-SPAM)">
                  <Input value={form.footer_address} onChange={(e) => setForm({ ...form, footer_address: e.target.value })} placeholder="123 Main St, City, Country" />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Track opens</p>
                  <p className="text-xs text-muted-foreground">Inserts a 1x1 pixel into outgoing campaigns.</p>
                </div>
                <Switch checked={form.tracking_opens} onCheckedChange={(v) => setForm({ ...form, tracking_opens: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Track clicks</p>
                  <p className="text-xs text-muted-foreground">Wraps links so Resend records click events.</p>
                </div>
                <Switch checked={form.tracking_clicks} onCheckedChange={(v) => setForm({ ...form, tracking_clicks: v })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Senders management */}
        <TabsContent value="senders" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="size-4" /> Sender identities
                </CardTitle>
                <CardDescription>
                  Map a category (e.g. <code className="text-xs px-1 bg-muted rounded">updates</code>,{" "}
                  <code className="text-xs px-1 bg-muted rounded">contact</code>,{" "}
                  <code className="text-xs px-1 bg-muted rounded">admin</code>) to a From address.
                  Email-sending code picks the sender by category; the marked default is used as a fallback.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    senders: [
                      ...form.senders,
                      {
                        id: `s_${Math.random().toString(36).slice(2, 8)}`,
                        category: "",
                        label: "",
                        from_name: "",
                        from_email: "",
                        reply_to: form.reply_to || "",
                      },
                    ],
                  })
                }
              >
                <Plus className="size-4 mr-1" /> Add sender
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.senders.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  No senders configured. Click <strong>Add sender</strong> to create one.
                </p>
              )}
              {form.senders.map((s, idx) => (
                <div key={s.id} className="rounded-xl border p-4 space-y-3 bg-card/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={s.is_default ? "default" : "outline"}>
                        {s.is_default ? (
                          <>
                            <Star className="size-3 mr-1 fill-current" /> Default
                          </>
                        ) : (
                          "Sender"
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{s.category || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!s.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const senders = form.senders.map((x, i) => ({ ...x, is_default: i === idx }));
                            setForm({ ...form, senders });
                          }}
                        >
                          <Star className="size-3 mr-1" /> Make default
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const senders = form.senders.filter((_, i) => i !== idx);
                          setForm({ ...form, senders });
                        }}
                        aria-label="Remove sender"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Category (slug)">
                      <Input
                        value={s.category}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, category: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") };
                          setForm({ ...form, senders });
                        }}
                        placeholder="updates"
                      />
                    </Field>
                    <Field label="Label">
                      <Input
                        value={s.label}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, label: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="Product updates"
                      />
                    </Field>
                    <Field label="From name">
                      <Input
                        value={s.from_name}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, from_name: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="Orizino Updates"
                      />
                    </Field>
                    <Field label="From email">
                      <Input
                        type="email"
                        value={s.from_email}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, from_email: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="team@orizino.com"
                      />
                    </Field>
                    <Field label="Reply-to (optional)">
                      <Input
                        type="email"
                        value={s.reply_to ?? ""}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, reply_to: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="contact.orizino@gmail.com"
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save senders"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* API keys & webhooks */}
        <TabsContent value="keys" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="size-4" /> API key
              </CardTitle>
              <CardDescription>
                Stored as the env var <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_API_KEY</code> in Netlify (site env) and Supabase (Edge Function secrets). Never exposed to the browser in full.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {env.resendKeyConfigured ? (
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="size-3 mr-1" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0">
                      <XCircle className="size-3 mr-1" /> Not configured
                    </Badge>
                  )}
                  <code className="text-xs font-mono px-2 py-1 bg-muted rounded truncate">
                    {env.resendKeyPreview ?? "RESEND_API_KEY (not set)"}
                  </code>
                </div>
                <Button size="sm" variant="outline" onClick={() => verifyMut.mutate()} disabled={!env.resendKeyConfigured || verifyMut.isPending}>
                  <RefreshCw className="size-3 mr-1" />
                  {verifyMut.isPending ? "Verifying…" : "Verify key"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add or rotate the key in <strong>Netlify → Site settings → Environment variables</strong> and mirror it in <strong>Supabase → Project settings → Edge Functions → Secrets</strong> under the name <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_API_KEY</code>. Redeploy Netlify, then click <strong>Verify key</strong>.
              </p>
              {domains && (
                <div className="rounded-lg border divide-y">
                  {domains.length === 0 && (
                    <p className="text-sm p-3 text-muted-foreground">
                      No domains in your Resend account yet. Add one at{" "}
                      <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        resend.com/domains
                      </a>
                      .
                    </p>
                  )}
                  {domains.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.region}</p>
                      </div>
                      <Badge variant={d.status === "verified" ? "default" : "outline"}>{d.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="size-4" /> Webhook
              </CardTitle>
              <CardDescription>Add this endpoint in Resend → Webhooks to ingest delivery, open, click, bounce events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ecosystem App URLs (.env Configured) */}
              <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/10 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ecosystem App URLs (.env Configured)</p>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Active</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">🛒 Storefront</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{APP_URLS.storefront}</p>
                    </div>
                    <Badge className="text-[9px] bg-emerald-500/20 text-emerald-500 font-bold border-0">ENV OK</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">⚡ Master Panel</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{APP_URLS.masterpanel}</p>
                    </div>
                    <Badge className="text-[9px] bg-emerald-500/20 text-emerald-500 font-bold border-0">ENV OK</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">🧭 Explore App (Upcoming)</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{APP_URLS.explore}</p>
                    </div>
                    <Badge className="text-[9px] bg-sky-500/20 text-sky-500 font-bold border-0">ENV OK</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">🏢 Company</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{APP_URLS.company}</p>
                    </div>
                    <Badge className="text-[9px] bg-emerald-500/20 text-emerald-500 font-bold border-0">ENV OK</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/40 bg-background flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">📦 OrderOps</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{APP_URLS.orderops}</p>
                    </div>
                    <Badge className="text-[9px] bg-emerald-500/20 text-emerald-500 font-bold border-0">ENV OK</Badge>
                  </div>
                </div>
              </div>
              <UrlRow label="Webhook URL" value={urls.webhook} onCopy={copy} />
              <UrlRow label="Unsubscribe URL" value={urls.unsubscribe} onCopy={copy} />
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Signing secret</p>
                  <p className="text-xs text-muted-foreground">
                    Stored as <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_WEBHOOK_SECRET</code> in Netlify (site env) and Supabase (Edge Function secrets). Used to verify incoming events.
                  </p>
                </div>
                {env.webhookSecretConfigured ? (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="size-3 mr-1" /> Set
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                    Optional but recommended
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => sampleMut.mutate()}
                  disabled={!env.webhookSecretConfigured || sampleMut.isPending}
                >
                  <Send className="size-3 mr-1" />
                  {sampleMut.isPending ? "Sending sample…" : "Send sample event"}
                </Button>
                <a
                  href="https://resend.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open Resend webhooks <ExternalLink className="size-3" />
                </a>
              </div>
              {!env.webhookSecretConfigured && (
                <p className="text-xs text-muted-foreground">Set <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_WEBHOOK_SECRET</code> to enable the sample event test.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test send */}
        <TabsContent value="test" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="size-4" /> Send a test email
              </CardTitle>
              <CardDescription>Uses your saved sender identity and the live Resend key. Every send is recorded in the dispatch log.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Recipient email">
                  <Input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Subject">
                  <Input
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    placeholder="Test from Resend integration"
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setTestResponse(null);
                    testMut.mutate();
                  }}
                  disabled={!testTo || !env.resendKeyConfigured || testMut.isPending}
                >
                  {testMut.isPending ? "Sending…" : "Send test"}
                </Button>
                {!hasVerifiedDomain && env.resendKeyConfigured && (
                  <span className="text-xs text-amber-600">Domain not verified — send may fail.</span>
                )}
              </div>
              {!env.resendKeyConfigured && (
                <p className="text-xs text-destructive">Set RESEND_API_KEY before sending tests.</p>
              )}
              {testResponse && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    testResponse.ok
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-destructive/40 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResponse.ok ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-600" /> Sent
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4 text-destructive" /> Failed
                      </>
                    )}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-all text-xs font-mono bg-background/50 rounded p-2 border">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="size-4" /> Last 30 days
              </CardTitle>
              <CardDescription>Aggregated from local delivery log (powered by Resend webhook events).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Sent" value={stats?.sent ?? 0} />
                <Stat label="Delivered" value={stats?.delivered ?? 0} />
                <Stat label="Opened" value={stats?.opened ?? 0} />
                <Stat label="Clicked" value={stats?.clicked ?? 0} />
                <Stat label="Bounced" value={stats?.bounced ?? 0} tone="warn" />
                <Stat label="Suppressed" value={stats?.suppressed ?? 0} tone="warn" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispatch log */}
        <TabsContent value="log" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="size-4" /> Dispatch log
                </CardTitle>
                <CardDescription>
                  Every automation, test, invoice and manual send — with Resend id or error reason.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => refetchLog()} disabled={logLoading}>
                  <RefreshCw className="size-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={logLoading || (logRows ?? []).length === 0}
                  onClick={async () => {
                    if (!confirm("Delete ALL dispatch log entries? This cannot be undone.")) return;
                    try {
                      const res = await clearLog({});
                      toast.success(`Cleared ${res.deleted} log ${res.deleted === 1 ? "entry" : "entries"}`);
                      qc.invalidateQueries({ queryKey: ["email-dispatch-log"] });
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed to clear log");
                    }
                  }}
                >
                  <Trash2 className="size-3 mr-1" />
                  Clear all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(logRows ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center border rounded-lg">
                  No email attempts yet.
                </p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left p-2 font-medium">When</th>
                        <th className="text-left p-2 font-medium">Purpose</th>
                        <th className="text-left p-2 font-medium">Event</th>
                        <th className="text-left p-2 font-medium">Recipient</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Provider / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(logRows ?? []).map((r: any) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 text-xs">
                            <Badge variant="outline" className="font-mono">{r.purpose}</Badge>
                          </td>
                          <td className="p-2 text-xs font-mono text-muted-foreground">{r.event ?? "—"}</td>
                          <td className="p-2 text-xs">{r.recipient || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-2 text-xs">
                            {r.status === "sent" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">sent</Badge>
                            ) : r.status === "failed" ? (
                              <Badge variant="destructive">failed</Badge>
                            ) : (
                              <Badge variant="outline">{r.status}</Badge>
                            )}
                          </td>
                          <td className="p-2 text-xs font-mono break-all max-w-[280px]">
                            {r.error ? (
                              <span className="text-destructive">{r.error}</span>
                            ) : (
                              <span className="text-muted-foreground">{r.provider_id || "—"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusPill({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="rounded-xl border p-3 flex items-center justify-between bg-card">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{ok ? okText : badText}</p>
      </div>
      {ok ? (
        <CheckCircle2 className="size-5 text-emerald-500" />
      ) : (
        <XCircle className="size-5 text-destructive" />
      )}
    </div>
  );
}

function UrlRow({ label, value, onCopy }: { label: string; value: string; onCopy: (s: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={() => onCopy(value)} aria-label={`Copy ${label}`}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "bg-amber-500/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
// code:4ce0
