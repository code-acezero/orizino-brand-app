"use client";
import { useState, useEffect } from "react";
import { useParams } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { getCampaign, upsertCampaign, sendCampaignNow, sendTestEmail, listTemplates } from "@/lib/email-campaigns.functions";
import { previewCampaignAudience } from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { Save, Send, Eye, FlaskConical, Users, ShieldAlert } from "lucide-react";

const STARTER_HTML = `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f6f7fb;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
  <h1 style="margin:0 0 16px;color:#111;font-size:24px">Your headline here</h1>
  <p style="color:#444;line-height:1.6">Hi {{name}},</p>
  <p style="color:#444;line-height:1.6">Write your message here. Use {{name}}, {{title}}, {{slug}} as variables.</p>
  <a href="https://example.com" style="display:inline-block;margin-top:16px;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Call to action</a>
</div></body></html>`;

export default function AdminEmailCampaignEditor() {
  const { id } = useParams() as { id: string };
  const getC = useServerFn(getCampaign);
  const upsert = useServerFn(upsertCampaign);
  const send = useServerFn(sendCampaignNow);
  const sendTest = useServerFn(sendTestEmail);
  const listTpl = useServerFn(listTemplates);
  const previewAud = useServerFn(previewCampaignAudience);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["campaign", id], queryFn: () => getC({ data: { id } }) });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => listTpl() });

  const [form, setForm] = useState<any>(null);
  const [testTo, setTestTo] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [audience, setAudience] = useState<{ recipients: number; sample: string[]; suppressed: number } | null>(null);
  useEffect(() => { if (data?.campaign && !form) setForm({ ...data.campaign, html: data.campaign.html || STARTER_HTML }); }, [data, form]);

  if (!form) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => upsert({ data: { id: form.id, name: form.name, subject: form.subject, from_name: form.from_name, from_email: form.from_email, reply_to: form.reply_to, html: form.html, audience_type: form.audience_type, schedule_at: form.schedule_at, status: form.schedule_at ? "scheduled" : "draft" } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["campaign", id] }); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const sendMut = useMutation({
    mutationFn: () => send({ data: { id } }),
    onSuccess: (r: any) => { toast.success(`Sent to ${r?.total || 0}: ${r?.sent || 0} delivered, ${r?.failed || 0} failed`); qc.invalidateQueries({ queryKey: ["campaign", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="text-xl font-display font-bold max-w-md border-0 px-0 focus-visible:ring-0" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}><FlaskConical className="w-4 h-4 mr-1.5" />Test</Button>
          <Button variant="outline" size="sm" onClick={() => saveMut.mutate()}><Save className="w-4 h-4 mr-1.5" />Save</Button>
          <Button size="sm" onClick={async () => { const a = await previewAud({ data: { audience_type: form.audience_type, audience_filter: form.audience_filter } }); setAudience(a); setReviewOpen(true); }}><Send className="w-4 h-4 mr-1.5" />{form.schedule_at ? "Review & schedule" : "Review & send"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-lg border border-border p-4 bg-card space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Subject</label><Input value={form.subject} onChange={(e) => set("subject", e.target.value)} maxLength={300} /></div>
              <div>
                <label className="text-xs text-muted-foreground">Template</label>
                <Select value={form.template_id ?? ""} onValueChange={(v) => { const t: any = templates.find((x: any) => x.id === v); if (t) { set("template_id", v); set("html", t.html); set("subject", form.subject || t.subject); } }}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">From name</label><Input value={form.from_name ?? ""} onChange={(e) => set("from_name", e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">From email</label><Input value={form.from_email ?? ""} onChange={(e) => set("from_email", e.target.value)} placeholder="onboarding@resend.dev" /></div>
              <div>
                <label className="text-xs text-muted-foreground">Audience</label>
                <Select value={form.audience_type} onValueChange={(v) => set("audience_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscribers">All subscribers</SelectItem>
                    <SelectItem value="customers">All customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Schedule at (optional)</label><Input type="datetime-local" value={form.schedule_at ? form.schedule_at.slice(0, 16) : ""} onChange={(e) => set("schedule_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
            </div>
          </div>

          <Tabs defaultValue="html">
            <TabsList><TabsTrigger value="html">HTML</TabsTrigger><TabsTrigger value="preview"><Eye className="w-4 h-4 mr-1.5" />Preview</TabsTrigger></TabsList>
            <TabsContent value="html">
              <Textarea value={form.html} onChange={(e) => set("html", e.target.value)} rows={24} className="font-mono text-xs" />
            </TabsContent>
            <TabsContent value="preview">
              <div className="rounded-lg border border-border overflow-hidden bg-white">
                <iframe srcDoc={form.html} className="w-full h-[600px] border-0" sandbox="" title="preview" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border p-4 bg-card">
            <h3 className="font-semibold mb-2">Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-2xl font-bold">{form.total_recipients}</div><div className="text-xs text-muted-foreground">Audience</div></div>
              <div><div className="text-2xl font-bold">{form.sent_count}</div><div className="text-xs text-muted-foreground">Sent</div></div>
              <div><div className="text-2xl font-bold">{form.opened_count}</div><div className="text-xs text-muted-foreground">Opens</div></div>
              <div><div className="text-2xl font-bold">{form.clicked_count}</div><div className="text-xs text-muted-foreground">Clicks</div></div>
              <div><div className="text-2xl font-bold">{form.bounced_count}</div><div className="text-xs text-muted-foreground">Bounces</div></div>
              <div><div className="text-2xl font-bold">{form.failed_count}</div><div className="text-xs text-muted-foreground">Failed</div></div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card text-xs text-muted-foreground space-y-1">
            <p><strong>Variables:</strong> use <code>&#123;&#123;name&#125;&#125;</code>, <code>&#123;&#123;title&#125;&#125;</code>, <code>&#123;&#123;slug&#125;&#125;</code></p>
            <p>Unsubscribe footer is added automatically. Bounces/complaints go to suppression list.</p>
          </div>
        </div>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send test email</DialogTitle></DialogHeader>
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={async () => { const r = await sendTest({ data: { to: testTo, subject: form.subject || "Test", html: form.html } }); if (r.id) { toast.success("Test sent"); setTestOpen(false); } else toast.error(r.error ?? "Failed"); }}>Send test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{form.schedule_at ? "Review & schedule campaign" : "Review & send campaign"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 text-sm">
              <div className="rounded border border-border p-3 bg-card">
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="font-medium">{form.subject || <span className="text-destructive">(empty)</span>}</div>
              </div>
              <div className="rounded border border-border p-3 bg-card">
                <div className="text-xs text-muted-foreground">From</div>
                <div className="font-medium">{form.from_name || "—"} &lt;{form.from_email || "default"}&gt;</div>
              </div>
              <div className="rounded border border-border p-3 bg-card flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold leading-none">{audience?.recipients ?? "…"}</div>
                  <div className="text-xs text-muted-foreground">{form.audience_type} recipients</div>
                </div>
              </div>
              {audience && audience.suppressed > 0 && (
                <div className="rounded border border-border p-3 bg-card flex items-center gap-2 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  {audience.suppressed} suppressed address{audience.suppressed === 1 ? "" : "es"} will be skipped
                </div>
              )}
              {audience?.sample && audience.sample.length > 0 && (
                <div className="rounded border border-border p-3 bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Sample recipients</div>
                  <ul className="text-xs space-y-0.5">{audience.sample.map((e) => <li key={e} className="font-mono">{e}</li>)}</ul>
                </div>
              )}
              {form.schedule_at && (
                <div className="rounded border border-primary/40 bg-primary/5 p-3 text-xs">
                  Will be queued and sent at <strong>{new Date(form.schedule_at).toLocaleString()}</strong>.
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-white">
              <iframe srcDoc={form.html} className="w-full h-[420px] border-0" sandbox="" title="review-preview" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            {form.schedule_at ? (
              <Button onClick={() => { saveMut.mutate(); setReviewOpen(false); toast.success("Scheduled"); }} disabled={!audience?.recipients}>Schedule</Button>
            ) : (
              <Button onClick={() => { sendMut.mutate(); setReviewOpen(false); }} disabled={!audience?.recipients}>Send to {audience?.recipients ?? 0} now</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// code:4ce0
