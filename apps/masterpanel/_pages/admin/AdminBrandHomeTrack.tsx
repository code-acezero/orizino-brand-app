"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Truck, Save, Shield, Phone, MessageSquare, MapPin, Search, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { BrandHomeSubNav } from "@/components/admin/BrandHomeSubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

interface CourierProvider {
  id: string;
  name: string;
  enabled: boolean;
  tracking_url_template: string;
}

interface TrackingStep {
  step_num: number;
  label: string;
  description: string;
}

interface TrackingConfig {
  headline: string;
  subheadline: string;
  search_placeholder: string;
  support_phone: string;
  support_whatsapp: string;
  support_hours: string;
  show_live_courier_badge: boolean;
  show_map_preview: boolean;
  couriers: CourierProvider[];
  steps: TrackingStep[];
}

const DEFAULT_TRACKING: TrackingConfig = {
  headline: "Track Your Orizino Order",
  subheadline: "Real-time logistics status across all 64 districts in Bangladesh.",
  search_placeholder: "Enter Order ID (e.g. OZ-8942) or Phone Number...",
  support_phone: "+880 1700-000000",
  support_whatsapp: "+880 1700-000000",
  support_hours: "10:00 AM – 10:00 PM (Daily)",
  show_live_courier_badge: true,
  show_map_preview: true,
  couriers: [
    { id: "steadfast", name: "Steadfast Courier", enabled: true, tracking_url_template: "https://steadfast.com.bd/t/{tracking_code}" },
    { id: "pathao", name: "Pathao Courier", enabled: true, tracking_url_template: "https://pathao.com/courier/t/{tracking_code}" },
    { id: "redx", name: "RedX Logistics", enabled: true, tracking_url_template: "https://redx.com.bd/track/{tracking_code}" },
    { id: "paperfly", name: "Paperfly", enabled: false, tracking_url_template: "https://paperfly.com.bd/track/{tracking_code}" },
  ],
  steps: [
    { step_num: 1, label: "Order Confirmed", description: "Payment verified & inventory allocated at warehouse." },
    { step_num: 2, label: "Quality Inspection & Packed", description: "Item checked for 240 GSM quality & hand-packed." },
    { step_num: 3, label: "Dispatched to Courier", description: "Handed over to partner hub for regional transport." },
    { step_num: 4, label: "Out for Delivery", description: "Courier agent is en route to your shipping address." },
    { step_num: 5, label: "Delivered", description: "Package successfully received by customer." },
  ],
};

export default function AdminBrandHomeTrack() {
  const qc = useQueryClient();
  const { data: config = DEFAULT_TRACKING, isLoading } = useQuery<TrackingConfig>({
    queryKey: ["brandhome-tracking-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "brandhome_tracking").maybeSingle();
      return (data?.value as unknown as TrackingConfig) || DEFAULT_TRACKING;
    },
  });

  const [draft, setDraft] = useState<TrackingConfig>(DEFAULT_TRACKING);

  React.useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (payload: TrackingConfig) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "brandhome_tracking",
        value: payload as any,
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order Tracking Page configured & saved!");
      qc.invalidateQueries({ queryKey: ["brandhome-tracking-config"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save tracking settings"),
  });

  const toggleCourier = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      couriers: prev.couriers.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> Loading Tracking Settings...
      </div>
    );
  }

  useRegisterUniversalSave(
    {
      id: "brandhome-track",
      label: "Save Tracking Config",
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
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BrandHome Order Tracking Builder</h1>
              <p className="text-xs text-muted-foreground">Configure customer tracking experience, courier links & support details.</p>
            </div>
          </div>
        </div>

        {/* Global Tracking Page Headers */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-500" /> Tracking Hero Banner
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Headline Title</label>
              <Input
                value={draft.headline}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                className="bg-background/80"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Subtitle / Notice</label>
              <Input
                value={draft.subheadline}
                onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })}
                className="bg-background/80"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Input Box Placeholder</label>
            <Input
              value={draft.search_placeholder}
              onChange={(e) => setDraft({ ...draft, search_placeholder: e.target.value })}
              className="bg-background/80"
            />
          </div>
        </div>

        {/* Courier API & Integration Toggles */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-500" /> Supported Logistics Partners
          </h2>
          <p className="text-xs text-muted-foreground">Select active courier integrations for live customer lookup.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {draft.couriers.map((courier) => (
              <div key={courier.id} className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{courier.name}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[220px]">{courier.tracking_url_template}</p>
                </div>
                <Switch
                  checked={courier.enabled}
                  onCheckedChange={() => toggleCourier(courier.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Support & Contact Settings */}
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-500" /> Customer Support Details
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Support Phone</label>
              <Input
                value={draft.support_phone}
                onChange={(e) => setDraft({ ...draft, support_phone: e.target.value })}
                className="bg-background/80"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">WhatsApp Number</label>
              <Input
                value={draft.support_whatsapp}
                onChange={(e) => setDraft({ ...draft, support_whatsapp: e.target.value })}
                className="bg-background/80"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Operating Hours</label>
              <Input
                value={draft.support_hours}
                onChange={(e) => setDraft({ ...draft, support_hours: e.target.value })}
                className="bg-background/80"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
