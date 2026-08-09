"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearch } from "@orizino/shared/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import QRCode from "qrcode";
import {
  Mail, Phone, MapPin, Globe, MessageCircle, Send, Download, Share2, QrCode as QrIcon, BadgeCheck, Copy, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicIdentity } from "@/lib/employee-identity.functions";
import { themeMap, themePalettes, allThemeVars } from "@/lib/theme-palettes";
import "@/src/styles/identity-layouts.css";

interface Identity {
  id: string;
  employee_code: string;
  slug: string;
  display_name: string | null;
  title: string | null;
  department: string | null;
  bio: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  accent_color: string | null;
  layout_preset?: string | null;
  theme_preset?: string | null;
  email_public: string | null;
  phone_public: string | null;
  location: string | null;
  timezone: string | null;
  socials: Record<string, string> | null;
  skills: string[] | null;
  languages: string[] | null;
  allow_indexing?: boolean | null;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  linkedin: <Globe className="w-4 h-4" />,
  twitter: <Globe className="w-4 h-4" />,
  instagram: <Globe className="w-4 h-4" />,
  github: <Globe className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
};

function socialHref(kind: string, val: string): string {
  const v = val.trim();
  if (!v) return "#";
  if (/^https?:\/\//i.test(v)) return v;
  switch (kind) {
    case "linkedin": return `https://linkedin.com/in/${v.replace(/^@/, "")}`;
    case "twitter": return `https://twitter.com/${v.replace(/^@/, "")}`;
    case "instagram": return `https://instagram.com/${v.replace(/^@/, "")}`;
    case "github": return `https://github.com/${v.replace(/^@/, "")}`;
    case "whatsapp": return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
    case "telegram": return `https://t.me/${v.replace(/^@/, "")}`;
    case "website":
    default: return `https://${v}`;
  }
}

function toVCard(id: Identity, url: string): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${id.display_name ?? ""}`,
    id.title ? `TITLE:${id.title}` : "",
    id.department ? `ORG:${id.department}` : "",
    id.email_public ? `EMAIL;TYPE=WORK:${id.email_public}` : "",
    id.phone_public ? `TEL;TYPE=WORK,VOICE:${id.phone_public}` : "",
    id.location ? `ADR;TYPE=WORK:;;${id.location};;;;` : "",
    id.avatar_url ? `PHOTO;VALUE=URI:${id.avatar_url}` : "",
    `URL:${url}`,
    `NOTE:${(id.bio ?? "").replace(/\n/g, "\\n")}`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/** Resolve preset -> CSS var map (or null when 'system'). */
function useThemePresetVars(themePreset: string | null | undefined): Record<string, string> | null {
  return useMemo(() => {
    if (!themePreset || themePreset === "system") return null;
    const palette = themeMap.get(themePreset) || themePalettes.find((p) => p.id === themePreset);
    if (!palette) return null;
    // Public profile always renders in the palette's dark scheme for visual consistency.
    return palette.dark;
  }, [themePreset]);
}

/** Brand mark shown on every layout — pulls current brand name + logo. */
const BrandMark: React.FC = () => {
  const { data } = useQuery({
    queryKey: ["public-identity-brand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", ["brand_identity", "site_name"]);
      const map: Record<string, any> = {};
      data?.forEach((r) => {
        const v = (r as any).value;
        map[(r as any).key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v;
      });
      const brand = map.brand_identity || {};
      return {
        name: brand.name || map.site_name || "Orizino",
        logo: brand.logo || "/orizino-logo.svg",
      };
    },
    staleTime: 5 * 60_000,
  });
  const name = data?.name ?? "Orizino";
  const logo = data?.logo ?? "/orizino-logo.svg";
  return (
    <a href="/" className="id-brandmark" aria-label={`${name} home`}>
      <img src={logo} alt="" className="w-6 h-6 rounded" />
      <span className="tracking-tight">{name}</span>
      <span className="ml-auto text-[10px] uppercase tracking-widest opacity-60">Verified employee</span>
    </a>
  );
};

export default function EmployeeIdentityPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const search = useSearch({ strict: false }) as { preview?: string };
  const isPreview = search?.preview === "1";
  const fetchIdentity = useServerFn(getPublicIdentity);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-identity-public", slug],
    queryFn: () => fetchIdentity({ data: { slug } }),
    staleTime: 60_000,
  });

  const identity = (data?.identity ?? null) as Identity | null;
  const accent = identity?.accent_color || "#3B82F6";
  const layout = identity?.layout_preset || "classic";
  const themeVars = useThemePresetVars(identity?.theme_preset);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/id/${slug}` : `/id/${slug}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(publicUrl, { errorCorrectionLevel: "M", margin: 1, width: 512, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [publicUrl]);

  const initials = useMemo(() => {
    const n = identity?.display_name ?? "";
    return n.split(/\s+/).slice(0, 2).map((s) => s[0] || "").join("").toUpperCase() || "?";
  }, [identity?.display_name]);

  const socials = identity?.socials ?? {};
  const socialEntries = Object.entries(socials).filter(([, v]) => (v ?? "").trim());

  const downloadVCard = () => {
    if (!identity) return;
    const blob = new Blob([toVCard(identity, publicUrl)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${identity.employee_code || identity.slug}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: identity?.display_name ?? "Profile", url: publicUrl });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* cancelled */ }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !identity) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${identity.employee_code || identity.slug}-qr.png`;
    a.click();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Loading…</div>;
  }
  if (!identity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white/70 gap-2 p-6 text-center">
        <p className="text-2xl font-semibold text-white">Profile not found</p>
        <p className="text-sm">This identity is unavailable or hasn't been published yet.</p>
      </div>
    );
  }

  // Build inline style: theme preset vars if any, always the safe-area pad.
  const wrapperStyle: React.CSSProperties = {
    paddingBottom: "max(env(safe-area-inset-bottom), 4rem)",
    ...(themeVars
      ? Object.fromEntries(
          allThemeVars
            .filter((k) => themeVars[k])
            .map((k) => [k as any, themeVars[k]]),
        )
      : {}),
  };

  const useSemantic = !!themeVars; // when scoped, use semantic tokens instead of hardcoded white/black
  const bg = useSemantic ? "bg-background text-foreground" : "bg-[#0a0a0a] text-white";
  const cardBg = useSemantic
    ? "border-border/60 bg-card/80"
    : "border-white/10 bg-white/[0.03]";
  const subtleText = useSemantic ? "text-muted-foreground" : "text-white/50";
  const bodyText = useSemantic ? "text-foreground/80" : "text-white/80";
  const chipBg = useSemantic ? "bg-muted/60 border-border/40" : "bg-white/5 border-white/10";
  const hoverChip = useSemantic ? "hover:bg-muted" : "hover:bg-white/10";

  return (
    <div
      data-identity-layout={layout}
      className={`min-h-[100dvh] ${bg}`}
      style={wrapperStyle}
    >
      <BrandMark />

      {isPreview && (
        <div className="w-full bg-amber-500/15 text-amber-200 text-xs font-medium text-center border-b border-amber-500/30 py-2">
          Preview mode — this page reflects the current draft.
        </div>
      )}

      {/* Cover */}
      <div
        className="id-cover relative h-56 md:h-72 w-full overflow-hidden"
        style={{
          backgroundImage: identity.cover_url
            ? `url(${identity.cover_url})`
            : `linear-gradient(135deg, ${accent}, ${accent}55)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${useSemantic ? "to-background" : "to-[#0a0a0a]"}`} />
      </div>

      <div className="id-main max-w-3xl mx-auto px-4 -mt-16 md:-mt-20 relative">
        <div className={`id-card rounded-3xl border backdrop-blur-xl p-5 md:p-8 shadow-2xl ${cardBg}`}>
          <div className="flex items-start gap-4 md:gap-6 flex-col sm:flex-row">
            <div className="id-avatar-wrap shrink-0 -mt-16 sm:-mt-20">
              {identity.avatar_url ? (
                <img
                  src={identity.avatar_url}
                  alt={identity.display_name ?? "avatar"}
                  className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover ring-4 shadow-xl ${useSemantic ? "ring-background" : "ring-[#0a0a0a]"}`}
                />
              ) : (
                <div
                  className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-3xl font-bold ring-4 shadow-xl ${useSemantic ? "ring-background text-white" : "ring-[#0a0a0a] text-white"}`}
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="id-name text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {identity.display_name}
                </h1>
                <span
                  className="id-code id-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  <BadgeCheck className="w-3 h-3" />
                  {identity.employee_code}
                </span>
              </div>
              {identity.pronouns && (
                <p className={`id-sub text-xs mb-2 ${subtleText}`}>{identity.pronouns}</p>
              )}
              {(identity.title || identity.department) && (
                <p className={`id-sub text-base ${bodyText}`}>
                  {identity.title}
                  {identity.title && identity.department ? " · " : ""}
                  {identity.department}
                </p>
              )}
              {identity.location && (
                <p className={`mt-1 text-sm inline-flex items-center gap-1 ${subtleText}`}>
                  <MapPin className="w-3.5 h-3.5" /> {identity.location}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={downloadVCard}
              className="id-pill inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium text-black"
              style={{ backgroundColor: accent }}
            >
              <Download className="w-4 h-4" /> Save contact
            </button>
            <button
              onClick={share}
              className={`id-pill inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors border ${chipBg} ${hoverChip}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied" : "Share"}
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className={`id-pill inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors border ${chipBg} ${hoverChip}`}
            >
              <QrIcon className="w-4 h-4" /> QR code
            </button>
          </div>

          {identity.bio && (
            <div className="mt-8">
              <p className={`whitespace-pre-line text-[15px] leading-relaxed ${bodyText}`}>{identity.bio}</p>
            </div>
          )}

          {(identity.email_public || identity.phone_public) && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {identity.email_public && (
                <a
                  href={`mailto:${identity.email_public}`}
                  className={`id-pill flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${chipBg} ${hoverChip}`}
                >
                  <Mail className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-sm truncate">{identity.email_public}</span>
                </a>
              )}
              {identity.phone_public && (
                <a
                  href={`tel:${identity.phone_public}`}
                  className={`id-pill flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${chipBg} ${hoverChip}`}
                >
                  <Phone className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-sm truncate">{identity.phone_public}</span>
                </a>
              )}
            </div>
          )}

          {socialEntries.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {socialEntries.map(([k, v]) => (
                <a
                  key={k}
                  href={socialHref(k, v)}
                  target="_blank"
                  rel="noreferrer"
                  className={`id-pill inline-flex items-center gap-2 h-9 px-3 rounded-full text-xs border transition-colors capitalize ${chipBg} ${hoverChip}`}
                >
                  {SOCIAL_ICONS[k] ?? <Globe className="w-4 h-4" />}
                  {k}
                </a>
              ))}
            </div>
          )}

          {(identity.skills?.length ?? 0) > 0 && (
            <div className="mt-6">
              <p className={`text-xs uppercase tracking-wider mb-2 ${subtleText}`}>Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {identity.skills!.map((s) => (
                  <span key={s} className={`id-chip px-2.5 py-1 rounded-full text-xs border ${chipBg}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(identity.languages?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className={`text-xs uppercase tracking-wider mb-2 ${subtleText}`}>Languages</p>
              <div className="flex flex-wrap gap-1.5">
                {identity.languages!.map((s) => (
                  <span key={s} className={`id-chip px-2.5 py-1 rounded-full text-xs border ${chipBg}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className={`mt-6 text-center text-xs ${subtleText}`}>
          Verified employee · <a href="/" className="underline hover:opacity-80">orizino.com</a>
        </p>
      </div>

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className={`rounded-3xl p-6 max-w-sm w-full text-center border ${useSemantic ? "bg-card border-border" : "bg-[#111] border-white/10 text-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-full rounded-2xl bg-white p-3" />}
            <p className="mt-4 text-sm break-all">{publicUrl}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={downloadQR}
                className="flex-1 h-10 rounded-full text-sm font-medium text-black"
                style={{ backgroundColor: accent }}
              >
                Download PNG
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); }}
                className={`flex-1 h-10 rounded-full text-sm font-medium border ${chipBg} ${hoverChip}`}
              >
                <Copy className="w-4 h-4 inline mr-1" /> Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
