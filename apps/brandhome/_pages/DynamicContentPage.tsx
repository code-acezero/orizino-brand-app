"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyNav } from "@/components/nav/CompanyNav";
import Footer from "@/components/Footer";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, RefreshCw, Cookie, Lock, ArrowUpRight, Loader2 } from "lucide-react";
import BlockRenderer, { type PageBlock } from "@/components/BlockRenderer";
import { Link } from "@/lib/router-compat";

interface CmsPageProps {
  slug: string;
}

const LEGAL_DOCS = [
  { slug: "privacy", label: "Privacy Policy", href: "/privacy", icon: ShieldCheck, desc: "How Orizino safeguards, encrypts, and respects your data." },
  { slug: "terms", label: "Terms of Service", href: "/terms", icon: FileText, desc: "Legal rules governing Orizino creations, orders & site usage." },
  { slug: "returns", label: "Return Policy", icon: RefreshCw, desc: "7-Day hassle-free return and replacement policy." },
  { slug: "cookies", label: "Cookie Policy", icon: Cookie, desc: "How cookies personalize your experience across Orizino." },
];

const FALLBACK_PAGES: Record<string, { title: string; subtitle: string; content: string }> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "Your privacy is paramount at Orizino. Learn how we handle and protect your personal data.",
    content: `# Privacy Policy\n\n**Last Updated:** February 2026\n\nAt **Orizino Co.**, safeguarding your personal information is a core commitment. This Privacy Policy outlines our transparent data handling principles.\n\n### 1. Information Collection\nWe collect essential transaction details (name, phone number, delivery address) strictly to fulfill courier orders via Pathao & Steadfast.\n\n### 2. Security & Encryption\nYour credentials are encrypted using 256-bit SSL standard protocol. We never sell or exchange customer data with unauthorized third parties.\n\n### 3. Contact Security Team\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Understand your rights and commitments when purchasing authentic Orizino garments.",
    content: `# Terms of Service\n\n**Last Updated:** February 2026\n\nWelcome to **Orizino Co.** These terms govern your interaction with our digital storefront and physical releases.\n\n### 1. Authentic Craftsmanship\nAll Orizino garments are produced under strict quality control. Intellectual property, brand drop designs, and tag marks belong exclusively to Orizino Co.\n\n### 2. Orders & Shipping\nAll prices are listed in BDT and supported international currencies. Orders are processed swiftly from our Kushtia facility.\n\n### 3. Support Contact\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  returns: {
    title: "Return & Exchange Policy",
    subtitle: "Shop with peace of mind. 7-Day straightforward returns on unworn items.",
    content: `# Return & Exchange Policy\n\n**Last Updated:** February 2026\n\nWe take pride in our 240 GSM heavy cotton construction. If your fit isn't perfect, our 7-Day return policy ensures hassle-free replacements.\n\n### 1. 7-Day Window\nItems must be returned within 7 days of delivery in original unworn condition with tags attached.\n\n### 2. Replacement Guarantee\nIf an item arrives damaged or incorrect, Orizino covers 100% of return logistics expenses.\n\n### 3. Help Center\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "Transparent disclosure of essential and preference cookies used on Orizino.",
    content: `# Cookie Policy\n\n**Last Updated:** February 2026\n\nOrizino uses minimal essential cookies to remember active shopping cart items, currency selections, and theme preferences.\n\n### 1. Essential Session Cookies\nCookies allow seamless navigation between our BrandHome, Storefront, and Order Tracking applications.\n\n### 2. Preferences & Analytics\nYou can clear or manage cookie preferences directly from your web browser settings.`
  }
};

export default function CmsPage({ slug }: CmsPageProps) {
  const targetSlugs = useMemo(() => {
    const list = [slug];
    if (slug === "returns" || slug === "refund") list.push("returns", "refund", "return-policy");
    if (slug === "privacy") list.push("privacy-policy");
    if (slug === "terms") list.push("terms-of-service");
    if (slug === "cookies") list.push("cookie-policy");
    return list;
  }, [slug]);

  const { data: page, isLoading } = useQuery({
    queryKey: ["brandhome-cms-page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .in("slug", targetSlugs)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    staleTime: 30 * 1000,
  });

  const isBlockPage = page?.content?.startsWith("<!--BLOCKS:");
  const blocks: PageBlock[] = useMemo(() => {
    if (!isBlockPage || !page?.content) return [];
    try {
      const json = page.content.slice(11, page.content.indexOf("-->"));
      return JSON.parse(json);
    } catch { return []; }
  }, [page?.content, isBlockPage]);

  const legalInfo = LEGAL_DOCS.find((d) => d.slug === slug || (slug === "refund" && d.slug === "returns"));
  const fallback = FALLBACK_PAGES[slug] || FALLBACK_PAGES[slug === "refund" ? "returns" : "privacy"];

  const title = page?.title || fallback?.title || legalInfo?.label || slug.toUpperCase();
  const subtitle = legalInfo?.desc || fallback?.subtitle || "Official documentation and policy disclosure.";
  const content = page?.content || fallback?.content || `# ${title}\n\nContent for this page is being updated.`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <CompanyNav />

      <main className="pt-32 pb-24 w-full px-4 sm:px-6 lg:px-8 xl:px-12 max-w-6xl mx-auto flex-1">
        {/* Navigation Tabs Header for Legal pages */}
        {legalInfo && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-md">
              {LEGAL_DOCS.map((doc) => {
                const active = doc.slug === slug || (slug === "refund" && doc.slug === "returns");
                const Icon = doc.icon;
                return (
                  <Link
                    key={doc.slug}
                    to={doc.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans-brand transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{doc.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 sm:p-10 mb-8 backdrop-blur-xl"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest font-sans-brand">
                <ShieldCheck className="w-3 h-3" /> Official Disclosure
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans-brand">
                {subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-sans-brand">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-secondary/40 border border-border/40 text-xs font-medium text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>256-Bit Standard</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" /> Loading page...
          </div>
        ) : isBlockPage ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BlockRenderer blocks={blocks} />
          </motion.div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border/40 bg-card/60 p-6 sm:p-10 shadow-xs prose prose-sm dark:prose-invert max-w-none font-sans-brand
              [&_h1]:font-editorial [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:border-b [&_h1]:border-border/40 [&_h1]:pb-3 [&_h1]:mb-6
              [&_h2]:font-editorial [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:font-editorial [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-xs [&_p]:sm:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:text-xs [&_li]:sm:text-sm [&_li]:text-foreground/80 [&_li]:mb-1.5
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_a]:text-primary [&_a]:font-bold [&_a]:no-underline hover:[&_a]:underline
            "
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </motion.article>
        )}
      </main>

      <Footer />
    </div>
  );
}
