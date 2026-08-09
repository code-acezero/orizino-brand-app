"use client";
import React from "react";
import { Link } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, Mail, Camera, ChevronRight, ChevronLeft, Settings, LogOut,
  ShoppingCart, Package, Heart, Star, Award, MapPin, CreditCard, PhoneCall,
  Bell, CheckCircle2, Shield, Save, X, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RewardsTab from "@/components/profile/RewardsTab";
import AddressBookTab from "@/components/profile/AddressBookTab";
import PaymentMethodsTab from "@/components/profile/PaymentMethodsTab";
import CallHistoryList from "@/components/CallHistoryList";
import { useLanguage } from "@/contexts/LanguageContext";

type TabId =
  | "profile" | "rewards" | "addresses" | "payments"
  | "orders" | "reviews" | "calls" | "notifications";

interface Props {
  user: any;
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  avatarUrl: string;
  loading: boolean;
  handleSave: () => void;
  handleAvatarUpload: (f: File) => void;
  signOut: () => void;
  orders: any[] | undefined;
  reviews: any[] | undefined;
  notifications: any[] | undefined;
  cartCount: number | undefined;
  wishlistCount: number | undefined;
  markNotificationRead: (id: string) => void;
  clearAllNotifications?: () => void;
  formatPrice: (n: number) => string;
  tierInfo: any;
  memberSince: string;
}

const rowsFor = (t: (k: string) => string): { id: TabId; icon: any; label: string; group: string }[] => [
  { id: "profile", icon: User, label: t("profile.personalInfo"), group: t("profile.groupAccount") },
  { id: "rewards", icon: Award, label: t("profile.rewardsLoyalty"), group: t("profile.groupAccount") },
  { id: "addresses", icon: MapPin, label: t("profile.addresses"), group: t("profile.groupAccount") },
  { id: "payments", icon: CreditCard, label: t("profile.payments"), group: t("profile.groupAccount") },
  { id: "orders", icon: Package, label: t("profile.myOrders"), group: t("profile.groupActivity") },
  { id: "reviews", icon: Star, label: t("profile.myReviews"), group: t("profile.groupActivity") },
  { id: "calls", icon: PhoneCall, label: t("profile.callHistory"), group: t("profile.groupActivity") },
  { id: "notifications", icon: Bell, label: t("nav.notifications"), group: t("profile.groupActivity") },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  processing: "bg-blue-500/15 text-blue-500",
  shipped: "bg-purple-500/15 text-purple-500",
  delivered: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-red-500/15 text-red-500",
};

const MobileProfileShell: React.FC<Props> = (p) => {
  const { t } = useLanguage();
  const ROWS = React.useMemo(() => rowsFor(t), [t]);
  const [openTab, setOpenTab] = React.useState<TabId | null>(null);
  const initial = (p.fullName || p.user?.email || "U").charAt(0).toUpperCase();
  const unread = p.notifications?.filter((n) => !n.is_read).length || 0;

  const badges: Partial<Record<TabId, number>> = {
    orders: p.orders?.length || 0,
    reviews: p.reviews?.length || 0,
    notifications: unread || 0,
  };

  const grouped = React.useMemo(() => {
    const out: Record<string, typeof ROWS> = {};
    ROWS.forEach((r) => { (out[r.group] ||= []).push(r); });
    return out;
  }, [ROWS]);

  const stats = [
    { icon: ShoppingCart, count: p.cartCount ?? 0, label: t("nav.cart"), href: "/cart" },
    { icon: Package, count: p.orders?.length ?? 0, label: t("nav.orders"), href: "/orders" },
    { icon: Heart, count: p.wishlistCount ?? 0, label: t("nav.wishlist"), href: "/wishlist" },
    { icon: Star, count: p.reviews?.length ?? 0, label: t("common.reviews") },
  ];

  const activeRow = openTab ? ROWS.find((r) => r.id === openTab) : null;


  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] relative bg-background">
      {/* Sticky sub-header — sits below the site Navbar (h-14) so the back
          button never disappears under it. */}
      <header className="sticky top-14 z-[80] backdrop-blur-xl bg-background/85 border-b border-border/40">
        <div className="flex items-center justify-between px-2 h-12">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 active:bg-secondary transition-transform"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[15px] font-semibold font-display text-foreground">{t("profile.account")}</h1>
          <Link
            to="/settings"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/60 active:scale-95 transition-transform"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px] text-foreground" />
          </Link>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        {/* Hero identity */}
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center pt-2"
        >
          <div className="relative">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-background shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-3xl font-display shadow-xl">
                {initial}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary border-4 border-background flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && p.handleAvatarUpload(e.target.files[0])} />
            </label>
          </div>
          <h2 className="mt-4 text-2xl font-bold font-display text-foreground">
            {p.fullName || "Your Profile"}
          </h2>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5 mt-1 max-w-full">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{p.user?.email}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
            <Badge variant="secondary" className="rounded-full text-[11px] gap-1 px-2.5">
              <Shield className="w-3 h-3" /> Verified
            </Badge>
            {p.tierInfo && (
              <button
                onClick={() => setOpenTab("rewards")}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                style={{
                  background: `${p.tierInfo.current.badge_color}22`,
                  color: p.tierInfo.current.badge_color,
                  border: `1px solid ${p.tierInfo.current.badge_color}55`,
                }}
              >
                <Award className="w-3 h-3" /> {p.tierInfo.current.name}
              </button>
            )}
          </div>
        </motion.section>

        {/* Horizontal stat strip */}
        <section className="-mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 min-w-max">
            {stats.map((s) => {
              const Wrap: any = s.href ? Link : "div";
              return (
                <Wrap
                  key={s.label}
                  {...(s.href ? { to: s.href } : {})}
                  className="flex flex-col items-center justify-center w-[88px] h-[88px] rounded-2xl bg-secondary/60 border border-border/40 active:scale-[0.97] transition-transform"
                >
                  <s.icon className="w-4 h-4 text-primary mb-1.5" />
                  <p className="text-xl font-bold font-display tabular-nums leading-none text-foreground">{s.count}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                </Wrap>
              );
            })}
          </div>
        </section>

        {/* Grouped list sections */}
        {Object.entries(grouped).map(([group, rows]) => (
          <section key={group}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 mb-1.5">{group}</p>
            <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
              {rows.map((row) => {
                const badge = badges[row.id];
                return (
                  <button
                    key={row.id}
                    onClick={() => setOpenTab(row.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 active:bg-secondary text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <row.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 text-[15px] text-foreground font-medium">{row.label}</span>
                    {badge ? (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center tabular-nums">
                        {badge}
                      </span>
                    ) : null}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Sign out */}
        <section>
          <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden">
            <button
              onClick={p.signOut}
              className="w-full flex items-center gap-3 px-3.5 py-3 active:bg-secondary text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <span className="flex-1 text-[15px] text-destructive font-medium">Sign out</span>
            </button>
          </div>
        </section>
      </main>

      {/* Drill-down subscreen */}
      <AnimatePresence>
        {openTab && activeRow && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-0 z-[10070] bg-background flex flex-col"
          >
            <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40 pt-[env(safe-area-inset-top)]">
              <div className="relative flex items-center justify-between px-2 h-14">
                <button
                  onClick={() => setOpenTab(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/60 active:scale-95 transition-transform"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <h2 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-foreground truncate max-w-[55vw] text-center">
                  {activeRow.label}
                </h2>
                <button
                  onClick={() => setOpenTab(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/60 active:scale-95 transition-transform"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-2xl mx-auto w-full">
              {openTab === "profile" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={p.fullName} onChange={(e) => p.setFullName(e.target.value)}
                          placeholder="Your name" className="pl-10 rounded-xl h-12 bg-background border-border/60" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Phone number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={p.phone} onChange={(e) => p.setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000" className="pl-10 rounded-xl h-12 bg-background border-border/60" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={p.user?.email || ""} disabled
                          className="pl-10 rounded-xl h-12 bg-background border-border/60 opacity-70" />
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-1">Contact support to change your email</p>
                    </div>
                  </div>
                  <Button onClick={p.handleSave} disabled={p.loading} className="w-full h-12 rounded-2xl gap-2 text-[15px]">
                    {p.loading
                      ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      : <><Save className="w-4 h-4" /> Save changes</>}
                  </Button>
                </div>
              )}

              {openTab === "rewards" && <RewardsTab />}
              {openTab === "addresses" && <AddressBookTab />}
              {openTab === "payments" && <PaymentMethodsTab />}

              {openTab === "orders" && (
                <div className="space-y-2">
                  {p.orders?.length === 0 && (
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-10 text-center">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">No orders yet</p>
                      <Link to="/inventory" className="text-primary text-sm">Start shopping →</Link>
                    </div>
                  )}
                  <div className="rounded-2xl bg-secondary/40 border border-border/40 overflow-hidden divide-y divide-border/40">
                    {p.orders?.map((o) => (
                      <Link key={o.id} to="/orders" className="flex items-center gap-3 p-3.5 active:bg-secondary">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">#{o.order_number}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-sm font-bold text-foreground tabular-nums">{p.formatPrice(Number(o.total))}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[o.status] || "bg-secondary text-foreground"}`}>
                            {o.status}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {openTab === "reviews" && (
                <div className="space-y-2">
                  {p.reviews?.length === 0 && (
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-10 text-center">
                      <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No reviews yet</p>
                    </div>
                  )}
                  {p.reviews?.map((r) => (
                    <div key={r.id} className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`} />
                        ))}
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {r.title && <p className="text-sm font-semibold text-foreground">{r.title}</p>}
                      {r.comment && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {openTab === "calls" && <CallHistoryList limit={50} />}

              {openTab === "notifications" && (
                <div className="space-y-2">
                  {p.notifications && p.notifications.length > 0 && p.clearAllNotifications && (
                    <div className="flex justify-end">
                      <button
                        onClick={p.clearAllNotifications}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear all
                      </button>
                    </div>
                  )}
                  {p.notifications?.length === 0 && (
                    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-10 text-center">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No notifications</p>
                    </div>
                  )}
                  {p.notifications?.map((n) => (
                    <button key={n.id}
                      onClick={() => !n.is_read && p.markNotificationRead(n.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all ${!n.is_read ? "bg-primary/5 border-primary/30" : "bg-secondary/40 border-border/40 opacity-80"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileProfileShell;
// code:4ce0
