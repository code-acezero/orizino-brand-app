"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, CheckCircle2, Send } from "lucide-react";
import { z } from "zod";
import { useOrizinoConfig, type LinkItem, type ThemeItem, type PersonItem, contactItemHref } from "@/lib/orizino-config";
import { ICON_MAP } from "@/lib/orizino-icons";
import { CONTACT_ICON_MAP } from "@/lib/contact-icons";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────────────────────────────
   GLOBAL SITE SETTINGS FETCH — mirrors storefront
──────────────────────────────────────────────────────────────────────── */
function useGlobalSiteSettings() {
  return useQuery({
    queryKey: ["explore-global-site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "site_name", "logo_url", "site_icon_url",
          "title_image_url", "title_source", "logo_display_style", "title_font",
        ]);
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        const v = s.value;
        map[s.key] = (typeof v === "object" && v !== null ? (v as any).value ?? v : v) as string;
      });
      return map;
    },
    staleTime: 30 * 1000,
  });
}

/* ─────────────────────────────────────────────────────────────────────
   THE 5 PRECISE LOGO ANIMATIONS ON TAP (100% STABLE, NO ROTATE / MORPH)
   0: The Stroke Fill (Brandhome signature metallic stroke draw)
   1: Liquid Fill (Bottom to top with accent red color)
   2: Logo Build (Middle drops from top, left/right swoosh from sides)
   3: Random Blink (Electric neon flicker across the 3 shapes)
   4: Slingshot (Left & right stretch outward, then force snap back)
──────────────────────────────────────────────────────────────────────── */

const PATH_LEFT = "M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z";
const PATH_RIGHT = "M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z";
const PATH_MIDDLE = "M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z";

function AnimatedLogo({ siteName }: { siteName?: string }) {
  const [mode, setMode] = useState<number>(0);
  const [animKey, setAnimKey] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleTap = useCallback(() => {
    // Pick randomly from the 5 animations ensuring a different one each tap
    setMode((prev) => (prev + 1 + Math.floor(Math.random() * 4)) % 5);
    setAnimKey((k) => k + 1);
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 2000);
  }, []);

  const activeModeClass = isPlaying ? `anim-mode-${mode}` : "animate-logo-stroke-fill";

  return (
    <button
      type="button"
      onClick={handleTap}
      title="Tap logo for animations"
      className="mx-auto block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl group transition-transform active:scale-[0.98]"
      aria-label={`${siteName || "ORIZINO"} logo — tap to animate`}
    >
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 mx-auto flex items-center justify-center animate-logo-idle select-none">
        <svg
          key={`logo-svg-${animKey}`}
          viewBox="0 0 539.27 565.14"
          className={`w-full h-full overflow-visible ${activeModeClass}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Metallic Shimmer Gradient */}
            <linearGradient id="logoMetallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--theme-shine)" stopOpacity="1" />
              <stop offset="25%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
              <stop offset="75%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--theme-shine)" stopOpacity="1" />
            </linearGradient>

            {/* Accent Red Liquid Gradient */}
            <linearGradient id="accentRedLiquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="#ff8a98" stopOpacity="1" />
            </linearGradient>

            {/* Liquid Fill Clip Path */}
            <clipPath id="liquidClipMask">
              <rect
                className="liquid-rect"
                x="0"
                y={isPlaying && mode === 1 ? "565px" : "0px"}
                width="540"
                height="566"
              />
            </clipPath>
          </defs>

          {/* Mode 1: Liquid Fill from Bottom to Up */}
          {isPlaying && mode === 1 ? (
            <g>
              {/* Silhouette base */}
              <g fill="rgba(255,255,255,0.08)">
                <path d={PATH_LEFT} />
                <path d={PATH_RIGHT} />
                <path d={PATH_MIDDLE} />
              </g>
              {/* Liquid rising layer */}
              <g clipPath="url(#liquidClipMask)" fill="url(#accentRedLiquidGrad)">
                <path d={PATH_LEFT} />
                <path d={PATH_RIGHT} />
                <path d={PATH_MIDDLE} />
              </g>
            </g>
          ) : (
            /* Modes 0, 2, 3, 4: The 3 geometric shapes */
            <g fill="url(#logoMetallicGrad)" strokeLinejoin="round" strokeLinecap="round">
              <path className="shape-left" d={PATH_LEFT} />
              <path className="shape-right" d={PATH_RIGHT} />
              <path className="shape-middle" d={PATH_MIDDLE} />
            </g>
          )}
        </svg>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   BRAND TITLE — follows Storefront exact typography & styling
──────────────────────────────────────────────────────────────────────── */
function StorefrontBrandTitle({
  siteName,
  titleSource,
  titleImageUrl,
  titleFont,
}: {
  siteName: string;
  titleSource?: string;
  titleImageUrl?: string;
  titleFont?: string;
}) {
  if (titleSource === "image" && titleImageUrl) {
    return (
      <div className="flex justify-center my-2">
        <img
          src={titleImageUrl}
          alt={siteName}
          className="h-10 sm:h-14 lg:h-16 w-auto object-contain mx-auto transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  const fontFamily = titleFont
    ? `'${titleFont}', var(--font-title, var(--font-display))`
    : "var(--font-title, var(--font-display))";

  return (
    <div className="flex justify-center my-2 w-full max-w-2xl mx-auto">
      <svg
        viewBox="0 0 1000 130"
        className="w-full h-auto mx-auto overflow-visible select-none my-1"
        data-brand="orizino"
      >
        <defs>
          <linearGradient id="monochromeStrokeShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.1" />
            <stop offset="35%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
            <stop offset="50%" stopColor="var(--theme-shine)" stopOpacity="1" />
            <stop offset="65%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-[64px] sm:text-[76px] md:text-[84px] font-bold uppercase tracking-[0.2em] animate-title-stroke-fill"
          style={{
            fontFamily,
            stroke: "url(#monochromeStrokeShimmer)",
            fill: "url(#monochromeStrokeShimmer)",
            letterSpacing: "0.2em",
          }}
        >
          {siteName}
        </text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION LABEL & DIVIDER
──────────────────────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </span>
  );
}

function Divider() {
  return <div className="rule my-8 sm:my-12 w-full max-w-7xl mx-auto" />;
}

/* ─────────────────────────────────────────────────────────────────────
   CHANNEL CARD
──────────────────────────────────────────────────────────────────────── */
function ChannelCard({ link, delay }: { link: LinkItem; delay: number }) {
  const Icon = link.icon !== "custom" ? ICON_MAP[link.icon] : null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer noopener"
      className="channel-card group flex flex-col items-center text-center gap-3 rounded-2xl p-6 fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-border flex items-center justify-center">
        {link.icon === "custom" && link.customLogo ? (
          <img src={link.customLogo} alt="" className="w-6 h-6 object-contain" />
        ) : Icon ? (
          <Icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
        ) : null}
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{link.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   THEME CARD (Center Aligned with Black & White Editorial Imagery)
──────────────────────────────────────────────────────────────────────── */
function ThemeCard({ theme, delay }: { theme: ThemeItem; delay: number }) {
  const imageUrl = theme.image || (
    theme.id === "anime" ? "/images/theme-anime.jpg" :
    theme.id === "cinema" ? "/images/theme-cinema.jpg" :
    theme.id === "gaming" ? "/images/theme-gaming.jpg" :
    "/images/theme-streetwear.jpg"
  );

  return (
    <a
      href={`/themes/${theme.id}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 min-h-[320px] sm:min-h-[360px] text-center items-center shadow-none transition-all duration-300 hover:border-primary/50 fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Black and White Editorial Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={imageUrl}
          alt={theme.label}
          className="w-full h-full object-cover grayscale contrast-125 brightness-90 group-hover:scale-105 group-hover:contrast-100 transition-all duration-700"
        />
        {/* Luxury Vignette & Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      {/* Content — Perfectly Center Aligned */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2 w-full">
        <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {theme.label}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto line-clamp-2 font-medium">
          {theme.blurb}
        </p>

        <div className="pt-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
          <span>Explore World</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PERSON / TEAM CARD (Full-Body Black & White Portraits, No Shadows)
──────────────────────────────────────────────────────────────────────── */
function PersonCard({ person, delay }: { person: PersonItem; delay: number }) {
  const photoUrl = person.photo || (
    person.id === "p_founder" ? "/avatars/team-founder.jpg" :
    person.id === "p_head_designer" ? "/avatars/team-designer.jpg" :
    person.id === "p_tech_lead" ? "/avatars/team-tech.jpg" :
    "/avatars/team-ops.jpg"
  );

  return (
    <div
      className="group flex flex-col items-center text-center gap-4 rounded-3xl p-4 sm:p-5 border border-border/70 bg-card/40 hover:border-primary/50 transition-all duration-300 select-none shadow-none fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Full-Body Black & White Portrait Photo (No Shadow) */}
      <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border/60 bg-muted/20 relative shadow-none">
        <img
          src={photoUrl}
          alt={person.name}
          className="w-full h-full object-cover object-top grayscale contrast-110 group-hover:scale-[1.02] transition-all duration-500 shadow-none"
        />
      </div>

      <div className="space-y-1.5 w-full flex flex-col items-center text-center pt-1">
        <p className="font-display text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
          {person.name}
        </p>
        <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
          {person.designation}
        </p>
        {person.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto pt-1 font-medium line-clamp-3">
            {person.bio}
          </p>
        )}
        {person.link && (
          <a
            href={person.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline pt-1.5"
          >
            <span>View Profile</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   CONTACT FORM
──────────────────────────────────────────────────────────────────────── */
const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().email("Invalid email"),
  subject: z.string().trim().min(2, "Add a subject"),
  message: z.string().trim().min(10, "Tell us a little more"),
});

type FormState = "idle" | "loading" | "success" | "error";

function ContactForm({ title, subtitle }: { title: string; subtitle: string }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [state, setState] = useState<FormState>("idle");
  const [ticket, setTicket] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof typeof form, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof typeof form;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setState("loading");
    try {
      const { data, error } = await (supabase as any)
        .from("inquiries")
        .insert({ ...parsed.data, status: "new" })
        .select("id")
        .single();
      if (error) throw error;
      setTicket("ORZ-" + ((data?.id ?? "") as string).toString().slice(0, 8).toUpperCase());
      setState("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setState("error");
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type: "input" | "textarea" = "input",
    inputType = "text"
  ) => (
    <div className="space-y-1.5 text-left">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block">
        {label}
      </label>
      {type === "input" ? (
        <input
          type={inputType}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full h-11 rounded-xl bg-muted/40 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
        />
      ) : (
        <textarea
          rows={4}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full rounded-xl bg-muted/40 border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none"
        />
      )}
      {errors[key] && <p className="text-[11px] text-primary">{errors[key]}</p>}
    </div>
  );

  if (state === "success") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3 max-w-xl mx-auto w-full">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
        <p className="font-display text-lg font-semibold">Message received</p>
        <p className="text-xs text-muted-foreground">
          Reference: <span className="font-mono text-foreground">{ticket}</span>
        </p>
        <button
          onClick={() => setState("idle")}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-6 text-left max-w-2xl mx-auto w-full shadow-lg">
      <div className="text-center space-y-1">
        <p className="font-display text-xl sm:text-2xl font-bold text-foreground">{title}</p>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Name", "name")}
          {field("Email", "email", "input", "email")}
        </div>
        {field("Subject", "subject")}
        {field("Message", "message", "textarea")}
        {state === "error" && (
          <p className="text-xs text-primary text-center">Something went wrong. Please try again.</p>
        )}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={state === "loading"}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-all shadow-md"
          >
            {state === "loading" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-4 h-4" /> Send Message</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────
   MAIN EXPLORE PAGE — Full Width Responsive with Cinematic Intro
──────────────────────────────────────────────────────────────────────── */
export function OrizinoConnect() {
  const [cfg, , , loaded] = useOrizinoConfig();
  const { data: siteSettings } = useGlobalSiteSettings();

  // Cinematic Intro Stages:
  // 0: Giant Logo Stroke Draw (0s - 1.8s)
  // 1: Giant Title Fade-In Reveal (1.8s - 3.0s)
  // 2: Smooth Shrink Down into Hero (3.0s - 4.1s)
  // 3: Complete — Page Contents Fade In (4.1s+)
  const [introStage, setIntroStage] = useState<number>(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setIntroStage(1), 1800);
    const t2 = setTimeout(() => setIntroStage(2), 3000);
    const t3 = setTimeout(() => setIntroStage(3), 4100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Global brand identity from site_settings (matches Storefront)
  const siteName      = siteSettings?.site_name || "ORIZINO";
  const titleSource   = siteSettings?.title_source || "text";
  const titleImageUrl = siteSettings?.title_image_url || "";
  const titleFont     = siteSettings?.title_font || "";
  const displayStyle  = siteSettings?.logo_display_style || "both";

  const showLogo  = !displayStyle || displayStyle === "logo"  || displayStyle === "both";
  const showTitle = !displayStyle || displayStyle === "title" || displayStyle === "both";

  // Dynamic favicon synchronization — always ensure official ORIZINO mark
  useEffect(() => {
    const iconUrl = "/favicon.png?v=4";
    const links = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']",
    );
    links.forEach((el) => {
      el.href = iconUrl;
    });
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledLinks        = (cfg.links        || []).filter((l) => l.enabled);
  const enabledPeople       = (cfg.people        || []).filter((p) => p.enabled);
  const enabledContactItems = (cfg.contactItems  || []).filter((c) => c.enabled);
  const enabledContactNotes = (cfg.contactNotes  || []).filter((n) => n.enabled);

  const isIntroActive = introStage < 3;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-background text-foreground overflow-x-hidden relative">

      {/* ── CINEMATIC INTRO OVERLAY ───────────────────────────── */}
      <AnimatePresence>
        {isIntroActive && (
          <motion.div
            key="cinematic-overlay"
            initial={{ opacity: 1 }}
            animate={{
              opacity: introStage === 2 ? 0 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background pointer-events-none px-4"
          >
            {/* Ambient Spotlight Glow during Intro */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 65% 55% at 50% 50%, hsl(var(--primary) / 0.2), transparent 75%)",
              }}
            />

            <motion.div
              initial={{ scale: 1, y: 0 }}
              animate={
                introStage === 2
                  ? { scale: 0.45, y: -90, opacity: 0 }
                  : { scale: 1, y: 0, opacity: 1 }
              }
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center text-center space-y-6 max-w-4xl mx-auto"
            >
              {/* Super Large Logo Stroke Draw */}
              <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 relative flex items-center justify-center animate-logo-idle">
                <svg
                  viewBox="0 0 539.27 565.14"
                  className="w-full h-full overflow-visible animate-logo-stroke-fill"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="logoIntroMetallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--theme-shine)" stopOpacity="1" />
                      <stop offset="25%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
                      <stop offset="75%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="var(--theme-shine)" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <g fill="url(#logoIntroMetallicGrad)" strokeLinejoin="round" strokeLinecap="round">
                    <path className="shape-left" d={PATH_LEFT} />
                    <path className="shape-right" d={PATH_RIGHT} />
                    <path className="shape-middle" d={PATH_MIDDLE} />
                  </g>
                </svg>
              </div>

              {/* Super Large Brand Title Reveal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: introStage >= 1 ? 1 : 0,
                  y: introStage >= 1 ? 0 : 20,
                }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="select-none"
              >
                {titleSource === "image" && titleImageUrl ? (
                  <img
                    src={titleImageUrl}
                    alt={siteName}
                    className="h-16 sm:h-24 md:h-28 w-auto object-contain mx-auto"
                  />
                ) : (
                  <div className="w-full max-w-3xl mx-auto px-4">
                    <svg viewBox="0 0 1000 130" className="w-full h-auto mx-auto overflow-visible select-none">
                      <defs>
                        <linearGradient id="monochromeIntroStrokeShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.1" />
                          <stop offset="35%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
                          <stop offset="50%" stopColor="var(--theme-shine)" stopOpacity="1" />
                          <stop offset="65%" stopColor="hsl(var(--foreground))" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="text-[68px] sm:text-[80px] md:text-[90px] font-bold uppercase tracking-[0.25em] animate-title-stroke-fill"
                        style={{
                          fontFamily: titleFont
                            ? `'${titleFont}', var(--font-title, var(--font-display))`
                            : "var(--font-title, var(--font-display))",
                          stroke: "url(#monochromeIntroStrokeShimmer)",
                          fill: "url(#monochromeIntroStrokeShimmer)",
                          letterSpacing: "0.25em",
                          filter: "drop-shadow(0 0 25px hsl(var(--primary) / 0.4))",
                        }}
                      >
                        {siteName}
                      </text>
                    </svg>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.15), transparent 75%)",
        }}
      />

      {/* ── FULL WIDTH CONTAINER ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introStage >= 2 ? 1 : 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16 sm:space-y-24 text-center"
      >

        {/* ── HERO SECTION ─────────────────────────────────────── */}
        <section className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">

          {/* Logo with 5 Tap Animations */}
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimatedLogo siteName={siteName} />
            </motion.div>
          )}

          {/* Brand Title — Follows Storefront Typography */}
          {showTitle && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <StorefrontBrandTitle
                siteName={siteName}
                titleSource={titleSource}
                titleImageUrl={titleImageUrl}
                titleFont={titleFont}
              />
            </motion.div>
          )}

          {/* Eyebrow tag: EXPLORE with electric neon blink */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: introStage >= 3 ? 1 : 0, y: introStage >= 3 ? 0 : 15 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.45em] text-primary neon-blink-eyebrow"
          >
            {cfg.hero?.eyebrow && cfg.hero.eyebrow !== "ORIZINO · EXPLORE" ? cfg.hero.eyebrow : "EXPLORE"}
          </motion.p>

          {/* Hero headline & taglines — Neon tube blinking electric signs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: introStage >= 3 ? 1 : 0, y: introStage >= 3 ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2 my-3"
          >
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-foreground neon-blink-white">
              {cfg.hero?.line1 || "Wear the story."}
            </h1>
            <p className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-gradient-crimson neon-blink-crimson">
              {cfg.hero?.line3 || "Mark what's next."}
            </p>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: introStage >= 3 ? 1 : 0, y: introStage >= 3 ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-sans"
          >
            {cfg.hero?.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: introStage >= 3 ? 1 : 0, y: introStage >= 3 ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <a
              href="#channels"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-md"
            >
              {cfg.hero?.primaryCta || "Explore Collections"}
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              {cfg.hero?.ghostCta || "Contact Maison"}
            </a>
          </motion.div>
        </section>

        <Divider />

        {/* ── COLLECTIONS SECTION ──────────────────────────────── */}
        {cfg.themes && cfg.themes.length > 0 && (
          <section className="space-y-8 sm:space-y-12">
            <div className="space-y-2 fade-up d1 max-w-2xl mx-auto">
              <Label>{cfg.themesIntro?.eyebrow || "Collections"}</Label>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                {cfg.themesIntro?.title || "Worlds, tailored."}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cfg.themesIntro?.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {cfg.themes.map((theme, i) => (
                <ThemeCard key={theme.id} theme={theme} delay={120 + i * 60} />
              ))}
            </div>
          </section>
        )}

        <Divider />

        {/* ── CHANNELS SECTION ─────────────────────────────────── */}
        {enabledLinks.length > 0 && (
          <section id="channels" className="space-y-8 sm:space-y-12">
            <div className="space-y-2 fade-up d2 max-w-2xl mx-auto">
              <Label>{cfg.connectIntro?.eyebrow || "Channels"}</Label>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                {cfg.connectIntro?.title || "The Connect Grid"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cfg.connectIntro?.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {enabledLinks.map((link, i) => (
                <ChannelCard key={link.id} link={link} delay={140 + i * 35} />
              ))}
            </div>
          </section>
        )}

        <Divider />

        {/* ── CONTACT SECTION ──────────────────────────────────── */}
        <section id="contact" className="space-y-10 sm:space-y-12">
          <div className="space-y-2 fade-up d3 max-w-2xl mx-auto">
            <Label>{cfg.contactIntro?.eyebrow || "Direct"}</Label>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {cfg.contactIntro?.title || "Let's Connect."}
            </h2>
          </div>

          {/* Clean Framed Contact Form / Directory (No BG Panel, Form Style) */}
          {(enabledContactItems.length > 0 || enabledContactNotes.length > 0) && (
            <div className="rounded-3xl border border-border/70 bg-transparent p-6 sm:p-10 max-w-4xl mx-auto space-y-10 fade-up d4 text-center">
              {/* Form-style Contact Fields in Clean Grid */}
              {enabledContactItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {enabledContactItems.map((item) => {
                    const Icon = CONTACT_ICON_MAP[item.icon];
                    const href = contactItemHref(item);
                    return (
                      <a
                        key={item.id}
                        href={href || undefined}
                        target={item.linkKind === "url" ? "_blank" : undefined}
                        rel="noreferrer"
                        className="group flex flex-col items-center justify-center text-center pb-3 border-b border-border/50 hover:border-primary/60 transition-colors cursor-pointer select-none space-y-1.5"
                      >
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                          {Icon && <Icon className="w-3.5 h-3.5 text-primary/80 group-hover:text-primary transition-colors" />}
                          <span>{item.label}</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors break-words">
                          {item.value}
                        </p>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Operational notes inside the frame */}
              {enabledContactNotes.length > 0 && (
                <div className="pt-2 flex flex-col items-center justify-center gap-2.5 max-w-xl mx-auto">
                  {enabledContactNotes.map((note) => {
                    const Icon = CONTACT_ICON_MAP[note.icon];
                    return (
                      <div key={note.id} className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                        {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />}
                        <span className="leading-relaxed font-medium">{note.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <ContactForm
            title={cfg.contact?.formTitle || "Contact the Maison"}
            subtitle={cfg.contact?.formSubtitle || "Every message reaches the maison directly."}
          />
        </section>

        {/* ── TEAM SECTION ─────────────────────────────────────── */}
        {enabledPeople.length > 0 && (
          <>
            <Divider />
            <section className="space-y-8 sm:space-y-12">
              <div className="space-y-2 fade-up d6 max-w-2xl mx-auto">
                <Label>{cfg.peopleIntro?.eyebrow || "The Team"}</Label>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  {cfg.peopleIntro?.title || "People behind the mark."}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cfg.peopleIntro?.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {enabledPeople.map((person, i) => (
                  <PersonCard key={person.id} person={person} delay={300 + i * 60} />
                ))}
              </div>
            </section>
          </>
        )}

        <Divider />

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="space-y-4 text-center fade-up d7 pb-10 max-w-xl mx-auto flex flex-col items-center">
          {/* Correct ORIZINO Brand Logo (Stacked on Top) */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center">
            <svg
              viewBox="0 0 539.27 565.14"
              className="w-full h-full fill-primary transition-transform duration-300 hover:scale-110"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d={PATH_LEFT} />
              <path d={PATH_RIGHT} />
              <path d={PATH_MIDDLE} />
            </svg>
          </div>

          {/* Correct Brand Title with Dynamic Global Font */}
          <span
            className="font-display text-base sm:text-lg font-bold tracking-[0.25em] uppercase text-foreground"
            style={{
              fontFamily: titleFont
                ? `'${titleFont}', var(--font-title, var(--font-display))`
                : "var(--font-title, var(--font-display))",
              letterSpacing: "0.25em",
            }}
          >
            {siteName}
          </span>

          {cfg.footer?.tagline && (
            <p className="text-xs text-muted-foreground">{cfg.footer.tagline}</p>
          )}
          {cfg.contactFooterLine && (
            <p className="text-xs text-muted-foreground/60">{cfg.contactFooterLine}</p>
          )}
          <p className="text-xs text-muted-foreground/40 pt-1">
            {cfg.footer?.copyright || `© ${new Date().getFullYear()} ${siteName}`}
          </p>
        </footer>

      </motion.div>
    </div>
  );
}
