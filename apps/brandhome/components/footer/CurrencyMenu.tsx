"use client";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Check, ChevronDown, Coins } from "lucide-react";

const CurrencyMenu: React.FC<{ variant?: "footer" | "default" }> = ({ variant = "footer" }) => {
  const { currency, setCurrency, enabledCurrencies, allCurrencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const list = enabledCurrencies.length > 0 ? enabledCurrencies : allCurrencies.slice(0, 8);
  const active = allCurrencies.find((c) => c.code === currency);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors ${variant === "footer" ? "border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground" : "bg-secondary/50 hover:bg-secondary"}`}>
          <Coins className="w-3 h-3" />
          <span className="font-mono">{active?.symbol}</span>
          <span>{currency}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1 rounded-2xl">
        <div className="max-h-64 overflow-y-auto">
          {list.map((c) => {
            const isActive = c.code === currency;
            return (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono w-6 text-center">{c.symbol}</span>
                  <span className="font-semibold">{c.code}</span>
                  <span className="text-muted-foreground truncate">{c.name}</span>
                </span>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CurrencyMenu;
// code:4ce0
