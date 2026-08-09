"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storefrontHref, shopHref, getShopLabel } from "@/lib/cross-app-urls";
import { BrandTitle } from "@/lib/brand-title";

const BASE_NAV_LINKS: Array<{ label: string; href: string | null; external?: boolean }> = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Products", href: "/products" },
  { label: "News", href: "/news" },
  { label: "Shop", href: null, external: true },
];

export function CompanyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: brand } = useQuery({
    queryKey: ["company-nav-brand"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["logo_url", "site_icon_url", "site_name"]);
      const m: Record<string, any> = {};
      data?.forEach((s) => {
        const v = s.value;
        m[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v;
      });
      return {
        logo: String(m.logo_url || m.site_icon_url || ""),
        name: String(m.site_name || "Orizino"),
      };
    },
  });

  const shopUrl = shopHref();
  const signInUrl = storefrontHref("/auth");
  const NAV_LINKS = BASE_NAV_LINKS.map((l) => (l.external ? { ...l, label: getShopLabel(l.label) } : l));
  const logoSrc = brand?.logo || "/orizino-logo.svg";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "bg-black/80 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo + Title */}
        <a href="/" className="flex items-center gap-2.5" aria-label={`${brand?.name || "Orizino"} Home`}>
          <img
            src={logoSrc}
            alt={brand?.name || "Orizino"}
            className="h-8 w-auto"
            style={{ filter: "brightness(1)" }}
          />
          <span className="text-white">
            <BrandTitle
              app="company"
              fallback={brand?.name || "Orizino"}
              className="font-semibold text-base tracking-tight"
              imageClassName="h-6 w-auto object-contain brightness-0 invert"
            />

          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-1.5 rounded-full border border-white/20 hover:border-white/50"
              >
                {link.label} ↗
              </a>
            ) : (
              <a
                key={link.label}
                href={link.href!}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            )
          )}
          <a
            href={signInUrl}
            className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors px-4 py-1.5 rounded-full border border-white/20"
          >
            Sign In
          </a>
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
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
            className="md:hidden bg-black/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-col gap-3"
          >
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-white/70 hover:text-white py-2"
                >
                  {link.label} ↗
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href!}
                  onClick={() => setOpen(false)}
                  className="text-sm text-white/70 hover:text-white py-2"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href={signInUrl}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors py-2.5 px-4 rounded-full border border-white/20 text-center mt-1"
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
