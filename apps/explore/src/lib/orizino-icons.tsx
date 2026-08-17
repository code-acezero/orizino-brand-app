import React from "react";
import { MessageCircle, Send, Globe, Mail, Music2, ShoppingBag } from "lucide-react";
import type { IconKey } from "@/lib/orizino-config";

export const InstagramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const FacebookIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const YoutubeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

export const TwitterIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const LinkedinIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const GithubIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.5 6.5a5.5 5.5 0 0 1-4-1.7v9.4a5.8 5.8 0 1 1-5-5.8v3a2.8 2.8 0 1 0 2 2.7V2h3a4.5 4.5 0 0 0 4 4.5z"/>
  </svg>
);

export const PinterestIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 2 0 3.5-2.1 3.5-5 0-2.6-1.9-4.5-4.6-4.5a4.7 4.7 0 0 0-4.9 4.7c0 .9.4 1.9.8 2.5.1.1.1.2.1.3l-.3 1.3c-.1.2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.5 0 3.9-2.5 7-5.9 7-1.2 0-2.3-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.2-1.4 3A10 10 0 1 0 12 2z"/>
  </svg>
);

export const DiscordIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20 4.5A18.3 18.3 0 0 0 15.5 3l-.3.5a13.6 13.6 0 0 0-6.4 0L8.5 3A18 18 0 0 0 4 4.5C1.3 8.6.5 12.5.9 16.4a18.3 18.3 0 0 0 5.6 2.8l1.1-1.6c-1-.4-2-.9-2.8-1.5l.7-.5a13 13 0 0 0 11 0l.7.5c-.9.6-1.8 1.1-2.8 1.5l1.1 1.6a18.3 18.3 0 0 0 5.6-2.8c.6-4.6-.7-8.4-3.1-11.9zM9 14.5c-1 0-1.9-1-1.9-2.2 0-1.3.8-2.2 1.9-2.2 1.1 0 2 1 1.9 2.2 0 1.3-.8 2.2-1.9 2.2zm6 0c-1.1 0-1.9-1-1.9-2.2 0-1.3.8-2.2 1.9-2.2s1.9 1 1.9 2.2c0 1.3-.8 2.2-1.9 2.2z"/>
  </svg>
);

export const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.2.7-1.3 1.4-1.9 1.4-.5.1-1 .2-3.4-.8-2.9-1.2-4.7-4.1-4.8-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .5-.1.2-.2.3-.3.4l-.3.4c-.1.1-.2.3-.1.5.1.2.6 1.1 1.4 1.8 1 .9 1.9 1.2 2.1 1.3.2.1.4.1.5 0l1-1.2c.1-.2.4-.2.5-.1l1.7.8c.3.1.4.2.5.3 0 .1 0 .8-.4 1.5z"/>
  </svg>
);

export type IconComp = React.ComponentType<{ className?: string }>;

export const ICON_MAP: Record<Exclude<IconKey, "custom">, IconComp> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  facebook: FacebookIcon,
  pinterest: PinterestIcon,
  youtube: YoutubeIcon,
  discord: DiscordIcon,
  whatsapp: WhatsAppIcon,
  telegram: Send,
  globe: Globe,
  mail: Mail,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
  github: GithubIcon,
  music: Music2,
  shop: ShoppingBag,
};

export const ICON_OPTIONS: { key: IconKey; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "pinterest", label: "Pinterest" },
  { key: "youtube", label: "YouTube" },
  { key: "discord", label: "Discord" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "twitter", label: "X / Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "music", label: "Music" },
  { key: "shop", label: "Shop" },
  { key: "globe", label: "Website" },
  { key: "mail", label: "Email" },
  { key: "custom", label: "Custom Logo" },
];

export { MessageCircle };
