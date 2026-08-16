"use client";
import React from "react";
import type { LucideProps } from "lucide-react";
import {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
  RussianRuble,
  PhilippinePeso,
  SwissFranc,
} from "lucide-react";
import { ALL_CURRENCIES } from "@/contexts/CurrencyContext";

type IconComp = React.FC<LucideProps>;

/** Only map codes whose symbol genuinely matches a Lucide glyph. */
const currencyIconMap: Record<string, IconComp> = {
  USD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  INR: IndianRupee,
  JPY: JapaneseYen,
  CNY: JapaneseYen,
  RUB: RussianRuble,
  PHP: PhilippinePeso,
  CHF: SwissFranc,
};

interface CurrencyIconProps {
  code: string;
  className?: string;
}

/** Renders an icon for the given currency. Uses a Lucide icon when an exact
 *  glyph exists, otherwise falls back to rendering the actual currency symbol
 *  (e.g. ৳ for BDT, ₩ for KRW) as styled text — never a misleading $ default. */
const CurrencyIcon: React.FC<CurrencyIconProps> = ({ code, className }) => {
  const upper = code.toUpperCase();
  const Icon = currencyIconMap[upper];
  if (Icon) return <Icon className={className} />;

  const def = ALL_CURRENCIES.find((c) => c.code === upper);
  const symbol = def?.symbol || upper;
  return (
    <span
      className={`${className || ""} notranslate currency-symbol`}
      translate="no"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        lineHeight: 1,
        fontSize: "1.05em",
      }}
      aria-label={`${upper} currency`}
    >
      {symbol}
    </span>
  );
};

export default CurrencyIcon;
// code:4ce0
