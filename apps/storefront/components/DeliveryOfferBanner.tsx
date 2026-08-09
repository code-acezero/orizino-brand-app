"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, MapPin, X, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "deliveryOfferBanner.dismissedId";

const DeliveryOfferBanner: React.FC = () => {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch { /* ignore */ }
  }, []);

  const { data: offers = [] } = useQuery({
    queryKey: ["active-delivery-offers-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 60_000,
  });

  const offer = offers.find((o: any) => o.id !== dismissedId) as any;
  if (!offer) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, offer.id); } catch { /* ignore */ }
    setDismissedId(offer.id);
  };

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={offer.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-2xl border border-border/50 bg-card/90 p-4 md:p-5 relative overflow-hidden mb-4 shadow-sm"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss offer"
          className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
                Special Offer
              </span>
              <p className="font-display font-semibold text-foreground text-sm">{offer.title}</p>
            </div>
            {offer.description && (
              <p className="text-xs text-muted-foreground">{offer.description}</p>
            )}
            <div className="flex items-center gap-3 justify-center sm:justify-start mt-1.5 flex-wrap text-xs text-muted-foreground">
              {offer.min_order_amount > 0 && (
                <span className="flex items-center gap-1 font-medium">
                  <Tag className="w-3 h-3 text-primary" /> Min order: ৳{offer.min_order_amount}
                </span>
              )}
              {offer.target_areas?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> {offer.target_areas.join(", ")}
                </span>
              )}
            </div>
          </div>
          {offer.expires_at && <CountdownTimer endsAt={offer.expires_at} />}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const CountdownTimer: React.FC<{ endsAt: string }> = ({ endsAt }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!timeLeft) return null;

  return (
    <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary">
      <span>Ends in: {timeLeft}</span>
    </div>
  );
};

export default DeliveryOfferBanner;
// code:4ce0
