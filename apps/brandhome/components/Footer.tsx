"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { ArrowUpRight } from "lucide-react";
import { Facebook, Twitter, Instagram, Youtube } from "@/components/ui/social-icons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import CurrencyMenu from "@/components/footer/CurrencyMenu";
import LanguageMenu from "@/components/footer/LanguageMenu";
import ThemeToggle from "@/components/footer/ThemeToggle";
import { useLanguage, getLocalizedBrandName, getLocalizedBrandSuffix } from "@/contexts/LanguageContext";
import { storefrontHref } from "@/lib/cross-app-urls";

type FooterStyle = "minimal" | "expanded" | "editorial";

interface FooterConfig {
  show_newsletter: boolean;
  show_social: boolean;
  show_categories: boolean;
  show_quick_links: boolean;
  show_trust_badges: boolean;
  copyright_text: string;
  footer_style: FooterStyle | "compact";
  bg_style: "transparent" | "glass" | "solid";
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_tiktok: string;
  social_youtube: string;
}

const defaultFooterConfig: FooterConfig = {
  show_newsletter: true,
  show_social: true,
  show_categories: true,
  show_quick_links: true,
  show_trust_badges: true,
  copyright_text: "",
  footer_style: "editorial",
  bg_style: "glass",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_tiktok: "",
  social_youtube: "",
};

interface FooterProps {
  variantOverride?: FooterStyle;
}

const Footer: React.FC<FooterProps> = ({ variantOverride }) => {
  const { language } = useLanguage();
  const year = new Date().getFullYear();

  const { data: siteSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["site-settings-footer"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["site_name", "site_description", "logo_url", "site_icon_url", "brand_suffix", "brand_prefix", "title_source", "title_image_url", "logo_display_style", "title_font"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => { const val = s.value; map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val; });
      return map;
    },
    staleTime: 15 * 60 * 1000,
  });

  const { data: footerConfig } = useQuery({
    queryKey: ["footer-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "footer_config").maybeSingle();
      return data?.value ? { ...defaultFooterConfig, ...(data.value as unknown as FooterConfig) } : defaultFooterConfig;
    },
    staleTime: 15 * 60 * 1000,
  });

  const merged = { ...(footerConfig || defaultFooterConfig), ...(variantOverride ? { footer_style: variantOverride } : {}) };
  // Normalize legacy "compact" → "expanded"
  const styleId: FooterStyle = merged.footer_style === "compact" ? "expanded" : (merged.footer_style as FooterStyle) || "editorial";
  const cfg = { ...merged, footer_style: styleId };

  const rawName = siteSettings?.site_name;
  const rawSiteName = String(typeof rawName === "object" && rawName !== null ? (rawName as any).value ?? "" : rawName ?? "ORIZINO");
  const siteName = getLocalizedBrandName(rawSiteName, language);
  const tagline = String(siteSettings?.site_description || "");
  const logoUrl = (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "/orizino-logo.svg";
  const rawSuffix = String(siteSettings?.brand_suffix || "").trim();
  const brandSuffix = getLocalizedBrandSuffix(rawSuffix, language);
  const brandPrefix = String(siteSettings?.brand_prefix || "").trim();

  const titleSource = (siteSettings?.title_source as string) || "text";
  const displayStyle = (siteSettings?.logo_display_style as string) || "both";
  const titleFont = (siteSettings?.title_font as string) || "";
  const titleImageUrl = (siteSettings?.title_image_url as string) || "";

  const showLogo = (displayStyle === "logo" || displayStyle === "both") && Boolean(logoUrl);
  const showTitle = displayStyle === "title" || displayStyle === "both" || Boolean(siteName);

  const renderTitleText = (imgClass = "") => {
    if (isLoadingSettings) {
      return <span className="inline-block h-5 w-24 rounded bg-muted/60 animate-pulse align-middle" />;
    }
    return titleSource === "image" && titleImageUrl
      ? <img src={titleImageUrl} alt={siteName} className={imgClass} />
      : <span className="tracking-[0.16em] uppercase font-bold select-none" style={{ fontFamily: titleFont ? `'${titleFont}', var(--font-title, var(--font-display))` : 'var(--font-title, var(--font-display))' }}>{siteName}</span>;
  };


  const shopLinks = [
    { label: "All Products", to: storefrontHref("/shop"), external: true },
    { label: "New Arrivals", to: storefrontHref("/shop?sort=new"), external: true },
    { label: "Bestsellers", to: storefrontHref("/shop?sort=popular"), external: true },
    { label: "Sale", to: storefrontHref("/shop?sale=true"), external: true },
  ];
  const supportLinks = [
    { label: "Help Center", to: storefrontHref("/support"), external: true },
    { label: "Order Tracking", to: "/track", external: false },
    { label: "Returns & Refund", to: storefrontHref("/refund"), external: true },
    { label: "FAQ", to: storefrontHref("/page/faq"), external: true },
  ];
  const companyLinks = [
    { label: "About & Docs", to: "/docs", external: false },
    { label: "Highlights", to: "/products", external: false },
    { label: "Press & News", to: "/news", external: false },
    { label: "Check Product", to: "/scanner-info", external: false },
  ];
  const legalLinks = [
    { label: "Privacy Policy", to: "/privacy", external: false },
    { label: "Terms of Service", to: "/terms", external: false },
    { label: "Return Policy", to: "/refund", external: false },
    { label: "Cookie Policy", to: "/cookies", external: false },
  ];

  const { data: footerNavs, isLoading: isLoadingFooterNavs } = useQuery({
    queryKey: ["footer-navs-brandhome"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "footer_navs").maybeSingle();
      return (data?.value as any) || null;
    },
    staleTime: 15 * 60 * 1000,
  });

  // Strictly pull CTA buttons from database (no hardcoded defaults)
  const ctaLinks: Array<{ id: string; label: string; href: string; variant?: string; is_active?: boolean }> =
    Array.isArray(footerNavs?.ctaLinks)
      ? footerNavs.ctaLinks.filter((c: any) => c.is_active !== false)
      : [];

  const resolveBrandHomeCtaHref = (href: string) => {
    if (href.startsWith("/shop") || href.startsWith("/categories") || href.startsWith("/support") || href.startsWith("/orders") || href.startsWith("/cart") || href.startsWith("/checkout")) {
      return storefrontHref(href);
    }
    return href;
  };

  const socials = [
    { icon: Instagram, href: cfg.social_instagram, label: "Instagram" },
    { icon: Twitter, href: cfg.social_twitter, label: "Twitter" },
    { icon: Facebook, href: cfg.social_facebook, label: "Facebook" },
    { icon: Youtube, href: cfg.social_youtube, label: "YouTube" },
  ].filter((s) => !!s.href);

  const copyrightText = cfg.copyright_text || (siteName ? `© ${year} ${siteName}. All rights reserved.` : `© ${year} All rights reserved.`);

  if (isLoadingSettings || isLoadingFooterNavs) {
    return (
      <footer className="w-full border-t border-border/40 py-10 px-6 space-y-6 bg-card/20 animate-pulse">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="h-6 w-36 bg-muted/60 rounded-md" />
            <div className="h-3.5 w-48 bg-muted/40 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted/60 rounded-md" />
            <div className="h-3 w-32 bg-muted/40 rounded-md" />
            <div className="h-3 w-28 bg-muted/40 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted/60 rounded-md" />
            <div className="h-3 w-32 bg-muted/40 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted/60 rounded-md" />
            <div className="h-3 w-36 bg-muted/40 rounded-md" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto h-8 bg-muted/30 rounded-xl" />
      </footer>
    );
  }



  // ────────────────────────────────────────────────────────────── MINIMAL
  if (styleId === "minimal") {
    return (
      <footer className="relative mt-12 border-t border-border/40">
        <div className="w-full px-4 md:px-8 lg:px-12 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-muted-foreground font-mono">{copyrightText}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageMenu />
          </div>
        </div>
      </footer>
    );
  }

  // ────────────────────────────────────────────────────────────── EDITORIAL
  if (styleId === "editorial") {
    return (
      <>
        {/* mobile/tablet */}
        <footer className="md:hidden relative mt-6 pb-[76px] px-4">
          <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-4 border-b border-border/40 flex items-center gap-3">
              {showLogo && logoUrl && (
                <div
                  className="w-12 h-12 shrink-0 bg-[#1E232A] dark:bg-[#F3EAD8] transition-colors duration-300"
                  style={{
                    maskImage: `url("${logoUrl}")`,
                    WebkitMaskImage: `url("${logoUrl}")`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                {showTitle && (
                  <h2 className="text-2xl font-bold leading-[1] tracking-tight text-foreground truncate">
                    {renderTitleText("inline-block h-6 w-auto object-contain align-middle")}
                    {brandPrefix && (
                      <span className="text-foreground/80 ml-1 text-[10px] font-medium tracking-tight align-baseline lowercase" style={{ fontFamily: titleFont ? `'${titleFont}', var(--font-title, var(--font-display))` : 'var(--font-title, var(--font-display))' }}>{brandPrefix}</span>
                    )}
                    {brandSuffix && (
                      <span
                        translate="no"
                        className="brand-suffix notranslate skiptranslate text-foreground/80 ml-1 text-[10px] font-medium tracking-tight align-baseline"
                        style={{ fontFamily: titleFont ? `'${titleFont}', var(--font-title, var(--font-display))` : 'var(--font-title, var(--font-display))' }}
                      >
                        {brandSuffix}
                      </span>
                    )}
                  </h2>
                )}
                {tagline && <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug truncate">{tagline}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex gap-1.5">
                  <ThemeToggle />
                  <LanguageMenu />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 px-4 py-4">
              {[{ t: "Shop", l: shopLinks }, { t: "Support", l: supportLinks }, { t: "Company", l: companyLinks }, { t: "Legal", l: legalLinks }].map((c) => (
                <div key={c.t}>
                  <div className="text-[7px] uppercase tracking-[0.25em] font-mono text-muted-foreground/70 mb-1">{c.t}</div>
                  <ul className="space-y-0.5">
                    {c.l.map((l) => (
                      <li key={l.label}>
                        {l.external ? (
                          <a href={l.to} target="_blank" rel="noreferrer" className="text-[10px] text-foreground/80 hover:text-primary">{l.label}</a>
                        ) : (
                          <Link to={l.to} className="text-[10px] text-foreground/80 hover:text-primary">{l.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center px-5 py-3 border-t border-border/40 bg-background/40">
              <span className="text-[9px] font-mono uppercase tracking-tight text-muted-foreground/70 text-center">{copyrightText}</span>
            </div>
            {cfg.show_social && socials.length > 0 && (
              <div className="flex items-center justify-center gap-5 py-3 border-t border-border/40">
                {socials.map(({ icon: Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-muted-foreground hover:text-primary"><Icon className="w-4 h-4" /></a>
                ))}
              </div>
            )}
          </div>
        </footer>

        {/* desktop */}
        <footer className="hidden md:block relative mt-10 w-full overflow-hidden">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
            {/* Top hairline */}
            <div className="border-t border-border/40 pt-5 pb-3" />

            {/* Logo + brand title (with motto under) + link columns on the right */}
            <div className="grid grid-cols-12 gap-6 lg:gap-10 pt-2 pb-6 border-b border-border/40 items-center">
              {/* Logo + title block */}
              <Link to="/home" className="col-span-12 md:col-span-5 flex items-center gap-4 lg:gap-5 group min-w-0">
                {showLogo && logoUrl && (
                  <div
                    className="w-16 h-16 shrink-0 bg-[#1E232A] dark:bg-[#F3EAD8] transition-colors duration-300 group-hover:scale-105"
                    style={{
                      maskImage: `url("${logoUrl}")`,
                      WebkitMaskImage: `url("${logoUrl}")`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                  />
                )}
                <div className="min-w-0 flex flex-col justify-center" style={{ gap: "clamp(4px, 0.6vw, 10px)" }}>
                  {showTitle && (
                    <h2
                      className="font-bold tracking-[-0.03em] leading-[0.9] text-foreground group-hover:text-primary transition-colors"
                      style={{
                        fontSize: "clamp(24px, 2.8vw, 36px)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {renderTitleText("inline-block h-[clamp(24px,2.8vw,36px)] w-auto object-contain align-middle")}
                      {brandPrefix && (
                        <span className="text-foreground/80 ml-1.5 font-medium tracking-tight align-baseline lowercase" style={{ fontSize: "clamp(11px, 0.9vw, 14px)", fontFamily: titleFont ? `'${titleFont}', var(--font-title, var(--font-display))` : 'var(--font-title, var(--font-display))' }}>
                          {brandPrefix}
                        </span>
                      )}
                      {brandSuffix && (
                        <span
                          translate="no"
                          className="brand-suffix notranslate skiptranslate text-foreground/80 ml-1.5 font-medium tracking-tight align-baseline"
                          style={{ fontSize: "clamp(11px, 0.9vw, 14px)", fontFamily: titleFont ? `'${titleFont}', var(--font-title, var(--font-display))` : 'var(--font-title, var(--font-display))' }}
                        >
                          {brandSuffix}
                        </span>
                      )}
                    </h2>
                  )}
                  {tagline && (
                    <p
                      className="text-foreground/50 leading-snug max-w-[320px] text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {tagline}
                    </p>
                  )}
                </div>
              </Link>

              {/* link columns — pushed to the right */}
              <div className="col-span-12 md:col-span-7 flex flex-wrap md:flex-nowrap md:justify-end gap-x-6 lg:gap-x-10 gap-y-3">
                {[{ t: "Shop", l: shopLinks }, { t: "Support", l: supportLinks }, { t: "Company", l: companyLinks }, { t: "Legal", l: legalLinks }].map((c) => (
                  <div key={c.t} className="w-1/2 md:w-auto">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-muted-foreground/70 mb-1.5">{c.t}</div>
                    <ul className="space-y-1">
                      {c.l.map((l) => (
                        <li key={l.label}>
                          {l.external ? (
                            <a href={l.to} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1 text-sm text-foreground/85 hover:text-primary transition-colors">
                              <span>{l.label}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <Link to={l.to} className="group inline-flex items-center gap-1 text-sm text-foreground/85 hover:text-primary transition-colors">
                              <span>{l.label}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured CTA Action Buttons Strip */}
            {ctaLinks.length > 0 && (
              <div className="py-3 border-b border-border/40 flex items-center justify-start flex-wrap gap-2.5">
                {ctaLinks.map((cta) => {
                  const targetUrl = resolveBrandHomeCtaHref(cta.href);
                  const isExternal = targetUrl.startsWith("http");
                  const variantClasses =
                    cta.variant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      : cta.variant === "secondary"
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40"
                      : cta.variant === "ghost"
                      ? "text-foreground hover:bg-accent/40"
                      : "border border-border/80 text-foreground hover:border-primary hover:text-primary bg-background/50";

                  if (isExternal) {
                    return (
                      <a
                        key={cta.id}
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 inline-flex items-center gap-1.5 active:scale-95 ${variantClasses}`}
                      >
                        {cta.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={cta.id}
                      to={targetUrl}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 inline-flex items-center gap-1.5 active:scale-95 ${variantClasses}`}
                    >
                      {cta.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Socials row */}
            {cfg.show_social && socials.length > 0 && (
              <div className="flex gap-3 py-4 border-b border-border/40">
                {socials.map(({ icon: Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            )}

            {/* Bottom meta */}
            <div className="grid grid-cols-12 gap-6 py-3">
              <div className="col-span-12 md:col-span-6 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
                <span>{copyrightText}</span>
              </div>
              <div className="col-span-12 md:col-span-6 flex items-center justify-start md:justify-end gap-4">
                <ThemeToggle />
                <LanguageMenu />
              </div>
            </div>
          </div>
        </footer>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────── EXPANDED (default fallback)
  return (
    <>
      {/* Mobile + tablet */}
      <footer className="lg:hidden relative mt-6 pb-[76px]">
        <div className="px-2.5 sm:px-3">
          <div className="border border-border/40 bg-card/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/40">
              <Link to="/home" className="inline-flex items-center gap-2 min-w-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={siteName} className="w-5 h-5 rounded-full object-cover ring-1 ring-border/40 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground text-[9px] font-bold">{(siteName || "L").charAt(0)}</span>
                  </div>
                )}
                {siteName && <span className="font-semibold text-[11px] tracking-tight text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>{siteName}</span>}
              </Link>
              {cfg.show_social && socials.length > 0 && (
                <div className="flex gap-2.5 shrink-0">
                  {socials.slice(0, 4).map(({ icon: Icon, href, label }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-muted-foreground/70 hover:text-primary"><Icon className="w-3 h-3" /></a>
                  ))}
                </div>
              )}
            </div>


            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5 px-3 py-2.5">
              {[{ title: "Shop", links: shopLinks }, { title: "Support", links: supportLinks }, { title: "Company", links: companyLinks }, { title: "Legal", links: legalLinks }].map((col) => (
                <div key={col.title} className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground/60 font-bold">{col.title}</h3>
                  <ul className="flex flex-col gap-0.5 text-[10px] font-light">
                    {col.links.slice(0, 4).map((l) => (
                      <li key={l.label}>
                        {l.external ? (
                          <a href={l.to} target="_blank" rel="noreferrer" className="text-foreground/75 hover:text-primary transition-colors truncate block">{l.label}</a>
                        ) : (
                          <Link to={l.to} className="text-foreground/75 hover:text-primary transition-colors truncate block">{l.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-background/40 border-t border-border/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                <span className="text-[8px] text-muted-foreground/70 uppercase tracking-tight font-mono truncate">{copyrightText}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle />
                <LanguageMenu />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Desktop — full width, 12-col, no right-side blank */}
      <footer className="hidden lg:block relative mt-14 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full border border-border/40 bg-card/40 overflow-hidden">
            <div className="grid grid-cols-12 gap-6 lg:gap-10 p-6 lg:p-8 border-b border-border/40">
              <div className="col-span-12 md:col-span-5 flex flex-col justify-between gap-4">
                <Link to="/home" className="inline-flex items-center gap-3 group w-fit">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="w-9 h-9 rounded-full object-cover ring-1 ring-border/40" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold">{(siteName || "L").charAt(0)}</span>
                    </div>
                  )}
                  {siteName && <span className="font-semibold text-sm tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>{siteName}</span>}
                </Link>
                <p className="font-mono uppercase tracking-[0.28em] text-[10px] sm:text-[11px] leading-relaxed max-w-sm text-foreground/40">{tagline}</p>
              </div>

            </div>

            <div className="grid grid-cols-12 gap-6 px-6 lg:px-8 py-6 lg:py-8">
              {[{ t: "Shop", l: shopLinks }, { t: "Support", l: supportLinks }, { t: "Company", l: companyLinks }, { t: "Legal", l: legalLinks }].map((c) => (
                <div key={c.t} className="col-span-6 md:col-span-3 flex flex-col gap-3">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold">{c.t}</h3>
                  <ul className="flex flex-col gap-2 text-[13px] font-light">
                    {c.l.map((l) => <li key={l.to}><Link to={l.to} className="text-foreground/80 hover:text-primary transition-colors">{l.label}</Link></li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="px-6 lg:px-8 py-3.5 bg-background/40 border-t border-border/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tight font-mono">{copyrightText}</span>
                <div className="flex items-center gap-2 px-2.5 py-0.5 bg-foreground/5 rounded-full border border-border/40">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">All systems operational</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                {cfg.show_social && socials.length > 0 && (
                  <div className="flex gap-3">
                    {socials.map(({ icon: Icon, href, label }) => (
                      <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-muted-foreground/70 hover:text-primary transition-colors"><Icon className="w-4 h-4" /></a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageMenu />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
// code:4ce0
