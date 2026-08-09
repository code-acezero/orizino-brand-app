"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
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
} from "lucide-react";
import SiteCustomizer from "@/components/admin/SiteCustomizer";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertSiteSettings } from "@/lib/admin-data.functions";

const defaultSettings: Record<string, any> = {
  // Identity
  site_name: "",
  site_description: "Your premium online marketplace",
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
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({ ...defaultCurrencyConfig });

  const { data: settings } = useQuery({
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

      // Load currency config
      const ccRow = settings.find((s) => s.key === "currency_config");
      if (ccRow?.value) {
        const val = (ccRow.value as any)?.value ?? ccRow.value;
        if (val && typeof val === "object") {
          setCurrencyConfig((prev) => ({ ...prev, ...val }));
        }
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: Object.entries(form).map(([key, value]) => ({ key, value: { value } })) } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-nav"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveCurrencyConfig = useMutation({
    mutationFn: async () => {
      await saveSiteSettings({ data: { entries: [{ key: "currency_config", value: { value: currencyConfig } }] } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["currency-config"] });
      toast.success("Currency settings saved");
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

  const [tab, setTab] = useTabParam("general", "/settings-ai");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-display font-bold tracking-tight">Site Settings</h1>
        <p className="text-sm text-muted-foreground">
          Identity, contact, status and localization. Visual branding lives in{" "}
          <a href="/brand" className="text-primary hover:underline">Branding</a>
          {" · "}
          checkout & catalog defaults live in{" "}
          <a href="/sales/products?tab=commerce" className="text-primary hover:underline">Products → Commerce</a>.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="customizer" className="flex items-center gap-1">
            <PaintBucket className="w-3.5 h-3.5" /> Customizer
          </TabsTrigger>
          <TabsTrigger value="currency" className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Currency
          </TabsTrigger>
        </TabsList>

        {/* ── General (rebuilt) ── */}
        <TabsContent value="general">
          <div className="space-y-6 max-w-4xl">
            {/* Site Identity */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" /> Site Identity
                </CardTitle>
                <CardDescription>
                  Public name and one-line description used in metadata and the footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Site Name</Label>
                    <Input
                      value={form.site_name}
                      onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                      placeholder="Your Brand"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tagline / Description</Label>
                    <Input
                      value={form.site_description}
                      onChange={(e) => setForm({ ...form, site_description: e.target.value })}
                      placeholder="Your premium online marketplace"
                      maxLength={160}
                    />
                    <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                      {(form.site_description ?? "").length}/160
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Contact & Business
                </CardTitle>
                <CardDescription>
                  Shown on contact pages, footer, transactional emails, and structured data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> Contact Email</Label>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      placeholder="hello@yoursite.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Contact Phone</Label>
                    <Input
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Business Address</Label>
                    <Textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="123 Main St, City, Country"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Support URL</Label>
                    <Input
                      value={form.support_url}
                      onChange={(e) => setForm({ ...form, support_url: e.target.value })}
                      placeholder="https://support.yoursite.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Business Hours</Label>
                    <Input
                      value={form.business_hours}
                      onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                      placeholder="Mon–Fri · 9am–6pm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" /> Localization
                </CardTitle>
                <CardDescription>
                  Default language, time zone and date formatting for the storefront.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Default Language</Label>
                    <Select
                      value={form.default_language}
                      onValueChange={(v) => setForm({ ...form, default_language: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time Zone</Label>
                    <Select
                      value={form.timezone}
                      onValueChange={(v) => setForm({ ...form, timezone: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date Format</Label>
                    <Select
                      value={form.date_format}
                      onValueChange={(v) => setForm({ ...form, date_format: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD MMM YYYY">25 May 2026</SelectItem>
                        <SelectItem value="MMM DD, YYYY">May 25, 2026</SelectItem>
                        <SelectItem value="YYYY-MM-DD">2026-05-25</SelectItem>
                        <SelectItem value="DD/MM/YYYY">25/05/2026</SelectItem>
                        <SelectItem value="MM/DD/YYYY">05/25/2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Week Starts On</Label>
                    <Select
                      value={form.week_starts_on}
                      onValueChange={(v) => setForm({ ...form, week_starts_on: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Status */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Site Status
                </CardTitle>
                <CardDescription>
                  Toggle maintenance and the site-wide announcement bar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <Label>Maintenance Mode</Label>
                      {form.maintenance_mode && (
                        <Badge variant="destructive" className="text-[10px]">Live</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Show a maintenance page to all non-admin visitors.
                    </p>
                  </div>
                  <Switch
                    checked={!!form.maintenance_mode}
                    onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })}
                  />
                </div>
                {form.maintenance_mode && (
                  <div className="space-y-1.5">
                    <Label>Maintenance Message</Label>
                    <Textarea
                      rows={2}
                      value={form.maintenance_message}
                      onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
                      placeholder="We'll be back shortly."
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="min-w-0 pr-4">
                    <Label>Guest Checkout</Label>
                    <p className="text-xs text-muted-foreground">
                      Let shoppers place an order without creating an account. Turning this off requires sign-in to buy.
                    </p>
                  </div>
                  <Switch
                    checked={form.allow_guest_checkout !== false}
                    onCheckedChange={(v) => setForm({ ...form, allow_guest_checkout: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="min-w-0 pr-4">
                    <Label>Announcement Bar</Label>
                    <p className="text-xs text-muted-foreground">
                      Show a message strip at the top of every page.
                    </p>
                  </div>
                  <Switch
                    checked={!!form.announcement_bar_enabled}
                    onCheckedChange={(v) => setForm({ ...form, announcement_bar_enabled: v })}
                  />
                </div>
                {form.announcement_bar_enabled && (
                  <div className="space-y-1.5">
                    <Label>Announcement Text</Label>
                    <Input
                      value={form.announcement_bar_text}
                      onChange={(e) => setForm({ ...form, announcement_bar_text: e.target.value })}
                      placeholder="🎉 Free shipping on orders over $50!"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Privacy / Cookies */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Privacy & Cookies
                </CardTitle>
                <CardDescription>
                  Controls the cookie banner and analytics behaviour for visitors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="min-w-0 pr-4">
                    <Label>Show Cookie Banner</Label>
                    <p className="text-xs text-muted-foreground">
                      Required for GDPR / ePrivacy compliance in many regions.
                    </p>
                  </div>
                  <Switch
                    checked={!!form.cookie_banner_enabled}
                    onCheckedChange={(v) => setForm({ ...form, cookie_banner_enabled: v })}
                  />
                </div>
                {form.cookie_banner_enabled && (
                  <div className="space-y-1.5">
                    <Label>Banner Message</Label>
                    <Textarea
                      rows={2}
                      value={form.cookie_banner_text}
                      onChange={(e) => setForm({ ...form, cookie_banner_text: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="min-w-0 pr-4">
                    <Label>Anonymize Analytics IPs</Label>
                    <p className="text-xs text-muted-foreground">
                      Truncates the last octet of visitor IPs in analytics events.
                    </p>
                  </div>
                  <Switch
                    checked={!!form.analytics_anonymize_ip}
                    onCheckedChange={(v) => setForm({ ...form, analytics_anonymize_ip: v })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="sticky bottom-4 z-10 flex justify-end">
              <Button
                size="lg"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="shadow-lg"
              >
                {saveMutation.isPending ? "Saving…" : "Save General Settings"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Customizer Tab ── */}
        <TabsContent value="customizer">
          <SiteCustomizer />
        </TabsContent>
        {/* ── Currency Tab ── */}
        <TabsContent value="currency">
          <div className="space-y-6">
            {/* Default Currency */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Default Currency</CardTitle>
                <CardDescription>
                  All product prices are stored in this currency. Other currencies are converted using the exchange rates below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ALL_CURRENCIES.slice(0, 12).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setDefaultCurrency(c.code)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        currencyConfig.default_currency === c.code
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg font-display">{c.symbol}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{c.code}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.name}</p>
                      </div>
                      {currencyConfig.default_currency === c.code && (
                        <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Exchange Rates */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Live Exchange Rates</CardTitle>
                <CardDescription>
                  Fetch live rates from open.er-api.com (free, no API key). Rates are relative to {currencyConfig.default_currency}.
                  {(currencyConfig as any).rates_last_updated && (
                    <span className="flex items-center gap-1 mt-1 text-primary">
                      <Clock className="w-3 h-3" />
                      Last updated: {new Date((currencyConfig as any).rates_last_updated).toLocaleString()}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => fetchRatesMutation.mutate()}
                  disabled={fetchRatesMutation.isPending || currencyConfig.enabled_currencies.length <= 1}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${fetchRatesMutation.isPending ? "animate-spin" : ""}`} />
                  {fetchRatesMutation.isPending ? "Fetching live rates..." : "Fetch Live Rates"}
                </Button>
                {currencyConfig.enabled_currencies.length <= 1 && (
                  <p className="text-xs text-muted-foreground mt-2">Enable at least 2 currencies to fetch exchange rates.</p>
                )}
              </CardContent>
            </Card>

            {/* Enabled Currencies */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Enabled Currencies</CardTitle>
                <CardDescription>
                  Toggle currencies on/off. Enabled currencies will automatically show for users from matching countries.
                  {currencyConfig.enabled_currencies.length} of {ALL_CURRENCIES.length} enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ALL_CURRENCIES.map((c) => {
                  const isEnabled = currencyConfig.enabled_currencies.includes(c.code);
                  const isDefault = currencyConfig.default_currency === c.code;
                  return (
                    <div key={c.code} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isEnabled ? "border-primary/20 bg-primary/5" : "border-border/30"}`}>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleCurrency(c.code)}
                        disabled={isDefault}
                      />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg font-display w-8">{c.symbol}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{c.code}</span>
                            <span className="text-xs text-muted-foreground">{c.name}</span>
                            {isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Countries: {c.countries.join(", ")}
                          </p>
                        </div>
                      </div>
                      {/* Exchange rate (only for non-default enabled currencies) */}
                      {isEnabled && !isDefault && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            1 {currencyConfig.default_currency} =
                          </Label>
                          <Input
                            type="number"
                            step="0.0001"
                            className="w-28 h-8 text-sm"
                            value={currencyConfig.exchange_rates[c.code] || ""}
                            onChange={(e) => setExchangeRate(c.code, e.target.value)}
                            placeholder="Rate"
                          />
                          <span className="text-xs text-muted-foreground">{c.code}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => saveCurrencyConfig.mutate()} disabled={saveCurrencyConfig.isPending}>
              {saveCurrencyConfig.isPending ? "Saving..." : "Save Currency Settings"}
            </Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminSettings;
// code:4ce0
