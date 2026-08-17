"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";

/* ── Full currency definitions ── */
export interface CurrencyDef {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  /** Countries that use this currency (ISO 2-letter) */
  countries: string[];
}

export const ALL_CURRENCIES: CurrencyDef[] = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD", countries: ["BD"] },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", countries: ["US", "PR", "GU", "VI", "AS", "EC", "SV", "MH", "FM", "PW"] },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE", countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "FI", "IE", "GR", "LU", "SK", "SI", "EE", "LV", "LT", "MT", "CY"] },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", countries: ["GB"] },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", countries: ["IN"] },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "en-PK", countries: ["PK"] },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA", countries: ["SA"] },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE", countries: ["AE"] },
  { code: "IRR", symbol: "﷼", name: "Iranian Rial", locale: "fa-IR", countries: ["IR"] },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY", countries: ["MY"] },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP", countries: ["JP"] },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", countries: ["CN"] },
  { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR", countries: ["KR"] },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR", countries: ["TR"] },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR", countries: ["BR"] },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", locale: "en-CA", countries: ["CA"] },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU", countries: ["AU"] },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG", countries: ["NG"] },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG", countries: ["EG"] },
  { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH", countries: ["TH"] },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID", countries: ["ID"] },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH", countries: ["PH"] },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN", countries: ["VN"] },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU", countries: ["RU"] },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA", countries: ["ZA"] },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal", locale: "ar-QA", countries: ["QA"] },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW", countries: ["KW"] },
  { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar", locale: "ar-BH", countries: ["BH"] },
  { code: "OMR", symbol: "﷼", name: "Omani Rial", locale: "ar-OM", countries: ["OM"] },
];

export interface CurrencyConfig {
  default_currency: string;
  enabled_currencies: string[];
  /** Exchange rates relative to default currency: { "USD": 0.0091, "EUR": 0.0084, ... } */
  exchange_rates: Record<string, number>;
}

const DEFAULT_CONFIG: CurrencyConfig = {
  default_currency: "BDT",
  enabled_currencies: ["BDT"],
  exchange_rates: {},
};

interface CurrencyContextType {
  /** Current active currency code */
  currency: string;
  /** Set currency manually */
  setCurrency: (code: string) => void;
  /** Format a price (stored in default currency) to the active currency */
  formatPrice: (amount: number) => string;
  /** Convert amount from default currency to active currency */
  convert: (amount: number) => number;
  /** Full config from DB */
  config: CurrencyConfig;
  /** All defined currencies */
  allCurrencies: CurrencyDef[];
  /** Only enabled currencies */
  enabledCurrencies: CurrencyDef[];
  /** Detected country code */
  detectedCountry: string | null;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "BDT",
  setCurrency: () => {},
  formatPrice: (a) => `৳${a.toFixed(2)}`,
  convert: (a) => a,
  config: DEFAULT_CONFIG,
  allCurrencies: ALL_CURRENCIES,
  enabledCurrencies: [],
  detectedCountry: null,
});

export const useCurrency = () => useContext(CurrencyContext);

/** Detect user's country code from timezone or fast Geo-IP APIs (cached in sessionStorage and localStorage) */
export const detectCountry = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  const cached = sessionStorage.getItem("user_country") || localStorage.getItem("user_country_cached");
  if (cached && cached.length === 2) return cached.toUpperCase();

  // 1. Fast zero-latency Timezone mapping
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/dhaka/i.test(tz)) return "BD";
    if (/kolkata|calcutta/i.test(tz)) return "IN";
    if (/karachi/i.test(tz)) return "PK";
    if (/dubai/i.test(tz)) return "AE";
    if (/riyadh/i.test(tz)) return "SA";
    if (/qatar|doha/i.test(tz)) return "QA";
    if (/kuwait/i.test(tz)) return "KW";
    if (/bahrain/i.test(tz)) return "BH";
    if (/muscat/i.test(tz)) return "OM";
    if (/kuala_lumpur/i.test(tz)) return "MY";
    if (/singapore/i.test(tz)) return "SG";
    if (/bangkok/i.test(tz)) return "TH";
    if (/tokyo/i.test(tz)) return "JP";
    if (/seoul/i.test(tz)) return "KR";
    if (/london/i.test(tz)) return "GB";
    if (/new_york|chicago|los_angeles|denver|phoenix/i.test(tz)) return "US";
    if (/toronto|vancouver|montreal/i.test(tz)) return "CA";
    if (/sydney|melbourne|brisbane/i.test(tz)) return "AU";
    if (/berlin|frankfurt/i.test(tz)) return "DE";
    if (/paris/i.test(tz)) return "FR";
    if (/rome/i.test(tz)) return "IT";
    if (/madrid/i.test(tz)) return "ES";
    if (/amsterdam/i.test(tz)) return "NL";
  } catch {}

  // 2. High-speed Geo-IP lookups with race/fallback
  const endpoints = [
    async () => {
      const res = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(2500) });
      const data = await res.json();
      return (data?.country as string) || null;
    },
    async () => {
      const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      return (data?.country_code as string) || null;
    },
    async () => {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      return (data?.country_code as string) || (data?.country as string) || null;
    },
  ];

  for (const fetcher of endpoints) {
    try {
      const code = await fetcher();
      if (code && typeof code === "string" && code.length === 2) {
        const upper = code.toUpperCase();
        sessionStorage.setItem("user_country", upper);
        localStorage.setItem("user_country_cached", upper);
        return upper;
      }
    } catch {}
  }

  return null;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>("BDT");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Load config from site_settings
  const { data: configRow } = useQuery({
    queryKey: ["currency-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "currency_config")
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const config = useMemo<CurrencyConfig>(() => {
    if (!configRow?.value) return DEFAULT_CONFIG;
    const val = (configRow.value as any)?.value ?? configRow.value;
    return { ...DEFAULT_CONFIG, ...val };
  }, [configRow]);

  const enabledCurrencies = useMemo(
    () => ALL_CURRENCIES.filter((c) => config.enabled_currencies.includes(c.code)),
    [config.enabled_currencies]
  );

  // Auto-detect visitor's country and auto-select currency if available in settings
  useEffect(() => {
    const saved = localStorage.getItem("preferred_currency");
    // If user has explicitly selected a valid enabled currency, honor their manual choice
    if (saved && config.enabled_currencies.includes(saved)) {
      setCurrencyState(saved);
      return;
    }

    let isMounted = true;

    detectCountry().then((country) => {
      if (!isMounted) return;
      setDetectedCountry(country);

      if (!country) {
        setCurrencyState(config.default_currency || "BDT");
        return;
      }

      // Find matching currency for user's visiting country that is actively enabled in settings
      const match = ALL_CURRENCIES.find(
        (c) => c.countries.includes(country) && config.enabled_currencies.includes(c.code)
      );

      if (match) {
        // Auto-select user's native currency
        setCurrencyState(match.code);
      } else {
        // If native currency is not enabled in settings, use default store currency
        setCurrencyState(config.default_currency || "BDT");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [config]);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem("preferred_currency", code);
  }, []);

  const convert = useCallback(
    (amount: number): number => {
      if (currency === config.default_currency) return amount;
      const rate = config.exchange_rates[currency];
      if (!rate) return amount;
      return amount * rate;
    },
    [currency, config]
  );

  const formatPrice = useCallback(
    (amount: number): string => {
      const converted = convert(amount);
      const def = ALL_CURRENCIES.find((c) => c.code === currency);
      const symbol = def?.symbol || currency;

      // For zero-decimal currencies
      const noDecimalCurrencies = ["JPY", "KRW", "VND", "IRR"];
      const decimals = noDecimalCurrencies.includes(currency) ? 0 : 2;

      return `${symbol}${converted.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
    [currency, convert]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatPrice,
        convert,
        config,
        allCurrencies: ALL_CURRENCIES,
        enabledCurrencies,
        detectedCountry,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
// code:4ce0
