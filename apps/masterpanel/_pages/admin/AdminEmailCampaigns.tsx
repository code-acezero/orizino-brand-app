"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listCampaigns, deleteCampaign, upsertCampaign, sendCampaignNow } from "@/lib/email-campaigns.functions";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Plus, Send, Trash2, Mail, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminEmailCampaigns() {
  const fetch = useServerFn(listCampaigns);
  const create = useServerFn(upsertCampaign);
  const send = useServerFn(sendCampaignNow);
  const del = useServerFn(deleteCampaign);
  const qc = useQueryClient();
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => fetch() });

  const createMut = useMutation({
    mutationFn: () => create({ data: { name: "Untitled campaign", subject: "", html: "<h1>Hello</h1>", audience_type: "subscribers", status: "draft" } }),
    onSuccess: (row: any) => { qc.invalidateQueries({ queryKey: ["campaigns"] }); window.location.href = `/marketing/email-campaigns/${row.id}`; },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Mail className="w-7 h-7" />Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Bulk email blasts powered by Resend</p>
        </div>
        <Button onClick={() => createMut.mutate()}><Plus className="w-4 h-4 mr-1.5" />New campaign</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {campaigns.map((c: any) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/marketing/email-campaigns/${c.id}`} className="font-medium hover:underline truncate">{c.name}</Link>
              <Badge variant={c.status === "sent" ? "default" : c.status === "scheduled" ? "secondary" : c.status === "sending" ? "secondary" : "outline"}>{c.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{c.subject || "(no subject)"}</p>
            <div className="mt-3 grid grid-cols-4 text-center text-xs">
              <div><div className="font-semibold">{c.total_recipients}</div><div className="text-muted-foreground">To</div></div>
              <div><div className="font-semibold">{c.sent_count}</div><div className="text-muted-foreground">Sent</div></div>
              <div><div className="font-semibold">{c.opened_count}</div><div className="text-muted-foreground">Open</div></div>
              <div><div className="font-semibold">{c.clicked_count}</div><div className="text-muted-foreground">Click</div></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.schedule_at ? <><Calendar className="inline w-3 h-3 mr-1" />{formatDistanceToNow(new Date(c.schedule_at), { addSuffix: true })}</> : "—"}</span>
              <div className="flex gap-1">
                {c.status === "draft" && <Button size="sm" variant="ghost" onClick={async () => { await send({ data: { id: c.id } }); toast.success("Sent"); qc.invalidateQueries({ queryKey: ["campaigns"] }); }}><Send className="w-3.5 h-3.5" /></Button>}
                <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["campaigns"] }); } }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-8">No campaigns yet. Click "New campaign" to start.</p>}
      </div>
    </div>
  );
}
// code:4ce0
