"use client";
import { motion } from "framer-motion";
import { ScanLine, ShieldCheck, Sparkles, Eye, Lock, ArrowRight, QrCode, Smartphone, CheckCircle2 } from "lucide-react";
import { getStorefrontUrl } from "@/lib/cross-app-urls";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { CompanyNav } from "@/components/nav/CompanyNav";
import Footer from "@/components/Footer";

export default function ScannerInfoPage() {
  const storefront = getStorefrontUrl();
  const verifyUrl = `${storefront}/verify`;
  const { cfg } = useScannerConfig();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CompanyNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/[0.06] blur-3xl" />
        </div>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto pt-[max(env(safe-area-inset-top),4rem)] pb-16 md:pt-28 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/40 text-[10px] font-sans-brand font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <ScanLine className="w-3.5 h-3.5" />
              Native scanner
            </div>
            <h1 className="text-[42px] md:text-[64px] leading-[1.05] font-editorial font-bold tracking-tight max-w-3xl">
              {(cfg as any).info_hero_title ?? (
                <>Every Orizino piece,{" "}<span className="text-primary">verifiably genuine.</span></>
              )}
            </h1>
            <p className="mt-6 text-[17px] md:text-[19px] text-muted-foreground max-w-2xl leading-relaxed font-sans-brand">
              {(cfg as any).info_hero_subtitle ?? "Scan the tag on any Orizino product with your phone camera — no app install, no sign-in. Instant authenticity proof, right in your browser."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={verifyUrl}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-foreground text-background font-sans-brand font-semibold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-foreground/5"
              >
                Try the scanner <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-border/40 bg-card/20 backdrop-blur-sm text-foreground hover:bg-card hover:border-border/80 font-sans-brand font-semibold text-xs uppercase tracking-widest transition-all hover:scale-[1.02]"
              >
                How it works
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Smartphone className="w-5 h-5" />}
            title="Native, not an app"
            body="Built into the Orizino web experience. Works on iPhone, Android, and desktop — no downloads."
          />
          <FeatureCard
            icon={<QrCode className="w-5 h-5" />}
            title="QR & barcode"
            body="Reads QR codes and every major 1D barcode format printed on our tags."
          />
          <FeatureCard
            icon={<Lock className="w-5 h-5" />}
            title="Privacy-first"
            body="Camera stays on your device. We only log the serial code that gets checked."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto py-16 border-t border-border/40">
        <p className="text-[10px] uppercase tracking-widest font-sans-brand font-semibold text-primary mb-3">How it works</p>
        <h2 className="text-[32px] md:text-[42px] font-editorial font-bold tracking-tight max-w-2xl">
          Three taps. One truth.
        </h2>
        <ol className="mt-10 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-5 items-start">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-sans-brand font-semibold shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-[18px] font-editorial font-semibold">{s.title}</p>
                <p className="text-[14px] font-sans-brand text-muted-foreground mt-1 max-w-xl leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What you'll see */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto py-16 border-t border-border/40">
        <p className="text-[10px] uppercase tracking-widest font-sans-brand font-semibold text-primary mb-3">Buyer vs. everyone else</p>
        <h2 className="text-[32px] md:text-[42px] font-editorial font-bold tracking-tight max-w-2xl">
          Everyone gets proof. Only the buyer gets details.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <DisclosureCard
            tone="muted"
            title="Anyone (no sign-in)"
            icon={<Eye className="w-5 h-5" />}
            rows={[
              ["Product", "Full name & image"],
              ["Authenticity", "Genuine ✓"],
              ["Sold on", "Month & year only"],
              ["Buyer", "Masked (e.g. A***a K.)"],
              ["Order details", "Hidden"],
            ]}
          />
          <DisclosureCard
            tone="accent"
            title="The buyer (signed in)"
            icon={<ShieldCheck className="w-5 h-5" />}
            rows={[
              ["Product", "Full name & image"],
              ["Authenticity", "Genuine ✓"],
              ["Sold on", "Exact date"],
              ["Order #", "Full number"],
              ["Shipping & payment", "Full details"],
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto py-20 border-t border-border/40">
        <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md p-8 md:p-12">
          <h3 className="text-[28px] md:text-[36px] font-editorial font-bold tracking-tight max-w-xl">
            Got an Orizino tag in front of you?
          </h3>
          <p className="mt-3 text-muted-foreground max-w-lg font-sans-brand">
            Open the scanner and hold your camera over the barcode or QR — you'll know in under a
            second.
          </p>
          <a
            href={verifyUrl}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-foreground text-background font-sans-brand font-semibold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-foreground/5"
          >
            Open scanner <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const STEPS = [
  {
    title: "Open the scanner on your phone",
    body: "Go to orizino.com/verify or tap the info icon on any product page. No app install required.",
  },
  {
    title: "Point at the tag",
    body: "Center the barcode or QR code inside the frame. The scanner reads it automatically — or type the code manually.",
  },
  {
    title: "See the truth",
    body: "You'll see product details, authenticity confirmation, and — if you're the buyer — full order info.",
  },
];

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-[16px] font-editorial font-semibold">{title}</p>
      <p className="mt-1.5 text-[13.5px] font-sans-brand text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function DisclosureCard({
  tone,
  title,
  icon,
  rows,
}: {
  tone: "muted" | "accent";
  title: string;
  icon: React.ReactNode;
  rows: [string, string][];
}) {
  const isAccent = tone === "accent";
  return (
    <div
      className={`rounded-3xl border backdrop-blur-sm p-6 ${
        isAccent
          ? "border-primary/30 bg-primary/5"
          : "border-border/40 bg-card/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isAccent ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <p className="text-[15px] font-editorial font-semibold">{title}</p>
      </div>
      <dl className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-[13.5px] font-sans-brand">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={`text-right font-medium ${isAccent ? "text-foreground" : "text-foreground/80"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {isAccent && (
        <p className="mt-4 flex items-center gap-1.5 text-[12px] font-sans-brand font-medium text-primary">
          <CheckCircle2 className="w-3.5 h-3.5" /> Requires sign-in with the purchasing account
        </p>
      )}
    </div>
  );
}
