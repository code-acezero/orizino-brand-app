"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SaleCountdown from "./SaleCountdown";

interface SalePopupProps {
  sale: {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    custom_icon_url?: string;
    banner_image?: string;
    color: string;
    button_text: string;
    button_link: string;
    ends_at?: string;
    show_countdown?: boolean;
  };
}

const SalePopup: React.FC<SalePopupProps> = ({ sale }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `sale_popup_dismissed_${sale.id}`;
    const dismissed = sessionStorage.getItem(key);
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [sale.id]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(`sale_popup_dismissed_${sale.id}`, "1");
  };

  const bgColor = sale.color?.startsWith("var") ? `hsl(var(--primary))` : `hsl(${sale.color})`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={dismiss}
        >
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>

            <div className="overflow-y-auto overscroll-contain">
              {sale.banner_image && (
                <div className="h-40 overflow-hidden flex-shrink-0">
                  <img src={sale.banner_image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 bg-card relative">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: bgColor }} />
                <div className="flex items-center gap-3 mb-3 pr-10">
                  {sale.custom_icon_url ? (
                    <img src={sale.custom_icon_url} className="w-12 h-12 object-contain" alt="" />
                  ) : (
                    <span className="text-4xl">{sale.icon}</span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold font-display text-foreground">{sale.title}</h3>
                    <p className="text-sm text-muted-foreground">{sale.subtitle}</p>
                  </div>
                </div>
                {sale.show_countdown && sale.ends_at && (
                  <div className="mb-4">
                    <SaleCountdown endsAt={sale.ends_at} color={sale.color} />
                  </div>
                )}
                <a
                  href={sale.button_link || "/inventory"}
                  onClick={dismiss}
                  className="block w-full text-center text-white font-semibold py-3 rounded-2xl transition-opacity hover:opacity-90"
                  style={{ background: bgColor }}
                >
                  {sale.button_text || "Shop Now"}
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalePopup;
// code:4ce0
