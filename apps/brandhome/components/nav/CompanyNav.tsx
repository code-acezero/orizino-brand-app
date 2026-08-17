"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storefrontHref, shopHref, getShopLabel } from "@/lib/cross-app-urls";
import { BrandTitle } from "@/lib/brand-title";
import LanguageMenu from "@/components/footer/LanguageMenu";

import { usePathname } from "next/navigation";

const BASE_NAV_LINKS: Array<{ label: string; href: string | null; external?: boolean }> = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Products", href: "/products" },
  { label: "News", href: "/news" },
  { label: "Shop", href: null, external: true },
];

export interface CompanyNavProps {
  variant?: "landing" | "docs" | "products" | "news" | "utility";
}

export function CompanyNav({ variant }: CompanyNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";

  const activeVariant =
    variant ||
    (pathname.startsWith("/docs")
      ? "docs"
      : pathname.startsWith("/products")
      ? "products"
      : pathname.startsWith("/news")
      ? "news"
      : pathname.startsWith("/track") || pathname.startsWith("/scanner-info")
      ? "utility"
      : "landing");

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: brand, isLoading } = useQuery({
    queryKey: ["company-nav-brand"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "logo_url", "site_icon_url", "site_name",
          "title_source", "title_image_url", "logo_display_style",
          "title_font", "brand_prefix", "brand_suffix",
          "brand_title_size_nav", "brand_logo_title_ratio"
        ]);
      const m: Record<string, any> = {};
      data?.forEach((s) => {
        const v = s.value;
        m[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v;
      });
      return {
        logo: String(m.logo_url || m.site_icon_url || ""),
        name: String(m.site_name || "Orizino"),
        titleSource: m.title_source || "text",
        titleImageUrl: m.title_image_url || "",
        displayStyle: m.logo_display_style || "both",
        titleFont: m.title_font || "",
        brandPrefix: m.brand_prefix || "",
        brandSuffix: m.brand_suffix || "",
        brandTitleSizeNav: Number(m.brand_title_size_nav) || 20,
        brandLogoTitleRatio: Number(m.brand_logo_title_ratio) || 1.0,
      };
    },
  });

  const shopUrl = shopHref();
  const signInUrl = storefrontHref("/auth");
  const NAV_LINKS = BASE_NAV_LINKS.map((l) => (l.external ? { ...l, label: getShopLabel(l.label) } : l));

  const variantHeaderClass = () => {
    if (open) return "bg-background/95 backdrop-blur-xl border-b border-border/80";
    switch (activeVariant) {
      case "docs":
        return scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs"
          : "bg-background/80 backdrop-blur-sm border-b border-border/40";
      case "products":
        return scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border/80 shadow-md"
          : "bg-card/40 backdrop-blur-md border-b border-border/30";
      case "news":
        return `border-t-2 border-t-primary ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border/80"
            : "bg-background/90 backdrop-blur-sm border-b border-border/50"
        }`;
      case "utility":
        return scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/80"
          : "bg-background/80 backdrop-blur-sm border-b border-border/40";
      case "landing":
      default:
        return scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm"
          : "bg-transparent border-b border-transparent";
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${variantHeaderClass()}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between relative">
        {/* Left Corner: Internal Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 z-10">
          {NAV_LINKS.filter((l) => !l.external).map((link) => {
            const isCurrent = link.href === "/" ? pathname === "/" : link.href ? pathname.startsWith(link.href) : false;
            return (
              <a
                key={link.label}
                href={link.href!}
                className={`text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  isCurrent
                    ? "font-bold text-primary border-b-2 border-primary pb-0.5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Middle: Centered Logo & Brand Title (No Suffix) */}
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center justify-center z-10">
          <a href="/" className="flex items-center gap-2.5 group" aria-label={`${brand?.name || "Orizino"} Home`}>
            {brand?.logo && (brand.displayStyle === "logo" || brand.displayStyle === "both") && (
              <img
                src={brand.logo}
                alt={brand?.name || "Orizino"}
                className="w-auto object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  height: `${Math.round(((brand.brandTitleSizeNav || 20) * 1.35) * (brand.brandLogoTitleRatio || 1.0))}px`,
                  maxHeight: "44px",
                  minHeight: "20px",
                }}
              />
            )}
            {brand?.titleSource === "image" && brand?.titleImageUrl ? (
              <img
                src={brand.titleImageUrl}
                alt={brand?.name || "Orizino"}
                className="w-auto object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  height: `${Math.round(((brand.brandTitleSizeNav || 20) * 1.35) * (brand.brandLogoTitleRatio || 1.0))}px`,
                  maxHeight: "44px",
                  minHeight: "20px",
                }}
              />
            ) : (
              <div className="flex items-baseline gap-1">
                {brand?.brandPrefix && (
                  <span className="opacity-80 font-medium lowercase tracking-tight text-xs">{brand.brandPrefix}</span>
                )}
                <BrandTitle
                  className="font-bold tracking-[0.16em] leading-none text-foreground transition-opacity group-hover:opacity-80 uppercase select-none"
                  fontSize={brand?.brandTitleSizeNav || 20}
                  fallback="Orizino"
                />
              </div>
            )}
          </a>
        </div>

        {/* Right Corner: External Shop Button & Sign In */}
        <div className="hidden md:flex items-center gap-3 z-10">
          {NAV_LINKS.filter((l) => l.external).map((link) => (
            <a
              key={link.label}
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="text-[11px] uppercase tracking-[0.14em] font-medium text-foreground transition-all hover:bg-foreground hover:text-background px-4 py-2 rounded-full border border-border"
            >
              {link.label} ↗
            </a>
          ))}
          <a
            href={signInUrl}
            suppressHydrationWarning
            className="text-[11px] uppercase tracking-[0.14em] font-medium text-background bg-foreground hover:opacity-80 transition-opacity px-5 py-2 rounded-full shadow-sm"
          >
            Sign In
          </a>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-foreground p-2 rounded-lg hover:bg-muted transition-colors ml-auto z-10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-6 py-6 flex flex-col gap-4"
          >
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-sm uppercase tracking-[0.14em] font-medium text-foreground hover:opacity-70 transition-opacity py-2"
                >
                  {link.label} ↗
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href!}
                  onClick={() => setOpen(false)}
                  className="text-sm uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </a>
              )
            )}
            <div className="py-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Language</span>
              <LanguageMenu variant="default" />
            </div>
            <a
              href={signInUrl}
              onClick={() => setOpen(false)}
              className="text-sm uppercase tracking-[0.14em] font-medium text-background bg-foreground hover:opacity-80 transition-opacity py-3 px-4 rounded-full text-center mt-2 shadow-sm"
            >
              Sign In
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
// code:4ce0
