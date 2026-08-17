"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  listAutomations,
  upsertAutomation,
  toggleAutomation,
  deleteAutomation,
  sendAutomationTest,
} from "@/lib/email-automations.functions";
import { listTemplates } from "@/lib/email-campaigns.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Pencil,
  Trash2,
  Workflow,
  Clock,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Zap,
  ShoppingBag,
  Truck,
  Layers,
  Flame,
  UserCheck,
  RefreshCw,
  Search,
  Check,
  XCircle,
  RotateCcw,
  Tag,
  Megaphone,
  Filter,
} from "lucide-react";

const EVENTS = [
  { value: "order_confirmed", label: "Order Confirmed & Invoice Issued", icon: ShoppingBag, category: "Orders" },
  { value: "order_shipped", label: "Order Dispatched & Tracking Assigned", icon: Truck, category: "Shipping" },
  { value: "order_delivered", label: "Order Delivered & Feedback Request", icon: CheckCircle2, category: "Fulfillment" },
  { value: "order_placed", label: "New Order Placed (Pending)", icon: ShoppingBag, category: "Orders" },
  { value: "order_cancelled", label: "Order Cancelled Notice", icon: XCircle, category: "Orders" },
  { value: "order_returned", label: "Order Return Initiated", icon: RotateCcw, category: "Orders" },
  { value: "order_refunded", label: "Payment Refund Processed", icon: CheckCircle2, category: "Orders" },
  { value: "welcome_signup", label: "New Customer Welcome & Voucher", icon: UserCheck, category: "Lifecycle" },
  { value: "abandoned_cart", label: "Abandoned Cart Recovery Reminder", icon: ShoppingBag, category: "Lifecycle" },
  { value: "product_published", label: "New Product Collection Drop", icon: Flame, category: "Marketing" },
  { value: "promo_created", label: "Seasonal Promo / Coupon Announced", icon: Tag, category: "Marketing" },
  { value: "offer_created", label: "Special Offer / Flash Deal", icon: Zap, category: "Marketing" },
  { value: "announcement_created", label: "Brand Editorial Announcement", icon: Megaphone, category: "Marketing" },
  { value: "popup_created", label: "Storefront Modal / Banner Event", icon: Megaphone, category: "Marketing" },
  { value: "category_published", label: "New Category Published", icon: Layers, category: "Marketing" },
  { value: "support_request_created", label: "Customer Support Ticket Opened", icon: AlertCircle, category: "Support" },
];

export default function AdminEmailAutomations() {
  const fetchAutos = useServerFn(listAutomations);
  const fetchTpl = useServerFn(listTemplates);
  const saveAuto = useServerFn(upsertAutomation);
  const toggleAuto = useServerFn(toggleAutomation);
  const delAuto = useServerFn(deleteAutomation);
  const testFn = useServerFn(sendAutomationTest);
  const qc = useQueryClient();

  const { data: items = [], isLoading: autoLoading } = useQuery({
    queryKey: ["autos"],
    queryFn: async () => {
      try {
        const res: any = await fetchAutos();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn("fetchAutos fallback to direct client query", err);
      }
      const { data, error } = await supabase
        .from("email_automations")
        .select("*, template:email_templates(id, name, subject)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10_000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      try {
        const res: any = await fetchTpl();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn("fetchTpl fallback to direct client query", err);
      }
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [testingRule, setTestingRule] = useState<any | null>(null);
  const [testEmail, setTestEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const saveMut = useMutation({
    mutationFn: (data: any) => saveAuto({ data }),
    onSuccess: () => {
      toast.success("Automation rule saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["autos"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save automation"),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      if (!testingRule) throw new Error("No rule selected");
      if (!testEmail) throw new Error("Enter a recipient email address");
      return testFn({ data: { automation_id: testingRule.id, to: testEmail.trim() } });
    },
    onSuccess: () => {
      toast.success(`Test event dispatched to ${testEmail}`);
      setTestingRule(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to dispatch test"),
  });

  const openTest = async (rule: any) => {
    setTestingRule(rule);
    if (!testEmail) {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setTestEmail(data.user.email);
    }
  };

  const openNew = () => {
    setEditing({
      name: "New Automation Trigger",
      event: "order_confirmed",
      audience_type: "order_customer",
      delay_minutes: 0,
      is_active: true,
      template_id: templates[0]?.id || "",
    });
  };

  const filteredItems = items.filter((a: any) => {
    const eventConfig = EVENTS.find((e) => e.value === a.event);
    const category = eventConfig?.category?.toLowerCase() || "other";
    const matchesCat = categoryFilter === "all" || category === categoryFilter.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.event?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventConfig?.label?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-xs">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-[#FAF6EE]">
                Automations &amp; Event Triggers
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border-purple-500/20">
                {items.length} Rules
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Live event-driven triggers that dispatch automated transactional notifications and marketing campaigns.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={openNew}
          className="text-xs h-9 font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Create Automation
        </Button>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search automation rules by trigger or name…"
            className="h-9 pl-9 text-xs bg-background/60 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
            <SelectTrigger className="w-44 h-9 text-xs bg-background/50 border-border/60 rounded-xl capitalize font-medium">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{categoryFilter === "all" ? "All Categories" : categoryFilter}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card border-border/60">
              {["all", "orders", "shipping", "fulfillment", "lifecycle", "marketing", "support"].map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs capitalize">
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── AUTOMATIONS GRID ── */}
      {autoLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl border border-border/40 bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border/60 rounded-2xl bg-card/30 space-y-4">
          <Workflow className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="text-base font-bold text-foreground">No automation rules found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {searchQuery ? "No triggers match your search criteria." : "Create an event-driven trigger for order tracking or customer onboarding."}
            </p>
          </div>
          <Button size="sm" onClick={openNew} className="rounded-xl">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Automation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((a: any) => {
            const eventConfig = EVENTS.find((e) => e.value === a.event) || {
              label: a.event,
              icon: Zap,
              category: "Custom",
            };
            const Icon = eventConfig.icon;
            const tplName = a.template?.name || templates.find((t: any) => t.id === a.template_id)?.name || "Assigned Template";

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{a.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Trigger: <span className="text-foreground font-semibold">{eventConfig.label}</span>
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={async (v) => {
                        try {
                          await toggleAuto({ data: { id: a.id, is_active: v } });
                          qc.invalidateQueries({ queryKey: ["autos"] });
                          toast.success(v ? "Automation activated" : "Automation paused");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to update status");
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-secondary/20 border border-border/30 text-xs mb-4">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Template</div>
                      <div className="font-medium text-foreground truncate" title={tplName}>
                        {tplName}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Audience</div>
                      <div className="font-medium text-foreground capitalize truncate">
                        {a.audience_type === "order_customer" ? "Order Customer" : a.audience_type || "Subscribers"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Delay</div>
                      <div className="font-medium text-foreground font-mono">
                        {a.delay_minutes > 0 ? `${a.delay_minutes} min` : "Instant"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <Badge
                    className={`text-[10px] font-mono uppercase ${
                      a.is_active
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-secondary/60 text-muted-foreground border-0"
                    }`}
                  >
                    {a.is_active ? "● Active Trigger" : "Paused"}
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openTest(a)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      title="Test send trigger"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(a)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      title="Edit rule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete automation "${a.name}"?`)) return;
                        await delAuto({ data: { id: a.id } });
                        qc.invalidateQueries({ queryKey: ["autos"] });
                        toast.success("Automation deleted");
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Delete automation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT AUTOMATION DIALOG ── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              {editing?.id ? "Edit Automation Rule" : "Create Automation Trigger"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the event trigger, recipient audience, and template template for automated delivery.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Rule Name</Label>
                <Input
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Order Confirmed Dispatch"
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Event Trigger</Label>
                <Select
                  value={editing.event}
                  onValueChange={(v) => setEditing({ ...editing, event: v })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Select event..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-xl">
                    {EVENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value} className="text-xs">
                        <span className="font-semibold">{e.category}:</span> {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Email Template</Label>
                <Select
                  value={editing.template_id || ""}
                  onValueChange={(v) => setEditing({ ...editing, template_id: v })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Select email template..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-xl">
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} <span className="text-muted-foreground">({t.category || "general"})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Audience</Label>
                  <Select
                    value={editing.audience_type || "subscribers"}
                    onValueChange={(v) => setEditing({ ...editing, audience_type: v })}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="order_customer" className="text-xs">Order Customer</SelectItem>
                      <SelectItem value="subscribers" className="text-xs">Subscribers</SelectItem>
                      <SelectItem value="customers" className="text-xs">Registered Accounts</SelectItem>
                      <SelectItem value="staff_support" className="text-xs">Staff Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Delay (Minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.delay_minutes ?? 0}
                    onChange={(e) => setEditing({ ...editing, delay_minutes: parseInt(e.target.value) || 0 })}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/10">
                <div>
                  <div className="text-xs font-semibold">Active Status</div>
                  <div className="text-[11px] text-muted-foreground">Enable this trigger for incoming events</div>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => saveMut.mutate(editing)}
              disabled={saveMut.isPending || !editing?.name}
              className="rounded-xl text-xs font-semibold"
            >
              {saveMut.isPending ? "Saving…" : "Save Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEST SIMULATION DIALOG ── */}
      <Dialog open={!!testingRule} onOpenChange={(o) => !o && setTestingRule(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Test Simulation Dispatch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send a real test email triggered by <span className="font-semibold text-foreground">{testingRule?.name}</span> with sample payloads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient Email</Label>
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestingRule(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending || !testEmail}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {testMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              {testMut.isPending ? "Sending…" : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
