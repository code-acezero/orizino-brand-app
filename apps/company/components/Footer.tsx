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
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const year = new Date().getFullYear();

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-footer"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["site_name", "site_description", "logo_url", "site_icon_url", "brand_suffix", "brand_prefix", "title_source", "title_image_url"]);
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
  const siteName = String(typeof rawName === "object" && rawName !== null ? (rawName as any).value ?? "" : rawName ?? "");
  const tagline = String(siteSettings?.site_description || "");
  const logoUrl = (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "/orizino-logo.svg";
  const brandSuffix = String(siteSettings?.brand_suffix || "").trim();
  const brandPrefix = String(siteSettings?.brand_prefix || "").trim();
  const titleSource = (siteSettings?.title_source as string) === "image" ? "image" : "text";
  const titleImageUrl = (siteSettings?.title_image_url as string) || "";
  const useTitleImage = titleSource === "image" && !!titleImageUrl;
  const renderTitleText = (imgClass: string) =>
    useTitleImage
      ? <img src={titleImageUrl} alt={siteName || "Title"} className={imgClass} loading="eager" decoding="async" />
      : <>{siteName}</>;

  const handleSubscribe = async () => {
    if (!email.trim() || subscribing) return;
    setSubscribing(true);
    const { error } = await supabase.from("email_subscriptions").insert({ email: email.trim().toLowerCase() });
    setSubscribing(false);
    if (error?.code === "23505") toast.success("You're already subscribed!");
    else if (error) toast.error("Subscription failed.");
    else { toast.success("Subscribed!"); setEmail(""); }
  };

  const shopLinks = [
    { label: "All Products", to: "/inventory" },
    { label: "New Arrivals", to: "/shop?sort=new" },
    { label: "Bestsellers", to: "/shop?sort=popular" },
    { label: "Sale", to: "/shop?sale=true" },
  ];
  const supportLinks = [
    { label: "Help Center", to: "/support" },
    { label: "Order Tracking", to: "/orders" },
    { label: "Returns", to: "/page/returns" },
    { label: "FAQ", to: "/page/faq" },
  ];
  const companyLinks = [
    { label: "About", to: "/page/about" },
    { label: "Careers", to: "/page/careers" },
    { label: "Press", to: "/page/press" },
    { label: "Contact", to: "/support" },
  ];
  const legalLinks = [
    { label: "Privacy", to: "/page/privacy" },
    { label: "Terms", to: "/page/terms" },
    { label: "Cookies", to: "/page/cookies" },
  ];

  const socials = [
    { icon: Instagram, href: cfg.social_instagram, label: "Instagram" },
    { icon: Twitter, href: cfg.social_twitter, label: "Twitter" },
    { icon: Facebook, href: cfg.social_facebook, label: "Facebook" },
    { icon: Youtube, href: cfg.social_youtube, label: "YouTube" },
  ].filter((s) => !!s.href);

  const copyrightText = cfg.copyright_text || (siteName ? `© ${year} ${siteName}. All rights reserved.` : `© ${year} All rights reserved.`);

  // ────────────────────────────────────────────────────────────── MINIMAL
  if (styleId === "minimal") {
    return (
      <footer className="relative mt-12 border-t border-border/40">
        <div className="w-full px-4 md:px-8 lg:px-12 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-muted-foreground font-mono">{copyrightText}</p>
          <div className="flex items-center gap-2">
            <CurrencyMenu />
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
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={siteName || "Logo"}
                  className="object-contain shrink-0 select-none"
                  style={{ height: "clamp(48px, 14vw, 72px)", width: "auto", background: "transparent" }}
                  draggable={false}
                />
              )}
              <div className="min-w-0 flex-1">
                <h2
                  className="text-2xl font-bold leading-[1] tracking-tight text-foreground truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {renderTitleText("inline-block h-6 w-auto object-contain align-middle")}
                  {brandPrefix && (
                    <span className="text-primary ml-1 text-[10px] font-medium tracking-tight align-baseline lowercase">{brandPrefix}</span>
                  )}
                  {brandSuffix && (
                    <span className="text-primary ml-1 text-[10px] font-medium tracking-tight align-baseline">{brandSuffix}</span>
                  )}
                </h2>
                {tagline && <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug truncate">{tagline}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <CurrencyMenu />
                <LanguageMenu />
              </div>
            </div>
            {cfg.show_newsletter && (
              <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }} className="px-5 py-4 border-b border-border/40">
                <div className="text-[9px] uppercase tracking-[0.3em] font-mono text-muted-foreground mb-2">Subscribe</div>
                <div className="flex items-center border-b border-foreground/20 focus-within:border-primary">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@email.com" className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-foreground placeholder:text-muted-foreground/40" />
                  <button type="submit" disabled={subscribing} className="text-[10px] uppercase tracking-widest font-bold text-foreground px-2 disabled:opacity-50">{subscribing ? "…" : "Send →"}</button>
                </div>
              </form>
            )}
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 px-4 py-4">
              {[{ t: "Shop", l: shopLinks }, { t: "Support", l: supportLinks }, { t: "Company", l: companyLinks }, { t: "Legal", l: legalLinks }].map((c) => (
                <div key={c.t}>
                  <div className="text-[7px] uppercase tracking-[0.25em] font-mono text-muted-foreground/70 mb-1">{c.t}</div>
                  <ul className="space-y-0.5">
                    {c.l.map((l) => <li key={l.to}><Link to={l.to} className="text-[10px] text-foreground/80 hover:text-primary">{l.label}</Link></li>)}
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
          <div className="w-full px-6 md:px-10 lg:px-16 xl:px-20">
            {/* Top hairline */}
            <div className="border-t border-border/40 pt-5 pb-3" />

            {/* Logo + brand title (with motto under) + link columns on the right */}
            <div className="grid grid-cols-12 gap-6 lg:gap-10 pt-2 pb-6 border-b border-border/40 items-center">
              {/* Logo + title block */}
              <Link to="/home" className="col-span-12 md:col-span-5 flex items-center gap-4 lg:gap-5 group min-w-0">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={siteName || "Logo"}
                    className="block w-auto object-contain select-none shrink-0"
                    style={{ height: "clamp(72px, 9vw, 128px)", background: "transparent" }}
                    draggable={false}
                  />
                )}
                <div className="min-w-0 flex flex-col justify-center" style={{ gap: "clamp(4px, 0.6vw, 10px)" }}>
                  <h2
                    className="font-bold tracking-[-0.03em] leading-[0.9] text-foreground group-hover:text-primary transition-colors"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(24px, 2.8vw, 36px)",
                    }}
                  >
                    {renderTitleText("inline-block h-[0.9em] w-auto object-contain align-middle")}
                    {brandPrefix && (
                      <span
                        className="text-primary font-medium tracking-tight align-baseline lowercase ml-2"
                        style={{ fontSize: "0.35em" }}
                      >
                        {brandPrefix}
                      </span>
                    )}
                    {brandSuffix && (
                      <span
                        className="text-primary font-medium tracking-tight align-baseline ml-2"
                        style={{ fontSize: "0.35em" }}
                      >
                        {brandSuffix}
                      </span>
                    )}
                  </h2>
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
                        <li key={l.to}>
                          <Link to={l.to} className="group inline-flex items-center gap-1 text-sm text-foreground/85 hover:text-primary transition-colors">
                            <span>{l.label}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

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

            {/* Newsletter row — compact */}
            {cfg.show_newsletter && (
              <div className="grid grid-cols-12 gap-6 lg:gap-10 py-5 border-b border-border/40 items-center">
                <div className="col-span-12 md:col-span-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-primary mb-1">Subscribe</div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }} className="col-span-12 md:col-span-7 flex items-end">
                  <div className="flex w-full items-center border-b-2 border-foreground/20 focus-within:border-primary transition-colors">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="your@email.com"
                      aria-label="Email address"
                      className="flex-1 bg-transparent border-none outline-none py-2 text-base text-foreground placeholder:text-muted-foreground/40"
                    />
                    <button type="submit" disabled={subscribing} className="text-xs uppercase tracking-[0.25em] font-bold text-foreground hover:text-primary px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2">
                      {subscribing ? "Sending…" : <>Subscribe <ArrowUpRight className="w-3.5 h-3.5" /></>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bottom meta */}
            <div className="grid grid-cols-12 gap-6 py-3">
              <div className="col-span-12 md:col-span-6 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
                <span>{copyrightText}</span>
              </div>
              <div className="col-span-12 md:col-span-6 flex items-center justify-start md:justify-end gap-4">
                <CurrencyMenu />
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

            {cfg.show_newsletter && (
              <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="bg-transparent border-none outline-none flex-1 text-[11px] placeholder:text-muted-foreground/40 text-foreground min-w-0 py-1" />
                <button type="submit" disabled={subscribing} className="text-[9px] uppercase tracking-widest font-bold text-foreground hover:text-primary px-1 disabled:opacity-50">{subscribing ? "..." : "Join"}</button>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5 px-3 py-2.5">
              {[{ title: "Shop", links: shopLinks }, { title: "Support", links: supportLinks }, { title: "Company", links: companyLinks }, { title: "Legal", links: legalLinks }].map((col) => (
                <div key={col.title} className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground/60 font-bold">{col.title}</h3>
                  <ul className="flex flex-col gap-0.5 text-[10px] font-light">
                    {col.links.slice(0, 4).map((l) => (
                      <li key={l.to}><Link to={l.to} className="text-foreground/75 hover:text-primary transition-colors truncate block">{l.label}</Link></li>
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
                <CurrencyMenu />
                <LanguageMenu />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Desktop — full width, 12-col, no right-side blank */}
      <footer className="hidden lg:block relative mt-14 w-full">
        <div className="w-full px-6 lg:px-10 xl:px-16">
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

              {cfg.show_newsletter && (
                <div className="col-span-12 md:col-span-7 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-1 bg-primary" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary">Stay in the loop</span>
                  </div>
                  <p className="text-[12px] sm:text-sm text-muted-foreground mb-3">Be first to know about drops, exclusive offers, and stories.</p>
                  <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }} className="flex w-full border-b border-border/60 focus-within:border-primary transition-colors py-0.5">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="bg-transparent border-none outline-none flex-grow text-sm py-1.5 placeholder:text-muted-foreground/40 text-foreground min-w-0" />
                    <button type="submit" disabled={subscribing} className="text-[11px] uppercase tracking-widest font-bold text-foreground hover:text-primary transition-colors px-4 disabled:opacity-50">{subscribing ? "..." : "Join"}</button>
                  </form>
                </div>
              )}
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
                  <CurrencyMenu />
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
