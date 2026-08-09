"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  Megaphone, TrendingUp, DollarSign, Users, MousePointerClick,
  Copy, Check, Wallet, ArrowUpRight, Award, Clock, ShieldCheck,
  CircleDollarSign, Link2, Share2, Gift, Info, Landmark, CreditCard, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import {
  getAffiliateSettings, getMyAffiliateAccount, getMyAffiliateStats,
  applyForAffiliate, updateMyPayoutMethod, requestPayout,
  listAffiliateProducts, getMyAffiliateLinks, createAffiliateLink,
  deleteAffiliateLink, listAffiliateCreatives,
} from "@/lib/affiliate.functions";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";

// =================== PAYOUT METHODS ===================
// Fixed, professional set of payout methods. Each has structured fields
// so admins receive clean, complete information instead of a freeform string.
type FieldDef = { key: string; label: string; placeholder?: string; type?: string; required?: boolean };
type MethodDef = { id: string; label: string; icon: any; tone: string; fields: FieldDef[] };

const PAYOUT_METHODS: MethodDef[] = [
  {
    id: "bank_account",
    label: "Bank Account",
    icon: Landmark,
    tone: "from-sky-500/15 to-indigo-500/5 text-sky-600",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true },
      { key: "account_number", label: "Account number", required: true },
      { key: "bank_name", label: "Bank name", required: true },
      { key: "branch_name", label: "Branch name" },
      { key: "routing_number", label: "Routing / SWIFT (optional)" },
    ],
  },
  {
    id: "card",
    label: "Card",
    icon: CreditCard,
    tone: "from-violet-500/15 to-fuchsia-500/5 text-violet-600",
    fields: [
      { key: "cardholder_name", label: "Cardholder name", required: true },
      { key: "card_number", label: "Card number", required: true, placeholder: "1234 5678 9012 3456" },
      { key: "card_brand", label: "Brand (Visa, Mastercard, …)" },
    ],
  },
  {
    id: "bkash",
    label: "bKash",
    icon: Smartphone,
    tone: "from-pink-500/15 to-rose-500/5 text-pink-600",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true },
      { key: "mobile_number", label: "bKash number", required: true, placeholder: "01XXXXXXXXX" },
      { key: "account_type", label: "Account type (Personal / Agent)" },
    ],
  },
  {
    id: "nagad",
    label: "Nagad",
    icon: Smartphone,
    tone: "from-orange-500/15 to-amber-500/5 text-orange-600",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true },
      { key: "mobile_number", label: "Nagad number", required: true, placeholder: "01XXXXXXXXX" },
      { key: "account_type", label: "Account type" },
    ],
  },
  {
    id: "upay",
    label: "Upay",
    icon: Smartphone,
    tone: "from-blue-500/15 to-cyan-500/5 text-blue-600",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true },
      { key: "mobile_number", label: "Upay number", required: true, placeholder: "01XXXXXXXXX" },
    ],
  },
  {
    id: "rocket",
    label: "Rocket",
    icon: Smartphone,
    tone: "from-purple-500/15 to-fuchsia-500/5 text-purple-600",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true },
      { key: "mobile_number", label: "Rocket number", required: true, placeholder: "017XXXXXXXX-X" },
    ],
  },
];

const methodLabel = (id?: string | null) =>
  PAYOUT_METHODS.find((m) => m.id === id)?.label ?? (id ?? "—");


const StatCard: React.FC<{ icon: any; label: string; value: string | number; sub?: string; tone?: string }> = ({
  icon: Icon, label, value, sub, tone = "primary",
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="stat-card relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-5">
    <div className={`stat-bg absolute -top-12 -right-12 w-32 h-32 rounded-full bg-${tone}/10 blur-2xl`} />
    <div className="relative">
      <div className={`stat-icon w-10 h-10 rounded-2xl bg-${tone}/15 text-${tone} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="stat-value text-2xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  </motion.div>
);

const AffiliatePage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const getSettings = useServerFn(getAffiliateSettings);
  const getAccount = useServerFn(getMyAffiliateAccount);
  const getStats = useServerFn(getMyAffiliateStats);
  const apply = useServerFn(applyForAffiliate);
  const updatePayout = useServerFn(updateMyPayoutMethod);
  const reqPayout = useServerFn(requestPayout);

  const { data: settings } = useQuery({ queryKey: ["affiliate-settings"], queryFn: () => getSettings() });
  const { data: account } = useQuery({
    queryKey: ["affiliate-account"], queryFn: () => getAccount(), enabled: !!user,
  });
  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats"], queryFn: () => getStats(),
    enabled: !!user && account?.status === "approved",
  });

  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  // PROGRAM DISABLED
  if (!settings) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!settings.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{settings.program_name}</h1>
          <p className="text-muted-foreground">{settings.status_message}</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center rounded-3xl border border-border/60 bg-card/60 p-10">
          <h1 className="text-2xl font-bold mb-2">Sign in to join</h1>
          <p className="text-muted-foreground mb-4">Please sign in to apply for our affiliate program.</p>
          <Button asChild><a href="/auth?next=/affiliate">Sign in</a></Button>
        </div>
      </div>
    );
  }

  // NO ACCOUNT YET → marketing + apply
  if (!account) {
    return (
      <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10">
          <Badge className="mb-3" variant="secondary">{settings.program_name}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent mb-3">
            Earn {settings.commission_rate}% on every referral
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{settings.program_description}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <Award className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">High commissions</h3>
            <p className="text-sm text-muted-foreground">Earn {settings.commission_rate}% on every qualified order from your referrals.</p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <Clock className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">{settings.cookie_days}-day cookie</h3>
            <p className="text-sm text-muted-foreground">Get credit for purchases up to {settings.cookie_days} days after the click.</p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <Wallet className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Fast payouts</h3>
            <p className="text-sm text-muted-foreground">Withdraw once you reach the {settings.min_payout} minimum threshold.</p>
          </div>
        </div>

        <div className="text-center">
          <Button size="lg" onClick={() => setApplyOpen(true)} className="px-8">
            Apply now <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <ApplyDialog
          open={applyOpen} onOpenChange={setApplyOpen}
          payoutMethods={PAYOUT_METHODS}
          onSubmit={async (payload) => {
            try {
              await apply({ data: payload });
              toast.success("Application submitted!");
              qc.invalidateQueries({ queryKey: ["affiliate-account"] });
              setApplyOpen(false);
            } catch (e: any) { toast.error(e.message); }
          }}
        />
      </div>
    );
  }

  // PENDING / REJECTED / SUSPENDED
  if (account.status !== "approved") {
    const statusMap: Record<string, { title: string; desc: string; color: string }> = {
      pending: { title: "Application under review", desc: "We'll notify you once it's approved.", color: "text-amber-500" },
      rejected: { title: "Application not approved", desc: account.rejection_reason || "Please contact support.", color: "text-destructive" },
      suspended: { title: "Account suspended", desc: "Please contact support to reinstate.", color: "text-destructive" },
    };
    const s = statusMap[account.status];
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center rounded-3xl border border-border/60 bg-card/60 p-10">
          <ShieldCheck className={`w-16 h-16 mx-auto mb-4 ${s.color}`} />
          <h1 className="text-2xl font-bold mb-2">{s.title}</h1>
          <p className="text-muted-foreground">{s.desc}</p>
        </div>
      </div>
    );
  }

  // APPROVED DASHBOARD
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${account.code}`;
  const style: "console" | "editorial" | "pulse" = (settings.display_style as any) ?? "console";

  const heroByStyle = {
    console: {
      wrap: "min-h-screen p-4 md:p-8 max-w-7xl mx-auto",
      hero: "mb-6 border border-border rounded-md bg-card p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap",
      title: "text-xl font-semibold uppercase tracking-tight",
      meta: "text-xs text-muted-foreground font-mono uppercase tracking-wider",
    },
    editorial: {
      wrap: "min-h-screen px-6 md:px-12 py-10 max-w-6xl mx-auto",
      hero: "mb-10 border-b border-border pb-8",
      title: "text-5xl md:text-6xl font-serif font-normal tracking-tighter leading-none",
      meta: "text-sm text-muted-foreground mt-3 font-mono",
    },
    pulse: {
      wrap: "min-h-screen p-4 md:p-8 max-w-7xl mx-auto",
      hero: "mb-6 relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8",
      title: "text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent",
      meta: "text-sm text-muted-foreground mt-2",
    },
  }[style];

  return (
    <div className={heroByStyle.wrap} data-affiliate-style={style}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={heroByStyle.hero}>
        {style === "pulse" && <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />}
        <div className="flex items-center justify-between flex-wrap gap-3 relative">
          <div>
            {style === "editorial" && <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">— Affiliate</p>}
            <h1 className={heroByStyle.title}>{style === "editorial" ? "Your earnings, in focus." : "Affiliate Dashboard"}</h1>
            <p className={heroByStyle.meta}>Code: <span className="font-mono font-semibold text-foreground">{account.code}</span> · Tier: <span className="capitalize">{account.tier}</span></p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Active</Badge>
        </div>
      </motion.div>

      {/* Share link */}
      <div className={`rounded-3xl border ${style === "pulse" ? "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent" : style === "editorial" ? "border-border bg-transparent rounded-none border-l-2 border-r-0 border-t-0 border-b-0 pl-4" : "border-border/60 bg-gradient-to-br from-primary/5 to-transparent"} p-5 mb-6`}>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your referral link</Label>
        <div className="flex gap-2 mt-2">
          <Input readOnly value={shareUrl} className="font-mono text-sm" />
          <Button variant="outline" onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true); setTimeout(() => setCopied(false), 1500);
          }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={() => {
            if (navigator.share) navigator.share({ url: shareUrl, title: "Join me" });
            else navigator.clipboard.writeText(shareUrl);
          }}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Available" value={formatPrice(Number(account.available_balance))} sub="Ready to withdraw" />
        <StatCard icon={Clock} label="Pending" value={formatPrice(Number(account.pending_balance))} sub="In payout queue" />
        <StatCard icon={TrendingUp} label="Lifetime earned" value={formatPrice(Number(account.total_earnings))} />
        <StatCard icon={CircleDollarSign} label="Lifetime paid" value={formatPrice(Number(account.lifetime_paid))} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MousePointerClick} label="Clicks" value={account.total_clicks} />
        <StatCard icon={Users} label="Sign-ups" value={account.total_signups} />
        <StatCard icon={Gift} label="Orders" value={account.total_orders} />
        <StatCard icon={Award} label="Rate" value={`${account.custom_rate ?? settings.commission_rate}%`} />
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Button onClick={() => setPayoutOpen(true)} disabled={Number(account.available_balance) < Number(settings.min_payout)}>
          <Wallet className="w-4 h-4 mr-2" /> Request payout
        </Button>
        <Button variant="outline" onClick={() => setMethodOpen(true)}>
          Update payout method
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="links">My Links</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="clicks">Clicks</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductBrowser affiliateCode={account.code} origin={typeof window !== "undefined" ? window.location.origin : ""} onCreated={() => qc.invalidateQueries({ queryKey: ["my-affiliate-links"] })} />
        </TabsContent>
        <TabsContent value="links">
          <MyLinksTab affiliateCode={account.code} origin={typeof window !== "undefined" ? window.location.origin : ""} />
        </TabsContent>
        <TabsContent value="creatives">
          <CreativesTab affiliateCode={account.code} />
        </TabsContent>

        <TabsContent value="commissions">
          <DataTable rows={stats?.commissions ?? []} columns={[
            { label: "Date", get: (r) => new Date(r.created_at).toLocaleDateString() },
            { label: "Order amount", get: (r) => Number(r.order_amount).toFixed(2) },
            { label: "Rate", get: (r) => `${r.commission_rate}%` },
            { label: "Commission", get: (r) => Number(r.commission_amount).toFixed(2) },
            { label: "Status", get: (r) => <Badge variant="secondary">{r.status}</Badge> },
          ]} />
        </TabsContent>
        <TabsContent value="referrals">
          <DataTable rows={stats?.referrals ?? []} columns={[
            { label: "Signed up", get: (r) => new Date(r.signed_up_at).toLocaleDateString() },
            { label: "Orders", get: (r) => r.total_orders ?? 0 },
            { label: "Status", get: (r) => <Badge variant="secondary">{r.status}</Badge> },
          ]} />
        </TabsContent>
        <TabsContent value="clicks">
          <DataTable rows={stats?.clicks ?? []} columns={[
            { label: "When", get: (r) => new Date(r.created_at).toLocaleString() },
            { label: "Device", get: (r) => r.device ?? "—" },
            { label: "Landing", get: (r) => <span className="text-xs truncate max-w-[200px] inline-block">{r.landing_url ?? "—"}</span> },
            { label: "Converted", get: (r) => r.converted ? <Check className="w-4 h-4 text-emerald-500" /> : "—" },
          ]} />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutsList rows={stats?.payouts ?? []} />
        </TabsContent>
      </Tabs>

      <PayoutDialog
        open={payoutOpen} onOpenChange={setPayoutOpen}
        available={Number(account.available_balance)} min={Number(settings.min_payout)} methodLabel={methodLabel(account.payout_method)}
        onSubmit={async (amount) => {
          try {
            await reqPayout({ data: { amount } });
            toast.success("Payout requested");
            qc.invalidateQueries({ queryKey: ["affiliate-account"] });
            qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
            setPayoutOpen(false);
          } catch (e: any) { toast.error(e.message); }
        }}
      />
      <PayoutMethodDialog
        open={methodOpen} onOpenChange={setMethodOpen}
        current={{ method: account.payout_method, details: account.payout_details ?? {} }}
        onSubmit={async (m, d) => {
          try {
            await updatePayout({ data: { payout_method: m, payout_details: d } });
            toast.success("Payout method updated");
            qc.invalidateQueries({ queryKey: ["affiliate-account"] });
            setMethodOpen(false);
          } catch (e: any) { toast.error(e.message); }
        }}
      />
    </div>
  );
};

const DataTable: React.FC<{ rows: any[]; columns: { label: string; get: (r: any) => any }[] }> = ({ rows, columns }) => (
  <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden mt-4">
    {rows.length === 0 ? (
      <div className="p-10 text-center text-muted-foreground text-sm">No data yet</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>{columns.map((c) => <th key={c.label} className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className="border-t border-border/40">
                {columns.map((c) => <td key={c.label} className="p-3">{c.get(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ============ Method picker + fields (shared) ============
const MethodPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {PAYOUT_METHODS.map((m) => {
      const Icon = m.icon;
      const active = value === m.id;
      return (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`relative text-left rounded-2xl border p-3 transition-all ${
            active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border/60 hover:border-border bg-card/40"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.tone} flex items-center justify-center mb-2`}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium">{m.label}</p>
          {active && <Check className="w-4 h-4 absolute top-2 right-2 text-primary" />}
        </button>
      );
    })}
  </div>
);

const MethodFields: React.FC<{ methodId: string; details: Record<string, string>; onChange: (d: Record<string, string>) => void }> = ({ methodId, details, onChange }) => {
  const def = PAYOUT_METHODS.find((m) => m.id === methodId);
  if (!def) return null;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {def.fields.map((f) => (
        <div key={f.key} className={f.key === "card_number" || f.key === "account_number" ? "md:col-span-2" : ""}>
          <Label className="text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
          <Input
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            value={details[f.key] ?? ""}
            onChange={(e) => onChange({ ...details, [f.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

const validateDetails = (methodId: string, details: Record<string, string>) => {
  const def = PAYOUT_METHODS.find((m) => m.id === methodId);
  if (!def) return "Please choose a payout method.";
  for (const f of def.fields) {
    if (f.required && !(details[f.key] ?? "").trim()) return `${f.label} is required.`;
  }
  return null;
};

const ApplyDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  payoutMethods: MethodDef[];
  onSubmit: (p: any) => void;
}> = ({ open, onOpenChange, onSubmit }) => {
  const [method, setMethod] = useState(PAYOUT_METHODS[0].id);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState("");
  const [promo, setPromo] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to the affiliate program</DialogTitle>
          <DialogDescription>Choose how you'd like to receive payouts and tell us about your channels.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Preferred payout method</Label>
            <MethodPicker value={method} onChange={(v) => { setMethod(v); setDetails({}); }} />
          </div>
          <div>
            <Label className="mb-2 block">Payout account details</Label>
            <MethodFields methodId={method} details={details} onChange={setDetails} />
          </div>
          <div>
            <Label>Website / channel URL (optional)</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>How will you promote?</Label>
            <Textarea value={promo} onChange={(e) => setPromo(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Additional notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            const err = validateDetails(method, details);
            if (err) { toast.error(err); return; }
            onSubmit({
              payout_method: method, payout_details: details,
              website_url: website || undefined, promotion_method: promo || undefined,
              application_notes: notes || undefined,
            });
          }}>Submit application</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayoutDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  available: number; min: number; methodLabel: string; onSubmit: (amount: number) => void;
}> = ({ open, onOpenChange, available, min, methodLabel, onSubmit }) => {
  const [amount, setAmount] = useState(String(available));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request payout</DialogTitle>
          <DialogDescription>Available: {available.toFixed(2)} · Minimum: {min.toFixed(2)} · Method: <span className="font-medium text-foreground">{methodLabel}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <span>Your request will be reviewed by our payouts team. You'll receive your funds within <strong className="text-foreground">24–72 working hours</strong> after verification.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(Number(amount))}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayoutMethodDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  current: { method: string | null; details: any };
  onSubmit: (method: string, details: any) => void;
}> = ({ open, onOpenChange, current, onSubmit }) => {
  const [method, setMethod] = useState(current.method ?? PAYOUT_METHODS[0].id);
  const [details, setDetails] = useState<Record<string, string>>(
    (current.details && typeof current.details === "object") ? current.details : {}
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update payout method</DialogTitle>
          <DialogDescription>Choose where you want your earnings sent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <MethodPicker value={method} onChange={(v) => { setMethod(v); setDetails({}); }} />
          <MethodFields methodId={method} details={details} onChange={setDetails} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            const err = validateDetails(method, details);
            if (err) { toast.error(err); return; }
            onSubmit(method, details);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Payouts list (premium) ============
const STATUS_TONE: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const PayoutsList: React.FC<{ rows: any[] }> = ({ rows }) => {
  const { formatPrice } = useCurrency();
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Your request is in safe hands</p>
          <p className="text-muted-foreground mt-0.5">
            All payout requests are reviewed and verified by our finance team. Once verified, your payment is released within <strong className="text-foreground">24–72 working hours</strong>. Thank you for your patience.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-10 text-center text-muted-foreground text-sm">
          No payouts requested yet
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{new Date(p.requested_at).toLocaleString()}</p>
                  <p className="text-xl font-bold mt-1">{formatPrice(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">via <span className="font-medium text-foreground">{methodLabel(p.method)}</span></p>
                </div>
                <Badge variant="outline" className={`capitalize ${STATUS_TONE[p.status] ?? ""}`}>{p.status}</Badge>
              </div>

              {p.txn_reference && (
                <p className="mt-3 text-xs">
                  <span className="text-muted-foreground">Transaction reference: </span>
                  <span className="font-mono font-medium">{p.txn_reference}</span>
                </p>
              )}
              {p.rejection_reason && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <p className="font-medium text-destructive mb-0.5">Reason for rejection</p>
                  <p className="text-muted-foreground">{p.rejection_reason}</p>
                </div>
              )}
              {p.admin_notes && (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                  <p className="font-medium text-primary mb-0.5">Message from our team</p>
                  <p className="text-foreground/90 whitespace-pre-wrap">{p.admin_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ============ Product Browser ============
const ProductBrowser: React.FC<{ affiliateCode: string; origin: string; onCreated: () => void }> = ({ affiliateCode, origin, onCreated }) => {
  const listProducts = useServerFn(listAffiliateProducts);
  const createLink = useServerFn(createAffiliateLink);
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const { data: products, isLoading } = useQuery({
    queryKey: ["affiliate-products", search, featuredOnly],
    queryFn: () => listProducts({ data: { search: search || undefined, featured: featuredOnly || undefined } }),
  });

  const generate = async (p: any) => {
    const target = `${origin}/product/${p.slug}?ref=${affiliateCode}`;
    try {
      await createLink({ data: {
        product_id: p.id, target_url: target, label: p.name,
        utm_source: "affiliate", utm_medium: "link", utm_campaign: affiliateCode,
      }});
      navigator.clipboard.writeText(target);
      toast.success("Link generated & copied!");
      onCreated();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button variant={featuredOnly ? "default" : "outline"} onClick={() => setFeaturedOnly((v) => !v)}>
          <Award className="w-4 h-4 mr-1" /> Featured
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center text-muted-foreground p-10 text-sm">Loading products…</div>
      ) : (products ?? []).length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-10 text-center text-muted-foreground text-sm">No products enrolled yet</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(products ?? []).map((p: any) => {
            const ap = p.affiliate;
            const finalPrice = Number(p.sale_price ?? p.price);
            const bonus = Number(ap?.bonus_amount ?? 0);
            const rate = ap?.override_rate;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted relative">
                  {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                  {ap?.is_featured && <Badge className="absolute top-2 left-2 bg-amber-500/90 text-white border-0">Featured</Badge>}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-medium text-sm line-clamp-2">{p.name}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="font-semibold text-foreground">{finalPrice.toFixed(2)}</span>
                    {rate != null && <Badge variant="secondary">{rate}%</Badge>}
                  </div>
                  {bonus > 0 && <p className="text-[10px] text-emerald-600 mt-1">+{bonus.toFixed(2)} bonus</p>}
                  <Button size="sm" className="mt-3 w-full" onClick={() => generate(p)}>
                    <Link2 className="w-3 h-3 mr-1" /> Generate link
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ My Links ============
const MyLinksTab: React.FC<{ affiliateCode: string; origin: string }> = ({ affiliateCode, origin }) => {
  const qc = useQueryClient();
  const listLinks = useServerFn(getMyAffiliateLinks);
  const delLink = useServerFn(deleteAffiliateLink);
  const createLink = useServerFn(createAffiliateLink);
  const { data: links } = useQuery({ queryKey: ["my-affiliate-links"], queryFn: () => listLinks() });
  const [customUrl, setCustomUrl] = useState("");
  const [label, setLabel] = useState("");
  const [campaign, setCampaign] = useState("");

  const addCustom = async () => {
    if (!customUrl) return;
    try {
      await createLink({ data: {
        target_url: customUrl, label: label || undefined,
        utm_source: "affiliate", utm_medium: "link", utm_campaign: campaign || affiliateCode,
      }});
      toast.success("Link created");
      setCustomUrl(""); setLabel(""); setCampaign("");
      qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card/60 p-5">
        <p className="font-semibold mb-3">Generate custom link</p>
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Target URL (e.g. /shop)" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className="md:col-span-2" />
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="Campaign tag (optional)" value={campaign} onChange={(e) => setCampaign(e.target.value)} className="md:col-span-2" />
          <Button onClick={addCustom}><Link2 className="w-4 h-4 mr-1" /> Create</Button>
        </div>
      </div>

      <DataTable rows={links ?? []} columns={[
        { label: "Label", get: (r) => r.label ?? "—" },
        { label: "Target", get: (r) => <span className="text-xs truncate max-w-[280px] inline-block font-mono">{r.target_url}</span> },
        { label: "Clicks", get: (r) => r.clicks ?? 0 },
        { label: "Conv.", get: (r) => r.conversions ?? 0 },
        { label: "Share URL", get: (r) => (
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(r.target_url); toast.success("Copied"); }}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        ) },
        { label: "", get: (r) => (
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm("Delete link?")) return;
            await delLink({ data: { id: r.id } });
            qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
          }}>Delete</Button>
        ) },
      ]} />
    </div>
  );
};

// ============ Creatives ============
const CreativesTab: React.FC<{ affiliateCode: string }> = ({ affiliateCode }) => {
  const list = useServerFn(listAffiliateCreatives);
  const { data: creatives } = useQuery({ queryKey: ["affiliate-creatives"], queryFn: () => list() });
  return (
    <div className="mt-4">
      {(creatives ?? []).length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-10 text-center text-muted-foreground text-sm">No creatives available yet</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(creatives ?? []).map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
              {c.image_url && <img src={c.image_url} alt={c.title} className="w-full aspect-video object-cover" />}
              <div className="p-4">
                <Badge variant="secondary" className="mb-2 capitalize">{c.type}</Badge>
                <p className="font-semibold">{c.title}</p>
                {c.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{c.content}</p>}
                <div className="flex gap-2 mt-3">
                  {c.content && <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(c.content); toast.success("Copied"); }}><Copy className="w-3 h-3 mr-1" />Text</Button>}
                  {c.image_url && <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(c.image_url); toast.success("Copied"); }}><Copy className="w-3 h-3 mr-1" />Image URL</Button>}
                  {c.target_url && <Button size="sm" onClick={() => {
                    const sep = c.target_url.includes("?") ? "&" : "?";
                    navigator.clipboard.writeText(`${c.target_url}${sep}ref=${affiliateCode}`);
                    toast.success("Tracked URL copied");
                  }}><Link2 className="w-3 h-3 mr-1" />Get link</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffiliatePage;
// code:4ce0
