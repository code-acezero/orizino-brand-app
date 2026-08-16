"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, Trash2, Edit3, CheckCircle2, Wallet, Smartphone, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

import { BkashLogo, NagadLogo, UpayLogo, RocketLogo } from "@orizino/ui";

interface PaymentMethodRow {
  id: string;
  provider: string;
  account_label: string;
  account_number_masked: string | null;
  is_default: boolean;
}

const PROVIDERS = [
  { id: "bkash", label: "bKash", icon: BkashLogo, color: "text-pink-500", numericOnly: true, minLen: 11, maxLen: 11 },
  { id: "nagad", label: "Nagad", icon: NagadLogo, color: "text-orange-500", numericOnly: true, minLen: 11, maxLen: 11 },
  { id: "upay", label: "Upay", icon: UpayLogo, color: "text-blue-500", numericOnly: true, minLen: 11, maxLen: 11 },
  { id: "rocket", label: "Rocket", icon: RocketLogo, color: "text-purple-500", numericOnly: true, minLen: 11, maxLen: 12 },
  { id: "card", label: "Card", icon: CreditCard, color: "text-primary", numericOnly: true, minLen: 13, maxLen: 19 },
  { id: "bank", label: "Bank Account", icon: Building2, color: "text-emerald-500", numericOnly: true, minLen: 6, maxLen: 20 },
  { id: "wallet", label: "Wallet", icon: Wallet, color: "text-amber-500", numericOnly: false, minLen: 3, maxLen: 64 },
];

const PaymentMethodsTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null);
  const [provider, setProvider] = useState("bkash");
  const [label, setLabel] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data: methods = [] } = useQuery({
    queryKey: ["user_payment_methods", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_payment_methods" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      return (data || []) as unknown as PaymentMethodRow[];
    },
    enabled: !!user,
  });

  const reset = () => {
    setEditing(null);
    setProvider("bkash");
    setLabel("");
    setAccountNumber("");
    setIsDefault(false);
  };

  const openAdd = () => { reset(); setOpen(true); };
  const openEdit = (m: PaymentMethodRow) => {
    setEditing(m);
    setProvider(m.provider);
    setLabel(m.account_label);
    setAccountNumber(m.account_number_masked || "");
    setIsDefault(m.is_default);
    setOpen(true);
  };

  const maskAccount = (val: string) => {
    if (!val) return null;
    const trimmed = val.replace(/\s+/g, "");
    if (trimmed.length <= 4) return trimmed;
    return "•••• " + trimmed.slice(-4);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!label.trim()) { toast({ title: t("payment.labelRequired"), variant: "destructive" }); return; }

    const def = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
    const trimmed = accountNumber.replace(/\s+/g, "");
    if (trimmed) {
      if (def.numericOnly && !/^\d+$/.test(trimmed)) {
        toast({ title: t("payment.numberDigitsOnly"), variant: "destructive" });
        return;
      }
      if (trimmed.length < def.minLen || trimmed.length > def.maxLen) {
        toast({ title: t("payment.numberLength"), description: `${def.label}: ${def.minLen}-${def.maxLen} chars`, variant: "destructive" });
        return;
      }
    } else {
      // require account number for known providers
      toast({ title: t("payment.invalidNumber"), variant: "destructive" });
      return;
    }

    const payload = {
      user_id: user.id,
      provider,
      account_label: label.trim().slice(0, 100),
      account_number_masked: maskAccount(trimmed),
      is_default: isDefault,
    };
    if (isDefault) {
      await supabase.from("user_payment_methods" as any).update({ is_default: false }).eq("user_id", user.id);
    }
    if (editing) {
      const { error } = await supabase.from("user_payment_methods" as any).update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Payment method updated" });
    } else {
      const { error } = await supabase.from("user_payment_methods" as any).insert(payload);
      if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Payment method added" });
    }
    queryClient.invalidateQueries({ queryKey: ["user_payment_methods"] });
    setOpen(false);
    reset();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_payment_methods" as any).delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["user_payment_methods"] });
    toast({ title: "Payment method removed" });
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("user_payment_methods" as any).update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("user_payment_methods" as any).update({ is_default: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["user_payment_methods"] });
    toast({ title: "Default updated" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-display text-foreground">{t("profile.payments")}</h2>
        <Button size="sm" onClick={openAdd} className="rounded-md gap-1.5"><Plus className="w-4 h-4" /> {t("common.add")}</Button>
      </div>

      {methods.length === 0 && (
        <div className="rounded-md border border-border/40 bg-card/60 p-10 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">{t("payment.noMethods")}</p>
          <Button onClick={openAdd} variant="outline" className="rounded-md gap-1.5"><Plus className="w-4 h-4" /> {t("common.add")}</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((m) => {
          const def = PROVIDERS.find((p) => p.id === m.provider) || PROVIDERS[0];
          const Icon = def.icon;
          return (
            <div key={m.id} className={`rounded-md border bg-card/60 p-5 relative transition-all ${m.is_default ? "border-primary/50" : "border-border/40 hover:border-primary/30"}`}>
              {m.is_default && <Badge className="absolute top-3 right-3 text-[10px]">Default</Badge>}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  <Icon className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.account_label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{def.label}</p>
                </div>
              </div>
              {m.account_number_masked && <p className="text-xs text-muted-foreground font-mono">{m.account_number_masked}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="rounded-md text-xs h-8 gap-1"><Edit3 className="w-3 h-3" /> {t("common.edit")}</Button>
                {!m.is_default && <Button size="sm" variant="ghost" onClick={() => handleSetDefault(m.id)} className="rounded-md text-xs h-8 gap-1"><CheckCircle2 className="w-3 h-3" /> Default</Button>}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)} className="rounded-md text-xs h-8 gap-1 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("common.add")} — {t("profile.payments")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("payment.provider")}</Label>
              <Select value={provider} onValueChange={(v) => { setProvider(v); setAccountNumber(""); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("payment.label")}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 100))} maxLength={100} placeholder="e.g. Personal bKash" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              {(() => {
                const def = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
                return (
                  <>
                    <Label>{t("payment.accountNumber")} ({def.minLen}-{def.maxLen} {def.numericOnly ? "digits" : "chars"})</Label>
                    <Input
                      value={accountNumber}
                      inputMode={def.numericOnly ? "numeric" : "text"}
                      maxLength={def.maxLen}
                      onChange={(e) => {
                        let v = e.target.value;
                        if (def.numericOnly) v = v.replace(/\D+/g, "");
                        setAccountNumber(v.slice(0, def.maxLen));
                      }}
                      placeholder={def.numericOnly ? "01XXXXXXXXX" : "account identifier"}
                      className="rounded-xl"
                    />
                    {accountNumber && <p className="text-xs text-muted-foreground">{t("payment.savedAs")}: {maskAccount(accountNumber)}</p>}
                  </>
                );
              })()}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
              <span className="text-sm text-foreground">{t("payment.setDefault")}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
            <Button onClick={handleSave} className="rounded-xl">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PaymentMethodsTab;
// code:4ce0
