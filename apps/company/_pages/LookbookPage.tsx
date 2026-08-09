"use client";
import React from "react";
import { ArrowLeft } from "lucide-react";
import CinematicHero from "@/components/landing/CinematicHero";
import CategoryMosaic from "@/components/landing/CategoryMosaic";
import CollectionShowcase from "@/components/landing/CollectionShowcase";

const LookbookPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ── Minimal Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center pointer-events-none">
        <a href="/" className="pointer-events-auto w-10 h-10 rounded-full bg-background/50 backdrop-blur flex items-center justify-center hover:bg-white/10 transition-colors border border-border/50">
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </a>
        <div className="pointer-events-auto">
          <span className="font-editorial text-lg tracking-[0.2em] uppercase mix-blend-difference" style={{ color: "hsl(var(--cream))" }}>Lookbook</span>
        </div>
      </header>

      {/* ── Visual Showcases ── */}
      <CinematicHero />
      
      <div className="py-20">
        <CollectionShowcase />
      </div>

      <div className="pb-20">
        <CategoryMosaic />
      </div>

      <div className="text-center mt-20">
        <a
          href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}/inventory`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center font-sans-brand text-xs uppercase tracking-[0.15em] px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Shop The Lookbook
        </a>
      </div>
    </div>
  );
};

export default LookbookPage;
