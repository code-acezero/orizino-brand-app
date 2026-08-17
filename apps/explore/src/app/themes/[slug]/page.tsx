"use client";

import React, { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useOrizinoConfig } from "@/lib/orizino-config";

export default function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [cfg, , , loaded] = useOrizinoConfig();
  const theme = cfg.themes.find((t) => t.id === slug);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" role="status" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#FF6B7A]" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white px-6 text-center">
        <h1 className="font-display text-4xl mb-3">Universe Not Found</h1>
        <Link href="/" className="text-[#FF6B7A] hover:underline">
          ← Back to ORIZINO Explore
        </Link>
      </div>
    );
  }

  const accent = theme.accent ?? "#8C1620";

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Themed Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060304]/80" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 20% 30%, ${accent}55, transparent 55%), radial-gradient(ellipse at 80% 70%, #4A0F12cc, transparent 60%), linear-gradient(180deg, #0a0405, #050203)`,
          }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7))" }} />
      </div>

      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-[0.4em] uppercase text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Explore Main
        </Link>
        <span className="font-display font-black tracking-widest text-sm uppercase text-white">
          ORIZINO
        </span>
      </header>

      <main className="px-6 md:px-12 pt-16 pb-32 max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[10px] md:text-xs tracking-[0.6em] uppercase mb-6 font-bold"
          style={{ color: accent }}
        >
          ORIZINO · {theme.label.toUpperCase()}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl md:text-8xl tracking-tight leading-[0.95] mb-8 font-black"
        >
          {theme.label}.
          <br />
          <span className="text-white/60">Wear the character.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-2xl text-base md:text-lg text-white/80 leading-relaxed mb-12"
        >
          {theme.longDescription || theme.blurb}
        </motion.p>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { kicker: "Concept", body: "Character-led silhouettes. Every drop starts from a narrative archetype, translated into luxury silhouettes." },
            { kicker: "Craft", body: "240+ GSM heavyweight combed compact cotton, boxy drape, and precision hand-dyed finishes." },
            { kicker: "Release", body: "Limited atelier runs. Individually serialized and authenticatable on the blockchain." },
          ].map((b, i) => (
            <motion.div
              key={b.kicker}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-2xl p-6 border border-white/10 bg-card/60 backdrop-blur-xl"
              style={{ boxShadow: `0 20px 60px -20px ${accent}55` }}
            >
              <p className="text-[10px] tracking-[0.4em] uppercase mb-3 font-bold" style={{ color: accent }}>
                {b.kicker}
              </p>
              <p className="text-xs text-white/80 leading-relaxed">{b.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <a
            href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://shop.orizino.com"}?theme=${theme.id}`}
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-xs tracking-wider uppercase font-semibold text-white bg-primary/40 border border-primary/60 hover:bg-primary/60 transition-all shadow-lg"
          >
            Shop {theme.label} Pieces <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-xs tracking-wider uppercase font-semibold text-white/80 hover:text-white bg-white/5 border border-white/15 hover:bg-white/10 transition-all"
          >
            Inquire about this collection
          </Link>
        </div>

        <div className="mt-24 pt-12 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-6">
            Other Collection Universes
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cfg.themes
              .filter((t) => t.id !== slug)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/themes/${t.id}`}
                  className="group rounded-2xl p-5 border border-white/10 bg-card/40 hover:border-white/30 backdrop-blur-md transition-all"
                >
                  <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2 font-bold">Universe</p>
                  <p className="font-display text-lg font-bold group-hover:text-[#FF6B7A] transition-colors">{t.label}</p>
                </Link>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
