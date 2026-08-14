"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Layers,
  Sparkles,
  Image as ImageIcon,
  Check,
  Layout,
  Smartphone,
  Monitor,
  Flame,
  ShieldCheck,
  Truck,
  RotateCcw,
  RotateCw,
  Star,
  ShoppingBag,
  Sliders,
  Ruler,
  MessageSquare,
  Zap,
  Eye,
  Columns,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Infinity as InfinityIcon,
  Disc,
  Film,
  LayoutGrid,
  Copy,
  Compass,
  Maximize2,
  SlidersHorizontal,
  BookOpen,
  Crown,
  Box,
  Square,
} from "lucide-react";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";

export type LayoutStyle = "dark-luxury" | "glass" | "neon" | "minimal" | "magazine" | "glass-minimal";
export type GalleryStyle =
  | "default"
  | "infinity"
  | "coverflow"
  | "filmstrip"
  | "mosaic"
  | "parallax-stack"
  | "editorial-split"
  | "carousel-cards"
  | "studio-turntable"
  | "immersive-zoom";

const DEMO_GALLERY_IMAGES: Record<string, string[]> = {
  charcoal: [
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  ],
  vanilla: [
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  ],
  cherry: [
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  ],
};

interface ProductPageConfig {
  layout: LayoutStyle;
  gallery: GalleryStyle;
  show_sticky_tray: boolean;
  show_scarcity_badge: boolean;
  show_trust_badges: boolean;
  show_size_chart: boolean;
  show_reviews: boolean;
}

const DEFAULT_CONFIG: ProductPageConfig = {
  layout: "glass",
  gallery: "default",
  show_sticky_tray: true,
  show_scarcity_badge: true,
  show_trust_badges: true,
  show_size_chart: true,
  show_reviews: true,
};

const STUDIO_PRESETS: {
  layout: LayoutStyle;
  gallery: GalleryStyle;
  label: string;
  tag: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    layout: "dark-luxury" as LayoutStyle,
    gallery: "infinity" as GalleryStyle,
    label: "Midnight Runway",
    tag: "High Fashion",
    desc: "Obsidian dark background, gold ambient glow & continuous 3D Infinity Loop gallery.",
    icon: Crown,
  },
  {
    layout: "glass" as LayoutStyle,
    gallery: "coverflow" as GalleryStyle,
    label: "Modern Atrium",
    tag: "Signature",
    desc: "Translucent frosted glassmorphism cards & 3D Coverflow perspective rotation.",
    icon: Box,
  },
  {
    layout: "neon" as LayoutStyle,
    gallery: "parallax-stack" as GalleryStyle,
    label: "High-Voltage Drop",
    tag: "Cyber Street",
    desc: "Cyberpunk edge glow, electrified price accent & 3D cursor parallax card stack.",
    icon: Zap,
  },
  {
    layout: "minimal" as LayoutStyle,
    gallery: "default" as GalleryStyle,
    label: "Pure Minimalist",
    tag: "Scandinavian",
    desc: "Pure whitespace, clean typography, hairline borders & Lightbox Zoom lens.",
    icon: Square,
  },
  {
    layout: "magazine" as LayoutStyle,
    gallery: "mosaic" as GalleryStyle,
    label: "Editorial Lookbook",
    tag: "Curated",
    desc: "Italic serif typography, asymmetric magazine narrative flow & adaptive mosaic grid.",
    icon: BookOpen,
  },
  {
    layout: "glass-minimal" as LayoutStyle,
    gallery: "filmstrip" as GalleryStyle,
    label: "Vintage Cinema",
    tag: "Atelier",
    desc: "Clean neutral glass borders with vintage 35mm filmstrip cinema sprocket frames.",
    icon: Film,
  },
];

const LAYOUT_STYLES: {
  id: LayoutStyle;
  label: string;
  desc: string;
  tag: string;
  icon: React.ElementType;
  previewBg: string;
  accentText: string;
}[] = [
  {
    id: "dark-luxury",
    label: "Dark Luxury",
    tag: "Obsidian",
    desc: "Deep obsidian backdrop with gold accents, ambient reflections & frosted cards",
    icon: Crown,
    previewBg: "bg-gradient-to-br from-black via-zinc-900 to-black",
    accentText: "text-amber-400",
  },
  {
    id: "glass",
    label: "Glassmorphism",
    tag: "Translucent",
    desc: "Frosted glass cards with smooth backdrop blur and signature brand borders",
    icon: Box,
    previewBg: "bg-gradient-to-br from-primary/25 via-background to-primary/10",
    accentText: "text-primary",
  },
  {
    id: "neon",
    label: "Neon Cyber",
    tag: "Electrified",
    desc: "High-contrast dark styling with glowing borders and electric price highlighting",
    icon: Zap,
    previewBg: "bg-gradient-to-br from-background via-primary/20 to-background",
    accentText: "text-primary font-black",
  },
  {
    id: "minimal",
    label: "Apple Minimal",
    tag: "Monochrome",
    desc: "Pure whitespace, clean precision typography, and zero visual clutter",
    icon: Square,
    previewBg: "bg-gradient-to-br from-zinc-100 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950",
    accentText: "text-foreground",
  },
  {
    id: "magazine",
    label: "Editorial Magazine",
    tag: "Serif & Story",
    desc: "Asymmetric lookbook layout with italic display serif typography and narrative blocks",
    icon: BookOpen,
    previewBg: "bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10",
    accentText: "font-serif italic text-foreground",
  },
  {
    id: "glass-minimal",
    label: "Glass Minimal",
    tag: "Neutral",
    desc: "Ultra-clean neutral glass with subtle outlines and crisp balanced contrast",
    icon: Sparkles,
    previewBg: "bg-gradient-to-br from-secondary/40 via-card to-secondary/20",
    accentText: "text-foreground",
  },
];

const GALLERY_ENGINES: {
  id: GalleryStyle;
  label: string;
  tag: string;
  desc: string;
  icon: React.ElementType;
  badge: string;
}[] = [
  {
    id: "default",
    label: "Classic Lightbox Zoom",
    tag: "Standard",
    desc: "Thumbnail rail with cursor zoom lens and immersive full-screen modal lightbox",
    icon: Maximize2,
    badge: "2D Rail",
  },
  {
    id: "infinity",
    label: "Infinity Loop 3D",
    tag: "3D Motion",
    desc: "Continuous 3D revolving carousel loop with smooth velocity transitions",
    icon: InfinityIcon,
    badge: "3D Carousel",
  },
  {
    id: "coverflow",
    label: "Coverflow 3D",
    tag: "Perspective",
    desc: "Perspective depth rotation with centered active card and angled side thumbnails",
    icon: Disc,
    badge: "3D Angle",
  },
  {
    id: "filmstrip",
    label: "Filmstrip Cinema",
    tag: "Vintage",
    desc: "Cinematic dark presentation with vintage 35mm film sprocket border frame",
    icon: Film,
    badge: "Cinema Frame",
  },
  {
    id: "mosaic",
    label: "Adaptive Grid Mosaic",
    tag: "Editorial",
    desc: "Pinterest-style adaptive masonry multi-image layout with cursor hover zoom",
    icon: LayoutGrid,
    badge: "Masonry",
  },
  {
    id: "parallax-stack",
    label: "Parallax Stack 3D",
    tag: "Interactive",
    desc: "Stacked image cards with 3D cursor tilt, depth layers, and gesture swipe",
    icon: Copy,
    badge: "3D Tilt",
  },
  {
    id: "editorial-split",
    label: "Editorial Split Runway",
    tag: "Dual-View",
    desc: "Dual high-fashion perspective showcasing front silhouette and fabric craft side-by-side",
    icon: Columns,
    badge: "Dual Runway",
  },
  {
    id: "carousel-cards",
    label: "Horizon Luxury Track",
    tag: "Panorama",
    desc: "Apple-style panoramic horizontal card slider with smooth momentum and ambient lighting",
    icon: SlidersHorizontal,
    badge: "Horizon Snap",
  },
  {
    id: "studio-turntable",
    label: "Orbit 360° Turntable",
    tag: "360° Spin",
    desc: "Interactive garment rotation turntable with precision angle dial, drag physics & studio lighting",
    icon: RotateCw,
    badge: "360° Orbit",
  },
];

// ── 1. STUDIO INFINITY LOOP 3D PREVIEW ──
const AdminStudioInfinityPreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length;
  const [currentIdx, setCurrentIdx] = React.useState(activeIdx);

  React.useEffect(() => {
    setCurrentIdx(activeIdx);
  }, [activeIdx]);

  React.useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => {
        const next = (prev + 1) % total;
        onNavigate(next);
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [total, onNavigate]);

  const getCardStyle = (idx: number) => {
    if (total <= 1) {
      return { x: "0%", scale: 1, rotateY: 0, opacity: 1, zIndex: 30 };
    }
    const half = total / 2;
    let diff = idx - currentIdx;
    while (diff > half) diff -= total;
    while (diff < -half) diff += total;

    if (diff === 0) {
      return { x: "0%", scale: 1, rotateY: 0, opacity: 1, zIndex: 30 };
    }
    if (diff === -1) {
      return { x: "-64%", scale: 0.84, rotateY: 28, opacity: 0.45, zIndex: 20 };
    }
    if (diff === 1) {
      return { x: "64%", scale: 0.84, rotateY: -28, opacity: 0.45, zIndex: 20 };
    }
    const isRight = diff > 0;
    return { x: isRight ? "120%" : "-120%", scale: 0.6, rotateY: isRight ? -45 : 45, opacity: 0, zIndex: 10 };
  };

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 select-none group border border-border/70">
      {/* Ambient background blur */}
      <div
        className="absolute -inset-8 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${images[currentIdx]})`,
          filter: "blur(40px) brightness(0.35) saturate(1.2)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      {/* Header Badges */}
      <div className="w-full flex items-center justify-between z-20">
        <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
          Infinity Loop 3D
        </span>
        {showScarcity && (
          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
          </span>
        )}
      </div>

      {/* 3D Perspective Stage */}
      <div className="relative flex items-center justify-center my-auto w-full h-[360px] pointer-events-auto overflow-hidden" style={{ perspective: "950px", transformStyle: "preserve-3d" }}>
        {images.map((img, i) => {
          const style = getCardStyle(i);
          const isCenter = i === currentIdx;

          return (
            <motion.div
              key={i}
              animate={{
                x: style.x,
                scale: style.scale,
                rotateY: style.rotateY,
                opacity: style.opacity,
              }}
              transition={{
                duration: 0.95,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                position: "absolute",
                width: "14.5rem",
                height: "20.5rem",
                transformStyle: "preserve-3d",
                zIndex: style.zIndex,
              }}
              onClick={() => {
                setCurrentIdx(i);
                onNavigate(i);
              }}
              className="cursor-pointer rounded-2xl overflow-hidden shadow-2xl border-none outline-none"
            >
              <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none rounded-2xl" />
              <div
                className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                  isCenter ? "bg-gradient-to-t from-black/35 via-transparent to-transparent" : "bg-black/35 hover:bg-black/15"
                }`}
              />
            </motion.div>
          );
        })}

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx - 1 + total) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx + 1) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Counter and Dot Indicator */}
      <div className="z-20 flex items-center justify-center gap-2.5">
        <div className="flex items-center gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIdx ? "w-4 bg-primary" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
        <span className="text-[9.5px] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/15">
          {currentIdx + 1} / {total}
        </span>
      </div>
    </div>
  );
};

// ── 2. STUDIO COVERFLOW 3D PREVIEW ──
const AdminStudioCoverflowPreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length;
  const [currentIdx, setCurrentIdx] = React.useState(activeIdx);

  React.useEffect(() => {
    setCurrentIdx(activeIdx);
  }, [activeIdx]);

  const getCardStyle = (idx: number) => {
    const half = total / 2;
    let diff = idx - currentIdx;
    while (diff > half) diff -= total;
    while (diff < -half) diff += total;

    if (diff === 0) {
      return { x: "0%", scale: 1, rotateY: 0, opacity: 1, zIndex: 30 };
    }
    if (diff === -1) {
      return { x: "-62%", scale: 0.84, rotateY: 35, opacity: 0.48, zIndex: 20 };
    }
    if (diff === 1) {
      return { x: "62%", scale: 0.84, rotateY: -35, opacity: 0.48, zIndex: 20 };
    }
    const isRight = diff > 0;
    return { x: isRight ? "115%" : "-115%", scale: 0.6, rotateY: isRight ? -45 : 45, opacity: 0, zIndex: 10 };
  };

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 select-none group border border-border/70">
      <div
        className="absolute -inset-8 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${images[currentIdx]})`,
          filter: "blur(40px) brightness(0.35) saturate(1.2)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      <div className="w-full flex items-center justify-between z-20">
        <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
          Coverflow 3D
        </span>
        {showScarcity && (
          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center my-auto w-full h-[360px] pointer-events-auto overflow-hidden" style={{ perspective: "900px", transformStyle: "preserve-3d" }}>
        {images.map((img, i) => {
          const style = getCardStyle(i);
          const isCenter = i === currentIdx;

          return (
            <motion.div
              key={i}
              animate={{
                x: style.x,
                scale: style.scale,
                rotateY: style.rotateY,
                opacity: style.opacity,
              }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 24,
                mass: 0.7,
              }}
              style={{
                position: "absolute",
                width: "14.5rem",
                height: "20.5rem",
                transformStyle: "preserve-3d",
                zIndex: style.zIndex,
              }}
              onClick={() => {
                setCurrentIdx(i);
                onNavigate(i);
              }}
              className="cursor-pointer rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none rounded-2xl" />
              <div
                className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                  isCenter ? "bg-gradient-to-t from-black/25 via-transparent to-transparent" : "bg-black/40 hover:bg-black/20"
                }`}
              />
            </motion.div>
          );
        })}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx - 1 + total) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx + 1) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="z-20 flex items-center justify-center gap-2.5">
        <div className="flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentIdx(i);
                onNavigate(i);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === currentIdx ? "w-5 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        <span className="text-[9.5px] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/15">
          {currentIdx + 1} / {total}
        </span>
      </div>
    </div>
  );
};

// ── 3. STUDIO PARALLAX STACK 3D PREVIEW ──
const AdminStudioParallaxStackPreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length;
  const [currentIdx, setCurrentIdx] = React.useState(activeIdx);

  React.useEffect(() => {
    setCurrentIdx(activeIdx);
  }, [activeIdx]);

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 select-none group border border-border/70">
      <div
        className="absolute -inset-8 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${images[currentIdx]})`,
          filter: "blur(40px) brightness(0.35) saturate(1.2)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      <div className="w-full flex items-center justify-between z-20">
        <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
          Parallax Stack 3D
        </span>
        {showScarcity && (
          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center my-auto w-full h-[360px] pointer-events-auto" style={{ perspective: "900px" }}>
        {/* Back card */}
        <div
          className="absolute w-[14rem] h-[19.5rem] rounded-2xl overflow-hidden border border-white/10 opacity-35 transition-all duration-300 shadow-2xl"
          style={{ transform: "translateY(-18px) scale(0.88)" }}
        >
          <img src={images[(currentIdx + 2) % total]} alt="" className="w-full h-full object-cover" />
        </div>
        {/* Mid card */}
        <div
          className="absolute w-[14.5rem] h-[20rem] rounded-2xl overflow-hidden border border-white/15 opacity-65 transition-all duration-300 shadow-2xl"
          style={{ transform: "translateY(-9px) scale(0.94)" }}
        >
          <img src={images[(currentIdx + 1) % total]} alt="" className="w-full h-full object-cover" />
        </div>
        {/* Front active card */}
        <div
          className="relative w-[15rem] h-[20.5rem] rounded-2xl overflow-hidden border border-primary/50 shadow-2xl z-20 transition-all duration-300 cursor-pointer"
          onClick={() => {
            const next = (currentIdx + 1) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
        >
          <img src={images[currentIdx]} alt="" className="w-full h-full object-cover" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx - 1 + total) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx + 1) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="z-20 text-center">
        <span className="text-[9.5px] font-mono text-white/80 bg-black/60 px-3 py-0.5 rounded-full border border-white/15">
          Card {currentIdx + 1} of {total} (Click to cycle)
        </span>
      </div>
    </div>
  );
};

// ── 4. STUDIO EDITORIAL SPLIT RUNWAY PREVIEW ──
const AdminStudioEditorialSplitPreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length;
  const secondaryIdx = total > 1 ? (activeIdx + 1) % total : 0;

  return (
    <div className="h-[480px] w-full flex flex-col justify-between rounded-2xl overflow-hidden border border-border/70 bg-card/60 p-3 select-none">
      <div className="grid grid-cols-2 gap-2.5 h-[390px] w-full">
        {/* Main 01 */}
        <div
          className="relative h-full rounded-xl overflow-hidden border border-border/40 group cursor-pointer"
          onClick={() => onNavigate((activeIdx + 1) % total)}
        >
          <img src={images[activeIdx]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
              Runway 01
            </span>
            {showScarcity && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                ONLY 4 LEFT
              </span>
            )}
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[8.5px] font-mono text-white/90 border border-white/15 flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-primary" /> Silhouette
          </div>
        </div>

        {/* Detail 02 */}
        <div
          className="relative h-full rounded-xl overflow-hidden border border-border/40 group cursor-pointer"
          onClick={() => onNavigate((activeIdx + 2) % total)}
        >
          <img src={images[secondaryIdx]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
              Runway 02
            </span>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[8.5px] font-mono text-white/90 border border-white/15 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-primary" /> Detail Craft
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(i)}
              className={`w-14 h-12 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 ${
                i === activeIdx ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105" : "border-border/50 opacity-50 hover:opacity-90"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate((activeIdx - 1 + total) % total)}
            className="w-7 h-7 rounded-full bg-background border border-border/60 text-foreground flex items-center justify-center hover:bg-muted cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate((activeIdx + 1) % total)}
            className="w-7 h-7 rounded-full bg-background border border-border/60 text-foreground flex items-center justify-center hover:bg-muted cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 5. STUDIO HORIZON CAROUSEL PREVIEW ──
const AdminStudioHorizonCarouselPreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length;
  const [currentIdx, setCurrentIdx] = React.useState(activeIdx);

  React.useEffect(() => {
    setCurrentIdx(activeIdx);
  }, [activeIdx]);

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 select-none group border border-border/70">
      <div
        className="absolute -inset-8 bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${images[currentIdx]})`,
          filter: "blur(40px) brightness(0.35) saturate(1.2)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      <div className="w-full flex items-center justify-between z-20">
        <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
          Horizon Track
        </span>
        {showScarcity && (
          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center my-auto w-full h-[360px] pointer-events-auto overflow-hidden">
        {images.map((img, i) => {
          const half = total / 2;
          let diff = i - currentIdx;
          while (diff > half) diff -= total;
          while (diff < -half) diff += total;

          const isCenter = diff === 0;
          const isLeft = diff === -1;
          const isRight = diff === 1;

          let x = "0%";
          let scale = 1;
          let opacity = 1;
          let zIndex = 30;

          if (isLeft) {
            x = "-65%";
            scale = 0.85;
            opacity = 0.45;
            zIndex = 20;
          } else if (isRight) {
            x = "65%";
            scale = 0.85;
            opacity = 0.45;
            zIndex = 20;
          } else if (!isCenter) {
            x = diff > 0 ? "120%" : "-120%";
            scale = 0.65;
            opacity = 0;
            zIndex = 10;
          }

          return (
            <motion.div
              key={i}
              animate={{ x, scale, opacity }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                width: "14.5rem",
                height: "20.5rem",
                zIndex,
              }}
              onClick={() => {
                setCurrentIdx(i);
                onNavigate(i);
              }}
              className="cursor-pointer rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none rounded-2xl" />
              <div
                className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                  isCenter ? "bg-gradient-to-t from-black/25 via-transparent to-transparent" : "bg-black/40 hover:bg-black/20"
                }`}
              />
            </motion.div>
          );
        })}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx - 1 + total) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = (currentIdx + 1) % total;
            setCurrentIdx(next);
            onNavigate(next);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentIdx(i);
                onNavigate(i);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === currentIdx ? "w-5 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        <span className="text-[9.5px] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/15">
          {currentIdx + 1} / {total}
        </span>
      </div>
    </div>
  );
};

// ── 6. STUDIO ORBIT 360 TURNTABLE PREVIEW ──
const AdminStudioTurntablePreview = ({
  images,
  activeIdx,
  onNavigate,
  showScarcity,
}: {
  images: string[];
  activeIdx: number;
  onNavigate: (idx: number) => void;
  showScarcity: boolean;
}) => {
  const total = images.length || 1;
  const currentAngleDeg = Math.round((activeIdx / total) * 360);

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-4 select-none group border border-border/70">
      {/* Ambient studio backdrop */}
      <div
        className="absolute -inset-8 bg-cover bg-center transition-all duration-500 pointer-events-none"
        style={{
          backgroundImage: `url(${images[activeIdx]})`,
          filter: "blur(40px) brightness(0.35) saturate(1.2)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black/90 pointer-events-none" />

      {/* Header */}
      <div className="w-full flex items-center justify-between z-20">
        <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md uppercase tracking-wider border border-white/15 flex items-center gap-1">
          <RotateCw className="w-2.5 h-2.5 text-primary" /> {currentAngleDeg}° STUDIO ORBIT
        </span>
        {showScarcity && (
          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
          </span>
        )}
      </div>

      {/* Turntable Stage */}
      <div className="relative flex items-center justify-center my-auto w-full h-[340px] pointer-events-auto">
        <div className="absolute bottom-1 w-64 h-8 rounded-[100%] bg-radial from-primary/30 via-black/80 to-transparent blur-md pointer-events-none" />

        <div className="relative w-[14.5rem] h-[20.5rem] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <img src={images[activeIdx]} alt="" className="w-full h-full object-cover rounded-2xl select-none pointer-events-none" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/50 pointer-events-none rounded-2xl" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((activeIdx - 1 + total) % total);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((activeIdx + 1) % total);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Rotary ticks */}
      <div className="z-20 flex flex-col gap-2">
        <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${((activeIdx + 1) / total) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(i)}
                className={`relative w-12 h-10 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 ${
                  i === activeIdx ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105" : "border-white/15 opacity-40 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 text-center text-[7px] font-mono font-bold bg-black/80 text-white">
                  {Math.round((i / total) * 360)}°
                </span>
              </button>
            ))}
          </div>
          <span className="text-[9.5px] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/15 shrink-0">
            {activeIdx + 1} / {total}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProductDetailLayoutPanel() {
  const qc = useQueryClient();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "split">("desktop");
  const [openAccordion, setOpenAccordion] = useState<"specs" | "story" | "fit" | "reviews" | null>("specs");
  const [previewSelectedSize, setPreviewSelectedSize] = useState("L");
  const [previewSelectedColor, setPreviewSelectedColor] = useState("charcoal");
  const [previewGalleryActiveIdx, setPreviewGalleryActiveIdx] = useState(0);

  const { data: layoutSettingsRow } = useQuery({
    queryKey: ["admin-product-page-layout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "product_page_layout")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [cfg, setCfg] = useState<ProductPageConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (layoutSettingsRow?.value) {
      let val = layoutSettingsRow.value as any;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = { layout: val };
        }
      }
      if (typeof val === "object" && val !== null) {
        setCfg({
          layout: (val.layout || "glass") as LayoutStyle,
          gallery: (val.gallery || "default") as GalleryStyle,
          show_sticky_tray: val.show_sticky_tray ?? true,
          show_scarcity_badge: val.show_scarcity_badge ?? true,
          show_trust_badges: val.show_trust_badges ?? true,
          show_size_chart: val.show_size_chart ?? true,
          show_reviews: val.show_reviews ?? true,
        });
      }
    }
  }, [layoutSettingsRow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jsonValue: any = { ...cfg };
      if (layoutSettingsRow?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: jsonValue })
          .eq("id", layoutSettingsRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: "product_page_layout", value: jsonValue }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product-page-layout"] });
      qc.invalidateQueries({ queryKey: ["product-page-layout"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Product details architecture saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  useRegisterUniversalSave(
    {
      label: "Save Product Layout",
      onSave: async () => {
        await saveMutation.mutateAsync();
      },
      isSaving: saveMutation.isPending,
      onReject: () => {
        setCfg(DEFAULT_CONFIG);
        toast.warning("Product layout reset to default");
      },
      canReject: true,
    },
    [cfg, saveMutation.isPending]
  );

  const activeLayoutObj = LAYOUT_STYLES.find((l) => l.id === cfg.layout) || LAYOUT_STYLES[1];
  const activeGalleryObj = GALLERY_ENGINES.find((g) => g.id === cfg.gallery) || GALLERY_ENGINES[0];

  return (
    <div className="space-y-5">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                Product Details &amp; Gallery Architecture
              </h2>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary bg-primary/10 capitalize">
                {activeLayoutObj.label} + {activeGalleryObj.badge}
              </Badge>
            </div>
            <p className="text-[10.5px] text-muted-foreground">
              Configure surface themes, 3D presentation engines, conversion docks, and trust architecture.
            </p>
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-background/80 border border-border/50">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "desktop"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "mobile"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile</span>
          </button>
          <button
            onClick={() => setPreviewMode("split")}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
              previewMode === "split"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split Stage</span>
          </button>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE PRODUCT PREVIEW STAGE ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden space-y-0">
        {/* Stage Subheader */}
        <div className="flex items-center justify-between p-3 px-4 border-b border-border/40 bg-secondary/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">Interactive Stage Preview</span>
            <span className="text-[9.5px] font-mono text-muted-foreground">
              (Live rendering with active theme &amp; gallery engine)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] font-mono">
              Mode: {cfg.layout}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">
              Engine: {cfg.gallery}
            </Badge>
          </div>
        </div>

        {/* Stage Canvas */}
        <div className={`p-4 sm:p-6 transition-all ${cfg.layout === "dark-luxury" ? "bg-black text-white" : cfg.layout === "minimal" ? "bg-[#FAF8F5] text-zinc-900" : "bg-background/70 text-foreground"}`}>
          <div className={`mx-auto ${previewMode === "mobile" ? "max-w-xs" : "w-full max-w-[1360px]"}`}>
            <div className={`grid gap-5 ${previewMode === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-12"} items-start`}>
              
              {/* Product Gallery Live Engine Preview Column */}
              <div className={`${previewMode === "mobile" ? "col-span-1" : "md:col-span-6"} space-y-2.5`}>
                {(() => {
                  const galleryImages = DEMO_GALLERY_IMAGES[previewSelectedColor] || DEMO_GALLERY_IMAGES.charcoal;
                  const activeImg = galleryImages[previewGalleryActiveIdx % galleryImages.length];

                  if (cfg.gallery === "infinity") {
                    return (
                      <AdminStudioInfinityPreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "coverflow") {
                    return (
                      <AdminStudioCoverflowPreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "parallax-stack") {
                    return (
                      <AdminStudioParallaxStackPreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "editorial-split") {
                    return (
                      <AdminStudioEditorialSplitPreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "carousel-cards") {
                    return (
                      <AdminStudioHorizonCarouselPreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "studio-turntable" || (cfg.gallery as any) === "immersive-zoom") {
                    return (
                      <AdminStudioTurntablePreview
                        images={galleryImages}
                        activeIdx={previewGalleryActiveIdx}
                        onNavigate={(idx) => setPreviewGalleryActiveIdx(idx)}
                        showScarcity={cfg.show_scarcity_badge}
                      />
                    );
                  }

                  if (cfg.gallery === "filmstrip") {
                    return (
                      <div className="h-[480px] flex flex-col justify-between rounded-2xl overflow-hidden border border-border/70 bg-black p-3 group select-none">
                        <div className="w-full flex items-center justify-between z-10">
                          <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
                            Filmstrip Cinema
                          </span>
                          {cfg.show_scarcity_badge && (
                            <span className="text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
                            </span>
                          )}
                        </div>

                        {/* Main Film Frame */}
                        <div className="relative h-[360px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                          {/* Left sprocket */}
                          <div className="absolute top-0 bottom-0 left-0 w-4 z-10 flex flex-col justify-around items-center bg-black/90 border-r border-white/10">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-[1px] bg-white/20" />
                            ))}
                          </div>
                          {/* Right sprocket */}
                          <div className="absolute top-0 bottom-0 right-0 w-4 z-10 flex flex-col justify-around items-center bg-black/90 border-l border-white/10">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-[1px] bg-white/20" />
                            ))}
                          </div>

                          <img
                            src={activeImg}
                            alt=""
                            className="w-full h-full object-cover px-4 rounded-xl"
                          />

                          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-full px-3 py-0.5 text-[8.5px] font-mono text-white border border-white/15">
                            FRAME 0{previewGalleryActiveIdx + 1} / 0{galleryImages.length}
                          </div>
                        </div>

                        {/* Filmstrip thumbnails */}
                        <div className="flex gap-2 overflow-x-auto pb-0.5">
                          {galleryImages.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewGalleryActiveIdx(i)}
                              className={`w-16 h-12 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 ${
                                i === previewGalleryActiveIdx
                                  ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105"
                                  : "border-white/15 opacity-40 hover:opacity-80 grayscale"
                              }`}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (cfg.gallery === "mosaic") {
                    return (
                      <div className="h-[480px] grid grid-cols-3 grid-rows-2 gap-2 rounded-2xl overflow-hidden border border-border/70 bg-card/60 p-2 select-none">
                        <div className="col-span-2 row-span-2 relative rounded-xl overflow-hidden border border-border/40 group cursor-pointer">
                          <img src={galleryImages[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
                              Mosaic Grid
                            </span>
                            {cfg.show_scarcity_badge && (
                              <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                                ONLY 4 LEFT
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 row-span-1 rounded-xl overflow-hidden border border-border/40 group cursor-pointer">
                          <img src={galleryImages[1 % galleryImages.length]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                        <div className="col-span-1 row-span-1 rounded-xl overflow-hidden border border-border/40 group cursor-pointer relative">
                          <img src={galleryImages[2 % galleryImages.length]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-mono font-bold">+{galleryImages.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default: Classic Lightbox Zoom
                  return (
                    <div className="h-[480px] flex flex-col justify-between rounded-2xl overflow-hidden border border-border/70 bg-card/60 p-3 select-none">
                      <div className="relative h-[380px] w-full rounded-xl overflow-hidden border border-border/40 group">
                        <img
                          src={activeImg}
                          alt="Preview Garment"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Loupe Simulation Badge */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[8.5px] font-mono text-white flex items-center gap-1 border border-white/20">
                          <ZoomIn className="w-3 h-3 text-primary" /> Classic Loupe
                        </div>
                        {cfg.show_scarcity_badge && (
                          <span className="absolute top-3 right-3 text-[8.5px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" /> ONLY 4 LEFT
                          </span>
                        )}
                        {/* Navigation Arrows */}
                        <button
                          onClick={() => setPreviewGalleryActiveIdx((p) => (p - 1 + galleryImages.length) % galleryImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPreviewGalleryActiveIdx((p) => (p + 1) % galleryImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Thumbnail Strip */}
                      <div className="flex gap-2 overflow-x-auto pb-0.5">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPreviewGalleryActiveIdx(idx)}
                            className={`w-16 h-12 rounded-xl overflow-hidden border cursor-pointer transition-all shrink-0 ${
                              previewGalleryActiveIdx === idx
                                ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105"
                                : "border-border/60 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Product Info & Conversion Column */}
              <div className={`${previewMode === "mobile" ? "col-span-1" : "md:col-span-6"} space-y-3.5`}>
                {/* Brand Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">
                      ORIZINO STUDIO — A/W 2026
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>4.9</span>
                      <span className="opacity-60 text-[9px] font-normal">(48 reviews)</span>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Heavyweight Boxy Drop Terry Hoodie
                  </h3>

                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className={`text-2xl font-black ${activeLayoutObj.accentText}`}>
                      $120.00 USD
                    </span>
                    <span className="text-xs opacity-50 line-through font-mono">$150.00</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                      SAVE 20%
                    </span>
                  </div>
                </div>

                {/* Colorways */}
                <div className="space-y-1.5 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold">Colorway:</span>
                    <span className="font-mono uppercase opacity-70 text-[9.5px]">{previewSelectedColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "charcoal", color: "#1E1E1E", label: "Charcoal" },
                      { id: "vanilla", color: "#EFE6DD", label: "Vanilla Cream" },
                      { id: "cherry", color: "#800000", label: "Deep Cherry" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setPreviewSelectedColor(c.id)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          previewSelectedColor === c.id
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                            : "border-white/20 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Sizing & Measurement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold">Select Size:</span>
                    {cfg.show_size_chart && (
                      <span className="text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium text-[9.5px]">
                        <Ruler className="w-2.5 h-2.5" /> Size Chart &amp; Fit Guide
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["S", "M", "L", "XL"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPreviewSelectedSize(s)}
                        className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          previewSelectedSize === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-secondary/30 hover:bg-secondary text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all cursor-pointer">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ADD TO CART</span>
                    </button>
                    <button className="py-2.5 px-3 rounded-xl bg-foreground text-background font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer">
                      <Zap className="w-3.5 h-3.5" />
                      <span>BUY NOW</span>
                    </button>
                  </div>

                  {cfg.show_sticky_tray && (
                    <div className="p-2 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Smartphone className="w-3 h-3 text-primary" /> Sticky Mobile Dock Active
                      </span>
                      <span className="font-mono text-primary font-bold">Auto-enabled</span>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                {cfg.show_trust_badges && (
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/30 text-[9px] text-center opacity-80 font-medium">
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <Truck className="w-3 h-3 text-primary" />
                      <span>Express Air Shipping</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      <span>100% Authentic</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-secondary/20 flex flex-col items-center gap-0.5">
                      <RotateCcw className="w-3 h-3 text-primary" />
                      <span>30-Day Easy Exchange</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── LUXURY PRODUCT INTELLIGENCE (ACCORDION DISCLOSURES — NO ROW MENUS) ── */}
            <div className="mt-6 pt-4 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                  Product Architecture &amp; Intelligence
                </span>
                <span className="text-[9px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Interactive Disclosures
                </span>
              </div>

              <div className="space-y-1.5">
                {/* 1. Garment Specs */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "specs" ? null : "specs")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sliders className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Garment Specifications</h4>
                        <span className="text-[9.5px] text-muted-foreground">380 GSM • Combed Cotton • Dhaka Atelier</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "specs" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "specs" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10.5px]">
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Fabric Density</span>
                          <strong className="text-foreground">380 GSM Heavy Terry</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Yarn Fiber</span>
                          <strong className="text-foreground">100% Combed Cotton</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Atelier Origin</span>
                          <strong className="text-foreground">Dhaka, Bangladesh</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="opacity-50 block font-mono text-[8.5px] uppercase">Hardware</span>
                          <strong className="text-foreground">Laser-Etched Aglets</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Atelier Story */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "story" ? null : "story")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Atelier Craft &amp; Story</h4>
                        <span className="text-[9.5px] text-muted-foreground">Yarn-dyed organic ring-spun cotton</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "story" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "story" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Engineered from yarn-dyed organic ring-spun cotton. Each piece is garment-dyed in Dhaka and enzyme washed for a broken-in vintage patina with heavyweight boxy drape.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Fit & Measurements */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "fit" ? null : "fit")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Ruler className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Fit Guidance &amp; Sizing</h4>
                        <span className="text-[9.5px] text-muted-foreground">Boxy oversized streetwear silhouette</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "fit" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "fit" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Boxy oversized silhouette with dropped shoulders. True to contemporary streetwear sizing. Take your normal size for relaxed drape, or size down for tailored fit.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Verified Reviews */}
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "reviews" ? null : "reviews")}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Customer Reviews &amp; Ratings</h4>
                        <span className="text-[9.5px] text-muted-foreground">⭐️⭐️⭐️⭐️⭐️ 4.9/5 (48 verified buyers)</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        openAccordion === "reviews" ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {openAccordion === "reviews" && (
                    <div className="p-3 pt-0 border-t border-border/30 mt-1">
                      <div className="flex items-center justify-between text-xs pt-2">
                        <span>⭐️⭐️⭐️⭐️⭐️ &ldquo;Insane 380 GSM fabric weight and perfect boxy silhouette.&rdquo;</span>
                        <span className="font-mono opacity-60 text-[9px]">Verified Buyer — 2 days ago</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: CURATED STUDIO PRESETS ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Curated Studio Combinations</h3>
              <p className="text-[10px] text-muted-foreground">1-click designer pairings of surface aesthetics and 3D gallery engines.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {STUDIO_PRESETS.map((rec) => {
            const active = cfg.layout === rec.layout && cfg.gallery === rec.gallery;
            const IconComp = rec.icon;
            return (
              <button
                key={rec.label}
                onClick={() => setCfg((c) => ({ ...c, layout: rec.layout, gallery: rec.gallery }))}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  active
                    ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                    : "border-border/60 hover:border-primary/40 bg-card/70 hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                      active
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-foreground/5 border-foreground/10 text-foreground group-hover:border-foreground/20"
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-xs leading-tight">{rec.label}</p>
                      <span className="text-[8px] font-mono text-muted-foreground uppercase font-semibold">{rec.tag}</span>
                    </div>
                  </div>
                  {active ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">{rec.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: VISUAL SURFACE THEMES ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Layout className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Visual Surface Theme (6 Layouts)</h3>
              <p className="text-[10px] text-muted-foreground">Select overall backdrop atmosphere, typography treatment, and card blur.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9.5px] font-mono text-primary border-primary/30">
            Active: {activeLayoutObj.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {LAYOUT_STYLES.map((opt) => {
            const active = cfg.layout === opt.id;
            const IconComp = opt.icon;
            return (
              <motion.div
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, layout: opt.id }))}
                className={`text-left rounded-xl border transition-all cursor-pointer overflow-hidden group ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/60 bg-card/70 hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div className={`h-12 ${opt.previewBg} relative flex items-center justify-between px-3 border-b border-border/30`}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shrink-0">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase font-bold text-foreground/90">{opt.tag}</span>
                  </div>
                  {active && (
                    <Badge variant="outline" className="text-[8.5px] font-mono border-primary/40 text-primary bg-background/90">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="p-3 space-y-0.5">
                  <p className="font-bold text-foreground text-xs">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{opt.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: IMAGE GALLERY ENGINE ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ImageIcon className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Image Gallery Engine ({GALLERY_ENGINES.length} Motion Engines)</h3>
              <p className="text-[10px] text-muted-foreground">Select how product photography and lookbook angles are presented.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9.5px] font-mono text-primary border-primary/30">
            Active: {activeGalleryObj.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {GALLERY_ENGINES.map((opt) => {
            const active = cfg.gallery === opt.id;
            const IconComp = opt.icon;
            return (
              <motion.div
                key={opt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCfg((c) => ({ ...c, gallery: opt.id }))}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/60 bg-card/70 hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                      active
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-foreground/5 border-foreground/10 text-foreground group-hover:border-foreground/20"
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-xs leading-tight">{opt.label}</p>
                      <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">{opt.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 4: CONVERSION & TRUST ARCHITECTURE ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Conversion &amp; Trust Architecture</h3>
              <p className="text-[10px] text-muted-foreground">Toggle conversion modules, scarcity banners, and trust guarantees.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Sticky Mobile Dock</span>
              <span className="text-[9.5px] text-muted-foreground block">Bottom fixed buy now tray on mobile</span>
            </div>
            <Switch
              checked={cfg.show_sticky_tray}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_sticky_tray: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Scarcity Counter</span>
              <span className="text-[9.5px] text-muted-foreground block">"Only X left in stock" badge</span>
            </div>
            <Switch
              checked={cfg.show_scarcity_badge}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_scarcity_badge: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Trust Guarantee Badges</span>
              <span className="text-[9.5px] text-muted-foreground block">Authentic, shipping &amp; returns</span>
            </div>
            <Switch
              checked={cfg.show_trust_badges}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_trust_badges: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Size Chart &amp; Fit Guide</span>
              <span className="text-[9.5px] text-muted-foreground block">Interactive measurements modal</span>
            </div>
            <Switch
              checked={cfg.show_size_chart}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_size_chart: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/15">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-foreground block">Customer Reviews Tab</span>
              <span className="text-[9.5px] text-muted-foreground block">Verified buyer ratings &amp; photos</span>
            </div>
            <Switch
              checked={cfg.show_reviews}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, show_reviews: v }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
