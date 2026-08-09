"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, X, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "topOfferBanner.dismissedId";

const TopOfferBanner: React.FC = () => {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch { /* ignore */ }
  }, []);

  const { data: offers = [] } = useQuery({
    queryKey: ["top-offer-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_offers")
        .select("id, title, description, min_order_amount")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const offer = offers.find((o) => o.id !== dismissedId);
  if (!offer) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, offer.id); } catch { /* ignore */ }
    setDismissedId(offer.id);
  };

  const subtitle =
    offer.description ||
    (offer.min_order_amount && offer.min_order_amount > 0
      ? `Min order ৳${offer.min_order_amount}`
      : "");

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={offer.id}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative overflow-hidden bg-primary/10 border-b border-primary/20"
      >
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center sm:justify-start">
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground">
              <Sparkles className="w-2.5 h-2.5" /> OFFER
            </span>
            <p className="truncate text-xs font-medium text-foreground leading-none">
              <span className="font-bold">{offer.title}</span>
              {subtitle && (
                <span className="text-muted-foreground ml-1.5">— {subtitle}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss top offer"
            className="shrink-0 -mr-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TopOfferBanner;
// code:4ce0
