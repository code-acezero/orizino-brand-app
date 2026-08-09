"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listCustomers, sendPromoNotification, sendInboxMessage, exportCustomers } from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";
import { toast } from "@/lib/app-toast";
import { Download, Send, MessageSquare, AlertTriangle, RefreshCw, Users } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import CustomerDetailDrawer from "@/components/admin/CustomerDetailDrawer";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import DataToolbar from "@/components/admin/DataToolbar";
import { TableSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/admin/TableStates";
import MobileListCard from "@/components/admin/MobileListCard";

export default function AdminCustomers() {
  const fetchList = useServerFn(listCustomers);
  const sendPromo = useServerFn(sendPromoNotification);
  const sendInbox = useServerFn(sendInboxMessage);
  const exportFn = useServerFn(exportCustomers);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composer, setComposer] = useState<{ mode: "promo" | "inbox"; ids: string[] } | null>(null);
  const [drawerCustomer, setDrawerCustomer] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => fetchList({ data: { search: search || undefined, limit: 200, offset: 0 } }),
    retry: false,
  });

  const items = data?.items ?? [];
  const loadError = error as Error | null;

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const promoMut = useMutation({
    mutationFn: () => sendPromo({ data: { customerIds: composer!.ids, title, message: message || undefined, type: "promo" } }),
    onSuccess: () => { toast.success("Promotion sent"); setComposer(null); setTitle(""); setMessage(""); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const inboxMut = useMutation({
    mutationFn: async () => {
      for (const id of composer!.ids) await sendInbox({ data: { customerId: id, content: message } });
    },
    onSuccess: () => { toast.success("Message sent to inbox"); setComposer(null); setMessage(""); qc.invalidateQueries({ queryKey: ["admin-support-conversations"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const doExport = async (format: "csv" | "json" | "vcard") => {
    const ids = selected.size ? Array.from(selected) : undefined;
    const res = await exportFn({ data: { customerIds: ids, format } });
    const blob = new Blob([res.body], { type: res.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = res.filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      <PageHeader
        icon={<Users className="w-5 h-5" />}
        title="Customers"
        description={`${data?.total ?? 0} accounts · staff are tagged inline`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => doExport("csv")}><Download className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={() => doExport("vcard")}>vCard</Button>
            <Button variant="outline" size="sm" onClick={() => doExport("json")}>JSON</Button>
          </>
        }
      />

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Couldn't load customers</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-sm">{loadError.message || "An unexpected error occurred while talking to Supabase."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DataToolbar
        left={<SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or ID…" />}
        right={
          selected.size > 0 ? (
            <>
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button size="sm" onClick={() => setComposer({ mode: "promo", ids: Array.from(selected) })}>
                <Send className="w-4 h-4 mr-1.5" aria-hidden />Promo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setComposer({ mode: "inbox", ids: Array.from(selected) })}>
                <MessageSquare className="w-4 h-4 mr-1.5" aria-hidden />Inbox
              </Button>
            </>
          ) : null
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Orders</th>
              <th className="px-3 py-2 text-left">Lifetime</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-0"><TableSkeleton rows={8} cols={7} /></td></tr>}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Users className="w-5 h-5" />}
                    message="No customers found"
                    hint={search ? "Try a different search term." : "Customers will appear here once they sign up."}
                  />
                </td>
              </tr>
            )}
            {items.map((c: any) => (
              <tr key={c.id} className="border-t border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setDrawerCustomer(c.id)}>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {c.avatar_url ? <img src={c.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium">{(c.full_name || "?").charAt(0).toUpperCase()}</div>}
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {c.full_name || "—"}
                        {(c.roles ?? []).includes("admin") && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">admin</Badge>}
                        {(c.roles ?? []).includes("moderator") && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">mod</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div>{c.email || "—"}</div>
                  <div className="text-muted-foreground">{c.phone || "—"}</div>
                </td>
                <td className="px-3 py-2 font-medium">{c.order_count}</td>
                <td className="px-3 py-2 font-medium">{Number(c.lifetime_spend).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy")}</td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => setComposer({ mode: "promo", ids: [c.id] })}><Send className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setComposer({ mode: "inbox", ids: [c.id] })}><MessageSquare className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {isLoading && <div className="rounded-lg border border-border bg-card p-4"><TableSkeleton rows={6} cols={1} /></div>}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              message="No customers found"
              hint={search ? "Try a different search term." : "Customers will appear here once they sign up."}
            />
          </div>
        )}
        {items.map((c: any) => {
          const roles = c.roles ?? [];
          const leading = c.avatar_url ? (
            <img src={c.avatar_url} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium">
              {(c.full_name || "?").charAt(0).toUpperCase()}
            </div>
          );
          return (
            <MobileListCard
              key={c.id}
              selected={selected.has(c.id)}
              onSelectedChange={() => toggle(c.id)}
              onClick={() => setDrawerCustomer(c.id)}
              selectLabel={`Select ${c.full_name || "customer"}`}
              leading={leading}
              title={c.full_name || "—"}
              badges={
                <>
                  {roles.includes("admin") && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">admin</Badge>}
                  {roles.includes("moderator") && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">mod</Badge>}
                </>
              }
              subtitle={c.email || c.phone || "—"}
              meta={
                <>
                  <span><span className="font-medium text-foreground">{c.order_count}</span> orders</span>
                  <span><span className="font-medium text-foreground">{Number(c.lifetime_spend).toFixed(0)}</span> lifetime</span>
                </>
              }
              actions={
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setComposer({ mode: "promo", ids: [c.id] })}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Promo
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setComposer({ mode: "inbox", ids: [c.id] })}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> Inbox
                  </Button>
                </>
              }
            />
          );
        })}
      </div>


      <Dialog open={!!composer} onOpenChange={(o) => !o && setComposer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send message to {composer?.ids.length} {composer?.ids.length === 1 ? "customer" : "customers"}</DialogTitle>
          </DialogHeader>
          <Tabs value={composer?.mode} onValueChange={(v) => composer && setComposer({ ...composer, mode: v as any })}>
            <TabsList className="w-full">
              <TabsTrigger value="promo"><Send className="w-4 h-4 mr-1.5" />Promo / Notification</TabsTrigger>
              <TabsTrigger value="inbox"><MessageSquare className="w-4 h-4 mr-1.5" />Inbox (opens chat)</TabsTrigger>
            </TabsList>
            <TabsContent value="promo" className="space-y-3">
              <Input placeholder="Title (shown as notification)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <Textarea placeholder="Message…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5} />
              <p className="text-xs text-muted-foreground">Delivered via in-app notification + web push when subscribed.</p>
            </TabsContent>
            <TabsContent value="inbox" className="space-y-3">
              <Textarea placeholder="Write a message — opens the customer's support chat" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} rows={6} />
              <p className="text-xs text-muted-foreground">The customer sees the support chat pop open with your message.</p>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposer(null)}>Cancel</Button>
            <Button
              disabled={(composer?.mode === "promo" ? !title : !message) || promoMut.isPending || inboxMut.isPending}
              onClick={() => composer?.mode === "promo" ? promoMut.mutate() : inboxMut.mutate()}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerDetailDrawer customerId={drawerCustomer} open={!!drawerCustomer} onOpenChange={(o) => !o && setDrawerCustomer(null)} />
    </div>
  );
}
// code:4ce0
