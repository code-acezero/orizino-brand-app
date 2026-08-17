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
    <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5" /> Price in other currencies
      </p>
      <div className="flex flex-wrap gap-2 notranslate skiptranslate" translate="no">
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
                onClick={() => setCurrency(c.code)}
                className="notranslate skiptranslate flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm"
              >
                <span className="font-display">{c.symbol}</span>
                <span className="text-foreground font-medium">
                  {converted.toLocaleString(undefined, { minimumFractionDigits: noDecimal ? 0 : 2, maximumFractionDigits: noDecimal ? 0 : 2 })}
                </span>
                <span className="text-muted-foreground text-xs">{c.code}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default CurrencyWidget;
// code:4ce0
