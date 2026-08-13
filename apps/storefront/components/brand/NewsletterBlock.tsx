"use client";
import React, { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";

const NewsletterBlock: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase.from as any)("newsletter_subscribers")
        .upsert({ email: email.trim() }, { onConflict: "email" });
      if (error) throw error;
      setDone(true);
      setEmail("");
      toast.success("You're on the list.");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section ref={ref} className="w-full bg-card/40 border-y border-border/40">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24 text-center">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-label text-primary dark:text-foreground">
            Stay in the loop
          </span>

          <h2 className="heading-editorial text-3xl sm:text-4xl lg:text-5xl leading-[1.05] text-foreground">
            Be the first to know
            <br />
            about every drop.
          </h2>

          <p className="font-sans-brand text-sm leading-relaxed max-w-sm text-muted-foreground">
            No noise. No spam. Just the latest releases, restocks, and exclusive
            access — straight to your inbox.
          </p>

          {done ? (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle className="w-5 h-5 text-primary dark:text-foreground" />
              <p className="font-sans-brand text-sm text-foreground">
                You're on the list. Watch your inbox.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="relative w-full max-w-md mt-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-6 pr-14 py-4 rounded-full text-sm font-sans-brand outline-none border border-border/40 bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/50 transition-all duration-300 focus:border-primary/50 focus:bg-background/80 hover:border-border/60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center rounded-full bg-foreground text-background hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </form>
          )}

          <p className="font-sans-brand text-xs text-muted-foreground/60">
            Unsubscribe anytime. No hard feelings.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterBlock;
