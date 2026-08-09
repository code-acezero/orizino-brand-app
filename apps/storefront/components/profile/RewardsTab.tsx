"use client";
import React from "react";
import { motion } from "framer-motion";
import { Award, Gift, TrendingUp, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLoyaltyTiers, useUserLoyalty, useLoyaltyTransactions, computeTierProgress } from "@/hooks/use-loyalty";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";

const RewardsTab: React.FC = () => {
  const { data: tiers } = useLoyaltyTiers();
  const { data: loyalty } = useUserLoyalty();
  const { data: transactions } = useLoyaltyTransactions(10);
  const { formatPrice } = useCurrency();
  const [copied, setCopied] = React.useState(false);

  const tierInfo = computeTierProgress(loyalty, tiers);

  const copyReferral = async () => {
    if (!loyalty?.referral_code) return;
    await navigator.clipboard.writeText(loyalty.referral_code);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero tier card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: tierInfo
            ? `linear-gradient(135deg, ${tierInfo.current.badge_color}22, transparent 60%)`
            : undefined,
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{ background: tierInfo?.current.badge_color }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-secondary/40">
              <Award className="w-6 h-6" style={{ color: tierInfo?.current.badge_color }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Tier</p>
              <h3 className="text-2xl font-bold font-display">{tierInfo?.current.name || "Bronze"}</h3>
            </div>
            <Badge variant="outline" className="ml-auto">
              {tierInfo?.current.discount_percentage || 0}% off
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-2xl bg-secondary/30">
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-xl font-bold text-primary">{loyalty?.points_balance || 0}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-secondary/30">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-xl font-bold">{loyalty?.total_orders || 0}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-secondary/30">
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="text-xl font-bold">{formatPrice(loyalty?.lifetime_spend || 0)}</p>
            </div>
          </div>

          {tierInfo?.next && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">
                  {formatPrice(tierInfo.remaining)} to <strong className="text-foreground">{tierInfo.next.name}</strong>
                </span>
                <span className="font-mono">{Math.round(tierInfo.progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${tierInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ background: tierInfo.next.badge_color }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Referral */}
      {loyalty?.referral_code && (
        <div className="glass-strong rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-primary" />
            <h4 className="font-semibold">Your Referral Code</h4>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-secondary/30 font-mono text-sm tracking-wider">
              {loyalty.referral_code}
            </code>
            <Button size="icon" variant="outline" onClick={copyReferral}>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with friends — both of you earn 100 points on their first order.
          </p>
        </div>
      )}

      {/* All tiers */}
      <div className="glass-strong rounded-3xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> All Tiers
        </h4>
        <div className="space-y-2">
          {tiers?.map((t) => {
            const isCurrent = t.id === tierInfo?.current.id;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  isCurrent ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/20"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${t.badge_color}33` }}
                >
                  <Award className="w-5 h-5" style={{ color: t.badge_color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(t.min_lifetime_spend)} lifetime · {t.points_multiplier}x points
                  </p>
                </div>
                <Badge variant={isCurrent ? "default" : "outline"}>{t.discount_percentage}%</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass-strong rounded-3xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4" /> Recent Activity
        </h4>
        {!transactions || transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No points activity yet. Place an order to start earning!
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-secondary/20">
                <div>
                  <p className="font-medium">{tx.description || tx.source}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`font-mono font-bold ${tx.points_change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.points_change >= 0 ? "+" : ""}{tx.points_change}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsTab;
// code:4ce0
