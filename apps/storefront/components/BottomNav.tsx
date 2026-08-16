"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { Home, LayoutGrid, ShoppingCart, Heart, User, ChevronDown, Zap, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { guestCartCount as guestCartCountFn } from "@/lib/guest-cart";
import { motion, AnimatePresence } from "framer-motion";

export interface BottomNavProductTray {
  product: {
    name: string;
    price: number;
    thumbnail?: string | null;
    stockQuantity: number;
  };
  onAddToCart: () => void;
  onBuyNow: () => void;
  addingToCart: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface BottomNavProps {
  onSearchClick?: () => void;
  onAuthClick?: () => void;
  productTray?: BottomNavProductTray;
}

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "__search__" },
  { icon: ShoppingCart, label: "Cart", path: "/cart" },
  { icon: Heart, label: "Wishlist", path: "/wishlist" },
  { icon: User, label: "Profile", path: "__profile__" },
];

type NavStyle = "liquid" | "notch" | "pill" | "glow" | "wave";

const BottomNav: React.FC<BottomNavProps> = ({ onSearchClick, onAuthClick, productTray }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [catOpen, setCatOpen] = useState(false);
  const [trayVisible, setTrayVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileBottomNavId = "mobile-bottom-nav";
  const canShowProductTray = Boolean(productTray && location.pathname.startsWith("/product/"));

  // Load nav style from DB
  const { data: mobileConfig, isLoading: mobileConfigLoading } = useQuery({
    queryKey: ["mobile-ui-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").eq("key", "mobile_ui_config");
      if (data?.[0]) {
        const val = data[0].value;
        return typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const navStyle: NavStyle | null = mobileConfigLoading ? null : ((mobileConfig as any)?.nav_style || "liquid");


  const { data: dbCategories = [] } = useQuery({
    queryKey: ["nav-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id, icon, icon_url").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const parentCategories = dbCategories.filter((c) => !c.parent_id);

  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("cart_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  const [guestCartCount, setGuestCartCount] = useState(0);
  useEffect(() => {
    if (user) return;
    const refresh = () => setGuestCartCount(guestCartCountFn());
    refresh();
    window.addEventListener("guest-cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("guest-cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [user]);
  const effectiveCartCount = user ? cartCount : guestCartCount;

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("wishlist_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    path: item.path === "__profile__" ? (user ? "/profile" : "__auth__") : item.path,
  }));

  const getActiveIndex = () => {
    if (catOpen) return 1;
    return items.findIndex((item) => item.path === location.pathname);
  };

  const activeIndex = getActiveIndex();

  useEffect(() => {
    if (!canShowProductTray) {
      setTrayVisible(false);
      return;
    }

    let rafId = 0;
    let lastVisible: boolean | null = null;

    const compute = () => {
      rafId = 0;
      if (window.innerWidth >= 1024) {
        if (lastVisible !== false) {
          lastVisible = false;
          setTrayVisible(false);
        }
        return;
      }
      const next = window.scrollY > 500;
      if (next !== lastVisible) {
        lastVisible = next;
        setTrayVisible(next);
      }
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [canShowProductTray]);


  const [ripple, setRipple] = useState<{ index: number; key: number } | null>(null);

  const handleClick = (item: typeof items[0], index: number) => {
    setRipple({ index, key: Date.now() });
    if (item.path === "__search__") {
      setCatOpen(false);
      onSearchClick?.();
    } else if (item.path === "__categories__") {
      setCatOpen(!catOpen);
    } else if (item.path === "__auth__") {
      onAuthClick?.();
    } else {
      setCatOpen(false);
      navigate(item.path);
    }
  };

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

  const CartBadge = ({ className = "" }: { className?: string }) =>
    effectiveCartCount > 0 ? (
      <motion.span
        key={effectiveCartCount}
        animate={cartPop ? { scale: [1, 1.85, 0.85, 1.2, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "backOut" }}
        className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center shadow-[0_0_10px_hsl(var(--destructive)/0.6)] ${className}`}
      >
        {effectiveCartCount > 99 ? "99+" : effectiveCartCount}
      </motion.span>
    ) : null;

  const WishlistBadge = ({ className = "" }: { className?: string }) =>
    wishlistCount > 0 ? (
      <span className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ${className}`}>
        {wishlistCount > 99 ? "99+" : wishlistCount}
      </span>
    ) : null;

  const RippleEffect = ({ active }: { active: boolean }) =>
    active && ripple ? (
      <motion.span
        key={ripple.key}
        initial={{ scale: 0, opacity: 0.4 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0 m-auto w-8 h-8 rounded-full pointer-events-none"
        style={{ background: "hsl(var(--primary) / 0.25)" }}
      />
    ) : null;

  const renderProductTray = (surfaceClassName = "") => (
    <AnimatePresence>
      {canShowProductTray && trayVisible && productTray && (
        <motion.div
          id="mobile-bottom-nav-tray"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="relative z-[60] -mb-px lg:hidden"
        >
          <div className={`glass-strong border-t border-border/50 overflow-hidden ${surfaceClassName}`}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {productTray.product.thumbnail && (
                <img
                  src={productTray.product.thumbnail}
                  alt=""
                  className="w-9 h-9 rounded-xl object-cover shrink-0"
                />
              )}

              <div className="min-w-0 flex-1">
                {productTray.disabled && productTray.disabledReason ? (
                  <>
                    <p className="truncate text-[11px] uppercase tracking-[0.15em] text-amber-500 font-semibold">Action required</p>
                    <p className="text-[12px] font-medium text-foreground truncate mt-0.5">{productTray.disabledReason}</p>
                  </>
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">{productTray.product.name}</p>
                    <p className="text-lg font-bold text-gradient leading-none mt-1">{formatPrice(productTray.product.price)}</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={productTray.onAddToCart}
                  disabled={productTray.addingToCart || productTray.product.stockQuantity === 0 || productTray.disabled}
                  className="h-10 px-3 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {productTray.addingToCart ? "Adding..." : "Cart"}
                </button>

                <button
                  onClick={productTray.onBuyNow}
                  disabled={productTray.product.stockQuantity === 0 || productTray.disabled}
                  className="h-10 px-3.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4" />
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Categories Panel (shared) ──
  const CategoriesPanel = (
    <AnimatePresence>
      {catOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setCatOpen(false)}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className={`fixed left-0 right-0 z-[10000] lg:hidden ${canShowProductTray && trayVisible ? "bottom-[calc(8rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"}`}
          >
            <div className="bg-card border-t border-border rounded-t-2xl max-h-[60vh] overflow-y-auto p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Categories</h3>
                <button onClick={() => setCatOpen(false)} className="text-muted-foreground">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {parentCategories.map((cat) => (
                  <Link key={cat.id} to={`/categories/${cat.slug}`} onClick={() => setCatOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                    {cat.icon_url ? (
                      <img src={cat.icon_url} alt="" className="w-8 h-8 rounded-lg object-contain" />
                    ) : cat.icon ? (
                      <span className="text-2xl">{cat.icon}</span>
                    ) : (
                      <LayoutGrid className="w-6 h-6 text-muted-foreground" />
                    )}
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">{cat.name}</span>
                  </Link>
                ))}
              </div>
              <Link to="/inventory" onClick={() => setCatOpen(false)}
                className="block mt-3 text-center text-sm text-primary font-medium py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                View All Products
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ══════════════════════════════════════════════
  // STYLE 1: Liquid Ball
  // ══════════════════════════════════════════════
  const renderLiquid = () => {
    return (
      <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden">
        {renderProductTray("border-x-0 rounded-none")}
        <div className="bg-card border-t border-border relative" style={{ overflow: "visible" }}>
          <div className="flex w-full relative" style={{ overflow: "visible" }}>
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.label}
                  onClick={() => handleClick(item, index)}
                  className="flex-1 flex flex-col items-center justify-center h-[52px] bg-transparent border-none cursor-pointer relative"
                  style={{ WebkitTapHighlightColor: "transparent", overflow: "visible" }}
                >
                  {/* Ball + Icon move together */}
                  <motion.div
                    animate={isActive ? { y: -18 } : { y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="relative z-10 flex items-center justify-center"
                    style={{ width: 42, height: 42 }}
                  >
                    {/* Animated ball background */}
                    {isActive && (
                      <motion.div
                        layoutId="liquid-ball"
                        className="absolute inset-0 border-4 border-card liquid-blob-morph"
                        style={{
                          background: "hsl(var(--primary))",
                          boxShadow: "0 0 12px hsl(var(--primary) / 0.5), 0 4px 16px hsl(var(--primary) / 0.3)",
                          borderRadius: "50%",
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      />
                    )}
                    {/* Icon centered inside ball */}
                    <item.icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    {item.label === "Cart" && <CartBadge className="z-20" />}
                    {item.label === "Wishlist" && <WishlistBadge className="z-20" />}
                  </motion.div>
                  <RippleEffect active={ripple?.index === index} />

                  {/* Label */}
                  <motion.span
                    animate={isActive ? { opacity: 1, y: -8, scale: 1 } : { opacity: 0, y: 4, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="absolute bottom-1 text-[10px] font-semibold tracking-wide"
                    style={{ color: "hsl(var(--primary))" }}
                  >
                    {item.label}
                  </motion.span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </nav>
    );
  };

  // ══════════════════════════════════════════════
  // STYLE 2: Notch
  // ══════════════════════════════════════════════
  const renderNotch = () => {
    return (
      <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden flex flex-col justify-end pb-[env(safe-area-inset-bottom)]">
        {renderProductTray("mx-2 rounded-t-2xl border-x border-border/50")}
        <div className="bg-card border-t border-border w-full relative" style={{ overflow: "visible" }}>
          <div className="flex items-center w-full px-2 py-2 relative">
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.label}
                  ref={el => { itemRefs.current[index] = el; }}
                  onClick={() => handleClick(item, index)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-transparent border-none cursor-pointer relative"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* Top notch bar indicator - centered via layoutId */}
                  {isActive && (
                    <motion.div
                      layoutId="notch-bar"
                      className="absolute -top-2 left-1/2 w-10 h-1 rounded-b-full"
                      style={{
                        background: "hsl(var(--primary))",
                        boxShadow: "0 2px 8px hsl(var(--primary) / 0.4)",
                        transform: "translateX(-50%)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    style={isActive ? { filter: "drop-shadow(0 2px 6px hsl(var(--primary) / 0.25))" } : undefined}
                  />
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="text-[9px] font-bold tracking-wide overflow-hidden"
                        style={{ color: "hsl(var(--primary))" }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.label === "Cart" && <CartBadge />}
                  {item.label === "Wishlist" && <WishlistBadge />}
                  <RippleEffect active={ripple?.index === index} />
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  };

  // ══════════════════════════════════════════════
  // STYLE 3: Pill / Capsule
  // ══════════════════════════════════════════════
  const renderPill = () => (
    <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      {renderProductTray("border-x-0 rounded-none")}
      <div className="pill-nav-bar">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button key={item.label} onClick={() => handleClick(item, index)}
              className={`pill-nav-item${isActive ? " active" : ""}`}>
              <motion.div
                animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="relative"
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label === "Cart" && <CartBadge />}
                {item.label === "Wishlist" && <WishlistBadge />}
              </motion.div>
              <AnimatePresence>
                {isActive && (
                  <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pill-label">{item.label}</motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      
    </nav>
  );

  // ══════════════════════════════════════════════
  // STYLE 4: Glow Dock
  // ══════════════════════════════════════════════
  const renderGlow = () => (
    <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden">
      {renderProductTray("border-x-0 rounded-none")}
      <div className="glow-nav-bar">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button key={item.label} onClick={() => handleClick(item, index)}
              className={`glow-nav-item${isActive ? " active" : ""}`}>
              <motion.div
                animate={isActive ? { scale: 1.25, y: -8 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="relative"
              >
                <item.icon className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? "drop-shadow-[0_0_6px_hsl(var(--primary))]" : ""}`} />
                {item.label === "Cart" && <CartBadge />}
                {item.label === "Wishlist" && <WishlistBadge />}
                {isActive && (
                  <motion.div
                    layoutId="glow-ring"
                    className="absolute -inset-2.5 rounded-full border-2 border-primary/40"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
              </motion.div>
              <motion.span
                animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 4 }}
                className="glow-label"
              >{item.label}</motion.span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  );

  // ══════════════════════════════════════════════
  // STYLE 5: Wave
  // ══════════════════════════════════════════════
  const renderWave = () => {
    const itemCount = items.length;
    const cx = activeIndex >= 0 ? (activeIndex + 0.5) * (400 / itemCount) : -100;

    return (
      <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden">
        {renderProductTray("border-x-0 rounded-none")}
        <div className="wave-nav-bar">
          <svg className="wave-nav-svg" viewBox="0 0 400 62" preserveAspectRatio="none">
            <motion.path
              animate={{
                d: activeIndex >= 0
                  ? `M0,18 L${cx - 30},18 Q${cx},0 ${cx},-12 Q${cx},0 ${cx + 30},18 L400,18 L400,62 L0,62 Z`
                  : "M0,18 L400,18 L400,62 L0,62 Z"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
            />
          </svg>
          <div className="wave-nav-items">
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button key={item.label} onClick={() => handleClick(item, index)}
                  className={`wave-nav-item${isActive ? " active" : ""}`}>
                  <motion.div
                    animate={isActive ? { y: -18, scale: 1.1 } : { y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className={`relative flex items-center justify-center ${isActive ? "w-9 h-9 rounded-full bg-primary shadow-lg" : ""}`}
                  >
                    <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    {item.label === "Cart" && <CartBadge />}
                    {item.label === "Wishlist" && <WishlistBadge />}
                  </motion.div>
                  <motion.span
                    animate={{ opacity: isActive ? 1 : 0.5, y: isActive ? -2 : 0 }}
                    className="wave-label"
                  >{item.label}</motion.span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </nav>
    );
  };

  const renderSkeleton = () => (
    <nav id={mobileBottomNavId} suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden">
      <div className="bg-card border-t border-border">
        <div className="flex w-full">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {}}
              className="flex-1 flex flex-col items-center justify-center h-[52px] bg-transparent border-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-card" />
    </nav>
  );

  const renderNav = () => {
    if (navStyle === null) return renderSkeleton();
    switch (navStyle) {
      case "notch": return renderNotch();
      case "pill": return renderPill();
      case "glow": return renderGlow();
      case "wave": return renderWave();
      default: return renderLiquid();
    }
  };


  return (
    <>
      {CategoriesPanel}
      {renderNav()}
    </>
  );
};

export default BottomNav;
// code:4ce0
