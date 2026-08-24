import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IconKey =
  | "instagram" | "tiktok" | "facebook" | "pinterest" | "youtube"
  | "discord" | "whatsapp" | "telegram" | "globe" | "mail"
  | "twitter" | "linkedin" | "github" | "music" | "shop" | "custom";

export type LinkItem = {
  id: string;
  name: string;
  desc: string;
  href: string;
  icon: IconKey;
  customLogo?: string;
  enabled: boolean;
};

export type ThemeItem = {
  id: string;
  label: string;
  blurb: string;
  image?: string;
  longDescription?: string;
  accent?: string;
};

export type ContactIconKey =
  | "mail" | "phone" | "briefcase" | "handshake" | "instagram"
  | "mapPin" | "globe" | "clock" | "truck" | "refresh" | "info" | "sparkles";

export type ContactLinkKind = "mailto" | "tel" | "url" | "instagram" | "map" | "none";

export type ContactItem = {
  id: string;
  icon: ContactIconKey;
  label: string;
  value: string;
  linkKind: ContactLinkKind;
  href?: string;
  enabled: boolean;
};

export type ContactNote = {
  id: string;
  icon: ContactIconKey;
  text: string;
  enabled: boolean;
};

export type PersonItem = {
  id: string;
  name: string;
  designation: string;
  photo?: string;
  bio?: string;
  link?: string;
  enabled: boolean;
};

export type OrizinoConfig = {
  hero: {
    eyebrow: string;
    line1: string;
    line2: string;
    line3: string;
    subtitle: string;
    primaryCta: string;
    ghostCta: string;
  };
  themesIntro: { eyebrow: string; title: string; subtitle: string };
  themes: ThemeItem[];
  connectIntro: { eyebrow: string; title: string; subtitle: string };
  links: LinkItem[];
  contactIntro: { eyebrow: string; title: string };
  contact: {
    email: string;
    phone: string;
    business: string;
    partnership: string;
    responseTime: string;
    location: string;
    address: string;
    hours: string;
    instagram: string;
    shipping: string;
    returns: string;
    pressNote: string;
    formTitle: string;
    formSubtitle: string;
  };
  contactItems: ContactItem[];
  contactNotes: ContactNote[];
  contactFooterLine: string;
  peopleIntro: { eyebrow: string; title: string; subtitle: string };
  people: PersonItem[];
  footer: {
    brandName: string;
    tagline: string;
    copyright: string;
  };
  motion: { speed: number; intensity: number; logoRotateInterval: number };
};

export const DEFAULT_CONFIG: OrizinoConfig = {
  hero: {
    eyebrow: "EXPLORE",
    line1: "Wear the story",
    line2: "Live the theme",
    line3: "Mark what's next",
    subtitle:
      "ORIZINO is a premium fashion maison crafting character-styled wardrobes — anime, cinema, gaming and street — translated into luxury silhouettes. Explore every channel, every collection, every world.",
    primaryCta: "Explore Collections",
    ghostCta: "Contact Maison",
  },
  themesIntro: {
    eyebrow: "COLLECTIONS",
    title: "Worlds, tailored.",
    subtitle: "Four universes, one maison. Each collection is a wardrobe drawn from the characters and worlds you already love.",
  },
  themes: [
    { id: "anime", label: "Anime", blurb: "Cult anime characters reimagined in premium-grade fabrics.", image: "/images/theme-anime.jpg", longDescription: "From shōnen icons to cult sci-fi heroines — wearable silhouettes drawn directly from the characters that shaped a generation.", accent: "#FF3E5A" },
    { id: "cinema", label: "Cinema", blurb: "Iconic film characters, reborn as luxury fashion silhouettes.", image: "/images/theme-cinema.jpg", longDescription: "Costume design lifted from the frames you remember. Character-driven pieces translated into ready-to-wear form.", accent: "#C8203B" },
    { id: "gaming", label: "Gaming", blurb: "Legendary game characters, stitched into luxury form.", image: "/images/theme-gaming.jpg", longDescription: "Iconic protagonists, antagonists and worlds from your favorite titles — engineered into wearable, premium silhouettes.", accent: "#8C1620" },
    { id: "street", label: "Streetwear", blurb: "Raw silhouettes, sharpened by luxury hands.", image: "/images/theme-streetwear.jpg", longDescription: "Street-rooted shapes recut with maison discipline. The everyday uniform, dialed up.", accent: "#6E1218" },
  ],
  connectIntro: {
    eyebrow: "CHANNELS",
    title: "The Connect Grid",
    subtitle: "Every doorway into the ORIZINO universe. Choose your channel — every link is a different angle of the same mark.",
  },
  links: [
    { id: "ig", name: "Instagram", desc: "Visual stories & collections", href: "https://instagram.com/orizino", icon: "instagram", enabled: true },
    { id: "tt", name: "TikTok", desc: "Motion. Mood. Marks.", href: "https://tiktok.com/@orizino", icon: "tiktok", enabled: true },
    { id: "fb", name: "Facebook", desc: "The wider circle", href: "https://facebook.com/orizino", icon: "facebook", enabled: true },
    { id: "pin", name: "Pinterest", desc: "Mood, archived", href: "https://pinterest.com/orizino", icon: "pinterest", enabled: true },
    { id: "yt", name: "YouTube", desc: "Films & lookbooks", href: "https://youtube.com/@orizino", icon: "youtube", enabled: true },
    { id: "dc", name: "Discord", desc: "The inner community", href: "https://discord.gg/orizino", icon: "discord", enabled: true },
    { id: "wa", name: "WhatsApp", desc: "Direct channel", href: "https://wa.me/8801800000000", icon: "whatsapp", enabled: true },
    { id: "tg", name: "Telegram", desc: "Direct line from the maison", href: "https://t.me/orizino", icon: "telegram", enabled: true },
    { id: "web", name: "Storefront", desc: "Enter the storefront", href: "https://shop.orizino.com", icon: "shop", enabled: true },
    { id: "mail", name: "Email", desc: "Contact the maison", href: "mailto:hello@orizino.com", icon: "mail", enabled: true },
  ],
  contactIntro: { eyebrow: "DIRECT", title: "Let's Connect." },
  contact: {
    email: "hello@orizino.com",
    phone: "+880 1800-000000",
    business: "business@orizino.com",
    partnership: "partners@orizino.com",
    responseTime: "Within 24–48 hours",
    location: "Worldwide & Dhaka Atelier",
    address: "ORIZINO Atelier, Banani, Dhaka, Bangladesh",
    hours: "Mon–Sat · 10:00 – 20:00 BST",
    instagram: "@orizino",
    shipping: "Dhaka (24–48h) · Nationwide Express (48–72h)",
    returns: "7-day hassle-free size exchange on all drops",
    pressNote: "For press inquiries, please include outlet, deadline, and assets needed.",
    formTitle: "Contact the Maison",
    formSubtitle: "Tell us about your inquiry — collaborations, press, or a private order. Every message reaches the maison directly.",
  },
  contactItems: [
    { id: "ci_email", icon: "mail", label: "Email", value: "hello@orizino.com", linkKind: "mailto", enabled: true },
    { id: "ci_phone", icon: "phone", label: "Phone", value: "+880 1800-000000", linkKind: "tel", enabled: true },
    { id: "ci_biz", icon: "briefcase", label: "Business", value: "business@orizino.com", linkKind: "mailto", enabled: true },
    { id: "ci_part", icon: "handshake", label: "Partnerships", value: "partners@orizino.com", linkKind: "mailto", enabled: true },
    { id: "ci_ig", icon: "instagram", label: "Instagram", value: "@orizino", linkKind: "instagram", enabled: true },
    { id: "ci_flag", icon: "mapPin", label: "Atelier", value: "ORIZINO Atelier, Banani, Dhaka", linkKind: "map", enabled: true },
  ],
  contactNotes: [
    { id: "cn_hours", icon: "clock", text: "Mon–Sat · 10:00 – 20:00 BST · Reply within 24–48 hours", enabled: true },
    { id: "cn_ship", icon: "truck", text: "Dhaka Express (24–48h) · Nationwide (48–72h)", enabled: true },
    { id: "cn_ret", icon: "refresh", text: "7-day hassle-free size exchange on all garments", enabled: true },
    { id: "cn_press", icon: "info", text: "For press inquiries, please include outlet, deadline, and assets needed.", enabled: true },
  ],
  contactFooterLine: "Dhaka Atelier · Worldwide Shipping",
  peopleIntro: {
    eyebrow: "THE TEAM",
    title: "People behind the mark.",
    subtitle: "Founders, designers and artisans — the team shaping every ORIZINO collection.",
  },
  people: [
    { id: "p_founder", name: "Azim Khan", designation: "Founder & Creative Director", photo: "/avatars/team-founder.jpg", bio: "Architect of the ORIZINO vision, marrying high fashion tailoring with anime & cinema character identities.", enabled: true },
    { id: "p_head_designer", name: "Atelier Lead", designation: "Head of Garment Architecture", photo: "/avatars/team-designer.jpg", bio: "Master of structural patterns, precision drop-shoulders and 240 GSM bespoke textiles.", enabled: true },
    { id: "p_tech_lead", name: "Digital Maison", designation: "Head of Systems & Experience", photo: "/avatars/team-tech.jpg", bio: "Crafting the immersive virtual maison, interactive discovery channels and digital touchpoints.", enabled: true },
    { id: "p_ops", name: "Fulfillment Lead", designation: "Director of Logistics & Operations", photo: "/avatars/team-ops.jpg", bio: "Leading high-velocity nationwide distribution and white-glove atelier deliveries.", enabled: true },
  ],
  footer: {
    brandName: "ORIZINO",
    tagline: "From Beyond Ordinary",
    copyright: "© 2026 ORIZINO — ALL RIGHTS RESERVED",
  },
  motion: { speed: 1, intensity: 1, logoRotateInterval: 10 },
};

export function mergeConfig(parsed: Partial<OrizinoConfig> | null | undefined): OrizinoConfig {
  if (!parsed || typeof parsed !== "object") return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    hero: { ...DEFAULT_CONFIG.hero, ...(parsed.hero || {}) },
    themesIntro: { ...DEFAULT_CONFIG.themesIntro, ...(parsed.themesIntro || {}) },
    connectIntro: { ...DEFAULT_CONFIG.connectIntro, ...(parsed.connectIntro || {}) },
    contactIntro: { ...DEFAULT_CONFIG.contactIntro, ...(parsed.contactIntro || {}) },
    contact: { ...DEFAULT_CONFIG.contact, ...(parsed.contact || {}) },
    footer: { ...DEFAULT_CONFIG.footer, ...(parsed.footer || {}) },
    motion: { ...DEFAULT_CONFIG.motion, ...(parsed.motion || {}) },
    themes: Array.isArray(parsed.themes) && parsed.themes.length ? parsed.themes : DEFAULT_CONFIG.themes,
    links: Array.isArray(parsed.links) && parsed.links.length ? parsed.links : DEFAULT_CONFIG.links,
    contactItems: Array.isArray(parsed.contactItems) && parsed.contactItems.length ? parsed.contactItems : DEFAULT_CONFIG.contactItems,
    contactNotes: Array.isArray(parsed.contactNotes) && parsed.contactNotes.length ? parsed.contactNotes : DEFAULT_CONFIG.contactNotes,
    contactFooterLine: typeof parsed.contactFooterLine === "string" ? parsed.contactFooterLine : DEFAULT_CONFIG.contactFooterLine,
    peopleIntro: { ...DEFAULT_CONFIG.peopleIntro, ...(parsed.peopleIntro || {}) },
    people: Array.isArray(parsed.people) && parsed.people.length ? parsed.people : DEFAULT_CONFIG.people,
  };
}

export async function fetchConfig(): Promise<OrizinoConfig> {
  try {
    // 1. Try site_settings (explore_config)
    const { data: ss } = await (supabase as any)
      .from("site_settings")
      .select("value")
      .eq("key", "explore_config")
      .maybeSingle();

    if (ss?.value) {
      return mergeConfig(ss.value as Partial<OrizinoConfig>);
    }

    // 2. Fallback to site_config (main)
    const { data: sc } = await (supabase as any)
      .from("site_config")
      .select("data")
      .eq("id", "main")
      .maybeSingle();

    if (sc?.data) {
      return mergeConfig(sc.data as Partial<OrizinoConfig>);
    }

    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfigRemote(cfg: OrizinoConfig) {
  // Upsert to site_settings under 'explore_config'
  const { error: ssError } = await (supabase as any)
    .from("site_settings")
    .upsert({ key: "explore_config", value: cfg as any, updated_at: new Date().toISOString() });

  if (ssError) {
    // Fallback try site_config
    const { error: scError } = await (supabase as any)
      .from("site_config")
      .upsert({ id: "main", data: cfg as any, updated_at: new Date().toISOString() });
    if (scError) throw ssError || scError;
  }
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type SaveState = {
  status: SaveStatus;
  error: string | null;
  dirty: boolean;
  saveNow: () => Promise<void>;
};

export type UseOrizinoConfig = [
  OrizinoConfig,
  (updater: (c: OrizinoConfig) => OrizinoConfig) => void,
  () => Promise<void>,
  boolean,
  SaveState,
];

export function useOrizinoConfig(): UseOrizinoConfig {
  const [cfg, setCfg] = useState<OrizinoConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const cfgRef = useRef<OrizinoConfig>(DEFAULT_CONFIG);
  const dirtyRef = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchConfig().then((c) => {
      if (alive && !dirtyRef.current) {
        setCfg(c);
        cfgRef.current = c;
      }
      if (alive) setLoaded(true);
    });

    const channel = supabase
      .channel("explore-config-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.explore_config" },
        (payload) => {
          if (dirtyRef.current) return;
          const next = (payload.new as { value?: Partial<OrizinoConfig> } | undefined)?.value;
          if (next) {
            const merged = mergeConfig(next);
            cfgRef.current = merged;
            setCfg(merged);
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const persist = useCallback(async (next: OrizinoConfig) => {
    if (savedTimer.current) {
      clearTimeout(savedTimer.current);
      savedTimer.current = null;
    }
    setStatus("saving");
    setError(null);
    try {
      await saveConfigRemote(next);
      dirtyRef.current = false;
      setDirty(false);
      setStatus("saved");
      savedTimer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Save failed");
      throw e;
    }
  }, []);

  const update = useCallback((updater: (c: OrizinoConfig) => OrizinoConfig) => {
    const next = updater(cfgRef.current);
    cfgRef.current = next;
    setCfg(next);
    dirtyRef.current = true;
    setDirty(true);
    setStatus("idle");
  }, []);

  const reset = useCallback(async () => {
    cfgRef.current = DEFAULT_CONFIG;
    setCfg(DEFAULT_CONFIG);
    await persist(DEFAULT_CONFIG);
  }, [persist]);

  const saveNow = useCallback(async () => {
    await persist(cfgRef.current);
  }, [persist]);

  return [cfg, update, reset, loaded, { status, error, dirty, saveNow }];
}

export function newLinkId() {
  return "lnk_" + Math.random().toString(36).slice(2, 9);
}

export function newContactItemId() {
  return "ci_" + Math.random().toString(36).slice(2, 9);
}

export function newContactNoteId() {
  return "cn_" + Math.random().toString(36).slice(2, 9);
}

export function newPersonId() {
  return "p_" + Math.random().toString(36).slice(2, 9);
}

export function contactItemHref(it: ContactItem): string {
  if (it.href && it.href.trim()) return it.href.trim();
  const v = it.value.trim();
  switch (it.linkKind) {
    case "mailto":
      return `mailto:${v}`;
    case "tel":
      return `tel:${v.replace(/[^+\d]/g, "")}`;
    case "instagram":
      return `https://instagram.com/${v.replace(/^@/, "")}`;
    case "map":
      return `https://maps.google.com/?q=${encodeURIComponent(v)}`;
    case "url":
      return v;
    default:
      return "#";
  }
}
