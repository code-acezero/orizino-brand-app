"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/app-toast";
import { Home, LayoutGrid, ShoppingCart, Heart, User, Smartphone, Tablet, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { DEFAULT_PERF, type PerfSettings } from "@/hooks/use-perf-settings";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

type NavStyle = "liquid" | "notch" | "pill" | "glow" | "wave";

interface MobileUIConfig {
  nav_style: NavStyle;
}

const NAV_STYLES: { id: NavStyle; name: string; description: string }[] = [
  { id: "liquid", name: "Liquid Ball", description: "Floating ball indicator with liquid morphing animation" },
  { id: "notch", name: "Notch", description: "iOS-inspired notch cutout with expanding labels" },
  { id: "pill", name: "Capsule", description: "Floating pill bar with slide-in labels" },
  { id: "glow", name: "Glow Dock", description: "macOS-style dock with glowing active icon" },
  { id: "wave", name: "Wave", description: "SVG wave cutout with floating active button" },
];

const PREVIEW_ITEMS = [
  { icon: Home, label: "Home" },
  { icon: LayoutGrid, label: "Categories" },
  { icon: ShoppingCart, label: "Cart" },
  { icon: Heart, label: "Wishlist" },
  { icon: User, label: "Profile" },
];

const defaultConfig: MobileUIConfig = { nav_style: "liquid" };

const AdminMobileUI = () => {
  const qc = useQueryClient();
  const [config, setConfig] = useState<MobileUIConfig>(defaultConfig);
  const [previewActive, setPreviewActive] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<"phone" | "tablet">("phone");

  const { data: settings } = useQuery({
    queryKey: ["admin-mobile-ui"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "mobile_ui_config");
      if (data?.[0]) {
        const val = data[0].value;
        return { row: data[0], config: (typeof val === "object" && val !== null ? (val as any).value ?? val : val) as MobileUIConfig };
      }
      return null;
    },
  });

  useEffect(() => {
    if (settings?.config) setConfig({ ...defaultConfig, ...settings.config });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jsonValue = { value: config } as any;
      if (settings?.row) {
        await supabase.from("site_settings").update({ value: jsonValue }).eq("id", settings.row.id);
      } else {
        await supabase.from("site_settings").insert({ key: "mobile_ui_config", value: jsonValue });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mobile-ui"] });
      qc.invalidateQueries({ queryKey: ["mobile-ui-config"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Mobile UI settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Preview renderers ──
  const renderPreviewLiquid = () => (
    <div className="relative bg-card border-t border-border h-[68px]">
      <div className="flex justify-center">
        <div className="flex relative" style={{ width: 280 }}>
          {PREVIEW_ITEMS.map((item, i) => {
            const isActive = i === previewActive;
            return (
              <button key={i} onClick={() => setPreviewActive(i)}
                className="flex flex-col items-center justify-center w-[56px] h-[60px] relative z-10">
                <motion.div animate={isActive ? { y: -24 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                  <item.icon className="w-4 h-4" />
                </motion.div>
                <motion.span animate={{ opacity: isActive ? 1 : 0, y: isActive ? 6 : 12 }}
                  className="text-[8px] font-semibold text-primary absolute bottom-1">{item.label}</motion.span>
              </button>
            );
          })}
          <motion.div
            animate={{ x: previewActive * 56 + 6 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute -top-5 w-[44px] h-[44px] rounded-full bg-primary border-4 border-background"
            style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.5)" }}
          />
        </div>
      </div>
    </div>
  );

  const renderPreviewNotch = () => (
    <div className="flex justify-center py-2">
      <div className="relative bg-card rounded-xl overflow-hidden">
        <div className="flex gap-1 px-3 py-2">
          {PREVIEW_ITEMS.map((item, i) => {
            const isActive = i === previewActive;
            return (
              <button key={i} onClick={() => setPreviewActive(i)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <motion.span initial={false} animate={{ height: isActive ? "auto" : 0, opacity: isActive ? 1 : 0 }}
                  className="text-[9px] font-bold text-primary overflow-hidden">{item.label}</motion.span>
              </button>
            );
          })}
        </div>
        <motion.div
          animate={{ x: previewActive * 64 + 18 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute -top-[2px] w-[50px] h-[20px] bg-background"
          style={{ clipPath: "path('M0,18 L6,18 C14,18 14,6 25,4 C36,6 36,18 44,18 L50,18 Z')" }}
        >
          <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-primary" />
        </motion.div>
      </div>
    </div>
  );

  const renderPreviewPill = () => (
    <div className="flex justify-center px-4 py-2">
      <div className="flex gap-1 bg-card/90 backdrop-blur-md rounded-full px-3 py-2 border border-border/50 shadow-xl">
        {PREVIEW_ITEMS.map((item, i) => {
          const isActive = i === previewActive;
          return (
            <button key={i} onClick={() => setPreviewActive(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <item.icon className="w-4 h-4" />
              {isActive && <motion.span initial={{ width: 0 }} animate={{ width: "auto" }}
                className="text-[9px] font-semibold overflow-hidden whitespace-nowrap">{item.label}</motion.span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderPreviewGlow = () => (
    <div className="bg-card border-t border-border py-2">
      <div className="flex justify-around px-6">
        {PREVIEW_ITEMS.map((item, i) => {
          const isActive = i === previewActive;
          return (
            <button key={i} onClick={() => setPreviewActive(i)} className="flex flex-col items-center gap-1">
              <motion.div animate={isActive ? { scale: 1.3, y: -6 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="relative">
                <item.icon className={`w-5 h-5 transition-all ${isActive ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" : "text-muted-foreground"}`} />
                {isActive && <div className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-pulse" />}
              </motion.div>
              <span className={`text-[8px] font-medium ${isActive ? "text-primary" : "text-muted-foreground/50"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderPreviewWave = () => (
    <div className="relative h-[72px]">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 72" preserveAspectRatio="none">
        <motion.path
          animate={{
            d: `M0,20 L${previewActive * 64 + 8},20 Q${previewActive * 64 + 32},0 ${previewActive * 64 + 32},-12 Q${previewActive * 64 + 32},0 ${previewActive * 64 + 56},20 L320,20 L320,72 L0,72 Z`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.5"
        />
      </svg>
      <div className="absolute inset-0 flex justify-around items-end px-4 pb-2 pt-5">
        {PREVIEW_ITEMS.map((item, i) => {
          const isActive = i === previewActive;
          return (
            <button key={i} onClick={() => setPreviewActive(i)} className="flex flex-col items-center gap-0.5">
              <motion.div animate={isActive ? { y: -20, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className={`flex items-center justify-center ${isActive ? "w-9 h-9 rounded-full bg-primary shadow-lg" : ""}`}>
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </motion.div>
              <span className={`text-[8px] ${isActive ? "text-primary font-semibold" : "text-muted-foreground/50"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const previewMap: Record<NavStyle, () => React.ReactElement> = {
    liquid: renderPreviewLiquid,
    notch: renderPreviewNotch,
    pill: renderPreviewPill,
    glow: renderPreviewGlow,
    wave: renderPreviewWave,
  };

  const deviceWidth = previewDevice === "phone" ? 360 : 768;

  useRegisterUniversalSave(
    {
      id: "mobile-ui",
      label: "Save Mobile UI Settings",
      onSave: () => saveMutation.mutate(),
      isSaving: saveMutation.isPending,
    },
    [config, saveMutation.isPending]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Mobile UI</h1>
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <button onClick={() => setPreviewDevice("phone")}
            className={`p-2 rounded-lg transition-all ${previewDevice === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Smartphone className="w-4 h-4" />
          </button>
          <button onClick={() => setPreviewDevice("tablet")}
            className={`p-2 rounded-lg transition-all ${previewDevice === "tablet" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Tablet className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Navigation Style</CardTitle>
              <CardDescription>Choose how the bottom navigation looks on mobile devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NAV_STYLES.map((style) => (
                  <button key={style.id} onClick={() => setConfig({ ...config, nav_style: style.id })}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      config.nav_style === style.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/30"
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{style.name}</span>
                      {config.nav_style === style.id && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <PerfPanel />
        </div>

        {/* Live Preview */}
        <div className="sticky top-4">
          <Card className="glass overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex justify-center p-4 pb-0">
                <div className="relative rounded-[2rem] border-[3px] border-border bg-background overflow-hidden shadow-2xl"
                  style={{ width: Math.min(deviceWidth, 360), height: 680 }}>
                  {/* Status bar */}
                  <div className="h-10 bg-background flex items-center justify-between px-6">
                    <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-2 rounded-sm bg-muted-foreground/40" />
                      <div className="w-3 h-2 rounded-sm bg-muted-foreground/40" />
                    </div>
                  </div>
                  {/* Content area mockup */}
                  <div className="px-4 space-y-3 flex-1">
                    <div className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-muted/30" />
                      ))}
                    </div>
                    <div className="h-4 w-24 rounded bg-muted/40" />
                    <div className="grid grid-cols-2 gap-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 rounded-xl bg-muted/30" />
                      ))}
                    </div>
                  </div>
                  {/* Bottom nav preview */}
                  <div className="absolute bottom-0 left-0 right-0">
                    {previewMap[config.nav_style]()}
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-muted-foreground py-3">
                Tap nav items to see animation • {NAV_STYLES.find(s => s.id === config.nav_style)?.name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMobileUI;

/** Mobile/Tablet performance toggles — controls 3D, motion, and lightweight rendering. */
const PerfPanel: React.FC = () => {
  const qc = useQueryClient();
  const [perf, setPerf] = useState<PerfSettings>(DEFAULT_PERF);

  const { data } = useQuery({
    queryKey: ["admin-mobile-perf-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "mobile_perf_settings").maybeSingle();
      return (data?.value as any) || null;
    },
  });

  useEffect(() => { if (data) setPerf({ ...DEFAULT_PERF, ...data }); }, [data]);

  const save = useMutation({
    mutationFn: async (updatedPerf: PerfSettings) => {
      const { error } = await supabase.from("site_settings").upsert(
        { key: "mobile_perf_settings", value: updatedPerf as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mobile-perf-settings"] });
      qc.invalidateQueries({ queryKey: ["mobile-perf-settings"] });
      toast.success("Performance settings updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const Row = ({ label, desc, k }: { label: string; desc: string; k: keyof PerfSettings }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={perf[k]}
        onCheckedChange={(v) => {
          const next = { ...perf, [k]: v };
          setPerf(next);
          save.mutate(next);
        }}
      />
    </div>
  );

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Performance & Animations</CardTitle>
        <CardDescription>Reduce motion, disable 3D scenes, and switch to lightweight rendering on mobile/tablet for a smoother native-app feel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile (&lt; 768px)</p>
          <Row label="Reduce motion" desc="Tone down framer-motion transitions" k="reduce_motion_mobile" />
          <Row label="Disable 3D scenes" desc="Skip WebGL/three.js heroes" k="disable_3d_mobile" />
          <Row label="Lightweight mode" desc="Skip cinematic overlays & light beams" k="lightweight_mode_mobile" />
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Tablet className="w-3.5 h-3.5" /> Tablet (768–1023px)</p>
          <Row label="Reduce motion" desc="Tone down framer-motion transitions" k="reduce_motion_tablet" />
          <Row label="Disable 3D scenes" desc="Skip WebGL/three.js heroes" k="disable_3d_tablet" />
          <Row label="Lightweight mode" desc="Skip cinematic overlays & light beams" k="lightweight_mode_tablet" />
        </div>
      </CardContent>
    </Card>
  );
};
// code:4ce0
