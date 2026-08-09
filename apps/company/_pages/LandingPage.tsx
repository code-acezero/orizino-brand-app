"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Package, ShoppingBag, Layers, Globe, Shield,
  Truck, Star, Users, Award, ChevronDown, Mail, Phone, MapPin,
  Facebook, Youtube
} from "lucide-react";
import NewsletterBlock from "@/components/landing/NewsletterBlock";
import BrandStoryBlock from "@/components/landing/BrandStoryBlock";

const STATS = [
  { value: "10K+", label: "Happy Customers" },
  { value: "500+", label: "Products Shipped" },
  { value: "4.9★", label: "Average Rating" },
  { value: "2023", label: "Est. Dhaka, BD" },
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
  const { data: siteSettings } = useQuery({
    queryKey: ["company-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url", "site_description", "social_instagram", "social_facebook", "contact_email", "contact_phone"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => { const v = s.value; map[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v; });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const siteName = (siteSettings?.site_name as string) || "Orizino";
  const logoUrl = (siteSettings?.logo_url as string) || "";
  const siteDesc = (siteSettings?.site_description as string) || "Premium drop shoulder streetwear from Dhaka.";
  const instagram = (siteSettings?.social_instagram as string) || "";
  const contactEmail = (siteSettings?.contact_email as string) || "";
  const contactPhone = (siteSettings?.contact_phone as string) || "";

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["company-featured"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, price, thumbnail, slug")
        .eq("is_active", true).eq("is_featured", true).limit(3);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-editorial text-lg tracking-[0.18em] uppercase text-foreground">
            {siteName}
          </a>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: "Products", href: "/products" },
              { label: "News", href: "/news" },
              { label: "Docs", href: "/docs" },
              { label: "Track Order", href: "/track" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="font-sans-brand text-[11px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-sans-brand text-[10px] tracking-[0.16em] uppercase px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
          >
            Shop Now <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(0 100% 30% / 0.12), transparent)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 80% 80%, hsl(30 33% 91% / 0.04), transparent)" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {logoUrl && (
            <motion.img
              src={logoUrl}
              alt={siteName}
              className="h-16 object-contain mx-auto mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <motion.span
            className="inline-block font-sans-brand text-[10px] tracking-[0.3em] uppercase mb-6 px-4 py-1.5 rounded-full border border-primary/30 text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Official Brand — Est. 2023
          </motion.span>
          <motion.h1
            className="font-editorial text-foreground mb-6 leading-[1.02]"
            style={{ fontSize: "clamp(3rem, 9vw, 7rem)", letterSpacing: "-0.03em" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {siteName}
          </motion.h1>
          <motion.p
            className="font-sans-brand text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ fontSize: "clamp(0.9rem, 1.8vw, 1.1rem)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            {siteDesc}
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <a
              href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-sans-brand text-[11px] tracking-[0.16em] uppercase px-7 py-3.5 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "hsl(var(--cherry))", color: "hsl(var(--cream))", borderRadius: 0 }}
            >
              <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
              Shop the Collection
            </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 font-sans-brand text-[11px] tracking-[0.16em] uppercase px-7 py-3.5 border border-border hover:border-foreground/40 transition-colors"
              style={{ borderRadius: 0 }}
            >
              <Package className="w-3.5 h-3.5" strokeWidth={1.5} />
              Product Info
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
      <section className="border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {STATS.map((s, i) => (
              <Section key={i} className="py-10 px-6 text-center">
                <p className="font-editorial text-4xl text-foreground mb-1" style={{ color: i === 0 ? "hsl(var(--cherry))" : undefined }}>{s.value}</p>
                <p className="font-sans-brand text-[11px] tracking-[0.14em] uppercase text-muted-foreground">{s.label}</p>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <BrandStoryBlock imageSide="left" />

      {/* ── Featured Products ── */}
      {featuredProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <Section className="mb-10">
            <span className="font-sans-brand text-[10px] tracking-[0.2em] uppercase text-primary block mb-3">Collection</span>
            <h2 className="font-editorial text-4xl lg:text-5xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Featured Pieces
            </h2>
          </Section>
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
        </section>
      )}

      {/* ── Brand Values ── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
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
        <Section className="max-w-4xl mx-auto px-6">
          <div className="flex gap-5 items-start">
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
      <footer className="border-t border-border" style={{ background: "hsl(var(--charcoal))" }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="font-editorial text-xl tracking-[0.15em] uppercase mb-2" style={{ color: "hsl(var(--cream))" }}>{siteName}</p>
              <p className="font-sans-brand text-[11px]" style={{ color: "hsl(var(--cream)/0.3)" }}>© {year} {siteName}. All rights reserved.</p>
            </div>
            <div className="flex flex-col gap-3">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="font-sans-brand text-[11px] flex items-center gap-2" style={{ color: "hsl(var(--cream)/0.4)" }}>
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="font-sans-brand text-[11px] flex items-center gap-2" style={{ color: "hsl(var(--cream)/0.4)" }}>
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {contactPhone}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {instagram && (
                <a href={instagram} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:border-primary transition-colors"
                  style={{ borderColor: "hsl(60 3% 26%)" }}
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" style={{ color: "hsl(var(--cream)/0.4)", width: 14, height: 14 }} />
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function Instagram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default LandingPage;
