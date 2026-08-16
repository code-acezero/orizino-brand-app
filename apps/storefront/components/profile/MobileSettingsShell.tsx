"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, Bell, Shield, Globe, ChevronRight, ChevronLeft,
  Moon, Sun, Mail, Volume2, VolumeX, BellRing, Package, Tag, Megaphone,
  TrendingUp, ShoppingBag, Lock, Smartphone, Monitor, AlertTriangle,
  Trash2, Languages, Coins, Download, FileText, HelpCircle, MessageSquare, Info, X,
  Type, Zap, Contrast, Maximize2, Vibrate, PlayCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type SectionId = "appearance" | "notifications" | "security" | "general";

const SECTIONS: { id: SectionId; label: string; icon: any; desc: string }[] = [
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & display" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alerts & sounds" },
  { id: "security", label: "Security", icon: Shield, desc: "Password & access" },
  { id: "general", label: "General", icon: Globe, desc: "Language, data, support" },
];

const NativeToggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`w-[46px] h-[28px] rounded-full transition-colors relative flex-shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
    aria-pressed={checked}
  >
    <div className={`absolute top-[2px] w-6 h-6 rounded-full bg-background shadow-md transition-transform ${checked ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
  </button>
);

const Row: React.FC<{
  icon?: React.ReactNode; label: string; desc?: string;
  right?: React.ReactNode; onClick?: () => void; destructive?: boolean;
}> = ({ icon, label, desc, right, onClick, destructive }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className="w-full flex items-center gap-3 px-3.5 py-3 active:bg-secondary text-left transition-colors disabled:cursor-default"
  >
    {icon && (
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${destructive ? "bg-destructive/10" : "bg-primary/10"}`}>
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className={`text-[15px] font-medium truncate ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
      {desc && <p className="text-[12px] text-muted-foreground truncate">{desc}</p>}
    </div>
    {right}
  </button>
);

interface Props {
  user: any;
  mode: "dark" | "light" | "system";
  toggleMode?: () => void;
  selectMode?: (m: "dark" | "light" | "system") => void;
  notifPrefs: any;
  updateNotifPref: (k: any) => void;
  pushSubscribed: boolean;
  pushBusy: boolean;
  pushLastUsed: string | null;
  togglePushSubscription: () => void;
  soundStyle: any;
  changeSoundStyle: (s: any) => void;
  soundVolume: number;
  changeSoundVolume: (v: number) => void;
  previewSound: () => void;
  language: string;
  setLang: (l: any) => void;
  ALL_LANGUAGES: any[];
  currency: string;
  setCurrency: (c: any) => void;
  enabledCurrencies: any[];
  setChangePasswordOpen: (v: boolean) => void;
  setDeleteAccountOpen: (v: boolean) => void;
  displayPrefs: {
    compact: boolean; reduceMotion: boolean; highContrast: boolean;
    largerText: boolean; haptics: boolean; autoplay: boolean;
  };
  updateDisplayPref: (k: "compact" | "reduceMotion" | "highContrast" | "largerText" | "haptics" | "autoplay") => void;
  t: (k: string) => string;
  openTwoFactor?: () => void;
  openSessions?: () => void;
  exportData?: () => void;
  exporting?: boolean;
  openPrivacy?: () => void;
  openHelp?: () => void;
  openSupport?: () => void;
}

const MobileSettingsShell: React.FC<Props> = (p) => {
  const [section, setSection] = React.useState<SectionId | null>(null);
  const activeSection = section ? SECTIONS.find((s) => s.id === section) : null;

  return (
    <div className="min-h-screen pb-24 relative bg-background">
      <header className="sticky top-0 z-[55] backdrop-blur-xl bg-background/85 border-b border-border/40">
        <div className="flex items-center justify-between px-2 h-14">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/profile"))}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 active:bg-secondary transition-transform"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[17px] font-semibold font-display text-foreground">
            {p.t("nav.settings") || "Settings"}
          </h1>
          <div className="w-9 h-9" />
        </div>
      </header>

      <main className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        <p className="text-[13px] text-muted-foreground px-1">
          Manage preferences, security and notifications
        </p>

        <section>
          <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
            {SECTIONS.map((s) => (
              <Row
                key={s.id}
                icon={<s.icon className="w-4 h-4 text-primary" />}
                label={s.label}
                desc={s.desc}
                onClick={() => setSection(s.id)}
                right={<ChevronRight className="w-4 h-4 text-muted-foreground" />}
              />
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-2">App version 2.0.0</p>
      </main>

      <AnimatePresence>
        {section && activeSection && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-0 z-[60] bg-background flex flex-col"
          >
            <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
              <div className="relative flex items-center justify-between px-2 h-14">
                <button
                  onClick={() => setSection(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/60 active:scale-95 transition-transform"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <h2 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-foreground">
                  {activeSection.label}
                </h2>
                <button
                  onClick={() => setSection(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/60 active:scale-95 transition-transform"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 max-w-2xl mx-auto w-full space-y-5">
              {section === "appearance" && (
                <>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Theme & Mode</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => p.selectMode ? p.selectMode("system") : p.toggleMode?.()}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            p.mode === "system"
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                              : "border-border/40 text-foreground/80 hover:bg-secondary/60"
                          }`}
                        >
                          <Monitor className="w-4 h-4 mb-1 text-primary" />
                          <span className="text-xs font-semibold">Auto</span>
                          <span className="text-[9px] text-muted-foreground">Device</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => p.selectMode ? p.selectMode("light") : p.toggleMode?.()}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            p.mode === "light"
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                              : "border-border/40 text-foreground/80 hover:bg-secondary/60"
                          }`}
                        >
                          <Sun className="w-4 h-4 mb-1 text-primary" />
                          <span className="text-xs font-semibold">Light</span>
                          <span className="text-[9px] text-muted-foreground">Day</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => p.selectMode ? p.selectMode("dark") : p.toggleMode?.()}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            p.mode === "dark"
                              ? "border-primary bg-primary/15 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                              : "border-border/40 text-foreground/80 hover:bg-secondary/60"
                          }`}
                        >
                          <Moon className="w-4 h-4 mb-1 text-primary" />
                          <span className="text-xs font-semibold">Dark</span>
                          <span className="text-[9px] text-muted-foreground">Night</span>
                        </button>
                      </div>
                    </div>
                  </section>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Display options</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row icon={<Maximize2 className="w-4 h-4 text-primary" />}
                        label="Compact layout" desc="Tighter spacing across the app"
                        onClick={() => p.updateDisplayPref("compact")}
                        right={<NativeToggle checked={p.displayPrefs.compact} onChange={() => p.updateDisplayPref("compact")} />} />
                      <Row icon={<Type className="w-4 h-4 text-primary" />}
                        label="Larger text" desc="Increase base font size"
                        onClick={() => p.updateDisplayPref("largerText")}
                        right={<NativeToggle checked={p.displayPrefs.largerText} onChange={() => p.updateDisplayPref("largerText")} />} />
                      <Row icon={<Contrast className="w-4 h-4 text-primary" />}
                        label="High contrast" desc="Sharper borders and text"
                        onClick={() => p.updateDisplayPref("highContrast")}
                        right={<NativeToggle checked={p.displayPrefs.highContrast} onChange={() => p.updateDisplayPref("highContrast")} />} />
                      <Row icon={<Zap className="w-4 h-4 text-primary" />}
                        label="Reduce motion" desc="Minimize animations"
                        onClick={() => p.updateDisplayPref("reduceMotion")}
                        right={<NativeToggle checked={p.displayPrefs.reduceMotion} onChange={() => p.updateDisplayPref("reduceMotion")} />} />
                      <Row icon={<PlayCircle className="w-4 h-4 text-primary" />}
                        label="Autoplay media" desc="Auto-start videos and carousels"
                        onClick={() => p.updateDisplayPref("autoplay")}
                        right={<NativeToggle checked={p.displayPrefs.autoplay} onChange={() => p.updateDisplayPref("autoplay")} />} />
                      <Row icon={<Vibrate className="w-4 h-4 text-primary" />}
                        label="Haptic feedback" desc="Vibration on tap (mobile)"
                        onClick={() => p.updateDisplayPref("haptics")}
                        right={<NativeToggle checked={p.displayPrefs.haptics} onChange={() => p.updateDisplayPref("haptics")} />} />
                    </div>
                  </section>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Theme palette</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4 space-y-3">
                      <p className="text-[13px] text-muted-foreground">
                        Accent colors and typography are set by the administrator.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary shadow-sm" />
                        <div className="w-9 h-9 rounded-xl bg-secondary border border-border" />
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border" />
                        <div className="w-9 h-9 rounded-xl bg-accent border border-border" />
                      </div>
                    </div>
                  </section>
                </>
              )}

              {section === "notifications" && (
                <>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Channels</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row
                        icon={<BellRing className="w-4 h-4 text-primary" />}
                        label={p.pushBusy ? "Updating…" : "Push notifications"}
                        desc={p.pushSubscribed
                          ? `Enabled · ${p.pushLastUsed ? new Date(p.pushLastUsed).toLocaleDateString() : "just now"}`
                          : "Alerts when app is closed"}
                        onClick={p.togglePushSubscription}
                        right={<NativeToggle checked={p.pushSubscribed} onChange={p.togglePushSubscription} />}
                      />
                      <Row icon={<Bell className="w-4 h-4 text-primary" />}
                        label="In-app notifications" desc="Inside the app"
                        onClick={() => p.updateNotifPref("push")}
                        right={<NativeToggle checked={p.notifPrefs.push} onChange={() => p.updateNotifPref("push")} />} />
                      <Row icon={<Mail className="w-4 h-4 text-primary" />}
                        label="Email notifications" desc="Updates via email"
                        onClick={() => p.updateNotifPref("email")}
                        right={<NativeToggle checked={p.notifPrefs.email} onChange={() => p.updateNotifPref("email")} />} />
                      <Row icon={p.notifPrefs.sound ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-primary" />}
                        label="Sound" desc="Notification sounds"
                        onClick={() => p.updateNotifPref("sound")}
                        right={<NativeToggle checked={p.notifPrefs.sound} onChange={() => p.updateNotifPref("sound")} />} />
                    </div>
                  </section>

                  <section className={!p.notifPrefs.sound ? "opacity-50 pointer-events-none" : ""}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Sound style</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {(["chime", "ping", "pop", "bell"] as const).map((s) => (
                          <button key={s} onClick={() => p.changeSoundStyle(s)}
                            className={`h-11 rounded-xl border text-sm capitalize transition-all ${p.soundStyle === s ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs text-muted-foreground">Volume</Label>
                          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(p.soundVolume * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.05} value={p.soundVolume}
                          onChange={(e) => p.changeSoundVolume(parseFloat(e.target.value))}
                          onMouseUp={p.previewSound} onTouchEnd={p.previewSound}
                          className="w-full accent-primary" />
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl w-full" onClick={p.previewSound}>
                        <Volume2 className="w-4 h-4 mr-1.5" /> Preview
                      </Button>
                    </div>
                  </section>

                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Categories</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row icon={<Package className="w-4 h-4 text-primary" />} label="Order updates" desc="Shipping & delivery"
                        onClick={() => p.updateNotifPref("orders")}
                        right={<NativeToggle checked={p.notifPrefs.orders} onChange={() => p.updateNotifPref("orders")} />} />
                      <Row icon={<Tag className="w-4 h-4 text-primary" />} label="Promotions" desc="Sales & coupons"
                        onClick={() => p.updateNotifPref("promotions")}
                        right={<NativeToggle checked={p.notifPrefs.promotions} onChange={() => p.updateNotifPref("promotions")} />} />
                      <Row icon={<Megaphone className="w-4 h-4 text-primary" />} label="Announcements" desc="Store news"
                        onClick={() => p.updateNotifPref("announcements")}
                        right={<NativeToggle checked={p.notifPrefs.announcements} onChange={() => p.updateNotifPref("announcements")} />} />
                      <Row icon={<TrendingUp className="w-4 h-4 text-primary" />} label="Price drops" desc="Wishlist on sale"
                        onClick={() => p.updateNotifPref("priceDrops")}
                        right={<NativeToggle checked={p.notifPrefs.priceDrops} onChange={() => p.updateNotifPref("priceDrops")} />} />
                      <Row icon={<ShoppingBag className="w-4 h-4 text-primary" />} label="Restock alerts" desc="When items return"
                        onClick={() => p.updateNotifPref("restockAlerts")}
                        right={<NativeToggle checked={p.notifPrefs.restockAlerts} onChange={() => p.updateNotifPref("restockAlerts")} />} />
                    </div>
                  </section>
                </>
              )}

              {section === "security" && (
                <>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Account</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row icon={<Lock className="w-4 h-4 text-primary" />}
                        label="Change password" desc="Update your password"
                        onClick={() => p.setChangePasswordOpen(true)}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                      <Row icon={<Smartphone className="w-4 h-4 text-primary" />}
                        label="Two-factor auth" desc="Extra layer of security"
                        onClick={p.openTwoFactor}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                      <Row icon={<Monitor className="w-4 h-4 text-primary" />}
                        label="Active sessions" desc="Logged-in devices"
                        onClick={p.openSessions}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                    </div>
                  </section>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-destructive/80 px-3 mb-1.5">Danger zone</p>
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <p className="text-sm font-medium text-destructive">Delete account</p>
                      </div>
                      <p className="text-[12px] text-muted-foreground">
                        This is permanent and removes all data, orders and preferences.
                      </p>
                      <Button variant="destructive" onClick={() => p.setDeleteAccountOpen(true)} className="rounded-xl w-full gap-2 h-11">
                        <Trash2 className="w-4 h-4" /> Delete account
                      </Button>
                    </div>
                  </section>
                </>
              )}

              {section === "general" && (
                <>
                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5 flex items-center gap-1.5">
                      <Languages className="w-3 h-3" /> {p.t("settings.language") || "Language"}
                    </p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
                      {p.ALL_LANGUAGES.map((l: any) => (
                        <button key={l.code} onClick={() => p.setLang(l.code)}
                          className="w-full flex items-center justify-between px-3.5 py-3 active:bg-secondary text-left transition-colors">
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium text-foreground truncate">{l.nativeLabel}</p>
                            <p className="text-[12px] text-muted-foreground truncate">{l.label}</p>
                          </div>
                          {p.language === l.code && (
                            <span className="text-primary text-lg leading-none">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {p.enabledCurrencies.length > 1 && (
                    <section>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5 flex items-center gap-1.5">
                        <Coins className="w-3 h-3" /> {p.t("settings.currency") || "Currency"}
                      </p>
                      <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                        {p.enabledCurrencies.map((c: any) => (
                          <button key={c.code} onClick={() => p.setCurrency(c.code)}
                            className="w-full flex items-center gap-3 px-3.5 py-3 active:bg-secondary text-left transition-colors">
                            <span className="w-9 text-xl font-display text-foreground">{c.symbol}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-medium text-foreground">{c.code}</p>
                              <p className="text-[12px] text-muted-foreground truncate">{c.name}</p>
                            </div>
                            {p.currency === c.code && <span className="text-primary text-lg leading-none">✓</span>}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Data & privacy</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row icon={<Download className="w-4 h-4 text-primary" />}
                        label={p.exporting ? "Preparing…" : "Download my data"} desc="Export personal data"
                        onClick={p.exportData}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                      <Row icon={<FileText className="w-4 h-4 text-primary" />}
                        label="Privacy policy" desc="Review our terms"
                        onClick={p.openPrivacy}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                    </div>
                  </section>

                  <section>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">Support</p>
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                      <Row icon={<HelpCircle className="w-4 h-4 text-primary" />}
                        label="Help center" desc="FAQs and guides"
                        onClick={p.openHelp}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                      <Row icon={<MessageSquare className="w-4 h-4 text-primary" />}
                        label="Contact support" desc="Get help from our team"
                        onClick={p.openSupport}
                        right={<ChevronRight className="w-4 h-4 text-muted-foreground" />} />
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center pt-3 flex items-center justify-center gap-1.5">
                      <Info className="w-3 h-3" /> App version 2.0.0
                    </p>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileSettingsShell;
// code:4ce0
