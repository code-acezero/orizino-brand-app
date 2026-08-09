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
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
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
    <section
      ref={ref}
      className="w-full"
      style={{ background: "hsl(var(--charcoal))" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-20 lg:py-28 text-center">
        <motion.div
          className="flex flex-col items-center gap-8"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="section-label" style={{ color: "hsl(var(--cherry))" }}>
            Stay in the loop
          </span>

          <h2
            className="heading-editorial text-3xl sm:text-4xl lg:text-5xl leading-[1.05]"
            style={{ color: "hsl(var(--cream))" }}
          >
            Be the first to know
            <br />
            about every drop.
          </h2>

          <p
            className="font-sans-brand text-sm leading-relaxed max-w-sm"
            style={{ color: "hsl(var(--cream) / 0.55)" }}
          >
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
              <CheckCircle className="w-5 h-5" style={{ color: "hsl(var(--cherry))" }} />
              <p
                className="font-sans-brand text-sm"
                style={{ color: "hsl(var(--cream))" }}
              >
                You're on the list. Watch your inbox.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md flex gap-0"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-5 py-3.5 text-sm font-sans-brand outline-none border border-r-0 transition-colors"
                style={{
                  background: "hsl(60 3% 14%)",
                  color: "hsl(var(--cream))",
                  borderColor: "hsl(60 3% 24%)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--cherry))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "hsl(60 3% 24%)";
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn-cherry flex-shrink-0 px-6 py-3.5"
                style={{ borderRadius: 0 }}
              >
                {submitting ? (
                  <span className="w-4 h-4 border border-cream/50 border-t-cream rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </form>
          )}

          <p
            className="font-sans-brand text-xs"
            style={{ color: "hsl(var(--cream) / 0.3)" }}
          >
            Unsubscribe anytime. No hard feelings.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterBlock;
