"use client";
import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, Save, LogOut, ShoppingCart, Package, Star, Bell,
  Settings, ChevronRight, Camera, Home, Building2, MapPinned,
  CreditCard, CheckCircle2, Shield, Mail, Calendar, Award, Heart, PhoneCall,
  ArrowUpRight, Trash2, ExternalLink
} from "lucide-react";
import CallHistoryList from "@/components/CallHistoryList";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { useProfileAppearance } from "@/hooks/use-profile-appearance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressBookTab from "@/components/profile/AddressBookTab";
import PaymentMethodsTab from "@/components/profile/PaymentMethodsTab";
import { useLanguage } from "@/contexts/LanguageContext";

type TabId =
  | "profile" | "addresses" | "payments"
  | "orders" | "reviews" | "calls" | "notifications";

const ProfilePage: React.FC = () => {
  useSeoMeta("profile", "Profile");
  const { user, signOut } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const { rootProps } = useProfileAppearance();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || "");
      }
    });
  }, [user]);

  const { data: orders } = useQuery({
    queryKey: ["profile-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("id, order_number, status, total, created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: cartCount } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("cart_items")
        .select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: wishlistCount } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("wishlist_items")
        .select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: reviews } = useQuery({
    queryKey: ["profile-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews")
        .select("id, rating, title, comment, created_at, product_id")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["profile-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .not("type", "in", '("support","call","admin","order_status","low_stock")')
        .order("created_at", { ascending: false }).limit(15);
      return data || [];
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, phone, avatar_url: avatarUrl }).eq("id", user.id);
    setLoading(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated successfully" });
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["profile-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["bell-notifications"] });
  };

  const clearAllNotifications = async () => {
    if (!user || !notifications?.length) return;
    const ownIds = notifications.filter((n) => n.user_id === user.id).map((n) => n.id);
    const broadcastIds = notifications.filter((n) => n.user_id !== user.id).map((n) => n.id);
    if (ownIds.length) {
      const { error } = await supabase.from("notifications").delete().in("id", ownIds);
      if (error) { toast({ title: "Could not clear notifications", description: error.message, variant: "destructive" }); return; }
    }
    if (broadcastIds.length && typeof window !== "undefined") {
      try {
        const key = `notif-dismissed:${user.id}`;
        const raw = window.localStorage.getItem(key);
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        broadcastIds.forEach((id) => set.add(id));
        window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
      } catch { /* ignore */ }
    }
    queryClient.invalidateQueries({ queryKey: ["profile-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["bell-notifications"] });
    toast({ title: "Notifications cleared" });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    toast({ title: "Avatar updated" });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    processing: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    shipped: "bg-purple-500/15 text-purple-500 border-purple-500/20",
    delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-rose-500/15 text-rose-500 border-rose-500/20",
  };

  const navItems: { id: TabId; icon: any; label: string; badge?: number | string }[] = [
    { id: "profile", icon: User, label: t("profile.personalInfo") || "Personal Info" },
    { id: "addresses", icon: MapPin, label: t("profile.addresses") || "Saved Addresses" },
    { id: "payments", icon: CreditCard, label: t("profile.payments") || "Payment Methods" },
    { id: "orders", icon: Package, label: t("profile.myOrders") || "Order History", badge: orders?.length },
    { id: "reviews", icon: Star, label: t("profile.reviews") || "My Reviews", badge: reviews?.length },
    { id: "calls", icon: PhoneCall, label: "Support Calls" },
    { id: "notifications", icon: Bell, label: "Notifications", badge: notifications?.filter(n => !n.is_read).length || undefined },
  ];

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  const initial = (fullName || user?.email || "U").charAt(0).toUpperCase();

  const stats = [
    { icon: ShoppingCart, count: cartCount ?? 0, label: "Shopping Bag", href: "/cart" },
    { icon: Package, count: orders?.length ?? 0, label: "My Orders", href: "/orders" },
    { icon: Heart, count: wishlistCount ?? 0, label: "Saved Items", href: "/wishlist" },
    { icon: Star, count: reviews?.length ?? 0, label: "My Reviews", onClick: () => setActiveTab("reviews") },
  ];

  return (
    <div {...rootProps} className="min-h-screen pb-20 relative bg-background">
      {/* Subtle ambient tint */}
      <div className="absolute inset-x-0 top-0 h-[260px] -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent" />
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-4 lg:pt-6 pb-16 space-y-4 sm:space-y-5 relative">
        {/* ============ PROFILE HEADER BANNER ============ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full rounded-md border border-border/40 bg-card/50 backdrop-blur-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5"
        >
          {/* Left: Avatar + Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left min-w-0">

            {/* Clean circle avatar */}
            <div className="relative group flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-primary/10 border border-border text-primary flex items-center justify-center font-bold text-2xl tracking-tight select-none">
                  {initial}
                </div>
              )}
              {/* Upload overlay */}
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              </label>
              {/* Verified dot */}
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
            </div>

            {/* Identity */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {fullName || "Your Profile"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-sm shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>

              {/* Minimal Meta Row */}
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground pt-0.5 justify-center sm:justify-start flex-wrap">
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-secondary/50 border border-border/40 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Settings className="w-4 h-4 text-primary" />
              <span>Account Settings</span>
            </Link>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-rose-500/8 border border-rose-500/15 text-xs font-semibold text-rose-500 hover:bg-rose-500/12 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.section>

        {/* ============ 4-STAT METRIC GRID ============ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {stats.map((s) => {
            const Wrapper: any = s.href ? Link : "button";
            const extra = s.href ? { to: s.href } : { type: "button" as const, onClick: s.onClick };
            const interactive = !!(s.href || s.onClick);
            return (
              <Wrapper
                key={s.label}
                {...extra}
                className={`rounded-md border border-border/40 bg-card/50 p-4 sm:p-5 transition-colors group relative text-left ${
                  interactive ? "hover:border-primary/30 hover:bg-card/70 cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                    <s.icon className="w-4 h-4" />
                  </div>
                  {interactive && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />}
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{s.count}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{s.label}</p>
              </Wrapper>
            );
          })}
        </motion.section>

        {/* ============ FULL-WIDTH ACCOUNT NAVIGATION & TAB PANEL ============ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full grid grid-cols-12 gap-5 items-start"
        >
          {/* Sticky Navigation Sidebar (Desktop) */}
          <aside className="hidden lg:block col-span-3 sticky top-20 self-start z-10">
            <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-1.5 pb-2 font-bold">Account Center</p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge ? (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile Horizontal Navigation Tabs */}
          <div className="col-span-12 lg:hidden">
            <div className="flex gap-2 p-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                      active ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-background/30">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Tab Content Panel */}
          <div className="col-span-12 lg:col-span-9 min-w-0 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "profile" && (
                  <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3.5 border-b border-border/30">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Keep your profile details up to date</p>
                      </div>
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            className="pl-10 rounded-md bg-background/80 border-border/60 h-10 text-xs focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number"
                            inputMode="tel"
                            className="pl-10 rounded-md bg-background/80 border-border/60 h-10 text-xs focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={user?.email || ""}
                          disabled
                          className="pl-10 rounded-md bg-secondary/20 border-border/60 h-10 text-xs opacity-70 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-1">Contact customer support to update your registered email address.</p>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-border/30">
                      <Button onClick={handleSave} disabled={loading} className="rounded-md h-10 px-6 font-bold text-xs gap-2">
                        {loading ? (
                          <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "addresses" && <AddressBookTab />}
                {activeTab === "payments" && <PaymentMethodsTab />}

                {activeTab === "orders" && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Your latest purchase activity</p>
                      </div>
                      <Link to="/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        View all <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    {orders?.length === 0 && (
                      <div className="rounded-md border border-border/40 bg-card/40 p-10 text-center">
                        <Package className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground mb-1">No orders yet</p>
                        <p className="text-xs text-muted-foreground mb-3">When you place an order, it will show up here.</p>
                        <Link to="/inventory" className="text-xs font-bold text-primary hover:underline">Start shopping →</Link>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {orders?.map((order) => (
                        <Link key={order.id} to="/orders"
                          className="rounded-md border border-border/40 bg-card/60 p-4 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">#{order.order_number}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs font-bold text-foreground mt-1">{formatPrice(Number(order.total))}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${statusColors[order.status] || "bg-secondary text-foreground border-border"}`}>
                              {order.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5">
                      <h2 className="text-lg font-bold text-foreground">Your Reviews</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Feedback you have shared on products</p>
                    </div>
                    {reviews?.length === 0 && (
                      <div className="rounded-md border border-border/40 bg-card/40 p-10 text-center">
                        <Star className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">No reviews yet</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {reviews?.map((review) => (
                        <div key={review.id} className="rounded-md border border-border/40 bg-card/60 p-4">
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-[11px] text-muted-foreground ml-auto">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && <p className="text-xs font-bold text-foreground">{review.title}</p>}
                          {review.comment && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "calls" && (
                  <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <PhoneCall className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Call History</h2>
                        <p className="text-xs text-muted-foreground">Your recent support calls & audio logs</p>
                      </div>
                    </div>
                    <CallHistoryList limit={50} />
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-card/60 backdrop-blur-md p-5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notifications?.filter(n => !n.is_read).length ? `${notifications.filter(n => !n.is_read).length} unread` : "You are all caught up"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {notifications && notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={clearAllNotifications}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold hover:bg-rose-500/15 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Clear all
                          </button>
                        )}
                        <Bell className="w-4.5 h-4.5 text-primary/60" />
                      </div>
                    </div>
                    {notifications?.length === 0 && (
                      <div className="rounded-md border border-border/40 bg-card/40 p-10 text-center">
                        <Bell className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">No notifications</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {notifications?.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => !n.is_read && markNotificationRead(n.id)}
                          className={`w-full text-left rounded-md border border-border/40 bg-card/60 p-3.5 transition-all ${!n.is_read ? "border-primary/40 bg-primary/5" : "opacity-80"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground">{n.title}</p>
                              {n.message && <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default ProfilePage;
