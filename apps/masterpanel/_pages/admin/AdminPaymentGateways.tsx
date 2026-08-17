"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import {
  CreditCard,
  Smartphone,
  Building2,
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Copy,
  Check,
  Wand2,
  ShieldCheck,
  Globe,
  Wallet,
  Info,
  Upload,
  X,
  RefreshCw,
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import PageHeader from "@/components/admin/PageHeader";
import { testStripeConnection } from "@/lib/stripe.functions";
import { useUniversalSave } from "@/contexts/UniversalSaveContext";

/* ══════════════════════════════════════════════════════════════
   TYPES & DEFAULT VALUES
   ══════════════════════════════════════════════════════════════ */

export interface PersonalAccount {
  enabled: boolean;
  account_type: "Personal" | "Merchant" | "Agent";
  account_number: string;
  account_holder: string;
  qr_code_url: string;
  instructions: string;
}

export interface PaymentConfig {
  mfs_system_enabled: boolean;
  cod_enabled: boolean;
  prepay_cod_delivery_charge?: boolean;
  cod_prepay_instructions?: string;
  gateways_enabled: string[];
  stripe: {
    enabled: boolean;
    publishable_key: string;
    mode: "test" | "live";
    business_name: string;
    bank_name: string;
    bank_account_holder: string;
    bank_account_number: string;
    bank_routing_number: string;
    bank_swift_code: string;
    bank_country: string;
    card_holder: string;
    card_last4: string;
    card_brand: string;
    payout_notes: string;
  };
  sslcommerz: { enabled: boolean; store_id: string; sandbox: boolean };
  bkash_merchant: { enabled: boolean; merchant_number: string };
  nagad_merchant: { enabled: boolean; merchant_number: string };
  personal_bkash: PersonalAccount;
  personal_nagad: PersonalAccount;
  personal_upay: PersonalAccount;
  personal_rocket: PersonalAccount;
}

const DEFAULT_CONFIG: PaymentConfig = {
  mfs_system_enabled: true,
  cod_enabled: true,
  prepay_cod_delivery_charge: false,
  cod_prepay_instructions: "Please send the advance delivery fee to one of our official MFS numbers below, then input your Transaction ID to place your order.",
  gateways_enabled: ["cod"],
  stripe: {
    enabled: false,
    publishable_key: "",
    mode: "test",
    business_name: "",
    bank_name: "",
    bank_account_holder: "",
    bank_account_number: "",
    bank_routing_number: "",
    bank_swift_code: "",
    bank_country: "United States",
    card_holder: "",
    card_last4: "",
    card_brand: "",
    payout_notes: "",
  },
  sslcommerz: { enabled: false, store_id: "", sandbox: true },
  bkash_merchant: { enabled: false, merchant_number: "" },
  nagad_merchant: { enabled: false, merchant_number: "" },
  personal_bkash: {
    enabled: true,
    account_type: "Personal",
    account_number: "",
    account_holder: "",
    qr_code_url: "",
    instructions: "Send money to the bKash number below using Send Money. After payment, enter your Transaction ID.",
  },
  personal_nagad: {
    enabled: true,
    account_type: "Personal",
    account_number: "",
    account_holder: "",
    qr_code_url: "",
    instructions: "Send money to the Nagad number below using Send Money. After payment, enter your Transaction ID.",
  },
  personal_upay: {
    enabled: false,
    account_type: "Personal",
    account_number: "",
    account_holder: "",
    qr_code_url: "",
    instructions: "Send money to the Upay number below. After completing transaction, enter your Transaction ID.",
  },
  personal_rocket: {
    enabled: false,
    account_type: "Personal",
    account_number: "",
    account_holder: "",
    qr_code_url: "",
    instructions: "Send money to the Rocket 12-digit number below. Provide your Transaction ID upon payment.",
  },
};

export const MFS_BRAND_THEMES: Record<
  string,
  {
    name: string;
    brandColor: string;
    rgbColor: string;
    bgGradient: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  bKash: {
    name: "bKash",
    brandColor: "#E2136E",
    rgbColor: "226-19-110",
    bgGradient: "from-[#E2136E]/15 via-[#E2136E]/5 to-transparent",
    badgeBg: "bg-[#E2136E]/10",
    badgeText: "text-[#E2136E]",
    badgeBorder: "border-[#E2136E]/30",
  },
  Nagad: {
    name: "Nagad",
    brandColor: "#EA1D25",
    rgbColor: "234-29-37",
    bgGradient: "from-[#EA1D25]/15 via-[#F7941D]/5 to-transparent",
    badgeBg: "bg-[#EA1D25]/10",
    badgeText: "text-[#EA1D25]",
    badgeBorder: "border-[#EA1D25]/30",
  },
  Rocket: {
    name: "Rocket",
    brandColor: "#8C3494",
    rgbColor: "140-52-148",
    bgGradient: "from-[#8C3494]/15 via-[#8C3494]/5 to-transparent",
    badgeBg: "bg-[#8C3494]/10",
    badgeText: "text-[#8C3494]",
    badgeBorder: "border-[#8C3494]/30",
  },
  Upay: {
    name: "Upay",
    brandColor: "#0B438E",
    rgbColor: "11-67-142",
    bgGradient: "from-[#0B438E]/15 via-[#FFC709]/10 to-transparent",
    badgeBg: "bg-[#0B438E]/10",
    badgeText: "text-[#0B438E] dark:text-[#5B9EF7]",
    badgeBorder: "border-[#0B438E]/30",
  },
};

/* ══════════════════════════════════════════════════════════════
   MFS ACCOUNT CARD WITH PROVIDER-THEMED QR CODE
   ══════════════════════════════════════════════════════════════ */

import { MFSLogo } from "@/components/admin/PaymentLogos";

const MFSAccountCard: React.FC<{
  label: "bKash" | "Nagad" | "Rocket" | "Upay";
  value: PersonalAccount;
  onChange: (val: PersonalAccount) => void;
}> = ({ label, value, onChange }) => {
  const theme = MFS_BRAND_THEMES[label] || MFS_BRAND_THEMES.bKash;
  const [generatingQR, setGeneratingQR] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyNumber = () => {
    if (!value.account_number) return;
    navigator.clipboard.writeText(value.account_number);
    setCopied(true);
    toast.success(`Copied ${label} number`);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleGenerateQR = async () => {
    if (!value.account_number) {
      toast.error(`Please enter a valid ${label} account number first`);
      return;
    }
    setGeneratingQR(true);
    try {
      const cleanNumber = value.account_number.trim();
      // Generate QR code using the exact MFS provider RGB color
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(
        cleanNumber
      )}&color=${theme.rgbColor}&bgcolor=255-255-255&margin=15&format=png`;

      const res = await fetch(qrApiUrl);
      if (!res.ok) throw new Error("Failed to generate QR code from server");
      const blob = await res.blob();
      const fileName = `qr-${label.toLowerCase()}-${Date.now()}.png`;
      const path = `payment-qr/${fileName}`;

      const { data, error } = await supabase.storage.from("banners").upload(path, blob, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });

      if (error) {
        // Fallback to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            onChange({ ...value, qr_code_url: dataUrl });
            toast.success(`${label} Branded (${theme.name}) QR code generated!`);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        const { data: urlData } = supabase.storage.from("banners").getPublicUrl(data.path);
        onChange({ ...value, qr_code_url: urlData.publicUrl });
        toast.success(`${label} Branded (${theme.name}) QR code generated!`);
      }
    } catch (err: any) {
      toast.error(`QR Generation failed: ${err.message}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQR(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `payment-qr/custom-${label.toLowerCase()}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(data.path);
      onChange({ ...value, qr_code_url: urlData.publicUrl });
      toast.success(`${label} QR code uploaded`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingQR(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={`border transition-all duration-200 ${value.enabled ? "border-border/80 shadow-xs" : "opacity-75 border-border/40 bg-card/50"}`}>
      <CardHeader className="p-3.5 border-b border-border/50 bg-secondary/15">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-xs ring-1 ring-border/40 bg-card">
              <MFSLogo method={label} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold text-foreground">{label}</CardTitle>
                <Badge variant={value.enabled ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 h-4 font-semibold">
                  {value.enabled ? `${value.account_type || "Personal"}` : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>

          <Switch
            checked={value.enabled}
            onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
          />
        </div>
      </CardHeader>

      {value.enabled && (
        <CardContent className="p-3.5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Type</Label>
              <Select
                value={value.account_type || "Personal"}
                onValueChange={(val: "Personal" | "Merchant" | "Agent") =>
                  onChange({ ...value, account_type: val })
                }
              >
                <SelectTrigger className="h-7 text-xs rounded-md bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal" className="text-xs">Personal (Send Money)</SelectItem>
                  <SelectItem value="Merchant" className="text-xs">Merchant (Payment)</SelectItem>
                  <SelectItem value="Agent" className="text-xs">Agent (Cash In)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Account Number *</Label>
              <div className="relative">
                <Input
                  value={value.account_number}
                  onChange={(e) => onChange({ ...value, account_number: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="h-7 text-xs font-mono font-bold tracking-wider rounded-md pr-7 bg-background"
                />
                {value.account_number && (
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    title="Copy number"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Holder Name</Label>
              <Input
                value={value.account_holder}
                onChange={(e) => onChange({ ...value, account_holder: e.target.value })}
                placeholder="e.g. Orizino Official"
                className="h-7 text-xs rounded-md bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Branded QR Code Box */}
            <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-secondary/15 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <QrCode className="w-3.5 h-3.5" style={{ color: theme.brandColor }} />
                  <span>Account QR Code</span>
                </Label>

                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${theme.badgeBorder} ${theme.badgeText} ${theme.badgeBg} font-semibold gap-1`}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: theme.brandColor }} />
                  {label} Theme
                </Badge>
              </div>

              {value.qr_code_url ? (
                <div className="flex items-center gap-3 bg-background/60 p-2.5 rounded-xl border border-border/50">
                  {/* Square 1:1 QR Container */}
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-1.5 border-2 shadow-xs shrink-0 flex items-center justify-center relative overflow-hidden"
                    style={{ borderColor: `${theme.brandColor}66` }}
                  >
                    <img
                      src={value.qr_code_url}
                      alt={`${label} QR Code`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* QR Action Controls */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="text-[11px] font-medium text-foreground truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.brandColor }} />
                      <span>{label} Branded QR</span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateQR}
                        disabled={generatingQR || !value.account_number}
                        className="h-6 px-2 text-[10px] rounded-md gap-1 border-border/70 bg-background font-medium hover:bg-muted"
                      >
                        {generatingQR ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-primary" />}
                        <span>Auto-Theme QR</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingQR}
                          className="h-6 px-2 text-[10px] rounded-md gap-1 text-muted-foreground hover:text-foreground font-normal"
                        >
                          {uploadingQR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          <span>Upload Custom</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => onChange({ ...value, qr_code_url: "" })}
                          className="text-[10px] text-destructive hover:underline p-1 ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-2 border-dashed border-border/70 rounded-xl bg-background/50 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-card shadow-2xs border border-border/60">
                    <QrCode className="w-4 h-4" style={{ color: theme.brandColor }} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-foreground">No QR code configured</p>
                    <p className="text-[10px] text-muted-foreground">Generate automatically with {label} theme colors</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateQR}
                      disabled={generatingQR || !value.account_number}
                      className="h-6 px-2 text-[10px] rounded-md gap-1 font-semibold text-white shadow-xs"
                      style={{ backgroundColor: theme.brandColor }}
                    >
                      {generatingQR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      <span>Auto-Generate {label} QR</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQR}
                      className="h-6 px-2 text-[10px] rounded-md gap-1 border-border/70 bg-background"
                    >
                      {uploadingQR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Upload</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden file input for custom uploads */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Instructions</Label>
              <Textarea
                value={value.instructions}
                onChange={(e) => onChange({ ...value, instructions: e.target.value })}
                placeholder="Instructions displayed to customer..."
                rows={4}
                className="text-[11px] rounded-xl bg-background leading-relaxed resize-none h-[116px]"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT: AdminPaymentGateways
   ══════════════════════════════════════════════════════════════ */

const AdminPaymentGateways: React.FC = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [initialForm, setInitialForm] = useState<PaymentConfig>(DEFAULT_CONFIG);

  const { data: config } = useQuery({
    queryKey: ["admin-payment-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "payment_gateways_config")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as any) || {};
    },
  });

  useEffect(() => {
    if (config && typeof config === "object" && Object.keys(config).length > 0) {
      const merged: PaymentConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        stripe: { ...DEFAULT_CONFIG.stripe, ...(config.stripe || {}) },
        sslcommerz: { ...DEFAULT_CONFIG.sslcommerz, ...(config.sslcommerz || {}) },
        bkash_merchant: { ...DEFAULT_CONFIG.bkash_merchant, ...(config.bkash_merchant || {}) },
        nagad_merchant: { ...DEFAULT_CONFIG.nagad_merchant, ...(config.nagad_merchant || {}) },
        personal_bkash: { ...DEFAULT_CONFIG.personal_bkash, ...(config.personal_bkash || {}) },
        personal_nagad: { ...DEFAULT_CONFIG.personal_nagad, ...(config.personal_nagad || {}) },
        personal_upay: { ...DEFAULT_CONFIG.personal_upay, ...(config.personal_upay || {}) },
        personal_rocket: { ...DEFAULT_CONFIG.personal_rocket, ...(config.personal_rocket || {}) },
      };
      setForm(merged);
      setInitialForm(merged);
    }
  }, [config]);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const saveMutation = useMutation({
    mutationFn: async (payloadToSave?: PaymentConfig) => {
      const dataToSave = payloadToSave || form;
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "payment_gateways_config",
          value: dataToSave as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setInitialForm(form);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-config"] });
      queryClient.invalidateQueries({ queryKey: ["payment-gateways-config"] });
      toast.success("Payment settings updated successfully");
    },
    onError: (e: any) => toast.error("Error saving payment settings: " + e.message),
  });

  const { registerSaveAction } = useUniversalSave();

  useEffect(() => {
    if (isDirty) {
      registerSaveAction({
        id: "payment-gateways-config",
        onSave: async () => {
          await saveMutation.mutateAsync(form);
        },
        onReject: () => {
          setForm(initialForm);
          toast.info("Unsaved payment changes discarded");
        },
        isSaving: saveMutation.isPending,
      });
    } else {
      registerSaveAction(null);
    }
    return () => registerSaveAction(null);
  }, [isDirty, form, initialForm, saveMutation.isPending, registerSaveAction]);

  const activeMFSCount = [
    form.personal_bkash.enabled,
    form.personal_nagad.enabled,
    form.personal_upay.enabled,
    form.personal_rocket.enabled,
  ].filter(Boolean).length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-20">
      {/* ── Header ── */}
      <PageHeader
        icon={<CreditCard className="w-5 h-5 text-primary" />}
        title="Payment Methods & Gateways"
        description="Unified configuration for Bangladeshi MFS accounts, Stripe cards, and merchant APIs"
        actions={
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !isDirty}
            className="gap-2 shadow-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{saveMutation.isPending ? "Saving..." : isDirty ? "Save Changes" : "Saved"}</span>
          </Button>
        }
      />

      {/* ── KPI Telemetry Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Mobile Banking (MFS)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-foreground">
                  {form.mfs_system_enabled ? activeMFSCount : 0}
                </span>
                <span className="text-xs text-pink-500 font-medium">
                  {form.mfs_system_enabled ? "methods active" : "system paused"}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
              <Smartphone className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stripe International</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-foreground">
                  {form.stripe.enabled ? form.stripe.mode.toUpperCase() : "Off"}
                </span>
                <span className="text-xs text-blue-500 font-medium">Card Gateway</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Merchant Gateways</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-foreground">
                  {[form.sslcommerz.enabled, form.bkash_merchant.enabled, form.nagad_merchant.enabled].filter(Boolean).length}
                </span>
                <span className="text-xs text-muted-foreground">gateways linked</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Building2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION: CASH ON DELIVERY (COD) & PRE-PAID DELIVERY FEE ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">Cash on Delivery (COD) &amp; Pre-paid Delivery Policy</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">COD Enabled</span>
            <Switch
              checked={form.cod_enabled !== false}
              onCheckedChange={(v) => setForm({ ...form, cod_enabled: v })}
            />
          </div>
        </div>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Require Pre-paid Delivery Charge for COD</span>
                <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                  Anti-RTO Protection
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, customers selecting Cash on Delivery must pre-pay the delivery charge via your active MFS accounts (bKash, Nagad, Rocket, Upay) and provide their Transaction ID before their order can be confirmed.
              </p>
            </div>
            <Switch
              checked={!!form.prepay_cod_delivery_charge}
              onCheckedChange={(v) => setForm({ ...form, prepay_cod_delivery_charge: v })}
            />
          </div>

          {form.prepay_cod_delivery_charge && (
            <div className="pt-2 border-t border-border/40 space-y-2">
              <Label className="text-[11px] font-semibold text-foreground">Customer Advance Payment Instructions (shown on Checkout)</Label>
              <Textarea
                rows={2}
                value={form.cod_prepay_instructions ?? ""}
                onChange={(e) => setForm({ ...form, cod_prepay_instructions: e.target.value })}
                placeholder="Please send the advance delivery fee to one of our official MFS numbers below, then input your Transaction ID to place your order."
                className="text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                The customer will see your active MFS accounts below, the exact calculated delivery charge, and a transaction ID input that unlocks the order placement button.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── SECTION 1: MOBILE BANKING (MFS) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-pink-500" />
            <h2 className="text-sm font-bold text-foreground">Mobile Banking Accounts (MFS)</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">MFS System Active</span>
            <Switch
              checked={form.mfs_system_enabled}
              onCheckedChange={(v) => setForm({ ...form, mfs_system_enabled: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <MFSAccountCard
            label="bKash"
            value={form.personal_bkash}
            onChange={(val) => setForm({ ...form, personal_bkash: val })}
          />
          <MFSAccountCard
            label="Nagad"
            value={form.personal_nagad}
            onChange={(val) => setForm({ ...form, personal_nagad: val })}
          />
          <MFSAccountCard
            label="Rocket"
            value={form.personal_rocket}
            onChange={(val) => setForm({ ...form, personal_rocket: val })}
          />
          <MFSAccountCard
            label="Upay"
            value={form.personal_upay}
            onChange={(val) => setForm({ ...form, personal_upay: val })}
          />
        </div>
      </div>

      {/* ── SECTION 2: ONLINE CARDS (STRIPE) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-foreground">Stripe Card Gateway</h2>
          </div>
          <Switch
            checked={form.stripe.enabled}
            onCheckedChange={(v) => setForm({ ...form, stripe: { ...form.stripe, enabled: v } })}
          />
        </div>

        <Card className={`border transition-all duration-200 ${form.stripe.enabled ? "border-border/80" : "opacity-75 border-border/40"}`}>
          {form.stripe.enabled && (
            <CardContent className="p-4 space-y-4">
              <StripeConnectionPanel />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Mode</Label>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-secondary/20 h-8">
                    <span className="text-xs font-semibold">{form.stripe.mode === "live" ? "Live" : "Test"}</span>
                    <Switch
                      checked={form.stripe.mode === "live"}
                      onCheckedChange={(v) =>
                        setForm({ ...form, stripe: { ...form.stripe, mode: v ? "live" : "test" } })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Publishable Key</Label>
                  <Input
                    value={form.stripe.publishable_key}
                    onChange={(e) =>
                      setForm({ ...form, stripe: { ...form.stripe, publishable_key: e.target.value } })
                    }
                    placeholder={form.stripe.mode === "live" ? "pk_live_..." : "pk_test_..."}
                    className="h-8 font-mono text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Statement Name</Label>
                  <Input
                    value={form.stripe.business_name}
                    onChange={(e) =>
                      setForm({ ...form, stripe: { ...form.stripe, business_name: e.target.value } })
                    }
                    placeholder="e.g. ORIZINO"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Bank Name</Label>
                  <Input
                    value={form.stripe.bank_name}
                    onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_name: e.target.value } })}
                    placeholder="Payoneer / Wise"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Account / IBAN</Label>
                  <Input
                    value={form.stripe.bank_account_number}
                    onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_account_number: e.target.value } })}
                    placeholder="•••• •••• 0000"
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ── SECTION 3: MERCHANT GATEWAYS (SSLCOMMERZ & DIRECT APIS) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-foreground">Merchant APIs & SSLCommerz</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* SSLCommerz */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="p-3.5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">SSLCommerz Gateway</CardTitle>
                  <CardDescription className="text-[10px]">Cards & internet banking aggregation</CardDescription>
                </div>
                <Switch
                  checked={form.sslcommerz.enabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, sslcommerz: { ...form.sslcommerz, enabled: v } })
                  }
                />
              </div>
            </CardHeader>
            {form.sslcommerz.enabled && (
              <CardContent className="p-3.5 space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Store ID</Label>
                  <Input
                    value={form.sslcommerz.store_id}
                    onChange={(e) =>
                      setForm({ ...form, sslcommerz: { ...form.sslcommerz, store_id: e.target.value } })
                    }
                    placeholder="e.g. orizino_live"
                    className="h-7 text-xs font-mono rounded-md"
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-secondary/20">
                  <span className="text-xs">Sandbox / Test Mode</span>
                  <Switch
                    checked={form.sslcommerz.sandbox}
                    onCheckedChange={(v) =>
                      setForm({ ...form, sslcommerz: { ...form.sslcommerz, sandbox: v } })
                    }
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* bKash & Nagad Direct Merchant APIs */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="p-3.5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">Direct Merchant APIs</CardTitle>
                  <CardDescription className="text-[10px]">bKash & Nagad official agreements</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="h-6 text-[10px] rounded px-2">
                  <a href="/system/debug?tab=keys">
                    <KeyRound className="w-3 h-3 mr-1" /> Secrets
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span>bKash Merchant API</span>
                <Switch
                  checked={form.bkash_merchant.enabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, bkash_merchant: { ...form.bkash_merchant, enabled: v } })
                  }
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Nagad Merchant API</span>
                <Switch
                  checked={form.nagad_merchant.enabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, nagad_merchant: { ...form.nagad_merchant, enabled: v } })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentGateways;

/* ══════════════════════════════════════════════════════════════
   STRIPE CONNECTION TESTER PANEL
   ══════════════════════════════════════════════════════════════ */

type StripeTestResult = {
  ok: boolean;
  configured: boolean;
  mode?: string;
  message?: string;
  account_id?: string;
  business_name?: string | null;
  country?: string;
  email?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  default_currency?: string;
};

const StripeConnectionPanel: React.FC = () => {
  const testFn = useServerFn(testStripeConnection);
  const [result, setResult] = useState<StripeTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const r = (await testFn()) as StripeTestResult;
      setResult(r);
      if (r.ok) toast.success(`Connected to Stripe (${r.mode} mode)`);
      else toast.error(r.message || "Stripe test failed");
    } catch (e: any) {
      toast.error(e?.message || "Stripe test failed");
      setResult({ ok: false, configured: false, message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/15 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">API Connection Test</h3>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runTest}
          disabled={loading}
          className="rounded-lg h-6 text-[10px] px-2 border-border/60 bg-background"
        >
          {loading ? <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
          Test Live Ping
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-2.5 text-xs space-y-1 ${
            result.ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            {result.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
            <span>{result.ok ? "Connection Healthy" : "Connection Failed"}</span>
            {result.mode && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">{result.mode}</Badge>}
          </div>
          {result.ok ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-0.5 text-[10px] opacity-90 font-mono">
              <div>Account: {result.business_name || result.account_id}</div>
              <div>Country: {result.country?.toUpperCase()}</div>
              <div>Charges: {result.charges_enabled ? "Enabled" : "Disabled"}</div>
              <div>Payouts: {result.payouts_enabled ? "Enabled" : "Disabled"}</div>
            </div>
          ) : (
            <p className="text-[10px] opacity-90">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
};
