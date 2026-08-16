"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Heart, User, X, Menu, LogOut, Settings, LayoutGrid, ChevronDown, Bell, Sun, Moon, MoreVertical, Globe, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { guestCartCount as guestCartCountFn } from "@/lib/guest-cart";
import BottomNav, { type BottomNavProductTray } from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";
import ImageWithFallback from "@/components/ImageWithFallback";
import LanguageMenu from "@/components/footer/LanguageMenu";

interface NavbarProps {
  bottomNavProductTray?: BottomNavProductTray;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  AED: "د.إ",
  SAR: "﷼",
};

const Navbar: React.FC<NavbarProps> = ({ bottomNavProductTray }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [catHover, setCatHover] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [cartPop, setCartPop] = useState(false);

  useEffect(() => {
    const trigger = () => {
      setCartPop(true);
      setTimeout(() => setCartPop(false), 700);
    };
    window.addEventListener("cart-pop-trigger", trigger);
    window.addEventListener("guest-cart-updated", trigger);
    return () => {
      window.removeEventListener("cart-pop-trigger", trigger);
      window.removeEventListener("guest-cart-updated", trigger);
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currency, setCurrency, enabledCurrencies, formatPrice } = useCurrency();
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent hydration mismatch — theme is unknown on server
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
    setCatHover(null);
  }, [location.pathname]);

  // Set data-nav-overlay on body when mobile menu or search is open (so FAB can auto-hide on mobile)
  useEffect(() => {
    if (mobileOpen || searchOpen) {
      document.body.setAttribute("data-nav-overlay", "true");
    } else {
      document.body.removeAttribute("data-nav-overlay");
    }
  }, [mobileOpen, searchOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Close search bar on outside click (keeping searchQuery intact!)
  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  const { data: searchSuggestions = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ["navbar-search-suggestions", searchQuery],
    queryFn: async () => {
      const q = searchQuery.trim();
      if (q.length < 2) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, thumbnail, images, category:categories(name)")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,short_description.ilike.%${q}%`)
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2 && searchOpen,
    staleTime: 15000,
  });

  const { data: siteSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["site-settings-nav"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "title_image_url", "title_source", "site_icon_url", "logo_display_style", "title_font"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const siteName = (siteSettings?.site_name as string) || "ORIZINO";
  const logoUrl = (siteSettings?.logo_url as string) || "";
  const titleImageUrl = (siteSettings?.title_image_url as string) || "";
  const titleSource = (siteSettings?.title_source as string) || "text";
  const displayStyle = (siteSettings?.logo_display_style as string) || "both";
  const titleFont = (siteSettings?.title_font as string) || "";

  const showLogo = (displayStyle === "logo" || displayStyle === "both") && Boolean(logoUrl);
  const showTitle = displayStyle === "title" || displayStyle === "both" || Boolean(siteName);

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["nav-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      return (data || []) as { id: string; name: string; slug: string; parent_id: string | null }[];
    },
    staleTime: 0,
  });

  const topCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // Cart count
  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      if (!user) return guestCartCountFn();
      const { data } = await supabase.from("cart_items").select("quantity").eq("user_id", user.id);
      return (data || []).reduce((s, i) => s + (i.quantity || 1), 0);
    },
    staleTime: 30 * 1000,
  });

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await (supabase.from as any)("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["nav-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/inventory?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navBg = scrolled
    ? "bg-background/90 border-b border-border shadow-sm"
    : "bg-transparent border-b border-transparent";

  const NAV_LINKS = [
    { label: "Shop All", href: "/inventory" },
    ...topCategories.slice(0, 5).map((c) => ({ label: c.name, href: `/categories/${c.slug}`, id: c.id })),
  ];

  return (
    <>
      <header
        suppressHydrationWarning
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/95 backdrop-blur-md border-b border-border/80 shadow-sm" : "bg-transparent border-b-0 border-transparent shadow-none"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* Main bar */}
          <div className="flex items-center h-12 lg:h-14 gap-3 relative">
            {/* Brand Logo & Title with skeleton fallback — Logo at corner, Title centered on mobile */}
            {!mounted || isSettingsLoading ? (
              <div className="flex items-center gap-2 my-auto">
                <div className="h-6 sm:h-7 w-8 sm:w-10 rounded-lg bg-muted/60 animate-pulse" />
                <div className="h-5 w-24 sm:w-32 rounded-md bg-muted/60 animate-pulse max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 my-auto shrink-0">
                {showLogo && (
                  <Link href="/" className="shrink-0 flex items-center group">
                    <BrandLogo logoUrl={logoUrl} alt={siteName} className="h-6 sm:h-7 w-8 sm:w-10 transition-transform duration-300 group-hover:scale-105" />
                  </Link>
                )}
                {showTitle && (
                  <Link
                    href="/"
                    className="flex items-center group my-auto max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2 z-10"
                  >
                    {titleSource === "image" && titleImageUrl ? (
                      <img
                        src={titleImageUrl}
                        alt={siteName}
                        className="h-6 sm:h-7 w-auto object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        translate="no"
                        data-brand="orizino"
                        className="inline-flex items-center brand-name notranslate skiptranslate text-lg sm:text-xl md:text-2xl tracking-[0.16em] uppercase text-foreground group-hover:text-primary transition-colors duration-300 font-bold leading-none select-none"
                        style={{
                          fontFamily: titleFont
                            ? `'${titleFont}', var(--font-title, var(--font-display))`
                            : 'var(--font-title, var(--font-display))',
                          fontSize: siteName.length <= 5 ? "1.25em" : "1.05em",
                        }}
                      >
                        {siteName}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            )}

            {/* Desktop nav links with skeleton fallback */}
            {!mounted || isCategoriesLoading ? (
              <div className="hidden lg:flex items-center gap-6 ml-8 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-3 w-16 rounded bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <nav className="hidden lg:flex items-center gap-0 ml-8 flex-1">
                {NAV_LINKS.map((link) => {
                  const children = (link as any).id ? getChildren((link as any).id) : [];
                  const active = isActive(link.href);
                  return (
                    <div
                      key={link.href}
                      className="relative group"
                      onMouseEnter={() => children.length > 0 && setCatHover((link as any).id || null)}
                      onMouseLeave={() => setCatHover(null)}
                    >
                      <Link
                        href={link.href}
                        className={`flex items-center gap-1 px-3 py-3.5 font-sans-brand text-[0.65rem] tracking-[0.14em] uppercase whitespace-nowrap transition-colors ${
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {link.label}
                        {children.length > 0 && (
                          <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" strokeWidth={1.5} />
                        )}
                      </Link>
                      <span className={`absolute bottom-0 left-3 right-3 h-px bg-primary transition-all duration-300 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                      {children.length > 0 && catHover === (link as any).id && (
                        <motion.div
                          className="absolute top-full left-0 mt-0 min-w-[180px] bg-[hsl(var(--charcoal)/0.97)] border border-border py-2 z-50 rounded-b-2xl rounded-t-none overflow-hidden shadow-xl"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          style={{ backdropFilter: "blur(16px)" }}
                        >
                          {children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/categories/${child.slug}`}
                              className="block px-4 py-2.5 font-sans-brand text-[0.65rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--charcoal-mid))] transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              {/* Search — redesigned inline expanding search bar */}
              <div className="relative hidden lg:flex items-center" ref={searchRef}>
                <AnimatePresence initial={false}>
                  {searchOpen && (
                    <motion.div
                      key="desktop-search-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 z-40 bg-black/50 dark:bg-black/65 backdrop-blur-[2px]"
                      onClick={() => setSearchOpen(false)}
                    />
                  )}
                  {searchOpen ? (
                    <motion.div
                      key="search-bar-expanded"
                      initial={{ width: 36, opacity: 0 }}
                      animate={{ width: 320, opacity: 1 }}
                      exit={{ width: 36, opacity: 0 }}
                      transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.22 }}
                      className="relative z-50 flex items-center h-9 rounded-full border border-border/80 bg-secondary/50 dark:bg-card/90 backdrop-blur-md px-3 shadow-xs focus-within:border-primary transition-all overflow-visible shrink-0"
                    >
                      <form onSubmit={handleSearch} className="flex items-center w-full gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search products..."
                          className="w-full bg-transparent text-xs font-sans-brand text-foreground placeholder:text-muted-foreground/60 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none appearance-none rounded-full pr-1"
                          style={{ outline: "none", border: "none", boxShadow: "none" }}
                        />
                        {/* X icon on left of Search icon to clear query & collapse */}
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchOpen(false);
                          }}
                          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                          title="Clear & collapse search"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        {/* Search icon on right end to trigger search */}
                        <button
                          type="submit"
                          className="p-1 rounded-full text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                          title="Search"
                        >
                          <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </form>

                      {/* Live product suggestions dropdown on typing (width 320px perfectly inline with searchbar, flat styling) */}
                      <AnimatePresence>
                        {searchQuery.trim().length >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full right-0 mt-2 w-[320px] rounded-2xl border border-border/80 bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] p-2 shadow-sm z-50 backdrop-blur-xl max-h-96 overflow-y-auto"
                          >
                            <div className="px-2 py-1 mb-1 border-b border-border/40 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Suggestions ({searchSuggestions.length})
                              </span>
                              {isSearchLoading && (
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>

                            {searchSuggestions.length === 0 && !isSearchLoading ? (
                              <div className="py-6 text-center text-xs text-muted-foreground font-sans-brand">
                                No products found for "{searchQuery}"
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {searchSuggestions.map((prod: any) => (
                                  <Link
                                    key={prod.id}
                                    href={`/products/${prod.slug}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-all group"
                                  >
                                    <ImageWithFallback
                                      src={prod.thumbnail || (Array.isArray(prod.images) ? prod.images[0] : null)}
                                      alt={prod.name}
                                      className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0 border border-border/40"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors font-sans-brand">
                                        {prod.name}
                                      </p>
                                      {prod.category?.name && (
                                        <p className="text-[10px] text-muted-foreground truncate font-sans-brand">
                                          {prod.category.name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-bold text-primary font-sans-brand">
                                        {formatPrice(Number(prod.price))}
                                      </span>
                                      {prod.compare_at_price && Number(prod.compare_at_price) > Number(prod.price) && (
                                        <p className="text-[9px] text-muted-foreground line-through font-sans-brand">
                                          {formatPrice(Number(prod.compare_at_price))}
                                        </p>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}

                            {searchQuery.trim().length >= 2 && (
                              <button
                                type="button"
                                onClick={(e) => handleSearch(e)}
                                className="w-full mt-2 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-sans-brand text-xs font-bold transition-all text-center"
                              >
                                View all results for "{searchQuery}" →
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="search-icon-button"
                      onClick={() => setSearchOpen(true)}
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                      aria-label="Search"
                      title="Search"
                    >
                      <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Switcher — 3-way cycling: Auto (System) -> Light -> Dark -> Auto */}
              <button
                onClick={() => {
                  if (theme === 'system' || !theme) setTheme('light');
                  else if (theme === 'light') setTheme('dark');
                  else setTheme('system');
                }}
                className="hidden lg:flex w-9 h-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                aria-label="Toggle theme mode"
                title={
                  mounted
                    ? theme === 'dark'
                      ? 'Theme: Dark (click for Auto/System)'
                      : theme === 'light'
                      ? 'Theme: Light (click for Dark)'
                      : 'Theme: Auto/System (click for Light)'
                    : 'Theme mode'
                }
              >
                {mounted && (
                  theme === 'dark' ? (
                    <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  ) : theme === 'light' ? (
                    <Sun className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  ) : (
                    <Monitor className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  )
                )}
              </button>

              {/* Notifications & Dynamic Island — always visible on desktop */}
              <div className="hidden lg:block shrink-0">
                <NotificationBell />
              </div>

              {/* Wishlist — hidden on mobile top nav, available in bottom nav */}
              <Link
                href="/wishlist"
                className="hidden lg:flex relative w-9 h-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Wishlist"
              >
                <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart — hidden on mobile top nav, available in bottom nav */}
              <Link
                href="/cart"
                className="hidden lg:flex relative w-9 h-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cart"
              >
                <motion.div
                  animate={cartPop ? {
                    y: [0, -14, 2, -4, 0],
                    rotate: [0, -18, 14, -6, 0],
                    scale: [1, 1.28, 0.88, 1.1, 1],
                  } : { y: 0, rotate: 0, scale: 1 }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  className="relative flex items-center justify-center"
                >
                  <ShoppingCart className={`w-[18px] h-[18px] ${cartPop ? "text-primary" : ""}`} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      animate={cartPop ? { scale: [1, 1.85, 0.85, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, ease: "backOut" }}
                      className="absolute -top-1.5 -right-1 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none"
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </motion.span>
                  )}
                </motion.div>
              </Link>

              {/* Account dropdown — desktop only */}
              <div className="hidden lg:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Account"
                >
                  {user ? (
                    userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground uppercase">
                          {(userProfile?.full_name || user.email || "U")[0]}
                        </span>
                      </div>
                    )
                  ) : (
                    <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  )}
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] border border-border/60 shadow-md overflow-hidden z-50 backdrop-blur-xl"
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-border/40">
                            <p className="text-[11px] font-sans-brand font-medium text-foreground truncate">{user.user_metadata?.full_name || "My Account"}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                          </div>
                          {[
                            { href: "/profile", icon: User, label: "My Profile" },
                            { href: "/settings", icon: Settings, label: "Settings" },
                            { href: "/orders", icon: LayoutGrid, label: "My Orders" },
                            { href: "/wishlist", icon: Heart, label: "Wishlist" },
                          ].map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-sans-brand text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                            >
                              <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {item.label}
                            </Link>
                          ))}

                          {/* Desktop Theme Mode Switcher */}
                          <div className="px-3 py-2 border-t border-border/40 bg-secondary/20">
                            <div className="flex items-center justify-between mb-1 px-1">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Theme</span>
                              <span className="text-[10px] text-primary capitalize font-medium">{theme || "system"}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-xl border border-border/40">
                              <button
                                type="button"
                                onClick={() => setTheme("system")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && (theme === "system" || !theme)
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Auto (Device theme)"
                              >
                                <Monitor className="w-3 h-3" />
                                <span>Auto</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTheme("light")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && theme === "light"
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Light Mode"
                              >
                                <Sun className="w-3 h-3" />
                                <span>Light</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTheme("dark")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && theme === "dark"
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Dark Mode"
                              >
                                <Moon className="w-3 h-3" />
                                <span>Dark</span>
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-border/40 pt-1">
                            <button
                              onClick={() => { signOut(); setUserMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-sans-brand text-primary hover:bg-primary/10 transition-colors text-left font-semibold"
                            >
                              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 space-y-2.5">
                          <Link
                            href="/auth"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full text-center py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
                          >
                            Sign In
                          </Link>
                          <Link
                            href="/auth?tab=signup"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full text-center py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-secondary/40 transition-colors"
                          >
                            Register
                          </Link>

                          {/* Desktop Guest Theme Mode Switcher */}
                          <div className="pt-2 border-t border-border/40">
                            <div className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-xl border border-border/40">
                              <button
                                type="button"
                                onClick={() => setTheme("system")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && (theme === "system" || !theme)
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Auto (Device theme)"
                              >
                                <Monitor className="w-3 h-3" />
                                <span>Auto</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTheme("light")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && theme === "light"
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Light Mode"
                              >
                                <Sun className="w-3 h-3" />
                                <span>Light</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTheme("dark")}
                                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                                  mounted && theme === "dark"
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Dark Mode"
                              >
                                <Moon className="w-3 h-3" />
                                <span>Dark</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Elegant Morphing Animated Menu Button — mobile/tablet only */}
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="lg:hidden group relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 shrink-0"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                title="Menu"
              >
                <div className="w-4 h-3.5 flex flex-col justify-between items-center relative">
                  <span
                    className={`h-px transition-all duration-300 ease-out origin-center ${
                      mobileOpen
                        ? "w-4 translate-y-[6px] rotate-45 bg-primary"
                        : "w-4 bg-foreground group-hover:w-3 group-hover:bg-primary"
                    }`}
                  />
                  <span
                    className={`h-px transition-all duration-300 ease-out ${
                      mobileOpen
                        ? "w-0 opacity-0 bg-primary"
                        : "w-2.5 bg-foreground group-hover:w-4 group-hover:bg-primary"
                    }`}
                  />
                  <span
                    className={`h-px transition-all duration-300 ease-out origin-center ${
                      mobileOpen
                        ? "w-4 -translate-y-[6px] -rotate-45 bg-primary"
                        : "w-4 bg-foreground group-hover:w-2 group-hover:bg-primary"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Side Menu Panel (Elegant Shift Animation) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[9990] bg-black/50 dark:bg-black/65 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] lg:bottom-0 w-[85vw] max-w-xs z-[9995] flex flex-col overflow-hidden bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] border-l border-b border-border/60 shadow-2xl backdrop-blur-xl rounded-bl-2xl"
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              {/* Drawer Header — follows Masterpanel Logo/Title */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-border/50 shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  {showLogo && (
                    <BrandLogo logoUrl={logoUrl} alt={siteName} className="h-6 w-8" />
                  )}
                  {showTitle && (
                    titleSource === "image" && titleImageUrl ? (
                      <img
                        src={titleImageUrl}
                        alt={siteName}
                        className="h-6 w-auto object-contain shrink-0 dark:brightness-100 brightness-0"
                      />
                    ) : (
                      <span
                        translate="no"
                        data-brand="orizino"
                        className="text-base tracking-[0.14em] uppercase text-foreground font-bold leading-none select-none brand-name notranslate skiptranslate"
                        style={{
                          fontFamily: titleFont
                            ? `'${titleFont}', var(--font-title, var(--font-display))`
                            : 'var(--font-title, var(--font-display))',
                        }}
                      >
                        {siteName}
                      </span>
                    )
                  )}
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* User strip — theme-mode aware */}
              <div className="p-4 border-b border-border/40 shrink-0 bg-card/60">
                {user ? (
                  <div className="flex items-center gap-3">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-xs">
                        <span className="text-sm font-extrabold text-primary-foreground uppercase">
                          {(userProfile?.full_name || user.email || "U")[0]}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{userProfile?.full_name || user.user_metadata?.full_name || "My Account"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/auth" className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-xs hover:opacity-90 transition-opacity" onClick={() => setMobileOpen(false)}>Sign In</Link>
                    <Link href="/auth?tab=signup" className="flex-1 py-2 text-center text-xs font-semibold rounded-xl border border-border/60 text-foreground hover:bg-secondary/40 transition-colors" onClick={() => setMobileOpen(false)}>Register</Link>
                  </div>
                )}
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 mb-2">
                  <p className="section-label px-2 mb-1">Shop</p>
                  {[
                    { label: "All Products", href: "/inventory" },
                    { label: "New Arrivals", href: "/inventory?sort=newest" },
                    { label: "Featured", href: "/inventory?featured=true" },
                    ...topCategories.map((c) => ({ label: c.name, href: `/categories/${c.slug}` })),
                    { label: "Sale", href: "/inventory?sale=true" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-2 py-2.5 rounded-lg font-sans-brand text-sm transition-colors ${
                        isActive(item.href) ? "text-primary bg-primary/8" : "text-foreground/80 hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="px-3 mt-4 pt-4 border-t border-border">
                  <p className="section-label px-2 mb-1">Account</p>
                  {[
                    { label: "My Orders", href: "/orders" },
                    { label: "Wishlist", href: "/wishlist" },
                    { label: "Cart", href: "/cart" },
                    { label: "Track Order", href: "/support#track" },
                    ...(user
                      ? [
                          { label: "My Profile", href: "/profile" },
                          { label: "Settings", href: "/settings" },
                        ]
                      : []),
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center px-2 py-2.5 rounded-lg font-sans-brand text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="px-3 mt-4 pt-4 border-t border-border">
                  <p className="section-label px-2 mb-1">Brand</p>
                  {[
                    { label: "Our Story", href: "/about" },
                    { label: "Order Tracking", href: "/track" },
                    { label: "Product Authenticity", href: "/verify" },
                    { label: "FAQ", href: "/support" },
                    { label: "Contact", href: "/support" },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center px-2 py-2.5 rounded-lg font-sans-brand text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Bottom: theme toggle + currency + language + sign out in ONE sleek compact row */}
              <div className="px-3 py-2.5 border-t border-border/40 shrink-0 bg-card/40">
                <div className="flex items-center justify-between gap-1.5 relative" ref={currencyMenuRef}>
                  {/* 1. Ultra-Compact Icon-Only Theme Switcher (Light / Dark / Auto) */}
                  <div className="flex items-center p-0.5 rounded-xl bg-secondary/50 border border-border/40 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                        mounted && theme === 'light'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Light Mode"
                      aria-label="Light Mode"
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                        mounted && theme === 'dark'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Dark Mode"
                      aria-label="Dark Mode"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                        mounted && (theme === 'system' || !theme)
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="System Auto Mode"
                      aria-label="System Auto Mode"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 2. Compact Language Pill */}
                  <div className="flex-1 min-w-0">
                    <LanguageMenu variant="compact" align="start" side="top" sideOffset={8} />
                  </div>

                  {/* 3. Compact Currency Pill */}
                  {enabledCurrencies && enabledCurrencies.length > 0 && (
                    <div className="flex-1 min-w-0 relative">
                      <button
                        type="button"
                        onClick={() => setCurrencyMenuOpen((prev) => !prev)}
                        className="w-full h-8 flex items-center justify-between gap-1 px-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/40 text-[11px] font-semibold text-foreground transition-all truncate cursor-pointer"
                        title="Select currency"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <span className="text-xs font-extrabold text-primary leading-none">
                            {CURRENCY_SYMBOLS[currency] || currency}
                          </span>
                          <span className="truncate text-[11px] font-bold">{currency}</span>
                        </span>
                        <ChevronDown className={`w-2.5 h-2.5 opacity-60 shrink-0 transition-transform duration-200 ${currencyMenuOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Currency List Dropdown Popover */}
                      <AnimatePresence>
                        {currencyMenuOpen && (
                          <motion.div
                            className="absolute bottom-full right-0 mb-2 w-48 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border/60 bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] p-1.5 shadow-2xl z-[10010] backdrop-blur-xl"
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-1.5 tracking-wider border-b border-border/40 mb-1">
                              Select Currency
                            </div>
                            <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                              {(enabledCurrencies || []).map((c: any) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCurrency(c.code);
                                    setCurrencyMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    currency === c.code
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : "text-foreground hover:bg-secondary/50"
                                  }`}
                                >
                                  <span>{c.name || c.code}</span>
                                  <span className="font-extrabold">{CURRENCY_SYMBOLS[c.code] || c.symbol || c.code}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {user && (
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-2 pt-2 text-[11px] font-sans-brand text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Search Bar (Floats above Bottom Nav) ── */}
      <AnimatePresence>
        {searchOpen && (
          <div className="lg:hidden" ref={searchRef}>
            {/* Backdrop overlay — tapping closes search bar while preserving typed text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9998] bg-black/50 dark:bg-black/65 backdrop-blur-[2px]"
              onClick={() => setSearchOpen(false)}
            />

            {/* Mobile Bottom Search Container */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[9999] flex flex-col gap-2"
            >
              {/* Product suggestions popover (opens upward above input) */}
              <AnimatePresence>
                {searchQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="w-full rounded-2xl border border-border/80 bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] p-3 shadow-sm backdrop-blur-xl max-h-[50vh] overflow-y-auto"
                  >
                    <div className="px-1 py-1 mb-1 border-b border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Suggestions ({searchSuggestions.length})
                      </span>
                      {isSearchLoading && (
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {searchSuggestions.length === 0 && !isSearchLoading ? (
                      <div className="py-6 text-center text-xs text-muted-foreground font-sans-brand">
                        No products found for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchSuggestions.map((prod: any) => (
                          <Link
                            key={prod.id}
                            href={`/products/${prod.slug}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-all group"
                          >
                            <ImageWithFallback
                              src={prod.thumbnail || (Array.isArray(prod.images) ? prod.images[0] : null)}
                              alt={prod.name}
                              className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0 border border-border/40"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors font-sans-brand">
                                {prod.name}
                              </p>
                              {prod.category?.name && (
                                <p className="text-[10px] text-muted-foreground truncate font-sans-brand">
                                  {prod.category.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-primary font-sans-brand">
                                {formatPrice(Number(prod.price))}
                              </span>
                              {prod.compare_at_price && Number(prod.compare_at_price) > Number(prod.price) && (
                                <p className="text-[9px] text-muted-foreground line-through font-sans-brand">
                                  {formatPrice(Number(prod.compare_at_price))}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {searchQuery.trim().length >= 2 && (
                      <button
                        type="button"
                        onClick={(e) => handleSearch(e)}
                        className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-sans-brand text-xs font-bold transition-all text-center shadow-xs active:scale-[0.98]"
                      >
                        View all results for "{searchQuery}" →
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div className="relative flex items-center h-12 rounded-full border border-border/80 bg-card/98 dark:bg-[hsl(var(--charcoal-mid)/0.98)] shadow-sm backdrop-blur-xl px-4 focus-within:border-primary transition-all">
                <form onSubmit={handleSearch} className="flex items-center w-full gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full bg-transparent text-sm font-sans-brand text-foreground placeholder:text-muted-foreground/60 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none appearance-none rounded-full pr-1"
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                  />
                  {/* X icon on left of Search icon to clear & collapse */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
                    title="Clear & collapse search"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  {/* Search icon on right end to trigger search */}
                  <button
                    type="submit"
                    className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary/60 transition-colors shrink-0"
                    title="Search"
                  >
                    <Search className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <BottomNav
        productTray={bottomNavProductTray}
        onSearchClick={() => setSearchOpen((prev) => !prev)}
        onAuthClick={() => navigate("/auth")}
      />

    </>
  );
};

export default Navbar;
