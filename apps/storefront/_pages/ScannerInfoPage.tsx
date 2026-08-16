"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import {
  ShieldCheck,
  QrCode,
  Package,
  Lock,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Check,
  Search,
  Tag,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FAQS = [
  {
    q: "Where do I find the serial code on my item?",
    a: "Look at the inner security tag or wash label on your Orizino garment. Every authentic piece includes a printed serial code and scannable barcode.",
  },
  {
    q: "How does scanning confirm my product is authentic?",
    a: "When you scan the barcode, our system matches the tag code against our official production records. If it's authentic, you'll instantly see the product name and verification status.",
  },
  {
    q: "Is my personal information kept private when someone scans my tag?",
    a: "Yes, absolutely. Anyone who scans the tag can see that the item is genuine, but your full name, address, and payment details remain private and hidden.",
  },
  {
    q: "What should I do if my serial code isn't recognized?",
    a: "Make sure you entered the code accurately without extra spaces. If you still have trouble, contact our support team with a photo of your tag and order receipt.",
  },
];

const ScannerInfoPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Scanner & Verification
          </Link>

          <Badge variant="outline" className="text-[11px] font-semibold border-border/80 text-muted-foreground bg-secondary/40 py-1 px-3">
            Orizino Authenticity Guarantee
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="border border-border/60 rounded-3xl p-6 sm:p-10 bg-card shadow-xs relative overflow-hidden space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/30 pb-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-foreground" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Product Verification Guide
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-foreground tracking-tight leading-tight">
                Authenticity Made Simple
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Every Orizino product comes with a unique serial tag. Scan your tag anytime to confirm your item is 100% original and genuine.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/verify">
                <Button className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold text-xs gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 shadow-xs">
                  <QrCode className="w-4 h-4" /> Launch Camera Scanner
                </Button>
              </Link>
              <Link to="/inventory">
                <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold text-xs border-border/60">
                  Explore Collection
                </Button>
              </Link>
            </div>
          </div>

          {/* Customer Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {[
              { label: "Unique Product Tag", val: "Every Item Tagged" },
              { label: "Scan Speed", val: "Instant Results" },
              { label: "Original Quality", val: "100% Guaranteed" },
              { label: "Buyer Privacy", val: "Fully Protected" },
            ].map((metric, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/40 space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <p className="text-sm font-bold text-foreground">{metric.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Simple Pillars */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Why We Tag Every Product
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">Simple, transparent & secure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">1. Authentic Tagging</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each garment carries a unique serial number printed right on the security label, so you can easily verify it anytime.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">2. Quick Camera Scan</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Point your phone camera at the barcode or QR code on your product tag to verify authenticity in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">3. Privacy Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Public scans confirm item authenticity without exposing your personal name, shipping address, or order details.
              </p>
            </div>

          </div>
        </div>

        {/* Easy How-It-Works Steps */}
        <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card space-y-6 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground border-b border-border/30 pb-4">
            How To Verify Your Item
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "Step 1", title: "Find The Tag", desc: "Locate the security tag on your garment." },
              { step: "Step 2", title: "Open Scanner", desc: "Click Launch Camera Scanner on our website." },
              { step: "Step 3", title: "Scan Barcode", desc: "Center the tag's code inside your camera view." },
              { step: "Step 4", title: "See Confirmation", desc: "View your item's instant genuine confirmation." },
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-2">
                <span className="text-xs font-mono font-bold text-muted-foreground">{s.step}</span>
                <h4 className="text-sm font-bold text-foreground">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-border/30 pb-4">
            <HelpCircle className="w-5 h-5 text-foreground" />
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border border-border/40 rounded-2xl bg-secondary/20 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-foreground hover:bg-secondary/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Call to Action */}
        <div className="border border-border/60 rounded-3xl p-8 bg-card text-center space-y-4 shadow-xs">
          <Shield className="w-8 h-8 text-foreground mx-auto" />
          <h3 className="text-xl font-bold text-foreground">Ready To Verify Your Item?</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Use your camera to scan any Orizino tag and confirm your garment's authenticity.
          </p>
          <Link to="/verify">
            <Button className="h-11 px-8 rounded-xl font-bold text-xs gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 shadow-xs">
              <QrCode className="w-4 h-4" /> Open Camera Scanner
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
};

export default ScannerInfoPage;
