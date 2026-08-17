"use client";
import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { useRegisterUniversalSave } from "@/contexts/UniversalSaveContext";
import {
  ALL_CURRENCIES,
  type CurrencyConfig,
} from "@/contexts/CurrencyContext";
import {
  Building2,
  Check,
  Clock,
  DollarSign,
  Globe,
  Languages,
  Mail,
  PaintBucket,
  Phone,
  RefreshCw,
  ShieldAlert,
  Fingerprint,
  Zap,
  Sliders,
  Palette,
  Save,
  CheckCircle2,
  Lock,
  UserCheck,
  Megaphone,
} from "lucide-react";
import SiteCustomizer from "@/components/admin/SiteCustomizer";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertSiteSettings } from "@/lib/admin-data.functions";
import { cn } from "@/lib/utils";

const defaultSettings: Record<string, any> = {
  // Contact
  contact_email: "",
  contact_phone: "",
  support_url: "",
  address: "",
  business_hours: "",
  // Status
  maintenance_mode: false,
  maintenance_message: "We'll be back shortly. Thanks for your patience.",
  announcement_bar_text: "",
  announcement_bar_enabled: false,
  // Checkout
  allow_guest_checkout: true,
  // Localization
  default_language: "en",
  timezone: "Asia/Dhaka",
  date_format: "DD MMM YYYY",
  week_starts_on: "sunday",
  // Privacy
  cookie_banner_enabled: true,
  cookie_banner_text:
    "We use cookies to improve your experience. By using our site you agree to our privacy policy.",
  analytics_anonymize_ip: true,
};

const defaultCurrencyConfig: CurrencyConfig = {
  default_currency: "BDT",
  enabled_currencies: ["BDT"],
  exchange_rates: {},
};

const TIMEZONES = [
  "UTC",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা (Bangla)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文 (Chinese)" },
];

const AdminSettings = () => {
  const qc = useQueryClient();
  const saveSiteSettings = useServerFn(upsertSiteSettings);
  const [form, setForm] = useState(defaultSettings);
  const [initialForm, setInitialForm] = useState(defaultSettings);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({ ...defaultCurrencyConfig });
  const [initialCurrencyConfig, setInitialCurrencyConfig] = useState<CurrencyConfig>({ ...defaultCurrencyConfig });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, any> = {};
      settings.forEach((s) => {
        map[s.key] = typeof s.value === "object" && s.value !== null ? (s.value as any).value ?? s.value : s.value;
      });
      setForm((prev) => ({ ...prev, ...map }));
      setInitialForm((prev) => ({ ...prev, ...map }));

      // Load currency config
      const ccRow = settings.find((s) => s.key === "currency_config");
      if (ccRow?.value) {
        const val = (ccRow.value as any)?.value ?? ccRow.value;
        if (val && typeof val === "object") {
          setCurrencyConfig((prev) => ({ ...prev, ...val }));
          setInitialCurrencyConfig((prev) => ({ ...prev, ...val }));
        }
      }
    }
  }, [settings]);

  const isFormDirty = useMemo(() => {
    try {
      return JSON.stringify(form) !== JSON.stringify(initialForm);
    } catch {
      return false;
    }
  }, [form, initialForm]);

  const isCurrencyDirty = useMemo(() => {
    try {
      return JSON.stringify(currencyConfig) !== JSON.stringify(initialCurrencyConfig);
    } catch {
      return false;
    }
  }, [currencyConfig, initialCurrencyConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: Object.entries(form).map(([key, value]) => ({ key, value: { value } })) } });
    },
    onSuccess: () => {
      setInitialForm(form);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-nav"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveCurrencyConfig = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "currency_config", value: { value: currencyConfig } }] } });
    },
    onSuccess: () => {
      setInitialCurrencyConfig(currencyConfig);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["currency-config"] });
      toast.success("Currency configuration saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const fetchRatesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-exchange-rates");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch rates");
      return data;
    },
    onSuccess: (data) => {
      setCurrencyConfig((prev) => ({
        ...prev,
        exchange_rates: data.rates,
      }));
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["currency-config"] });
      toast.success("Exchange rates updated from live API");
    },
    onError: (e) => toast.error(`Failed to fetch rates: ${e.message}`),
  });

  const toggleCurrency = (code: string) => {
    const enabled = currencyConfig.enabled_currencies.includes(code);
    if (enabled && code === currencyConfig.default_currency) {
      toast.error("Cannot disable the default currency");
      return;
    }
    setCurrencyConfig((prev) => ({
      ...prev,
      enabled_currencies: enabled
        ? prev.enabled_currencies.filter((c) => c !== code)
        : [...prev.enabled_currencies, code],
    }));
  };

  const setExchangeRate = (code: string, rate: string) => {
    setCurrencyConfig((prev) => ({
      ...prev,
      exchange_rates: { ...prev.exchange_rates, [code]: parseFloat(rate) || 0 },
    }));
  };

  const setDefaultCurrency = (code: string) => {
    setCurrencyConfig((prev) => ({
      ...prev,
      default_currency: code,
      enabled_currencies: prev.enabled_currencies.includes(code)
        ? prev.enabled_currencies
        : [...prev.enabled_currencies, code],
    }));
  };

  const [tab, setTab] = useTabParam("general", "/settings-ai/general");

  // Universal Floating Save Registration for tabs handled directly by AdminSettings
  useRegisterUniversalSave(
    useMemo(() => {
      if (tab === "customizer") {
        // Handled directly inside SiteCustomizer component
        return null;
      }
      if (tab === "currency") {
        return {
          id: "admin-settings-currency",
          label: "Save Currency Config",
          isSaving: saveCurrencyConfig.isPending,
          isDirty: isCurrencyDirty,
          onSave: () => saveCurrencyConfig.mutate(),
          onReject: () => setCurrencyConfig(initialCurrencyConfig),
          canReject: isCurrencyDirty,
        };
      }
      return {
        id: `admin-settings-${tab}`,
        label: tab === "maintenance" ? "Save Maintenance & State" : "Save General Settings",
        isSaving: saveMutation.isPending,
        isDirty: isFormDirty,
        onSave: () => saveMutation.mutate(),
        onReject: () => setForm(initialForm),
        canReject: isFormDirty,
      };
    }, [
      tab,
      saveCurrencyConfig.isPending,
      isCurrencyDirty,
      saveCurrencyConfig,
      initialCurrencyConfig,
      saveMutation.isPending,
      isFormDirty,
      saveMutation,
      initialForm,
    ])
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full">
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                <Sliders className="w-3 h-3 text-primary animate-pulse" />
                Global System Configuration
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                Base Engine
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              General Settings &amp; Customizer
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Manage core business identity, contact channels, global storefront localization, layout customizer tokens, multi-currency exchange rates, and site maintenance states.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* ── Tab 1: General & Business ── */}
        <TabsContent value="general" className="mt-0 space-y-6">
          {/* Brand Identity Centralization Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="font-bold text-foreground text-xs sm:text-sm">Brand Name &amp; Visual Identity are managed in Branding Hub</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Edit your primary Brand Name, Wordmark chunking, Logos, Typography, and live navbar simulator in one place.</p>
              </div>
            </div>
            <Link
              to="/settings-ai/branding"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-colors shrink-0 shadow-xs"
            >
              Open Branding Hub →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Localization */}
            <Card className="border-border/50 bg-card/60 shadow-xs lg:col-span-2">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" /> Localization &amp; Region
                </CardTitle>
                <CardDescription className="text-xs">
                  Default language, timezone, and calendar date formatting.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Default Language</Label>
                  <Select
                    value={form.default_language}
                    onValueChange={(v) => setForm({ ...form, default_language: v })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Time Zone</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(v) => setForm({ ...form, timezone: v })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date Format</Label>
                  <Select
                    value={form.date_format}
                    onValueChange={(v) => setForm({ ...form, date_format: v })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD MMM YYYY" className="text-xs">25 May 2026</SelectItem>
                      <SelectItem value="MMM DD, YYYY" className="text-xs">May 25, 2026</SelectItem>
                      <SelectItem value="YYYY-MM-DD" className="text-xs">2026-05-25</SelectItem>
                      <SelectItem value="DD/MM/YYYY" className="text-xs">25/05/2026</SelectItem>
                      <SelectItem value="MM/DD/YYYY" className="text-xs">05/25/2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Week Starts On</Label>
                  <Select
                    value={form.week_starts_on}
                    onValueChange={(v) => setForm({ ...form, week_starts_on: v })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday" className="text-xs">Sunday</SelectItem>
                      <SelectItem value="monday" className="text-xs">Monday</SelectItem>
                      <SelectItem value="saturday" className="text-xs">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact & Business Info */}
          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Corporate &amp; Customer Support Channels
              </CardTitle>
              <CardDescription className="text-xs">
                Contact channels shown on invoices, emails, structured data, and customer support pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" /> Contact Email
                </Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="contact@orizino.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone Number
                </Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="+880 1800-000000"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" /> Helpdesk / Support URL
                </Label>
                <Input
                  value={form.support_url}
                  onChange={(e) => setForm({ ...form, support_url: e.target.value })}
                  placeholder="https://orizino.com/support"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Operating Hours
                </Label>
                <Input
                  value={form.business_hours}
                  onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                  placeholder="Sat–Thu · 10am–8pm"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                <Label className="text-xs font-medium">Headquarters Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh"
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Save Bar */}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-10 px-6 rounded-xl font-bold gap-2 text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : "Save General Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ── Tab 2: Layout & UI Customizer ── */}
        <TabsContent value="customizer" className="mt-0">
          <SiteCustomizer />
        </TabsContent>

        {/* ── Tab 3: Currency & Rates ── */}
        <TabsContent value="currency" className="mt-0 space-y-6">
          {/* Default Currency */}
          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Primary Storefront Currency
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Base database currency. Other currencies are calculated using the live exchange multiplier.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                  Base: {currencyConfig.default_currency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {ALL_CURRENCIES.slice(0, 12).map((c) => {
                  const isSelected = currencyConfig.default_currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setDefaultCurrency(c.code)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-bold"
                          : "border-border/50 hover:border-primary/40 hover:bg-secondary/30 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-display">{c.symbol}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-none">{c.code}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.name}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Live Automated Exchange Rates */}
          <Card className="border-primary/20 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Live Exchange Multiplier Sync
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fetch real-time automated rates from open exchange API. Rates are relative to {currencyConfig.default_currency}.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchRatesMutation.mutate()}
                  disabled={fetchRatesMutation.isPending || currencyConfig.enabled_currencies.length <= 1}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border/60"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", fetchRatesMutation.isPending && "animate-spin")} />
                  {fetchRatesMutation.isPending ? "Syncing..." : "Sync Live Rates"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Multi-Currency Supported List */}
          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Active Currencies &amp; Multipliers
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle supported currencies. Visitors from detected countries will automatically see their local currency.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-border/40">
              {ALL_CURRENCIES.map((c) => {
                const isEnabled = currencyConfig.enabled_currencies.includes(c.code);
                const isDefault = currencyConfig.default_currency === c.code;
                return (
                  <div key={c.code} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleCurrency(c.code)}
                        disabled={isDefault}
                      />
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base font-display font-bold w-6 text-center">{c.symbol}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">{c.code}</span>
                            <span className="text-xs text-muted-foreground font-medium">({c.name})</span>
                            {isDefault && (
                              <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 py-0">
                                Primary Base
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Active Regions: {c.countries.slice(0, 5).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isEnabled && !isDefault && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          1 {currencyConfig.default_currency} =
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          className="w-24 h-8 text-xs font-mono"
                          value={currencyConfig.exchange_rates[c.code] || ""}
                          onChange={(e) => setExchangeRate(c.code, e.target.value)}
                          placeholder="Rate"
                        />
                        <span className="text-xs font-mono font-bold text-foreground">{c.code}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Maintenance & State ── */}
        <TabsContent value="maintenance" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maintenance Mode */}
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Maintenance Mode
                </CardTitle>
                <CardDescription className="text-xs">
                  Display a lock screen to visitors during scheduled upgrades or maintenance.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Enable Maintenance Mode</Label>
                    <p className="text-[11px] text-muted-foreground">Admins can still preview and browse the site.</p>
                  </div>
                  <Switch
                    checked={!!form.maintenance_mode}
                    onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })}
                  />
                </div>
                {form.maintenance_mode && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Visitor Lock Screen Message</Label>
                    <Textarea
                      rows={3}
                      value={form.maintenance_message}
                      onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
                      placeholder="We'll be back shortly with exciting new drops."
                      className="text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guest Checkout */}
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" /> Checkout Accessibility
                </CardTitle>
                <CardDescription className="text-xs">
                  Allow one-click guest checkout without requiring immediate account creation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Allow Guest Checkout</Label>
                    <p className="text-[11px] text-muted-foreground">Shoppers can place orders directly with phone/email.</p>
                  </div>
                  <Switch
                    checked={form.allow_guest_checkout !== false}
                    onCheckedChange={(v) => setForm({ ...form, allow_guest_checkout: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Announcement Strip */}
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" /> Top Announcement Strip
                </CardTitle>
                <CardDescription className="text-xs">
                  Display a global banner strip at the very top of every storefront page.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Enable Announcement Strip</Label>
                    <p className="text-[11px] text-muted-foreground">Highlights flash sales, promotions or shipping offers.</p>
                  </div>
                  <Switch
                    checked={!!form.announcement_bar_enabled}
                    onCheckedChange={(v) => setForm({ ...form, announcement_bar_enabled: v })}
                  />
                </div>
                {form.announcement_bar_enabled && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Announcement Message</Label>
                    <Input
                      value={form.announcement_bar_text}
                      onChange={(e) => setForm({ ...form, announcement_bar_text: e.target.value })}
                      placeholder="🎉 Free express delivery across Bangladesh on orders over ৳2,500!"
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cookie & GDPR Banner */}
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Privacy &amp; Cookies Consent
                </CardTitle>
                <CardDescription className="text-xs">
                  EU GDPR &amp; regional privacy compliance banner controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Show Cookie Consent Banner</Label>
                    <p className="text-[11px] text-muted-foreground">Displays bottom consent modal on first visit.</p>
                  </div>
                  <Switch
                    checked={!!form.cookie_banner_enabled}
                    onCheckedChange={(v) => setForm({ ...form, cookie_banner_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Anonymize Visitor IPs</Label>
                    <p className="text-[11px] text-muted-foreground">Masks visitor IP octets in analytics logs.</p>
                  </div>
                  <Switch
                    checked={!!form.analytics_anonymize_ip}
                    onCheckedChange={(v) => setForm({ ...form, analytics_anonymize_ip: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-10 px-6 rounded-xl font-bold gap-2 text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : "Save State & Privacy Settings"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
// code:4ce0
