"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  Megaphone, TrendingUp, DollarSign, Users, MousePointerClick,
  Copy, Check, Wallet, ArrowUpRight, Award, Clock, ShieldCheck,
  Link2, Share2, Info, Landmark, CreditCard, Smartphone,
  Calculator, Sparkles, QrCode, Download, RefreshCw, CheckCircle2, Shield,
  Layers, Package, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
type FieldDef = { key: string; label: string; placeholder?: string; type?: string; required?: boolean };
type MethodDef = { id: string; label: string; icon: any; color: string; fields: FieldDef[] };

const PAYOUT_METHODS: MethodDef[] = [
  {
    id: "bkash",
    label: "bKash",
    icon: Smartphone,
    color: "#e11d48",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true, placeholder: "e.g. Tanvir Ahmed" },
      { key: "mobile_number", label: "bKash mobile number", required: true, placeholder: "017XXXXXXXX" },
      { key: "account_type", label: "Account type", placeholder: "Personal / Merchant" },
    ],
  },
  {
    id: "nagad",
    label: "Nagad",
    icon: Smartphone,
    color: "#ea580c",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true, placeholder: "e.g. Tanvir Ahmed" },
      { key: "mobile_number", label: "Nagad mobile number", required: true, placeholder: "018XXXXXXXX" },
      { key: "account_type", label: "Account type", placeholder: "Personal" },
    ],
  },
  {
    id: "upay",
    label: "Upay",
    icon: Smartphone,
    color: "#2563eb",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true, placeholder: "e.g. Tanvir Ahmed" },
      { key: "mobile_number", label: "Upay number", required: true, placeholder: "019XXXXXXXX" },
    ],
  },
  {
    id: "rocket",
    label: "Rocket",
    icon: Smartphone,
    color: "#9333ea",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true, placeholder: "e.g. Tanvir Ahmed" },
      { key: "mobile_number", label: "Rocket number (with 12th digit)", required: true, placeholder: "017XXXXXXXX-X" },
    ],
  },
  {
    id: "bank_account",
    label: "Bank Transfer (EFT/NPSB)",
    icon: Landmark,
    color: "#0ea5e9",
    fields: [
      { key: "account_holder", label: "Account holder name", required: true, placeholder: "As per bank records" },
      { key: "account_number", label: "Bank account number", required: true, placeholder: "13-16 digit account number" },
      { key: "bank_name", label: "Bank name", required: true, placeholder: "e.g. BRAC Bank, City Bank" },
      { key: "branch_name", label: "Branch name", placeholder: "e.g. Gulshan Branch" },
      { key: "routing_number", label: "Routing number (9 digits)", placeholder: "Optional 9-digit routing" },
    ],
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    icon: CreditCard,
    color: "#8b5cf6",
    fields: [
      { key: "cardholder_name", label: "Cardholder name", required: true, placeholder: "Name on card" },
      { key: "card_number", label: "Card number (masked)", required: true, placeholder: "1234 56XX XXXX 3456" },
      { key: "card_brand", label: "Card network", placeholder: "Visa / Mastercard" },
    ],
  },
];

const methodLabel = (id?: string | null) =>
  PAYOUT_METHODS.find((m) => m.id === id)?.label ?? (id ?? "—");

const TIER_COLORS: Record<string, { badge: string; border: string; glow: string; text: string }> = {
  bronze: { badge: "bg-amber-700/15 text-amber-500 border-amber-600/30", border: "border-amber-700/30", glow: "rgba(180,83,9,0.1)", text: "text-amber-500" },
  silver: { badge: "bg-slate-300/15 text-slate-300 border-slate-300/30", border: "border-slate-300/30", glow: "rgba(203,213,225,0.1)", text: "text-slate-300" },
  gold: { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", border: "border-yellow-500/30", glow: "rgba(234,179,8,0.2)", text: "text-yellow-400" },
  platinum: { badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30", border: "border-cyan-500/30", glow: "rgba(6,182,212,0.2)", text: "text-cyan-400" },
  diamond: { badge: "bg-purple-500/15 text-purple-300 border-purple-500/30", border: "border-purple-500/30", glow: "rgba(168,85,247,0.2)", text: "text-purple-300" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   STAT METRIC CARD
───────────────────────────────────────────────────────────────────────────── */
const MetricCard: React.FC<{
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}> = ({ icon: Icon, label, value, sub, color = "#3b82f6" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">{label}</span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE EARNINGS SIMULATOR
───────────────────────────────────────────────────────────────────────────── */
function EarningsSimulator({ baseRate }: { baseRate: number }) {
  const { formatPrice } = useCurrency();
  const [traffic, setTraffic] = useState<number>(3000);
  const [conversionRate, setConversionRate] = useState<number>(3.5);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(3500);

  const estimatedOrders = Math.round((traffic * (conversionRate / 100)));
  const estimatedGmv = estimatedOrders * avgOrderValue;
  const estimatedCommission = Math.round((estimatedGmv * (baseRate / 100)));
  const estimatedAnnual = estimatedCommission * 12;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 sm:p-7 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Interactive Earnings Simulator</h3>
            <p className="text-xs text-muted-foreground">Adjust traffic volume and basket size to project your potential earnings</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary self-start sm:self-auto font-mono text-xs px-2.5 py-1">
          {baseRate}% Base Rate
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Slider 1: Traffic */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Monthly Audience Clicks
              </span>
              <span className="font-mono text-foreground font-bold">{traffic.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={200}
              max={50000}
              step={200}
              value={traffic}
              onChange={(e) => setTraffic(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Conversion Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Estimated Conversion Rate
              </span>
              <span className="font-mono text-emerald-400 font-bold">{conversionRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.1}
              value={conversionRate}
              onChange={(e) => setConversionRate(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: Average Order Value */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Average Order Value
              </span>
              <span className="font-mono text-amber-400 font-bold">{formatPrice(avgOrderValue)}</span>
            </div>
            <input
              type="range"
              min={500}
              max={20000}
              step={250}
              value={avgOrderValue}
              onChange={(e) => setAvgOrderValue(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Output card */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Projected Revenue</p>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Monthly Payout</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-primary">{formatPrice(estimatedCommission)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Annual Potential</p>
              <p className="text-lg font-bold text-foreground">{formatPrice(estimatedAnnual)}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between font-mono">
            <span>~{estimatedOrders} orders / mo</span>
            <span>{formatPrice(estimatedGmv)} GMV</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN AFFILIATE PAGE COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export const AffiliatePage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const getSettings = useServerFn(getAffiliateSettings);
  const getAccount = useServerFn(getMyAffiliateAccount);
  const getStats = useServerFn(getMyAffiliateStats);
  const apply = useServerFn(applyForAffiliate);
  const updatePayout = useServerFn(updateMyPayoutMethod);
  const reqPayout = useServerFn(requestPayout);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["affiliate-settings"],
    queryFn: () => getSettings(),
  });
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["affiliate-account"],
    queryFn: () => getAccount(),
    enabled: !!user,
  });
  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats"],
    queryFn: () => getStats(),
    enabled: !!user && account?.status === "approved",
  });

  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // 1. Loading state
  if (settingsLoading || (user && accountLoading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Loading Affiliate Program…</p>
        </div>
      </div>
    );
  }

  // 2. Program Disabled
  if (!settings?.enabled) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-8 space-y-4 shadow-sm"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <Megaphone className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{settings?.program_name || "Affiliate Program"}</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">{settings?.status_message || "The partner affiliate program is currently undergoing maintenance. Please check back soon."}</p>
        </motion.div>
      </div>
    );
  }

  // 3. User not signed in -> Public Landing View
  if (!user) {
    return (
      <div className="w-full pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Official Creator &amp; Ambassador Program
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Turn Your Influence Into Ongoing Referral Revenue
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Earn up to <strong className="text-primary font-bold">{settings.commission_rate}%</strong> commission on qualified customer orders referred through your custom links and digital passes.
          </p>
          <div className="pt-2 flex justify-center">
            <Button size="lg" asChild className="rounded-xl px-7 h-11 text-sm font-bold shadow-sm cursor-pointer">
              <a href="/auth?next=/affiliate">
                Sign In to Join Program <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Generous Commissions</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Earn {settings.commission_rate}% base commission on all catalog pieces with special bonus campaigns.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">{settings.cookie_days}-Day Cookie Window</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every customer that enters through your link is tied to your account for {settings.cookie_days} days.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Direct MFS &amp; Bank Payouts</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Receive your balance directly via bKash, Nagad, Rocket, or direct bank transfer upon reaching {formatPrice(Number(settings.min_payout))}.
            </p>
          </div>
        </div>

        {/* Live Simulator */}
        <EarningsSimulator baseRate={Number(settings.commission_rate)} />
      </div>
    );
  }

  // 4. User signed in but no affiliate account yet -> Application View
  if (!account) {
    return (
      <div className="w-full pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 pt-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            {settings.program_name || "Official Partner Program"}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto">
            Become an Official Brand Partner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {settings.program_description ||
              "Share your personal curated links, earn generous commissions on every sale, and get early access to new releases."}
          </p>
          <div className="pt-2">
            <Button size="lg" onClick={() => setApplyOpen(true)} className="rounded-xl px-7 h-11 text-sm font-bold shadow-sm cursor-pointer">
              Complete Fast Application <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <Award className="w-6 h-6 text-primary mb-1" />
            <h3 className="font-bold text-sm">Competitive Commission</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Earn {settings.commission_rate}% on standard products plus special product bonuses.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <Clock className="w-6 h-6 text-primary mb-1" />
            <h3 className="font-bold text-sm">{settings.cookie_days}-Day Tracking Window</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Keep earning commissions even if customers return to purchase weeks later.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <Wallet className="w-6 h-6 text-primary mb-1" />
            <h3 className="font-bold text-sm">Reliable Payouts</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Fast withdrawal requests to bKash, Nagad, Rocket, or direct Bank transfer.</p>
          </div>
        </div>

        <EarningsSimulator baseRate={Number(settings.commission_rate)} />

        <ApplyDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          payoutMethods={PAYOUT_METHODS}
          onSubmit={async (payload) => {
            try {
              await apply({ data: payload });
              toast.success("Application submitted successfully!");
              qc.invalidateQueries({ queryKey: ["affiliate-account"] });
              setApplyOpen(false);
            } catch (e: any) {
              toast.error(e.message || "Failed to submit application");
            }
          }}
        />
      </div>
    );
  }

  // 5. Account Pending or Suspended
  if (account.status !== "approved") {
    const statusMap: Record<string, { title: string; desc: string; icon: any; color: string }> = {
      pending: {
        title: "Application Under Review",
        desc: "Your affiliate application is currently being reviewed by our partner management team. You will be notified once approved.",
        icon: Clock,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      },
      suspended: {
        title: "Account Suspended",
        desc: "Your affiliate account is currently paused. Please contact partner support for more information.",
        icon: ShieldCheck,
        color: "text-destructive bg-destructive/10 border-destructive/30",
      },
      rejected: {
        title: "Application Not Approved",
        desc: "Your application was not approved at this time. You may reapply in the future.",
        icon: Shield,
        color: "text-destructive bg-destructive/10 border-destructive/30",
      },
    };
    const s = statusMap[account.status] || statusMap.pending;
    const StatusIcon = s.icon;

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-8 space-y-4 shadow-sm"
        >
          <div className={`w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center ${s.color}`}>
            <StatusIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{s.title}</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
        </motion.div>
      </div>
    );
  }

  // 6. APPROVED AFFILIATE DASHBOARD
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/?ref=${account.code}`;
  const tierKey = (account.tier || "bronze").toLowerCase();
  const tierStyle = TIER_COLORS[tierKey] || TIER_COLORS.bronze;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&format=svg`;

  return (
    <div className="w-full pb-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-4">
      {/* Top Banner Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${tierStyle.badge}`}>
              {account.tier || "Bronze"} Partner
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Affiliate Partner Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono font-bold text-foreground">{account.code}</span> · Rate: <span className="font-bold text-primary">{account.custom_rate ?? settings.commission_rate}%</span>
          </p>
        </div>

        {/* Quick Action Payout Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => setPayoutOpen(true)}
            disabled={Number(account.available_balance) < Number(settings.min_payout)}
            className="rounded-xl font-bold h-10 px-4 shadow-xs flex-1 sm:flex-initial cursor-pointer text-xs"
          >
            <Wallet className="w-4 h-4 mr-1.5" /> Request Payout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMethodOpen(true)}
            className="rounded-xl font-semibold h-10 px-4 border-border/70 hover:bg-secondary flex-1 sm:flex-initial cursor-pointer text-xs"
          >
            Payout Settings
          </Button>
        </div>
      </motion.div>

      {/* Main Referral Link & QR Card */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Your Universal Referral Link
            </Label>
            <p className="text-xs text-muted-foreground">
              Share this link across social bios and messages for automatic {settings.cookie_days}-day cookie attribution.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowQrModal(true)}
            className="self-start sm:self-auto rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-secondary cursor-pointer h-8"
          >
            <QrCode className="w-3.5 h-3.5" /> VIP QR Pass
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <Input readOnly value={shareUrl} className="font-mono text-xs h-10 rounded-xl bg-background/80 w-full" />
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                toast.success("Referral link copied!");
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl font-bold gap-1.5 cursor-pointer text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "Orizino", url: shareUrl });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied!");
                }
              }}
              className="h-10 px-3 rounded-xl cursor-pointer"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Financial & Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={DollarSign}
          label="Available"
          value={formatPrice(Number(account.available_balance))}
          sub={`Min. ${formatPrice(Number(settings.min_payout))}`}
          color="#10b981"
        />
        <MetricCard
          icon={Clock}
          label="Pending"
          value={formatPrice(Number(account.pending_balance))}
          sub="Unlocks after delivery"
          color="#f59e0b"
        />
        <MetricCard
          icon={TrendingUp}
          label="Lifetime Earned"
          value={formatPrice(Number(account.total_earnings))}
          sub={`Paid: ${formatPrice(Number(account.lifetime_paid))}`}
          color="#8b5cf6"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Clicks / Traffic"
          value={account.total_clicks?.toLocaleString() ?? 0}
          sub={`${account.total_orders ?? 0} Orders · ${account.total_signups ?? 0} Sign-ups`}
          color="#06b6d4"
        />
      </div>

      {/* Main Tabs Suite */}
      <Tabs defaultValue="products" className="w-full space-y-4">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="inline-flex h-10 items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/60 min-w-max">
            <TabsTrigger value="products" className="rounded-lg text-xs font-bold px-3">Catalog &amp; Links</TabsTrigger>
            <TabsTrigger value="links" className="rounded-lg text-xs font-bold px-3">Campaigns ({stats?.clicks?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="creatives" className="rounded-lg text-xs font-bold px-3">Media Kit</TabsTrigger>
            <TabsTrigger value="commissions" className="rounded-lg text-xs font-bold px-3">Commission Ledger</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg text-xs font-bold px-3">Referrals</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-lg text-xs font-bold px-3">Payouts History</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Products Studio */}
        <TabsContent value="products">
          <ProductBrowser
            affiliateCode={account.code}
            origin={origin}
            onCreated={() => qc.invalidateQueries({ queryKey: ["my-affiliate-links"] })}
          />
        </TabsContent>

        {/* Tab 2: Custom Links */}
        <TabsContent value="links">
          <MyLinksTab affiliateCode={account.code} origin={origin} />
        </TabsContent>

        {/* Tab 3: Creatives & Media Kit */}
        <TabsContent value="creatives">
          <CreativesTab affiliateCode={account.code} />
        </TabsContent>

        {/* Tab 4: Commissions Ledger */}
        <TabsContent value="commissions">
          <DataTable
            rows={stats?.commissions ?? []}
            columns={[
              { label: "Date", get: (r) => new Date(r.created_at).toLocaleDateString() },
              { label: "Order Amount", get: (r) => formatPrice(Number(r.order_amount)) },
              { label: "Rate", get: (r) => `${r.commission_rate}%` },
              { label: "Commission", get: (r) => <span className="font-bold text-emerald-400">{formatPrice(Number(r.commission_amount))}</span> },
              {
                label: "Status",
                get: (r) => (
                  <Badge
                    variant="outline"
                    className={`capitalize font-semibold text-[11px] ${
                      r.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : r.status === "pending"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </Badge>
                ),
              },
            ]}
          />
        </TabsContent>

        {/* Tab 5: Referrals */}
        <TabsContent value="referrals">
          <DataTable
            rows={stats?.referrals ?? []}
            columns={[
              { label: "Joined", get: (r) => new Date(r.signed_up_at || r.created_at).toLocaleDateString() },
              { label: "Orders Placed", get: (r) => r.total_orders ?? 0 },
              {
                label: "Status",
                get: (r) => (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    {r.status || "active"}
                  </Badge>
                ),
              },
            ]}
          />
        </TabsContent>

        {/* Tab 6: Payouts */}
        <TabsContent value="payouts">
          <PayoutsList rows={stats?.payouts ?? []} />
        </TabsContent>
      </Tabs>

      {/* QR Code Pass Dialog */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm text-center rounded-2xl border border-border/80 bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-bold text-base">Your Partner VIP QR Pass</DialogTitle>
            <DialogDescription className="text-xs">
              Show this QR code to customers or print on promotional materials.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-white flex items-center justify-center my-3 mx-auto shadow-sm">
            <img src={qrUrl} alt="Affiliate QR Code" className="w-48 h-48 object-contain" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono font-bold text-foreground">{account.code}</p>
            <Button
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = qrUrl;
                a.download = `orizino-referral-qr-${account.code}.svg`;
                a.click();
                toast.success("QR Pass downloaded!");
              }}
              className="w-full rounded-xl font-bold text-xs gap-1.5"
            >
              <Download className="w-4 h-4" /> Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Request Dialog */}
      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        available={Number(account.available_balance)}
        min={Number(settings.min_payout)}
        methodLabel={methodLabel(account.payout_method)}
        onSubmit={async (amount) => {
          try {
            await reqPayout({ data: { amount } });
            toast.success("Payout request submitted successfully!");
            qc.invalidateQueries({ queryKey: ["affiliate-account"] });
            qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
            setPayoutOpen(false);
          } catch (e: any) {
            toast.error(e.message || "Failed to submit payout request");
          }
        }}
      />

      {/* Payout Method Update Dialog */}
      <PayoutMethodDialog
        open={methodOpen}
        onOpenChange={setMethodOpen}
        current={{ method: account.payout_method, details: account.payout_details ?? {} }}
        onSubmit={async (m, d) => {
          try {
            await updatePayout({ data: { payout_method: m, payout_details: d } });
            toast.success("Payout destination updated successfully!");
            qc.invalidateQueries({ queryKey: ["affiliate-account"] });
            setMethodOpen(false);
          } catch (e: any) {
            toast.error(e.message || "Failed to update payout method");
          }
        }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DATA TABLE HELPER (RESPONSIVE TABLE + MOBILE CARDS)
───────────────────────────────────────────────────────────────────────────── */
const DataTable: React.FC<{ rows: any[]; columns: { label: string; get: (r: any) => any }[] }> = ({ rows, columns }) => (
  <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden">
    {rows.length === 0 ? (
      <div className="p-10 text-center text-muted-foreground text-xs font-medium">
        No records found yet.
      </div>
    ) : (
      <>
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 border-b border-border/50">
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className="text-left p-3.5 font-bold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r, i) => (
                <tr key={r.id ?? i} className="hover:bg-secondary/20 transition-colors">
                  {columns.map((c) => (
                    <td key={c.label} className="p-3.5">
                      {c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-border/40">
          {rows.map((r, i) => (
            <div key={r.id ?? i} className="p-3.5 space-y-2">
              {columns.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-muted-foreground font-medium">{c.label}</span>
                  <div className="text-right">{c.get(r)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   METHOD PICKER & FIELDS
───────────────────────────────────────────────────────────────────────────── */
const MethodPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {PAYOUT_METHODS.map((m) => {
      const Icon = m.icon;
      const active = value === m.id;
      return (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`relative text-left rounded-xl border p-3 transition-all cursor-pointer ${
            active
              ? "border-primary ring-2 ring-primary/20 bg-primary/10 shadow-xs"
              : "border-border/60 hover:border-border/90 bg-card/50"
          }`}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
            style={{ backgroundColor: `${m.color}18`, color: m.color }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-bold text-foreground truncate">{m.label}</p>
          {active && <Check className="w-3.5 h-3.5 absolute top-2.5 right-2.5 text-primary" />}
        </button>
      );
    })}
  </div>
);

const MethodFields: React.FC<{ methodId: string; details: Record<string, string>; onChange: (d: Record<string, string>) => void }> = ({
  methodId,
  details,
  onChange,
}) => {
  const def = PAYOUT_METHODS.find((m) => m.id === methodId);
  if (!def) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      {def.fields.map((f) => (
        <div key={f.key} className={f.key === "account_number" || f.key === "card_number" ? "sm:col-span-2 space-y-1" : "space-y-1"}>
          <Label className="text-xs font-semibold">
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            value={details[f.key] ?? ""}
            onChange={(e) => onChange({ ...details, [f.key]: e.target.value })}
            className="h-10 text-xs rounded-xl"
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

/* ─────────────────────────────────────────────────────────────────────────────
   APPLY DIALOG
───────────────────────────────────────────────────────────────────────────── */
const ApplyDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payoutMethods: MethodDef[];
  onSubmit: (p: any) => void;
}> = ({ open, onOpenChange, onSubmit }) => {
  const [method, setMethod] = useState(PAYOUT_METHODS[0].id);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState("");
  const [promo, setPromo] = useState("");
  const [notes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-bold text-base sm:text-lg">Apply to the Ambassador Program</DialogTitle>
          <DialogDescription className="text-xs">
            Set up your preferred payout route and tell us how you plan to promote.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold mb-2 block">Preferred Payout Route</Label>
            <MethodPicker value={method} onChange={(v) => { setMethod(v); setDetails({}); }} />
          </div>
          <div>
            <MethodFields methodId={method} details={details} onChange={setDetails} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Social Channel / Website URL (optional)</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://instagram.com/..." className="h-10 text-xs rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Promotion Strategy</Label>
            <Textarea value={promo} onChange={(e) => setPromo(e.target.value)} rows={2} placeholder="e.g. Fashion stories, haul videos, lifestyle blog..." className="text-xs rounded-xl" />
          </div>
        </div>
        <DialogFooter className="pt-3 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const err = validateDetails(method, details);
              if (err) { toast.error(err); return; }
              onSubmit({
                payout_method: method,
                payout_details: details,
                website_url: website || undefined,
                promotion_method: promo || undefined,
                application_notes: notes || undefined,
              });
            }}
            className="rounded-xl text-xs font-bold h-10"
          >
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PAYOUT REQUEST DIALOG
───────────────────────────────────────────────────────────────────────────── */
const PayoutDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: number;
  min: number;
  methodLabel: string;
  onSubmit: (amount: number) => void;
}> = ({ open, onOpenChange, available, min, methodLabel, onSubmit }) => {
  const { formatPrice } = useCurrency();
  const [amount, setAmount] = useState(String(available));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-base sm:text-lg">Request Balance Withdrawal</DialogTitle>
          <DialogDescription className="text-xs">
            Available: {formatPrice(available)} · Minimum: {formatPrice(min)} · Destination: <strong className="text-foreground">{methodLabel}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Withdrawal Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 text-sm font-mono rounded-xl" />
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              Your withdrawal request is verified and processed to your chosen account within <strong className="text-foreground">24–72 business hours</strong>.
            </p>
          </div>
        </div>
        <DialogFooter className="pt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10">
            Cancel
          </Button>
          <Button onClick={() => onSubmit(Number(amount))} className="rounded-xl text-xs font-bold h-10">
            Confirm Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PAYOUT METHOD DIALOG
───────────────────────────────────────────────────────────────────────────── */
const PayoutMethodDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: { method: string | null; details: any };
  onSubmit: (method: string, details: any) => void;
}> = ({ open, onOpenChange, current, onSubmit }) => {
  const [method, setMethod] = useState(current.method ?? PAYOUT_METHODS[0].id);
  const [details, setDetails] = useState<Record<string, string>>(
    current.details && typeof current.details === "object" ? current.details : {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-bold text-base sm:text-lg">Update Payout Destination</DialogTitle>
          <DialogDescription className="text-xs">
            Choose where your verified commissions should be transferred.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <MethodPicker value={method} onChange={(v) => { setMethod(v); setDetails({}); }} />
          <MethodFields methodId={method} details={details} onChange={setDetails} />
        </div>
        <DialogFooter className="pt-3 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const err = validateDetails(method, details);
              if (err) { toast.error(err); return; }
              onSubmit(method, details);
            }}
            className="rounded-xl text-xs font-bold h-10"
          >
            Save Method
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PAYOUTS HISTORY
───────────────────────────────────────────────────────────────────────────── */
const STATUS_TONE: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const PayoutsList: React.FC<{ rows: any[] }> = ({ rows }) => {
  const { formatPrice } = useCurrency();
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/60 p-10 text-center text-muted-foreground text-xs">
          No payout requests made yet.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/70 bg-card/60 p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[11px] font-mono text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{formatPrice(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">via <span className="font-semibold text-foreground">{methodLabel(p.method)}</span></p>
                </div>
                <Badge variant="outline" className={`capitalize font-bold text-[11px] ${STATUS_TONE[p.status] ?? ""}`}>
                  {p.status}
                </Badge>
              </div>
              {p.txn_reference && (
                <p className="text-xs font-mono bg-secondary/50 p-2 rounded-lg text-muted-foreground">
                  Reference: <span className="text-foreground font-semibold">{p.txn_reference}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT CATALOG BROWSER & DEEP LINK STUDIO
───────────────────────────────────────────────────────────────────────────── */
const ProductBrowser: React.FC<{ affiliateCode: string; origin: string; onCreated: () => void }> = ({
  affiliateCode,
  origin,
  onCreated,
}) => {
  const { formatPrice } = useCurrency();
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
      await createLink({
        data: {
          product_id: p.id,
          target_url: target,
          label: p.name,
          utm_source: "affiliate",
          utm_medium: "product_link",
          utm_campaign: affiliateCode,
        },
      });
      navigator.clipboard.writeText(target);
      toast.success("Product referral link copied!");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate link");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search catalog products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-10 text-xs rounded-xl"
        />
        <Button
          variant={featuredOnly ? "default" : "outline"}
          onClick={() => setFeaturedOnly((v) => !v)}
          className="h-10 text-xs rounded-xl font-semibold cursor-pointer"
        >
          <Award className="w-3.5 h-3.5 mr-1" /> Featured Picks
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground p-10 text-xs">Loading pieces…</div>
      ) : (products ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/60 p-10 text-center text-muted-foreground text-xs">
          No products enrolled for affiliate tracking yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {(products ?? []).map((p: any) => {
            const ap = p.affiliate;
            const finalPrice = Number(p.sale_price ?? p.price);
            const rate = ap?.override_rate;

            return (
              <div
                key={p.id}
                className="rounded-xl border border-border/70 bg-card/60 overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="aspect-square bg-secondary/40 relative overflow-hidden">
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  {ap?.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-black font-bold text-[9px] border-0 px-1.5 py-0.5">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
                  <div>
                    <p className="font-semibold text-xs text-foreground line-clamp-1">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-xs text-foreground">{formatPrice(finalPrice)}</span>
                      {rate != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {rate}% Rate
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => generate(p)} className="w-full rounded-lg text-xs font-semibold gap-1 cursor-pointer h-8">
                    <Link2 className="w-3.5 h-3.5" /> Deep Link
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM LINKS & CAMPAIGNS
───────────────────────────────────────────────────────────────────────────── */
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
      await createLink({
        data: {
          target_url: customUrl,
          label: label || undefined,
          utm_source: "affiliate",
          utm_medium: "custom_link",
          utm_campaign: campaign || affiliateCode,
        },
      });
      toast.success("Campaign link generated!");
      setCustomUrl("");
      setLabel("");
      setCampaign("");
      qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to create link");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 space-y-3">
        <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Generate Custom Campaign Link</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="Target page URL (e.g. /shop)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="sm:col-span-2 h-10 text-xs rounded-xl"
          />
          <Input
            placeholder="Campaign tag (e.g. Instagram Bio)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-10 text-xs rounded-xl"
          />
          <Button onClick={addCustom} className="sm:col-span-3 h-10 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
            <Link2 className="w-4 h-4" /> Create Campaign Link
          </Button>
        </div>
      </div>

      <DataTable
        rows={links ?? []}
        columns={[
          { label: "Campaign", get: (r) => <span className="font-medium text-foreground">{r.label ?? "Direct Link"}</span> },
          {
            label: "Target Link",
            get: (r) => <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] inline-block">{r.target_url}</span>,
          },
          { label: "Clicks", get: (r) => r.clicks ?? 0 },
          { label: "Orders", get: (r) => r.conversions ?? 0 },
          {
            label: "Actions",
            get: (r) => (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(r.target_url);
                    toast.success("Link copied!");
                  }}
                  className="rounded-lg text-xs h-7 px-2.5 font-semibold cursor-pointer"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await delLink({ data: { id: r.id } });
                    qc.invalidateQueries({ queryKey: ["my-affiliate-links"] });
                  }}
                  className="text-destructive hover:bg-destructive/10 rounded-lg text-xs h-7 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MARKETING CREATIVES KIT
───────────────────────────────────────────────────────────────────────────── */
const CreativesTab: React.FC<{ affiliateCode: string }> = ({ affiliateCode }) => {
  const list = useServerFn(listAffiliateCreatives);
  const { data: creatives } = useQuery({ queryKey: ["affiliate-creatives"], queryFn: () => list() });

  return (
    <div className="space-y-4">
      {(creatives ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/60 p-10 text-center text-muted-foreground text-xs">
          Marketing creatives will be uploaded here by the brand team.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(creatives ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border/70 bg-card/60 overflow-hidden space-y-3 p-3.5">
              {c.image_url && <img src={c.image_url} alt={c.title} className="w-full aspect-video rounded-lg object-cover" />}
              <div>
                <Badge variant="outline" className="capitalize text-[10px] font-bold mb-1">
                  {c.type}
                </Badge>
                <p className="font-bold text-xs text-foreground">{c.title}</p>
                {c.content && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.content}</p>}
              </div>
              <div className="flex gap-2">
                {c.content && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(c.content);
                      toast.success("Copy template copied!");
                    }}
                    className="rounded-lg text-xs flex-1 h-8"
                  >
                    Copy Copywriting
                  </Button>
                )}
                {c.image_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(c.image_url);
                      toast.success("Asset URL copied!");
                    }}
                    className="rounded-lg text-xs h-8"
                  >
                    Copy Image
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffiliatePage;
