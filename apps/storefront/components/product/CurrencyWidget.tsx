"use client";
import React from "react";
import { Globe } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencyWidgetProps {
  price: number;
}

const CurrencyWidget: React.FC<CurrencyWidgetProps> = ({ price }) => {
  const { currency, setCurrency, enabledCurrencies, config } = useCurrency();

  if (enabledCurrencies.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 shrink-0">
        <Globe className="w-3 h-3 text-muted-foreground/70" /> Est:
      </span>
      <div className="flex flex-wrap gap-1.5 notranslate skiptranslate" translate="no">
        {enabledCurrencies
          .filter((c) => c.code !== currency)
          .map((c) => {
            const rate = config.exchange_rates[c.code];
            if (!rate && c.code !== config.default_currency) return null;
            const converted = c.code === config.default_currency ? price : price * rate;
            const noDecimal = ["JPY", "KRW", "VND", "IRR"].includes(c.code);
            return (
              <button
                key={c.code}
                translate="no"
                type="button"
                onClick={() => setCurrency(c.code)}
                className="notranslate skiptranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-border/70 bg-card hover:border-primary/60 hover:bg-primary/5 transition-all text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
              >
                <span className="font-display font-bold">{c.symbol}</span>
                <span className="text-foreground font-bold">
                  {converted.toLocaleString(undefined, {
                    minimumFractionDigits: noDecimal ? 0 : 2,
                    maximumFractionDigits: noDecimal ? 0 : 2,
                  })}
                </span>
                <span className="text-[10px] text-muted-foreground/80 font-medium">{c.code}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default CurrencyWidget;
