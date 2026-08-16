"use client";
import React, { useState } from "react";
import { Link, useLocation } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, RefreshCw, Cookie, Mail, Phone, MapPin, ChevronRight, Lock, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LegalPageProps {
  slug: "privacy" | "terms" | "returns" | "cookies";
}

const LEGAL_DOCS = [
  { slug: "privacy", label: "Privacy Policy", href: "/privacy", icon: ShieldCheck, desc: "How we collect, protect, and handle your data." },
  { slug: "terms", label: "Terms of Service", href: "/terms", icon: FileText, desc: "Rules and terms governing site usage and purchases." },
  { slug: "returns", label: "Return Policy", href: "/refund", icon: RefreshCw, desc: "Hassle-free 7-day return and exchange details." },
  { slug: "cookies", label: "Cookie Policy", href: "/cookies", icon: Cookie, desc: "How we use cookies to personalize your store experience." },
];

const FALLBACK_CONTENT: Record<string, { title: string; subtitle: string; content: string }> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "Your privacy is our priority. Learn how Orizino protects your personal data.",
    content: `# Privacy Policy\n\n**Last Updated:** February 2026\n\nAt **Orizino Co.**, protecting your personal privacy and safeguarding your data is one of our fundamental commitments. This Privacy Policy outlines how we collect, process, and protect your information.\n\n### 1. Information We Collect\nWe collect personal details (name, email, phone number, shipping address) when you place orders or create an account, as well as device & browsing analytics.\n\n### 2. How We Use Information\nYour data is processed strictly to fulfill orders via Pathao courier, provide customer care, personalize preferences, and ensure transaction security.\n\n### 3. Contact Us\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Understanding your rights and obligations when shopping with Orizino Co.",
    content: `# Terms of Service\n\n**Last Updated:** February 2026\n\nWelcome to **Orizino Co.** These Terms of Service govern your use of our storefront and services.\n\n### 1. Account & Use Terms\nYou must provide accurate order details and maintain account confidentiality.\n\n### 2. Pricing & Intellectual Property\nPrices are listed in BDT and supported currencies. All drop designs, artwork, and logos belong exclusively to Orizino Co.\n\n### 3. Contact Us\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  returns: {
    title: "Return & Refund Policy",
    subtitle: "Shop with total confidence. 7-Day hassle-free returns and exchanges.",
    content: `# Return & Refund Policy\n\n**Last Updated:** February 2026\n\nAt **Orizino Co.**, we stand behind our garment quality. If you are not satisfied, our 7-Day Return & Exchange Policy has you covered.\n\n### 1. 7-Day Return Window\nItems can be returned or exchanged within 7 days of delivery in unworn, unwashed condition with original tags.\n\n### 2. Free Exchange for Defects\nIf an item is damaged or wrong, we cover 100% of return courier costs.\n\n### 3. Contact Us\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "Transparency regarding how cookies enhance your browsing experience.",
    content: `# Cookie Policy\n\n**Last Updated:** February 2026\n\nOrizino uses cookies to remember your shopping cart, selected currency, theme mode, and preferences.\n\n### 1. Essential & Analytics Cookies\nWe use essential session cookies and anonymized analytics to keep your cart active and improve site performance.\n\n### 2. Managing Cookies\nYou can control or clear cookies in your browser settings.\n\n### 3. Contact Us\nEmail: contact.orizino@gmail.com | Phone: +8801603327099`
  }
};

const LegalPage: React.FC<LegalPageProps> = ({ slug }) => {
  const currentDoc = LEGAL_DOCS.find((d) => d.slug === slug || (slug === "returns" && d.href === "/refund")) || LEGAL_DOCS[0];

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["cms-legal-page", slug],
    queryFn: async () => {
      const targetSlugs: string[] = [slug];
      if (slug === "returns") targetSlugs.push("refund", "return-policy");
      if (slug === "privacy") targetSlugs.push("privacy-policy");
      if (slug === "terms") targetSlugs.push("terms-of-service");
      if (slug === "cookies") targetSlugs.push("cookie-policy");

      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .in("slug", targetSlugs)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    staleTime: 60 * 1000,
  });

  const title = pageData?.title || FALLBACK_CONTENT[slug]?.title || currentDoc.label;
  const content = pageData?.content || FALLBACK_CONTENT[slug]?.content || "";

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 lg:pt-8 font-sans-brand">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 max-w-6xl mx-auto">
        
        {/* Navigation Tabs Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/60 backdrop-blur-md">
            {LEGAL_DOCS.map((doc) => {
              const active = doc.slug === slug;
              const Icon = doc.icon;
              return (
                <Link
                  key={doc.slug}
                  href={doc.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{doc.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-10 mb-8 backdrop-blur-xl"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> Official Policy
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentDoc.desc}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-secondary/60 border border-border/40 text-xs font-medium text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>256-Bit Encrypted</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-secondary/60 border border-border/40 text-xs font-medium text-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Customer Guarantee</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Legal Text Document */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 rounded-3xl border border-border/60 bg-card p-6 sm:p-10 shadow-xs"
          >
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2 rounded-xl" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
                <Skeleton className="h-4 w-5/6 rounded-lg" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : (
              <article className="prose prose-sm dark:prose-invert max-w-none 
                [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-foreground [&_h1]:border-b [&_h1]:border-border/40 [&_h1]:pb-3 [&_h1]:mb-6
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:text-xs [&_p]:sm:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:text-xs [&_li]:sm:text-sm [&_li]:text-foreground/80 [&_li]:mb-1.5
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
                [&_strong]:text-foreground [&_strong]:font-semibold
                [&_hr]:border-border/40 [&_hr]:my-6
                [&_a]:text-primary [&_a]:font-bold [&_a]:no-underline hover:[&_a]:underline
              ">
                <ReactMarkdown>{content}</ReactMarkdown>
              </article>
            )}
          </motion.main>

          {/* Sidebar & Quick Help */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Quick Switch Card */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-xs">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">
                Other Store Policies
              </h3>
              <div className="space-y-2">
                {LEGAL_DOCS.map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <Link
                      key={doc.slug}
                      href={doc.href}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${
                        doc.slug === slug
                          ? "bg-primary/10 border-primary/40 text-primary font-bold"
                          : "border-border/40 hover:bg-secondary/50 text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs">{doc.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Support Contact Box */}
            <div className="rounded-3xl border border-border/60 bg-secondary/30 p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Need Clarification?</h4>
                  <p className="text-[11px] text-muted-foreground">Our support team is here to assist.</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <a
                  href="mailto:contact.orizino@gmail.com"
                  className="flex items-center gap-2.5 text-foreground/80 hover:text-primary transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>contact.orizino@gmail.com</span>
                </a>
                <a
                  href="tel:+8801603327099"
                  className="flex items-center gap-2.5 text-foreground/80 hover:text-primary transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>+8801603327099</span>
                </a>
                <span className="flex items-start gap-2.5 text-foreground/60 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Kushtia Sadar, Kushtia, Khulna 7000, Bangladesh</span>
                </span>
              </div>

              <Link
                href="/support"
                className="inline-flex items-center justify-center w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 transition-all hover:bg-primary/90 shadow-xs"
              >
                <span>Visit Help Center</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </aside>
        </div>

      </div>
    </div>
  );
};

export default LegalPage;
