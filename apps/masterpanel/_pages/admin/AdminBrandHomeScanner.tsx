"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { QrCode, Save, ShieldCheck, ScanLine, KeyRound, Cpu, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { BrandHomeSubNav } from "@/components/admin/BrandHomeSubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

interface ScannerConfig {
  headline: string;
  subheadline: string;
  authentic_badge_text: string;
  authentic_message: string;
  unverified_message: string;
  enable_nfc_verification: boolean;
  enable_qr_verification: boolean;
  require_batch_match: boolean;
  serial_prefix: string;
}

const DEFAULT_SCANNER: ScannerConfig = {
  headline: "Orizino Authentic Product Scanner",
  subheadline: "Scan the NFC tag or QR code on your garment tag to verify authentic 240 GSM craftsmanship.",
  authentic_badge_text: "100% VERIFIED AUTHENTIC ORIZINO GARMENT",
  authentic_message: "This product is an authentic Orizino creation, manufactured with 240 GSM ring-spun cotton and quality-checked at our Kushtia facility.",
  unverified_message: "Warning: Unable to verify authenticity for this tag code. Please ensure you purchased from official Orizino channels.",
  enable_nfc_verification: true,
  enable_qr_verification: true,
  require_batch_match: true,
  serial_prefix: "OZ-2026-",
};

export default function AdminBrandHomeScanner() {
  const qc = useQueryClient();
  const { data: config = DEFAULT_SCANNER, isLoading } = useQuery<ScannerConfig>({
    queryKey: ["brandhome-scanner-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "brandhome_scanner").maybeSingle();
      return (data?.value as unknown as ScannerConfig) || DEFAULT_SCANNER;
    },
  });

  const [draft, setDraft] = useState<ScannerConfig>(DEFAULT_SCANNER);

  React.useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ScannerConfig) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "brandhome_scanner",
        value: payload as any,
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product Scanner & NFC verification settings saved!");
      qc.invalidateQueries({ queryKey: ["brandhome-scanner-config"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save scanner settings"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading Scanner Settings...
      </div>
    );
  }

  useRegisterUniversalSave(
    {
      id: "brandhome-scanner",
      label: "Save Scanner Settings",
      onSave: () => saveMutation.mutate(draft),
      isSaving: saveMutation.isPending,
    },
    [draft, saveMutation.isPending]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 border-b border-border/50 pb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BrandHome Product Scanner Studio</h1>
              <p className="text-xs text-muted-foreground">Configure NFC chip, QR code & physical garment authentication experience.</p>
            </div>
          </div>
        </div>

        {/* Global Scanner Headers */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-amber-500" /> Scanner Interface Header
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Scanner Title</label>
              <Input
                value={draft.headline}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                className="bg-background/80"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Instructions Subtitle</label>
              <Input
                value={draft.subheadline}
                onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })}
                className="bg-background/80"
              />
            </div>
          </div>
        </div>

        {/* Verification Toggles & Serial Config */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-500" /> Verification Protocols & Rules
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 pt-1">
            <div className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/50">
              <div>
                <h3 className="font-semibold text-xs text-foreground">NFC Tap Scan</h3>
                <p className="text-[11px] text-muted-foreground">Mobile NFC chip detection</p>
              </div>
              <Switch
                checked={draft.enable_nfc_verification}
                onCheckedChange={(checked) => setDraft({ ...draft, enable_nfc_verification: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/50">
              <div>
                <h3 className="font-semibold text-xs text-foreground">QR Camera Scan</h3>
                <p className="text-[11px] text-muted-foreground">Garment tag QR code</p>
              </div>
              <Switch
                checked={draft.enable_qr_verification}
                onCheckedChange={(checked) => setDraft({ ...draft, enable_qr_verification: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/50">
              <div>
                <h3 className="font-semibold text-xs text-foreground">Batch Verification</h3>
                <p className="text-[11px] text-muted-foreground">Match production batch</p>
              </div>
              <Switch
                checked={draft.require_batch_match}
                onCheckedChange={(checked) => setDraft({ ...draft, require_batch_match: checked })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Garment Serial Code Prefix</label>
            <Input
              value={draft.serial_prefix}
              onChange={(e) => setDraft({ ...draft, serial_prefix: e.target.value })}
              className="bg-background/80 max-w-xs font-mono text-xs"
            />
          </div>
        </div>

        {/* Authentic vs Counterfeit Response Messages */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authentication Response Displays
          </h2>

          <div>
            <label className="text-xs font-semibold text-emerald-500 flex items-center gap-1 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Authentic Item Badge Title
            </label>
            <Input
              value={draft.authentic_badge_text}
              onChange={(e) => setDraft({ ...draft, authentic_badge_text: e.target.value })}
              className="bg-background/80 font-bold text-xs text-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-emerald-500 flex items-center gap-1 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Authentic Success Message
            </label>
            <Textarea
              rows={3}
              value={draft.authentic_message}
              onChange={(e) => setDraft({ ...draft, authentic_message: e.target.value })}
              className="bg-background/80 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-amber-500 flex items-center gap-1 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {"Unverified / Counterfeit Warning Message"}
            </label>
            <Textarea
              rows={3}
              value={draft.unverified_message}
              onChange={(e) => setDraft({ ...draft, unverified_message: e.target.value })}
              className="bg-background/80 text-xs"
            />
          </div>
        </div>
      </div>
    );
  }
