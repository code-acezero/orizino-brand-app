"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  listCampaigns,
  deleteCampaign,
  upsertCampaign,
  sendCampaignNow,
  listTemplates,
  sendTestEmail,
} from "@/lib/email-campaigns.functions";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import {
  Plus,
  Send,
  Trash2,
  Mail,
  Calendar,
  Eye,
  MousePointerClick,
  Users,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCw,
  FlaskConical,
  ExternalLink,
  Layers,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export default function AdminEmailCampaigns() {
  const fetchCampaigns = useServerFn(listCampaigns);
  const fetchTemplates = useServerFn(listTemplates);
  const saveCampaign = useServerFn(upsertCampaign);
  const sendCampaign = useServerFn(sendCampaignNow);
  const deleteCamp = useServerFn(deleteCampaign);
  const testSend = useServerFn(sendTestEmail);
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<any | null>(null);
  const [testModalCamp, setTestModalCamp] = useState<any | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    subject: "",
    audience_type: "subscribers",
    template_id: "",
    html: "",
  });

  const { data: campaigns = [], isLoading: campLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => fetchCampaigns(),
    staleTime: 10_000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTemplates(),
    staleTime: 30_000,
  });

  const saveMut = useMutation({
    mutationFn: async (payload: any) => {
      return saveCampaign({ data: payload });
    },
    onSuccess: () => {
      toast.success("Campaign saved successfully");
      setCreateOpen(false);
      setEditingCamp(null);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to save campaign");
    },
  });

  const handleSendNow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to dispatch broadcast "${name}" to all targeted recipients immediately?`)) {
      return;
    }
    try {
      const res: any = await sendCampaign({ data: { id } });
      if (res?.ok || res?.success) {
        toast.success(`Campaign "${name}" queued for dispatch!`);
      } else {
        toast.error(res?.error || "Failed to start campaign dispatch");
      }
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      toast.error(err?.message || "Dispatch request failed");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteCamp({ data: { id } });
      toast.success("Campaign deleted");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleTestDispatch = async () => {
    if (!testEmail || !testModalCamp) {
      toast.error("Please enter a test recipient email");
      return;
    }
    setTestSending(true);
    try {
      const res: any = await testSend({
        data: {
          to: testEmail.trim(),
          subject: `[TEST] ${testModalCamp.subject || testModalCamp.name}`,
          html: testModalCamp.html || "<h1>Test Campaign Content</h1>",
        },
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Test email sent to ${testEmail}`);
        setTestModalCamp(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email");
    } finally {
      setTestSending(false);
    }
  };

  const openEdit = (c: any) => {
    setEditingCamp(c);
    setForm({
      name: c.name || "",
      subject: c.subject || "",
      audience_type: c.audience_type || "subscribers",
      template_id: c.template_id || "",
      html: c.html || "",
    });
    setCreateOpen(true);
  };

  const openNew = () => {
    setEditingCamp(null);
    setForm({
      name: "",
      subject: "",
      audience_type: "subscribers",
      template_id: "",
      html: `<div style="padding: 24px; background: #0d0c0e; color: #FAF6EE; font-family: sans-serif;">
  <h1 style="color: #FAF6EE; font-size: 24px; font-weight: 800;">ORIZINO Exclusive Announcement</h1>
  <p style="color: #9E9A92; font-size: 14px; line-height: 1.6;">Explore the newest releases in our luxury signature collection.</p>
</div>`,
    });
    setCreateOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-xs">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-[#FAF6EE]">
                Email Campaigns &amp; Broadcasts
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                {campaigns.length} Broadcasts
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Compose, schedule, and blast marketing newsletters to your customer base powered by Resend.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={openNew}
          className="text-xs h-9 font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </Button>
      </div>

      {/* ── CAMPAIGNS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campLoading && campaigns.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border/60 rounded-2xl bg-card/40 space-y-3">
            <Mail className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-bold text-foreground">No email campaigns created yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first promotional blast to engage subscribers with seasonal drops and exclusive discounts.
            </p>
            <Button size="sm" onClick={openNew} className="rounded-xl mt-2">
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Campaign
            </Button>
          </div>
        ) : (
          campaigns.map((c: any) => {
            const isSent = c.status === "sent";
            const isSending = c.status === "sending";
            const isScheduled = c.status === "scheduled";

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-foreground truncate">{c.name}</h3>
                    <Badge
                      className={`text-[10px] uppercase font-mono ${
                        isSent
                          ? "bg-emerald-500/20 text-emerald-500 border-0"
                          : isSending
                          ? "bg-amber-500/20 text-amber-500 border-0 animate-pulse"
                          : isScheduled
                          ? "bg-sky-500/20 text-sky-400 border-0"
                          : "bg-secondary/60 text-muted-foreground border-0"
                      }`}
                    >
                      {c.status || "draft"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground truncate mb-4">
                    {c.subject || <span className="italic opacity-60">No subject specified</span>}
                  </p>

                  {/* Recipient & Engagement Metrics */}
                  <div className="grid grid-cols-4 gap-1 p-2.5 rounded-xl bg-secondary/20 border border-border/30 text-center mb-4">
                    <div>
                      <div className="text-xs font-bold text-foreground font-mono">{c.total_recipients || 0}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Target</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-500 font-mono">{c.sent_count || 0}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Sent</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-400 font-mono">{c.opened_count || 0}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Open</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-sky-400 font-mono">{c.clicked_count || 0}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Click</div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 shrink-0" />
                    {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : "recently"}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTestModalCamp(c);
                        setTestEmail("");
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Send test email"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(c)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Edit campaign"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleSendNow(c.id, c.name)}
                        className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-lg bg-primary text-primary-foreground"
                        title="Send broadcast now"
                      >
                        <Send className="w-3 h-3" /> Blast
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.id, c.name)}
                      className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Delete campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── CREATE / EDIT CAMPAIGN DIALOG ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> {editingCamp ? "Edit Campaign" : "Compose New Campaign"}
            </DialogTitle>
            <DialogDescription>
              Configure campaign name, subject, target audience, and message content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Campaign Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Autumn Luxury Drop Announcement"
                  className="bg-background/60 text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Audience</Label>
                <Select
                  value={form.audience_type}
                  onValueChange={(v) => setForm({ ...form, audience_type: v })}
                >
                  <SelectTrigger className="bg-background/60 text-sm rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="subscribers">All Active Subscribers</SelectItem>
                    <SelectItem value="customers">All Registered Customers</SelectItem>
                    <SelectItem value="marketing_audience">Marketing Audience Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Subject Line *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Exclusive Preview: The Autumn/Winter Signature Silhouette — ORIZINO"
                className="bg-background/60 text-sm rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email HTML Content</Label>
                {templates.length > 0 && (
                  <Select
                    onValueChange={(tplId) => {
                      const t = templates.find((x: any) => x.id === tplId);
                      if (t?.html) setForm({ ...form, html: t.html, template_id: t.id });
                    }}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-48 rounded-lg bg-secondary/30">
                      <SelectValue placeholder="Import from Template" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Textarea
                value={form.html}
                onChange={(e) => setForm({ ...form, html: e.target.value })}
                rows={8}
                placeholder="<html><body>...</body></html>"
                className="bg-background/60 font-mono text-xs rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveMut.mutate({
                  id: editingCamp?.id,
                  name: form.name.trim() || "Untitled Campaign",
                  subject: form.subject.trim(),
                  audience_type: form.audience_type,
                  template_id: form.template_id || undefined,
                  html: form.html,
                  status: editingCamp?.status || "draft",
                })
              }
              disabled={saveMut.isPending}
              className="rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {saveMut.isPending ? "Saving…" : "Save Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEST DISPATCH MODAL ── */}
      <Dialog open={!!testModalCamp} onOpenChange={(o) => !o && setTestModalCamp(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Send Test Broadcast
            </DialogTitle>
            <DialogDescription>
              Preview how this campaign renders in a real inbox before blasting to all recipients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 text-xs space-y-1">
              <p className="font-semibold text-foreground">Campaign: {testModalCamp?.name}</p>
              <p className="text-muted-foreground">Subject: {testModalCamp?.subject || "(no subject)"}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recipient Email Address</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="staff@orizino.com"
                className="bg-background/60 font-mono text-sm rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="ghost" onClick={() => setTestModalCamp(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleTestDispatch}
              disabled={testSending || !testEmail}
              className="rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {testSending ? "Sending…" : "Dispatch Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
