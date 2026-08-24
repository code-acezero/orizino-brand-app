"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Package, ShoppingBag, Layers, Globe, Shield,
  Truck, Star, Users, Award, ChevronDown, Mail, Phone, MapPin
} from "lucide-react";
import NewsletterBlock from "@/components/landing/NewsletterBlock";
import BrandStoryBlock from "@/components/landing/BrandStoryBlock";
import Footer from "@/components/Footer";
import { CompanyNav } from "@/components/nav/CompanyNav";
import { shopHref, storefrontHref, getShopLabel } from "@/lib/cross-app-urls";
import { BrandTitle, loadGoogleFont } from "@orizino/shared";

const FALLBACK_STATS = [
  { value: "10K+", label: "HAPPY CUSTOMERS" },
  { value: "500+", label: "PRODUCTS SHIPPED" },
  { value: "4.9★", label: "AVERAGE RATING" },
  { value: "2026", label: "EST. KUSHTIA, BD" },
];

const VALUES = [
  { icon: Layers, title: "Premium Materials", body: "240 GSM ring-spun cotton, garment-washed for a lived-in softness from day one." },
  { icon: Award, title: "Engineered Fit", body: "Every seam, every drop — calculated to flatter. The 3cm shoulder drop is our signature." },
  { icon: Shield, title: "Quality Assured", body: "Every batch quality-checked before dispatch. No compromises, no exceptions." },
  { icon: Truck, title: "Nationwide Delivery", body: "Reaching every district in Bangladesh. Fast, reliable, trackable." },
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6%" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const LandingPage: React.FC = () => {
  const { data: siteSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["company-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url", "site_description", "site_tagline", "social_instagram", "social_facebook", "contact_email", "contact_phone", "landing_config", "title_image_url", "title_source", "logo_display_style", "title_font"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => { const v = s.value; map[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v; });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const siteName = (siteSettings?.site_name as string) || "Orizino";
  const logoUrl = (siteSettings?.logo_url as string) || "";
  const siteDesc = (siteSettings?.site_description as string) || "Premium drop shoulder streetwear from Dhaka.";
  const siteTagline = (siteSettings?.site_tagline as string) || (siteSettings?.landing_config as any)?.hero_tagline || "Beyond Simplicity.";
  const instagram = (siteSettings?.social_instagram as string) || "";
  const contactEmail = (siteSettings?.contact_email as string) || "";
  const contactPhone = (siteSettings?.contact_phone as string) || "";

  const titleSource = (siteSettings?.title_source as string) || "text";
  const displayStyle = (siteSettings?.logo_display_style as string) || "both";
  const titleFont = (siteSettings?.title_font as string) || "";
  const titleImageUrl = (siteSettings?.title_image_url as string) || "";

  const showLogo = displayStyle !== "title" && displayStyle !== "none";
  const showTitle = displayStyle !== "logo" && displayStyle !== "none" && Boolean(siteName);

  React.useEffect(() => {
    if (titleFont) {
      loadGoogleFont(titleFont);
    }
  }, [titleFont]);

  const [liveDraft, setLiveDraft] = React.useState<Record<string, any> | null>(null);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ORIZINO_LANDING_DRAFT_UPDATE" && event.data.config) {
        setLiveDraft(event.data.config);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const landingConfig = (liveDraft || siteSettings?.landing_config) as Record<string, any> | undefined;
  const heroBgUrl = landingConfig?.hero_bg_url as string | undefined;
  const heroVideoUrl = landingConfig?.hero_video_url as string | undefined;
  const activeStats = (landingConfig?.show_stats !== false && Array.isArray(landingConfig?.stats) && landingConfig.stats.length > 0) 
    ? landingConfig.stats 
    : FALLBACK_STATS;

  const { data: featuredProducts = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ["company-featured"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, price, thumbnail, slug")
        .eq("is_active", true).eq("is_featured", true).limit(3);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const shopUrl = shopHref();
  const storefrontUrl = storefrontHref();

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Navbar ── */}
      <CompanyNav />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Video / Image / luxury ambient lighting */}
        {heroVideoUrl ? (
          <>
            <div className="absolute inset-0 z-0">
              <video autoPlay loop muted playsInline src={heroVideoUrl} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 z-0 bg-background/65" />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </>
        ) : heroBgUrl ? (
          <>
            <div className="absolute inset-0 z-0">
              <img src={heroBgUrl} alt="Hero" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 z-0 bg-background/75" />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </>
        ) : (
          <>
            {/* Rich luxury ambient monochrome spotlight glow */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 12%, hsl(var(--foreground) / 0.08), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 75%, hsl(var(--foreground) / 0.03), transparent 75%)",
              }}
            />
            {/* Fine luxury stage grid aura */}
            <div
              className="absolute inset-0 z-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.15) 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />
          </>
        )}

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto text-center flex flex-col items-center">
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 mx-auto flex items-center justify-center shrink-0 select-none"
            >
              <div className="w-full h-full flex items-center justify-center animate-logo-idle">
                <svg
                  viewBox="0 0 539.27 565.14"
                  className="w-full h-full object-contain overflow-visible select-none text-foreground"
                  style={{ color: "hsl(var(--foreground))" }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g stroke="currentColor" fill="currentColor" strokeLinejoin="round" strokeLinecap="round">
                    <path
                      pathLength={1200}
                      className="logo-wing-left"
                      d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z"
                    />
                    <path
                      pathLength={1200}
                      className="logo-wing-right"
                      d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z"
                    />
                    <path
                      pathLength={1200}
                      className="logo-wing-middle"
                      d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z"
                    />
                  </g>
                </svg>
              </div>
            </motion.div>
          )}
          
          {showTitle && (
            <motion.div
              className="relative mb-8 flex flex-col items-center justify-center w-full max-w-5xl mx-auto select-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Foreshadowed Brand Title (Ghost Background Layer) */}
              <div
                className="w-full flex items-center justify-center pointer-events-none select-none"
                style={{
                  opacity: 0.13,
                  filter: "grayscale(1) blur(0.5px)",
                  transform: "scaleX(1.08) scaleY(1.04)",
                }}
              >
                {titleSource === "image" && titleImageUrl ? (
                  <img
                    src={titleImageUrl}
                    alt={siteName}
                    className="h-20 sm:h-28 lg:h-36 w-auto object-contain"
                  />
                ) : (
                  <BrandTitle
                    className="brand-name uppercase font-black tracking-[0.12em] leading-none select-none"
                    fontSize="clamp(4rem, 11vw, 9rem)"
                    fallback="ORIZINO"
                  />
                )}
              </div>

              {/* Center-aligned Tagline Overlay (Foreground Layer) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto px-6">
                <motion.h2
                  className="font-sans-brand text-foreground text-center font-semibold uppercase drop-shadow-sm"
                  style={{
                    fontSize: "clamp(0.85rem, 2.2vw, 1.6rem)",
                    letterSpacing: "clamp(0.22em, 0.6vw, 0.5em)",
                    textShadow: "0 1px 12px hsl(var(--background) / 0.5)",
                  }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.28 }}
                >
                  {siteTagline}
                </motion.h2>
              </div>
            </motion.div>
          )}

          <motion.div
            className="flex items-center justify-center gap-3.5 flex-wrap pt-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <a
              href={shopUrl}
              target="_blank"
              rel="noreferrer"
              suppressHydrationWarning
              className="inline-flex items-center justify-center gap-2.5 font-sans-brand text-[11px] sm:text-xs tracking-[0.18em] uppercase px-7 py-3.5 sm:px-8 sm:py-4 rounded-full font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg hover:shadow-xl bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>Visit Our Shop</span>
            </a>
            <a
              href="#story"
              className="inline-flex items-center justify-center gap-2.5 font-sans-brand text-[11px] sm:text-xs tracking-[0.18em] uppercase px-7 py-3.5 sm:px-8 sm:py-4 rounded-full font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] border border-foreground/20 hover:border-foreground/40 bg-background/60 backdrop-blur-md text-foreground hover:bg-foreground/5 shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>Our Story</span>
            </a>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-4 h-4" strokeWidth={1} />
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      {(landingConfig?.show_stats !== false) && (
        <section className="border-y border-border">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
              {activeStats.map((s: any, i: number) => (
                <Section key={i} className="py-12 px-6 text-center">
                  <p className="font-editorial text-4xl md:text-5xl text-foreground mb-2" style={{ color: i === 0 ? "hsl(var(--cherry))" : undefined }}>{s.value}</p>
                  <p className="font-sans-brand text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{s.label}</p>
                </Section>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Brand Story ── */}
      <BrandStoryBlock imageSide="left" />

      {/* ── Featured Products ── */}
      {(isLoadingFeatured || featuredProducts.length > 0) && (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto py-20">
          <Section className="mb-10">
            <span className="font-sans-brand text-[10px] tracking-[0.2em] uppercase text-primary block mb-3">Collection</span>
            <h2 className="font-editorial text-4xl lg:text-5xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Featured Pieces
            </h2>
          </Section>
          {isLoadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-card/40 border border-border/50 relative overflow-hidden flex flex-col justify-end p-5"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-transparent animate-pulse" />
                  <div className="w-10 h-3 rounded-full bg-white/10 mb-2 animate-pulse" />
                  <div className="w-3/4 h-5 rounded-lg bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {featuredProducts.map((p: any, i: number) => (
                  <Section key={p.id}>
                    <a
                      href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}/products/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group block relative overflow-hidden"
                      style={{ aspectRatio: "3/4" }}
                    >
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-card flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, hsl(60 3% 8% / 0.85) 100%)" }} />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="font-sans-brand text-[10px] tracking-[0.14em] uppercase text-cream/60 mb-1">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <p className="font-editorial text-lg text-cream leading-tight">{p.name}</p>
                      </div>
                      <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 transition-all duration-500" style={{ background: "hsl(var(--cherry))" }} />
                    </a>
                  </Section>
                ))}
              </div>
              <div className="mt-8 text-center">
                <a
                  href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}/inventory`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-sans-brand text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground transition-colors group"
                >
                  View All Products
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Brand Values ── */}
      <section className="border-t border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto py-20">
          <Section className="mb-12 text-center">
            <span className="font-sans-brand text-[10px] tracking-[0.2em] uppercase text-primary block mb-3">Why Orizino</span>
            <h2 className="font-editorial text-4xl lg:text-5xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Built Different
            </h2>
          </Section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
              <Section key={i} className="bg-background p-8 flex flex-col gap-4">
                <div className="w-10 h-10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} style={{ color: "hsl(var(--cherry))" }} />
                </div>
                <div className="w-6 h-px" style={{ background: "hsl(var(--cherry))" }} />
                <h3 className="font-editorial text-lg text-foreground">{title}</h3>
                <p className="font-sans-brand text-[13px] text-muted-foreground leading-relaxed">{body}</p>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote ── */}
      <section className="border-t border-border py-20">
        <Section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto">
          <div className="flex gap-5 items-start max-w-4xl mx-auto">
            <div className="w-0.5 self-stretch flex-shrink-0" style={{ background: "hsl(var(--cherry))" }} />
            <div>
              <span className="font-editorial text-5xl leading-none" style={{ color: "hsl(var(--cherry))" }}>"</span>
              <blockquote className="font-editorial text-2xl sm:text-3xl text-foreground leading-snug mt-2" style={{ letterSpacing: "-0.01em" }}>
                Orizino redefines what premium streetwear looks like outside of the West — and they do it effortlessly.
              </blockquote>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-6 h-px" style={{ background: "hsl(var(--cherry))" }} />
                <span className="font-sans-brand text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Fashion Observer · 2024</span>
              </div>
            </div>
          </div>
        </Section>
      </section>

      {/* ── Newsletter ── */}
      <NewsletterBlock />

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
};

export default LandingPage;
