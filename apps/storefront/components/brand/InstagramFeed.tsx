"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ExternalLink } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export interface InstagramPost {
  handle: string;
  caption: string;
  tag: string;
  image_url?: string;
}

export interface InstagramConfig {
  is_enabled?: boolean;
  badge_tag?: string;
  title?: string;
  subtitle?: string;
  instagram_url?: string;
  instagram_handle?: string;
  posts?: InstagramPost[];
}

const DEFAULT_POSTS: InstagramPost[] = [
  {
    handle: "@orizino_style",
    caption: "Heavyweight drop shoulder tee in Onyx Black.",
    tag: "#OrizinoStyle",
  },
  {
    handle: "@streetwear_vibes",
    caption: "Minimalist streetwear silhouette for the city.",
    tag: "#OrizinoFits",
  },
  {
    handle: "@urban_fits",
    caption: "Architectural cargo drape paired with signature hoodie.",
    tag: "#OrizinoCommunity",
  },
  {
    handle: "@orizino_daily",
    caption: "Crafted for longevity & heavyweight comfort.",
    tag: "#OrizinoCulture",
  },
];

interface InstagramFeedProps {
  config?: InstagramConfig | null;
  isLoading?: boolean;
}

export const InstagramFeedSkeleton: React.FC = () => (
  <div className="w-full animate-pulse space-y-8">
    <div className="flex flex-col items-center text-center justify-center gap-3">
      <div className="h-6 w-44 rounded-full bg-muted/60" />
      <div className="h-8 w-60 rounded-lg bg-muted/60" />
      <div className="h-4 w-72 rounded-md bg-muted/40" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-2xl bg-card/40 border border-border/40 flex items-center justify-center p-4">
          <div className="w-10 h-10 rounded-full bg-muted/60" />
        </div>
      ))}
    </div>
    <div className="flex justify-center">
      <div className="h-10 w-56 rounded-full bg-muted/60" />
    </div>
  </div>
);

const InstagramFeed: React.FC<InstagramFeedProps> = ({ config, isLoading }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  if (isLoading) return <InstagramFeedSkeleton />;
  if (config?.is_enabled === false) return null;

  const badgeTag = config?.badge_tag || "[ COMMUNITY LOOKS ]";
  const title = config?.title || "#OrizinoStyle";
  const subtitle = config?.subtitle || "Tag @orizino_official to be featured in our curated streetwear gallery.";
  const instagramUrl = config?.instagram_url || "https://instagram.com";
  const instagramHandle = config?.instagram_handle || "@orizino_official";
  const posts = Array.isArray(config?.posts) && config.posts.length > 0 ? config.posts : DEFAULT_POSTS;

  return (
    <section ref={ref} className="w-full">
      {/* Header */}
      <motion.div
        className="flex flex-col items-center text-center justify-center mb-8 gap-2"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* 4-Column Photo Grid — Matches page container width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {posts.slice(0, 4).map((post, idx) => (
          <motion.a
            key={idx}
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "100px" }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-2xl bg-secondary/20 dark:bg-card/40 border border-border/40 aspect-[3/4]"
          >
            {/* Image / Fallback image background */}
            <div className="absolute inset-0 bg-secondary/30 dark:bg-muted/20 flex items-center justify-center overflow-hidden">
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="opacity-80 group-hover:opacity-100 transition-opacity text-center p-4">
                  <InstagramIcon className="w-10 h-10 text-primary dark:text-foreground mx-auto" />
                </div>
              )}
            </div>

            {/* Hover Theme-aware Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-5 z-10">
              <div className="flex items-center justify-between text-foreground">
                <InstagramIcon className="w-4 h-4 text-primary dark:text-foreground" />
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div>
                <span className="text-[10px] font-mono text-cream-deep tracking-wider uppercase block mb-1 font-semibold">
                  {post.tag}
                </span>
                <p className="text-xs font-sans-brand text-foreground line-clamp-2 mb-2 font-medium leading-relaxed">
                  {post.caption}
                </p>
                <span className="text-[11px] font-mono text-muted-foreground block font-semibold">
                  {post.handle}
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Instagram Follow CTA */}
      <div className="mt-8 text-center">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/70 border border-border/60 text-xs font-sans-brand font-semibold tracking-wider text-foreground hover:bg-secondary hover:border-primary/40 transition-all"
        >
          <InstagramIcon className="w-4 h-4 text-primary dark:text-foreground" />
          Follow {instagramHandle} on Instagram
        </a>
      </div>
    </section>
  );
};

export default InstagramFeed;
