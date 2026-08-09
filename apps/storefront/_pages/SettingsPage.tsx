"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Palette, Bell, Globe, Shield, ChevronRight, Eye, EyeOff,
  Lock, Smartphone, Mail, Volume2, VolumeX, Languages, Monitor, TrendingUp,
  Trash2, Download, HelpCircle, MessageSquare, FileText, Info,
  BellRing, ShoppingBag, Tag, Package, Megaphone, AlertTriangle,
  Coins, Sparkles, Type, Zap, Contrast, Maximize2, Vibrate, PlayCircle,
  Sliders, Key, Laptop, LifeBuoy, CheckCircle2, User
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage, ALL_LANGUAGES } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useProfileAppearance } from "@/hooks/use-profile-appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { pushSupported, subscribeToPush, unsubscribeFromPush, getPushStatus } from "@/lib/push";
import TwoFactorDialog from "@/components/settings/TwoFactorDialog";
import SessionsDialog from "@/components/settings/SessionsDialog";
import { useNavigate, Link } from "@/lib/router-compat";
import { useServerFn } from "@/lib/server-fn-compat";
import { exportOwnData, deleteOwnAccount } from "@/lib/account.functions";

import {
  setNotificationSoundEnabled,
  setNotificationSoundStyle,
  setNotificationSoundVolume,
  getNotificationSoundStyle,
  getNotificationSoundVolume,
  previewNotificationSound,
  type NotificationSoundStyle,
} from "@/lib/sounds";

interface NotifPrefs {
  orders: boolean;
  promotions: boolean;
  announcements: boolean;
  priceDrops: boolean;
  restockAlerts: boolean;
  email: boolean;
  push: boolean;
  sound: boolean;
}

const defaultNotifPrefs: NotifPrefs = {
  orders: true, promotions: true, announcements: true, priceDrops: true,
  restockAlerts: true, email: true, push: true, sound: true,
};

interface DisplayPrefs {
  compact: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
  haptics: boolean;
  autoplay: boolean;
}

const defaultDisplayPrefs: DisplayPrefs = {
  compact: false, reduceMotion: false, highContrast: false,
  largerText: false, haptics: true, autoplay: true,
};

function applyDisplayPrefs(prefs: DisplayPrefs) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("pref-compact", prefs.compact);
  html.classList.toggle("pref-reduce-motion", prefs.reduceMotion);
  html.classList.toggle("pref-high-contrast", prefs.highContrast);
  html.classList.toggle("pref-larger-text", prefs.largerText);
}

const ToggleRow: React.FC<{
  icon: React.ReactNode; label: string; desc?: string; checked: boolean; onChange: () => void;
}> = ({ icon, label, desc, checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground truncate">{desc}</p>}
      </div>
    </div>
    <div className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 p-0.5 ${checked ? "bg-primary" : "bg-secondary border border-border/60"}`}>
      <div className={`w-4 h-4 rounded-full bg-background transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"}`} />
    </div>
  </button>
);

type SectionId = "appearance" | "notifications" | "security" | "general";

const SECTIONS: { id: SectionId; label: string; icon: any; desc: string }[] = [
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & display options" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alerts & audio sounds" },
  { id: "security", label: "Security", icon: Shield, desc: "Password & authentication" },
  { id: "general", label: "General", icon: Globe, desc: "Language, data & support" },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, enabledCurrencies } = useCurrency();
  const { language, setLanguage: setLang, t } = useLanguage();
  const { rootProps } = useProfileAppearance();

  const [mode, setMode] = useState<"dark" | "light">(theme === "light" ? "light" : "dark");
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(defaultDisplayPrefs);
  const [section, setSection] = useState<SectionId>("appearance");

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const callExport = useServerFn(exportOwnData);
  const callDelete = useServerFn(deleteOwnAccount);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await callExport({ data: undefined as any });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  const prefsRef = React.useRef<Record<string, any>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("displayPrefs");
      if (raw) {
        const parsed = { ...defaultDisplayPrefs, ...JSON.parse(raw) };
        setDisplayPrefs(parsed);
        applyDisplayPrefs(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (theme === "dark" || theme === "light") {
      setMode(theme);
    }
  }, [theme]);

  // Load initial preferences from Supabase ONCE per user session
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    supabase.from("profiles").select("preferences").eq("id", user.id).single().then(({ data }) => {
      if (!mounted || !data?.preferences) return;
      const prefs = data.preferences as Record<string, any>;
      prefsRef.current = prefs;

      if (prefs.mode && (prefs.mode === "dark" || prefs.mode === "light")) {
        setMode(prefs.mode);
      }
      if (prefs.notifPrefs) {
        const merged = { ...defaultNotifPrefs, ...prefs.notifPrefs };
        setNotifPrefs(merged);
        setNotificationSoundEnabled(merged.sound);
      }
      if (prefs.displayPrefs) {
        const merged = { ...defaultDisplayPrefs, ...prefs.displayPrefs };
        setDisplayPrefs(merged);
        applyDisplayPrefs(merged);
        try { localStorage.setItem("displayPrefs", JSON.stringify(merged)); } catch {}
      }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const savePrefs = (prefs: Record<string, any>) => {
    if (!user?.id) return;
    prefsRef.current = { ...prefsRef.current, ...prefs };
    supabase.from("profiles").update({ preferences: prefsRef.current }).eq("id", user.id).then(({ error }) => {
      if (error) {
        toast({ title: "Could not save settings", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Settings saved" });
      }
    });
  };

  const updateDisplayPref = (key: keyof DisplayPrefs) => {
    const updated = { ...displayPrefs, [key]: !displayPrefs[key] };
    setDisplayPrefs(updated);
    applyDisplayPrefs(updated);
    try { localStorage.setItem("displayPrefs", JSON.stringify(updated)); } catch {}
    if (key === "haptics" && updated.haptics && "vibrate" in navigator) navigator.vibrate?.(15);
    savePrefs({ displayPrefs: updated });
  };

  const toggleMode = () => {
    const currentIsDark = mode === "dark" || theme === "dark";
    const newMode = currentIsDark ? "light" : "dark";
    setMode(newMode);
    setTheme(newMode);
    savePrefs({ mode: newMode });
  };

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushLastUsed, setPushLastUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPushStatus(user.id).then((s) => {
      setPushSubscribed(s.subscribed);
      setPushLastUsed(s.lastUsedAt);
    });
  }, [user]);

  const togglePushSubscription = async () => {
    if (!user || pushBusy) return;
    if (!pushSupported()) {
      toast({ title: "Not supported", description: "Push isn't available in this browser.", variant: "destructive" });
      return;
    }
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush(user.id);
        setPushSubscribed(false);
        setPushLastUsed(null);
        toast({ title: "Push notifications disabled" });
      } else {
        const ok = await subscribeToPush(user.id);
        if (ok) {
          const s = await getPushStatus(user.id);
          setPushSubscribed(s.subscribed);
          setPushLastUsed(s.lastUsedAt);
          toast({ title: "Push notifications enabled" });
        } else {
          toast({ title: "Permission denied", variant: "destructive" });
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const [soundStyle, setSoundStyle] = useState<NotificationSoundStyle>("chime");
  const [soundVolume, setSoundVolume] = useState<number>(0.5);
  useEffect(() => {
    setSoundStyle(getNotificationSoundStyle());
    setSoundVolume(getNotificationSoundVolume());
  }, []);

  const updateNotifPref = (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    savePrefs({ notifPrefs: updated });
    if (key === "sound") setNotificationSoundEnabled(updated.sound);
  };

  const changeSoundStyle = (style: NotificationSoundStyle) => {
    setSoundStyle(style);
    setNotificationSoundStyle(style);
    previewNotificationSound(style);
  };
  const changeSoundVolume = (v: number) => {
    setSoundVolume(v);
    setNotificationSoundVolume(v);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast({ title: "Enter your current password", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "New password must be at least 8 characters", variant: "destructive" }); return; }
    if (newPassword === currentPassword) { toast({ title: "Pick a new password different from the current one", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setPasswordLoading(true);
    const email = user?.email;
    if (!email) { setPasswordLoading(false); toast({ title: "Not signed in", variant: "destructive" }); return; }
    const { error: reErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reErr) { setPasswordLoading(false); toast({ title: "Current password is incorrect", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Password updated", description: "Use your new password next time you sign in." });
    setChangePasswordOpen(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await callDelete({ data: undefined as any });
      toast({ title: "Account deleted" });
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Couldn't delete account", description: e?.message || "Try again later", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteAccountOpen(false);
    }
  };

  return (
    <div {...rootProps} className="min-h-screen pb-20 relative bg-background">
      {/* Subtle ambient tint */}
      <div className="absolute inset-x-0 top-0 h-[240px] -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/6 via-primary/2 to-transparent" />
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-4 lg:pt-6 pb-16 space-y-4 sm:space-y-5 relative">
        {/* ============ SETTINGS HEADER BANNER ============ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full rounded-md border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider mb-1">
              <Sliders className="w-3 h-3" /> Control Center
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {t("nav.settings") || "Account Settings"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your application preferences, notifications, security and system options
            </p>
          </div>

          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-secondary/50 border border-border/40 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
          >
            <User className="w-4 h-4 text-primary" />
            <span>Back to Profile</span>
          </Link>
        </motion.section>

        {/* ============ SETTINGS LAYOUT GRID ============ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="w-full grid grid-cols-12 gap-5 items-start"
        >
          {/* Sticky Section Navigation Sidebar */}
          <aside className="col-span-12 lg:col-span-3 sticky top-20 self-start z-10">
            <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-1.5 pb-2 font-bold">Categories</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => {
                  const active = section === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSection(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <s.icon className="w-4 h-4" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="truncate">{s.label}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Settings Section Content Panel */}
          <div className="col-span-12 lg:col-span-9 min-w-0 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* APPEARANCE SECTION */}
                {section === "appearance" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-border/30">
                        <div>
                          <h2 className="text-base font-bold text-foreground">Theme & Display Mode</h2>
                          <p className="text-xs text-muted-foreground">Switch between light and dark visual themes</p>
                        </div>
                        <Palette className="w-4 h-4 text-primary" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => mode !== "light" && toggleMode()}
                          className={`p-3.5 rounded-md border text-left transition-all flex items-center gap-3 ${
                            mode === "light" ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/30"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Sun className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Light Mode</p>
                            <p className="text-[11px] text-muted-foreground">Clean, high clarity interface</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => mode !== "dark" && toggleMode()}
                          className={`p-3.5 rounded-md border text-left transition-all flex items-center gap-3 ${
                            mode === "dark" ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/30"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Moon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Dark Mode</p>
                            <p className="text-[11px] text-muted-foreground">Deep luxury dark tones</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Accessibility & Layout Options</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ToggleRow icon={<Maximize2 className="w-4 h-4" />}
                          label="Compact Layout" desc="Tighter padding and dense spacing"
                          checked={displayPrefs.compact} onChange={() => updateDisplayPref("compact")} />
                        <ToggleRow icon={<Type className="w-4 h-4" />}
                          label="Larger Text" desc="Increase base typography size"
                          checked={displayPrefs.largerText} onChange={() => updateDisplayPref("largerText")} />
                        <ToggleRow icon={<Contrast className="w-4 h-4" />}
                          label="High Contrast" desc="Sharper high contrast borders and text"
                          checked={displayPrefs.highContrast} onChange={() => updateDisplayPref("highContrast")} />
                        <ToggleRow icon={<Zap className="w-4 h-4" />}
                          label="Reduce Motion" desc="Minimize ambient UI animations"
                          checked={displayPrefs.reduceMotion} onChange={() => updateDisplayPref("reduceMotion")} />
                        <ToggleRow icon={<PlayCircle className="w-4 h-4" />}
                          label="Autoplay Media" desc="Auto-scroll carousels & video previews"
                          checked={displayPrefs.autoplay} onChange={() => updateDisplayPref("autoplay")} />
                        <ToggleRow icon={<Vibrate className="w-4 h-4" />}
                          label="Haptic Feedback" desc="Vibration responses on touch devices"
                          checked={displayPrefs.haptics} onChange={() => updateDisplayPref("haptics")} />
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS SECTION */}
                {section === "notifications" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Notification Channels</h2>
                      <div className="space-y-2.5">
                        <ToggleRow icon={<BellRing className="w-4 h-4" />}
                          label={pushBusy ? "Updating…" : "Push Notifications"}
                          desc={pushSubscribed
                            ? `Enabled · last sync ${pushLastUsed ? new Date(pushLastUsed).toLocaleString() : "just now"}`
                            : "Receive alerts even when the browser is closed"}
                          checked={pushSubscribed} onChange={togglePushSubscription} />
                        <ToggleRow icon={<Bell className="w-4 h-4" />}
                          label="In-App Notifications" desc="Display alert badges & banners within app"
                          checked={notifPrefs.push} onChange={() => updateNotifPref("push")} />
                        <ToggleRow icon={<Mail className="w-4 h-4" />}
                          label="Email Alerts" desc="Receive order status & account security updates via email"
                          checked={notifPrefs.email} onChange={() => updateNotifPref("email")} />
                        <ToggleRow icon={notifPrefs.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          label="Notification Sound" desc="Play audio chime when notifications arrive"
                          checked={notifPrefs.sound} onChange={() => updateNotifPref("sound")} />
                      </div>
                    </div>

                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Notification Sound Style</h2>
                      <div className={`space-y-4 ${!notifPrefs.sound ? "opacity-40 pointer-events-none" : ""}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(["chime", "ping", "pop", "bell"] as NotificationSoundStyle[]).map((s) => (
                            <button key={s} type="button" onClick={() => changeSoundStyle(s)}
                              className={`p-3 rounded-md border text-xs font-bold capitalize transition-colors ${
                                soundStyle === s ? "border-primary bg-primary/10 text-foreground" : "border-border/40 hover:border-primary/30 text-muted-foreground"
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-semibold">Sound Volume</span>
                            <span className="font-mono text-foreground font-bold">{Math.round(soundVolume * 100)}%</span>
                          </div>
                          <input type="range" min={0} max={1} step={0.05}
                            value={soundVolume}
                            onChange={(e) => changeSoundVolume(parseFloat(e.target.value))}
                            onMouseUp={() => previewNotificationSound(soundStyle)}
                            onTouchEnd={() => previewNotificationSound(soundStyle)}
                            className="w-full accent-primary h-1.5 bg-secondary rounded-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Notification Categories</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ToggleRow icon={<Package className="w-4 h-4" />} label="Order Status Updates" desc="Shipping & delivery confirmations"
                          checked={notifPrefs.orders} onChange={() => updateNotifPref("orders")} />
                        <ToggleRow icon={<Tag className="w-4 h-4" />} label="Promotional Offers" desc="Coupons & flash sales"
                          checked={notifPrefs.promotions} onChange={() => updateNotifPref("promotions")} />
                        <ToggleRow icon={<Megaphone className="w-4 h-4" />} label="Store Announcements" desc="News & product launches"
                          checked={notifPrefs.announcements} onChange={() => updateNotifPref("announcements")} />
                        <ToggleRow icon={<TrendingUp className="w-4 h-4" />} label="Price Drop Alerts" desc="When saved wishlist items drop in price"
                          checked={notifPrefs.priceDrops} onChange={() => updateNotifPref("priceDrops")} />
                        <ToggleRow icon={<ShoppingBag className="w-4 h-4" />} label="Restock Alerts" desc="When out-of-stock items return"
                          checked={notifPrefs.restockAlerts} onChange={() => updateNotifPref("restockAlerts")} />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY SECTION */}
                {section === "security" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Account Security</h2>
                      
                      <button
                        type="button"
                        onClick={() => setChangePasswordOpen(true)}
                        className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Change Password</p>
                            <p className="text-[11px] text-muted-foreground">Update your account login password</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTwoFactorOpen(true)}
                        className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Two-Factor Authentication (2FA)</p>
                            <p className="text-[11px] text-muted-foreground">Enhance security with multi-factor authentication</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionsOpen(true)}
                        className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Active Sessions & Devices</p>
                            <p className="text-[11px] text-muted-foreground">Manage logged-in devices & active sessions</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-5 sm:p-6 space-y-3">
                      <div className="flex items-center gap-2 text-rose-500">
                        <AlertTriangle className="w-4 h-4" />
                        <h2 className="text-base font-bold">Danger Zone</h2>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deleting your account is permanent. All your profile information, order history, addresses, and saved preferences will be erased.
                      </p>
                      <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)} className="rounded-md text-xs font-bold gap-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Account
                      </Button>
                    </div>
                  </div>
                )}

                {/* GENERAL SECTION */}
                {section === "general" && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <Languages className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-bold text-foreground">{t("settings.language") || "Language"}</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ALL_LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => setLang(l.code)}
                            className={`flex items-center justify-between p-3 rounded-md border text-left transition-colors ${
                              language === l.code ? "border-primary bg-primary/10 text-foreground font-bold" : "border-border/40 hover:border-primary/30 text-muted-foreground"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-semibold">{l.nativeLabel}</p>
                              <p className="text-[10px] text-muted-foreground">{l.label}</p>
                            </div>
                            {language === l.code && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {enabledCurrencies.length > 1 && (
                      <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                          <Coins className="w-4 h-4 text-primary" />
                          <h2 className="text-base font-bold text-foreground">{t("settings.currency") || "Currency"}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {enabledCurrencies.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => setCurrency(c.code)}
                              className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                                currency === c.code ? "border-primary bg-primary/10 text-foreground font-bold" : "border-border/40 hover:border-primary/30 text-muted-foreground"
                              }`}
                            >
                              <span className="text-lg font-bold font-display">{c.symbol}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold">{c.code}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{c.name}</p>
                              </div>
                              {currency === c.code && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Data & Privacy</h2>
                      <button
                        type="button"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                            <Download className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{exporting ? "Preparing Export…" : "Export Personal Data"}</p>
                            <p className="text-[11px] text-muted-foreground">Download a complete copy of your personal data as JSON</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate({ to: "/page/$slug", params: { slug: "privacy" } })}
                        className="w-full flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Privacy Policy</p>
                            <p className="text-[11px] text-muted-foreground">Read how your data is handled</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-3">
                      <h2 className="text-base font-bold text-foreground pb-2 border-b border-border/30">Support & Help</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/page/$slug", params: { slug: "faq" } })}
                          className="flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Help Center</p>
                              <p className="text-[11px] text-muted-foreground">FAQs & guides</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate({ to: "/support" })}
                          className="flex items-center justify-between p-3.5 rounded-md border border-border/40 bg-card/40 hover:bg-card/70 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Contact Support</p>
                              <p className="text-[11px] text-muted-foreground">Get help from support</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and pick a new password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password" className="rounded-lg" autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters" className="rounded-lg pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password" className="rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-lg">
              {passwordLoading ? "Updating…" : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data, orders, and preferences will be permanently erased.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} className="rounded-lg">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="rounded-lg">
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TwoFactorDialog open={twoFactorOpen} onOpenChange={setTwoFactorOpen} />
      <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </div>
  );
};

export default SettingsPage;
