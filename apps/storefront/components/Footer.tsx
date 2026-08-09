"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MapPin, Phone, CreditCard, Truck, Shield, RefreshCcw, ChevronDown } from "lucide-react";
import CurrencyMenu from "@/components/footer/CurrencyMenu";
import LanguageMenu from "@/components/footer/LanguageMenu";
import BrandLogo from "@/components/BrandLogo";



const TRUST_BADGES = [
  { icon: Truck, label: "Free Delivery over ৳1000", shortLabel: "Free Delivery" },
  { icon: RefreshCcw, label: "7-Day Easy Returns", shortLabel: "7-Day Returns" },
  { icon: Shield, label: "Secure Checkout", shortLabel: "Secure Pay" },
  { icon: CreditCard, label: "Multiple Payment Options", shortLabel: "Flexible Pay" },
];

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "brand_suffix", "title_font", "logo_url", "site_icon_url", "social_instagram", "social_facebook", "footer_config", "contact_email", "contact_phone", "contact_address", "footer_navs"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 0,
  });

  const siteName = (siteSettings?.site_name as string) || "Orizino";
  const brandSuffix = (siteSettings?.brand_suffix as string) || "co.";
  const titleFont = (siteSettings?.title_font as string) || "";
  const logoUrl = (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "";
  const footerCfg = (siteSettings?.footer_config as any) || {};
  const instagramUrl = footerCfg?.social_instagram || (siteSettings?.social_instagram as string) || "";
  const contactEmail = footerCfg?.contact_email || (siteSettings?.contact_email as string) || "";
  const contactPhone = footerCfg?.contact_phone || (siteSettings?.contact_phone as string) || "";
  const contactAddress = footerCfg?.contact_address || (siteSettings?.contact_address as string) || "";

  const dynamicNavs = (siteSettings?.footer_navs as any) || {};
  const BRAND_LINKS = Array.isArray(dynamicNavs.brandLinks) && dynamicNavs.brandLinks.length > 0
    ? dynamicNavs.brandLinks
    : [
      { label: "About Orizino", href: "/page/about" },
      { label: "Story & Craft", href: "/page/about" },
      { label: "Streetwear Care", href: "/support" },
      { label: "Sustainability", href: "/page/about" },
    ];

  const SUPPORT_LINKS = Array.isArray(dynamicNavs.supportLinks) && dynamicNavs.supportLinks.length > 0
    ? dynamicNavs.supportLinks
    : [
      { label: "Help Center", href: "/support" },
      { label: "Track Order", href: "/orders" },
      { label: "Return & Exchange", href: "/refund" },
      { label: "Contact Us", href: "/support" },
      { label: "FAQ", href: "/page/faq" },
    ];

  const ACCOUNT_LINKS = Array.isArray(dynamicNavs.accountLinks) && dynamicNavs.accountLinks.length > 0
    ? dynamicNavs.accountLinks
    : [
      { label: "My Profile", href: "/profile" },
      { label: "Order History", href: "/orders" },
      { label: "Saved Wishlist", href: "/wishlist" },
      { label: "Account Settings", href: "/settings" },
    ];

  const LEGAL_LINKS = Array.isArray(dynamicNavs.legalLinks) && dynamicNavs.legalLinks.length > 0
    ? dynamicNavs.legalLinks
    : [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Return Policy", href: "/refund" },
      { label: "Cookie Policy", href: "/cookies" },
    ];

  const { data: categories = [] } = useQuery({
    queryKey: ["footer-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(7);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const SHOP_LINKS = [
    { label: "All Products", href: "/inventory" },
    { label: "New Arrivals", href: "/inventory?sort=newest" },
    { label: "Featured", href: "/inventory?featured=true" },
    ...categories.map((c: any) => ({ label: c.name, href: `/categories/${c.slug}` })),
    { label: "Sale", href: "/inventory?sale=true" },
  ];

  const extraNavSections = Array.isArray(dynamicNavs?.extraSections) ? dynamicNavs.extraSections : [];

  const FOOTER_SECTIONS = [
    { id: "shop", title: "Shop", links: SHOP_LINKS, colClass: "" },
    { id: "brand", title: "Brand", links: BRAND_LINKS, colClass: "" },
    { id: "support", title: "Support", links: SUPPORT_LINKS, colClass: "" },
    { id: "account", title: "Account", links: ACCOUNT_LINKS, colClass: "" },
    ...extraNavSections.map((sec: any, idx: number) => ({
      id: sec.id || `extra-${idx}`,
      title: sec.title || sec.name || "More",
      links: Array.isArray(sec.links) ? sec.links : [],
      colClass: "",
    })),
  ];

  // Dynamically group ALL footer sections into side-by-side pairs for mobile
  const SECTION_PAIRS = [];
  for (let i = 0; i < FOOTER_SECTIONS.length; i += 2) {
    SECTION_PAIRS.push({
      id: `pair-${i}`,
      left: FOOTER_SECTIONS[i],
      right: FOOTER_SECTIONS[i + 1],
    });
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await (supabase.from as any)("newsletter_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
      setSubscribed(true);
      setEmail("");
    } catch { }
  };

  return (
    <footer style={{ background: "hsl(var(--background))" }} className="relative overflow-hidden border-t border-border/40">
      {/* Dynamic Edge-to-Edge SVG Watermark - Fits 100% width automatically for any font and title length */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden px-4 sm:px-6 lg:px-8 xl:px-10 z-0" aria-hidden="true">
        <svg
          viewBox="0 0 1000 130"
          className="w-full h-full pointer-events-none select-none"
          preserveAspectRatio="none"
        >
          <text
            x="0"
            y="55%"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            dominantBaseline="central"
            className="fill-foreground/5 dark:fill-foreground/8 font-extrabold uppercase select-none pointer-events-none"
            style={{
              fontFamily: titleFont
                ? `'${titleFont}', var(--font-title, var(--font-display))`
                : 'var(--font-title, var(--font-display))',
              fontSize: "110px",
            }}
          >
            {siteName}
          </text>
        </svg>
      </div>

      {/* Trust badges strip — Single compact row */}
      <div className="relative border-b border-border/15 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-nowrap items-center justify-between overflow-x-auto gap-2 sm:gap-4 py-0.5 divide-x divide-border/15 scrollbar-none">
            {TRUST_BADGES.map(({ icon: Icon, label, shortLabel }, idx) => (
              <div
                key={label}
                className={`flex items-center gap-1 shrink-0 ${idx > 0 ? "pl-2 sm:pl-3" : ""}`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-primary/30 dark:border-border/60 bg-primary/10 dark:bg-secondary/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-primary dark:text-foreground" strokeWidth={1.5} />
                </div>
                <span className="font-sans-brand text-[8.5px] sm:text-[10px] tracking-wide text-foreground/80 leading-none font-medium whitespace-nowrap">
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10">

        {/* ── DESKTOP LAYOUT (lg+): Brand col + 4 nav columns in a 12-col grid ── */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 pt-6 pb-6 lg:pt-8 lg:pb-8 border-b border-border/15">

          {/* Brand column — 4 cols */}
          <div className="lg:col-span-4 flex flex-col justify-between py-1">
            <div className="flex flex-col gap-3">
              {/* 1. Logo Title (Bigger) + Suffix + Underline */}
              <div className="w-fit flex flex-col gap-1 group shrink-0">
                <Link href="/" className="inline-flex items-center gap-2.5 sm:gap-3">
                  {logoUrl && (
                    <BrandLogo logoUrl={logoUrl} alt={siteName} className="h-6 w-8 sm:h-7 sm:w-9 lg:h-10 lg:w-13 transition-all duration-300 group-hover:scale-105" />
                  )}
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span
                      className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl tracking-[0.14em] uppercase text-foreground font-extrabold group-hover:text-primary transition-colors duration-300"
                      style={{
                        fontFamily: titleFont
                          ? `'${titleFont}', var(--font-title, var(--font-display))`
                          : 'var(--font-title, var(--font-display))',
                      }}
                    >
                      {siteName}
                    </span>
                    {brandSuffix && (
                      <span className="text-xs lg:text-sm font-bold tracking-widest text-primary/80 uppercase transition-colors group-hover:text-primary">
                        {brandSuffix}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="w-full h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:h-1 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
              </div>

              {/* 2. Text under logo title with reduced width length */}
              <p className="font-sans-brand text-xs lg:text-sm leading-relaxed max-w-[32ch] text-foreground/70">
                Premium drop shoulder streetwear from Kushtia, crafted for those who carry themselves with quiet intention.
              </p>
            </div>

            {/* 3. Contacts moved down to the bottom of the column */}
            <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans-brand text-xs">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 text-foreground/70 hover:text-primary transition-colors whitespace-nowrap">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary dark:text-foreground/80" strokeWidth={1.5} />
                  <span>{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 text-foreground/70 hover:text-primary transition-colors whitespace-nowrap">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary dark:text-foreground/80" strokeWidth={1.5} />
                  <span>{contactPhone}</span>
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"
                  className="w-5 h-5 rounded-full border flex items-center justify-center transition-all hover:border-primary group border-border/60 shrink-0"
                >
                  <Instagram className="w-2.5 h-2.5 transition-colors group-hover:text-primary text-primary dark:text-foreground" />
                </a>
              )}
            </div>
          </div>

          {/* 4 Nav Sections — 2 cols each = 8 cols, total = 12 */}
          {FOOTER_SECTIONS.map((sec) => (
            <div key={sec.id} className="lg:col-span-2 pt-1">
              <p className="text-primary dark:text-foreground font-extrabold tracking-[0.2em] text-xs uppercase font-sans-brand mb-2">
                {sec.title}
              </p>
              <ul className="flex flex-col gap-1.5">
                {sec.links.map((link: any) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-sans-brand text-xs transition-colors text-foreground/65 hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── MOBILE LAYOUT (< lg): Brand block + Accordion section pairs ── */}
        <div className="lg:hidden pt-1 pb-0.5 border-b border-border/15 flex flex-col gap-1">

          {/* Mobile Brand block */}
          <div className="flex flex-col gap-0.5 py-0.5">
            <div className="flex flex-row items-center justify-between gap-2 w-full">
              {/* Logo + Name + Suffix + Underline */}
              <div className="w-fit flex flex-col gap-0.5 group shrink-0">
                <Link href="/" className="inline-flex items-center gap-1.5">
                  {logoUrl && (
                    <BrandLogo logoUrl={logoUrl} alt={siteName} className="h-4 w-5 transition-all duration-300 group-hover:scale-105" />
                  )}
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-xs tracking-[0.14em] uppercase text-foreground font-extrabold group-hover:text-primary transition-colors duration-300"
                      style={{
                        fontFamily: titleFont
                          ? `'${titleFont}', var(--font-title, var(--font-display))`
                          : 'var(--font-title, var(--font-display))',
                      }}
                    >
                      {siteName}
                    </span>
                    {brandSuffix && (
                      <span className="text-[8px] font-bold tracking-widest text-primary/80 uppercase transition-colors group-hover:text-primary">
                        {brandSuffix}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="w-full h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:h-1 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
              </div>

              {/* Contacts — Right side */}
              <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 font-sans-brand text-[8.5px]">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-0.5 text-foreground/60 hover:text-primary transition-colors whitespace-nowrap">
                    <Mail className="w-2.5 h-2.5 flex-shrink-0 text-primary dark:text-foreground/80" strokeWidth={1.5} />
                    <span>{contactEmail}</span>
                  </a>
                )}
                {contactPhone && (
                  <a href={`tel:${contactPhone}`} className="flex items-center gap-0.5 text-foreground/60 hover:text-primary transition-colors whitespace-nowrap">
                    <Phone className="w-2.5 h-2.5 flex-shrink-0 text-primary dark:text-foreground/80" strokeWidth={1.5} />
                    <span>{contactPhone}</span>
                  </a>
                )}
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"
                    className="w-4 h-4 rounded-full border flex items-center justify-center transition-all hover:border-primary group border-border/60 shrink-0"
                  >
                    <Instagram className="w-2 h-2 transition-colors group-hover:text-primary text-primary dark:text-foreground" />
                  </a>
                )}
              </div>
            </div>

            {/* Mobile: Tagline + Subscribe side by side */}
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-0.5">
              <p className="font-sans-brand text-[8.5px] leading-tight text-foreground/60 flex-1 min-w-0 pr-1">
                Streetwear from Kushtia, crafted with quiet intention.
              </p>
              <div className="shrink-0">
                {subscribed ? (
                  <p className="font-sans-brand text-[8.5px] text-muted-foreground">✓ Subscribed.</p>
                ) : (
                  <form
                    onSubmit={handleNewsletterSubmit}
                    className="flex items-center gap-0 w-[145px] sm:w-[180px] h-5 sm:h-6 rounded-full border border-border/60 bg-secondary/30 dark:bg-card/60 overflow-hidden focus-within:bg-background focus-within:border-border transition-all p-0.5"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Subscribe to newsletter"
                      className="flex-1 min-w-0 px-2 h-full bg-transparent text-[8px] sm:text-[8.5px] font-sans-brand outline-none border-none ring-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0"
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 px-2 sm:px-2.5 h-full rounded-full font-sans-brand text-[7.5px] sm:text-[8.5px] font-bold tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                    >
                      Join
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Mobile accordion section pairs */}
          {SECTION_PAIRS.map((pair) => {
            const isOpen = !!openSections[pair.id];
            return (
              <div key={pair.id} className="border-b border-border/10 last:border-none py-0.5">
                {/* Pair Header with Single Middle Arrow */}
                <button
                  type="button"
                  onClick={() => toggleSection(pair.id)}
                  className="w-full flex items-center justify-between py-0.5 relative cursor-pointer select-none group"
                >
                  {/* Left Title */}
                  <span className="text-primary dark:text-foreground font-extrabold tracking-[0.2em] text-[9px] sm:text-[10px] uppercase font-sans-brand text-left">
                    {pair.left.title}
                  </span>

                  {/* Single Middle Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-primary" : "text-foreground/60 group-hover:text-primary"
                      }`}
                    />
                  </div>

                  {/* Right Title (if present) */}
                  {pair.right ? (
                    <span className="text-primary dark:text-foreground font-extrabold tracking-[0.2em] text-[9px] sm:text-[10px] uppercase font-sans-brand text-right">
                      {pair.right.title}
                    </span>
                  ) : (
                    <span className="w-10" />
                  )}
                </button>

                {/* Pair Link Columns (Expand Together Side-by-Side) */}
                {isOpen && (
                  <div className="grid grid-cols-2 gap-2 mt-1 pb-0.5">
                    {/* Left Links */}
                    <ul className="flex flex-col gap-0.5 text-left">
                      {pair.left.links.map((link: any) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="font-sans-brand text-[8.5px] sm:text-[9.5px] transition-colors text-foreground/60 hover:text-primary"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {/* Right Links (if present) */}
                    {pair.right && (
                      <ul className="flex flex-col gap-0.5 text-right items-end">
                        {pair.right.links.map((link: any) => (
                          <li key={link.label}>
                            <Link
                              href={link.href}
                              className="font-sans-brand text-[8.5px] sm:text-[9.5px] transition-colors text-foreground/60 hover:text-primary"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP BOTTOM BAR (lg+) ── */}
        <div className="hidden lg:flex items-center justify-between py-4 lg:py-5 w-full font-sans-brand text-xs">
          {/* Left: Copyright text and CTA links */}
          <div className="flex items-center gap-x-3 text-foreground/60 shrink-0">
            <span>© {year} {siteName}. All rights reserved.</span>
            <span className="text-foreground/20">•</span>
            <div className="flex items-center gap-x-3">
              {LEGAL_LINKS.map((l, idx) => (
                <React.Fragment key={l.label}>
                  {idx > 0 && <span className="text-foreground/20">•</span>}
                  <Link href={l.href} className="hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Center: Subscribe Bar (Increased Width) */}
          <div className="flex justify-center flex-1 px-4">
            {subscribed ? (
              <p className="text-xs text-muted-foreground">✓ Subscribed to newsletter.</p>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex items-center gap-0 w-[280px] xl:w-[340px] h-7 rounded-full border border-border/60 bg-secondary/30 dark:bg-card/60 overflow-hidden focus-within:bg-background focus-within:border-border transition-all p-0.5"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Subscribe to newsletter"
                  className="flex-1 min-w-0 px-3 h-full bg-transparent text-xs font-sans-brand outline-none border-none ring-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0"
                />
                <button
                  type="submit"
                  className="flex-shrink-0 px-3.5 h-full rounded-full font-sans-brand text-xs font-bold tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                >
                  Join
                </button>
              </form>
            )}
          </div>

          {/* Right: Currency & Language menus */}
          <div className="flex items-center gap-2 shrink-0">
            <CurrencyMenu />
            <LanguageMenu />
          </div>
        </div>

        {/* ── MOBILE BOTTOM BAR (< lg) ── */}
        <div className="lg:hidden relative w-full flex flex-col sm:flex-row items-center justify-center py-1 overflow-x-auto scrollbar-none text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-2.5 gap-y-1 font-sans-brand text-[8.5px] sm:text-[9px] text-foreground/40 leading-none">
            {/* Copyright text */}
            <span className="inline-flex items-center shrink-0">© {year} {siteName}. All rights reserved.</span>

            {/* Separator dot — visible on sm+ screens */}
            <span className="hidden sm:inline-flex items-center text-foreground/20 text-[7px] shrink-0">•</span>

            {/* Legal CTA links */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-2.5 shrink-0">
              {LEGAL_LINKS.map((l, idx) => (
                <React.Fragment key={l.label}>
                  {idx > 0 && <span className="inline-flex items-center text-foreground/20 text-[7px] shrink-0">•</span>}
                  <Link
                    href={l.href}
                    className="inline-flex items-center transition-colors hover:text-foreground/70 shrink-0"
                  >
                    {l.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom padding for fixed nav clearance */}
      <div className="h-[52px] lg:h-0" />
    </footer>
  );
};

// Instagram icon inline (avoids import issue if not in ui package)
function Instagram({ className, style }: { className?: string; style?: Record<string, any> }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default Footer;
