"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTabParam } from "@/hooks/use-tab-param";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { toast } from "@/lib/app-toast";
import { CreditCard, Smartphone, Building2, QrCode, Power, Loader2, CheckCircle2, XCircle, KeyRound, ExternalLink } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { testStripeConnection } from "@/lib/stripe.functions";

interface PersonalAccount {
  enabled: boolean;
  account_number: string;
  account_holder: string;
  qr_code_url: string;
  instructions: string;
}

interface PaymentConfig {
  mfs_system_enabled: boolean;
  cod_enabled: boolean;
  gateways_enabled: string[];
  stripe: {
    enabled: boolean;
    publishable_key: string;
    mode: "test" | "live";
    business_name: string;
    bank_name: string;
    bank_account_holder: string;
    bank_account_number: string;
    bank_routing_number: string;
    bank_swift_code: string;
    bank_country: string;
    card_holder: string;
    card_last4: string;
    card_brand: string;
    payout_notes: string;
  };
  sslcommerz: { enabled: boolean; store_id: string; sandbox: boolean };
  bkash_merchant: { enabled: boolean };
  nagad_merchant: { enabled: boolean };
  personal_bkash: PersonalAccount;
  personal_nagad: PersonalAccount;
  personal_upay: PersonalAccount;
  personal_rocket: PersonalAccount;
}

const DEFAULT: PaymentConfig = {
  mfs_system_enabled: true,
  cod_enabled: true,
  gateways_enabled: ["cod"],
  stripe: {
    enabled: false,
    publishable_key: "",
    mode: "test",
    business_name: "",
    bank_name: "",
    bank_account_holder: "",
    bank_account_number: "",
    bank_routing_number: "",
    bank_swift_code: "",
    bank_country: "",
    card_holder: "",
    card_last4: "",
    card_brand: "",
    payout_notes: "",
  },
  sslcommerz: { enabled: false, store_id: "", sandbox: true },
  bkash_merchant: { enabled: false },
  nagad_merchant: { enabled: false },
  personal_bkash: { enabled: false, account_number: "", account_holder: "", qr_code_url: "", instructions: "Send money to the number below. After sending, enter your Transaction ID." },
  personal_nagad: { enabled: false, account_number: "", account_holder: "", qr_code_url: "", instructions: "Send money to the number below. After sending, enter your Transaction ID." },
  personal_upay: { enabled: false, account_number: "", account_holder: "", qr_code_url: "", instructions: "Send money to the number below. After sending, enter your Transaction ID." },
  personal_rocket: { enabled: false, account_number: "", account_holder: "", qr_code_url: "", instructions: "Send money to the number below. After sending, enter your Transaction ID." },
};

const methodThemes: Record<string, { bg: string; fg: string; accent: string }> = {
  bKash: { bg: "#E2136E", fg: "#FFFFFF", accent: "#D1145B" },
  Nagad: { bg: "#F26522", fg: "#FFFFFF", accent: "#E85A1D" },
  Upay: { bg: "#0066CC", fg: "#FFFFFF", accent: "#0055AA" },
  Rocket: { bg: "#8E24AA", fg: "#FFFFFF", accent: "#7B1FA2" },
};

const generateQRCodeUrl = (accountNumber: string, label: string): string => {
  const data = encodeURIComponent(accountNumber);
  const bgColor = methodThemes[label]?.bg?.replace("#", "") || "E2136E";
  const fgColor = methodThemes[label]?.fg?.replace("#", "") || "FFFFFF";
  // Use a QR code API with branding colors
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${data}&bgcolor=${bgColor}&color=${fgColor}&margin=20`;
};

const PersonalAccountForm: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: PersonalAccount;
  onChange: (v: PersonalAccount) => void;
}> = ({ label, icon, value, onChange }) => {
  const [generatingQR, setGeneratingQR] = useState(false);

  const handleGenerateQR = async () => {
    if (!value.account_number) {
      toast.error("Enter an account number first");
      return;
    }
    setGeneratingQR(true);

    try {
      const qrUrl = generateQRCodeUrl(value.account_number, label);

      // Fetch the QR code image and upload to Supabase storage
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const fileName = `qr-${label.toLowerCase()}-${Date.now()}.png`;
      const path = `payment-qr/${fileName}`;

      const { data, error } = await supabase.storage.from("banners").upload(path, blob, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });

      if (error) throw error;
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(data.path);
      onChange({ ...value, qr_code_url: urlData.publicUrl });
      toast.success(`${label} QR code generated!`);
    } catch (err: any) {
      toast.error("Failed to generate QR: " + err.message);
    } finally {
      setGeneratingQR(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{label} Personal Account</CardTitle>
          </div>
          <Switch checked={value.enabled} onCheckedChange={(v) => onChange({ ...value, enabled: v })} />
        </div>
      </CardHeader>
      {value.enabled && (
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={value.account_number} onChange={(e) => onChange({ ...value, account_number: e.target.value })} placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input value={value.account_holder} onChange={(e) => onChange({ ...value, account_holder: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>QR Code Image</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleGenerateQR}
                disabled={generatingQR || !value.account_number} className="rounded-xl text-xs">
                {generatingQR ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <QrCode className="w-3 h-3 mr-1" />}
                Auto-Generate QR
              </Button>
            </div>
            <ImageUpload bucket="banners" folder="payment-qr" value={value.qr_code_url} onUploaded={(url) => onChange({ ...value, qr_code_url: url })} />
          </div>
          <div className="space-y-2">
            <Label>Payment Instructions</Label>
            <Textarea value={value.instructions} onChange={(e) => onChange({ ...value, instructions: e.target.value })} rows={3} />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const AdminPaymentGateways = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<PaymentConfig>(DEFAULT);

  const { data: config } = useQuery({
    queryKey: ["admin-payment-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "payment_gateways_config").maybeSingle();
      return (data?.value as any) || {};
    },
  });

  useEffect(() => {
    if (config && typeof config === "object") setForm({ ...DEFAULT, ...config });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "payment_gateways_config",
        value: form as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
      qc.invalidateQueries({ queryKey: ["payment-gateways-config"] });
      toast.success("Payment settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Payment Gateways</h1>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* System Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Power className="w-5 h-5" /> System Controls</CardTitle>
          <CardDescription>Global payment system settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">MFS Payment System</p>
              <p className="text-xs text-muted-foreground">Enable/disable the entire MFS screenshot-based payment verification system</p>
            </div>
            <Switch checked={form.mfs_system_enabled} onCheckedChange={(v) => setForm({ ...form, mfs_system_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">Allow customers to pay on delivery</p>
            </div>
            <Switch checked={form.cod_enabled} onCheckedChange={(v) => setForm({ ...form, cod_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      <TabsWithParam defaultTab="personal" basePath="/sales/payment-gateways" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personal"><Smartphone className="w-4 h-4 mr-1" /> Personal Accounts</TabsTrigger>
          <TabsTrigger value="stripe"><CreditCard className="w-4 h-4 mr-1" /> Stripe</TabsTrigger>
          <TabsTrigger value="merchant"><Building2 className="w-4 h-4 mr-1" /> Merchant APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Payment Accounts</CardTitle>
              <CardDescription>Accept payments to your personal mobile banking accounts. Users will send money, upload a screenshot, and your team verifies the payment before confirming the order.</CardDescription>
            </CardHeader>
          </Card>
          <PersonalAccountForm label="bKash" icon={<Smartphone className="w-5 h-5 text-pink-500" />}
            value={form.personal_bkash} onChange={(v) => setForm({ ...form, personal_bkash: v })} />
          <PersonalAccountForm label="Nagad" icon={<Smartphone className="w-5 h-5 text-orange-500" />}
            value={form.personal_nagad} onChange={(v) => setForm({ ...form, personal_nagad: v })} />
          <PersonalAccountForm label="Upay" icon={<Smartphone className="w-5 h-5 text-blue-500" />}
            value={form.personal_upay} onChange={(v) => setForm({ ...form, personal_upay: v })} />
          <PersonalAccountForm label="Rocket" icon={<Smartphone className="w-5 h-5 text-purple-500" />}
            value={form.personal_rocket} onChange={(v) => setForm({ ...form, personal_rocket: v })} />
        </TabsContent>

        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Stripe — International Payments</CardTitle>
                  <CardDescription>
                    Accept card payments from global customers (USD, EUR, GBP, etc.). Settlements are deposited by Stripe into your linked bank account on your Stripe payout schedule.
                  </CardDescription>
                </div>
                <Switch checked={form.stripe.enabled} onCheckedChange={(v) => setForm({ ...form, stripe: { ...form.stripe, enabled: v } })} />
              </div>
            </CardHeader>
            {form.stripe.enabled && (
              <CardContent className="space-y-6">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Stripe is for <strong>collecting</strong> payments from international customers — not for affiliate payouts. Your primary BD operations should use bKash / Nagad / SSLCommerz.
                </div>

                <StripeConnectionPanel />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="flex items-center gap-2 rounded-xl border p-2">
                      <Switch checked={form.stripe.mode === "live"} onCheckedChange={(v) => setForm({ ...form, stripe: { ...form.stripe, mode: v ? "live" : "test" } })} />
                      <span className="text-sm">{form.stripe.mode === "live" ? "Live" : "Test"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business / Statement Name</Label>
                    <Input value={form.stripe.business_name} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, business_name: e.target.value } })} placeholder="As shown on customer statements" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input value={form.stripe.publishable_key} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, publishable_key: e.target.value } })} placeholder={form.stripe.mode === "live" ? "pk_live_..." : "pk_test_..."} />
                  <p className="text-xs text-muted-foreground">Secret key (STRIPE_SECRET_KEY) must be added as a server-side secret via the API Keys page.</p>
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Settlement Bank Account (where Stripe deposits your earnings)</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stripe payouts go directly to the bank account linked in your Stripe Dashboard. Stripe does not currently support Bangladesh-based bank accounts directly — most BD operators use a Payoneer / Wise account, or a US/UK/SG entity. Record the receiving account here for your team's reference.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={form.stripe.bank_name} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_name: e.target.value } })} placeholder="e.g. Payoneer / Wise / Chase" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input value={form.stripe.bank_account_holder} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_account_holder: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number / IBAN</Label>
                      <Input value={form.stripe.bank_account_number} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_account_number: e.target.value } })} placeholder="•••• •••• •••• 0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Routing / Sort Code</Label>
                      <Input value={form.stripe.bank_routing_number} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_routing_number: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>SWIFT / BIC</Label>
                      <Input value={form.stripe.bank_swift_code} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_swift_code: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Country</Label>
                      <Input value={form.stripe.bank_country} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, bank_country: e.target.value } })} placeholder="e.g. United States" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Debit Card (Stripe Instant Payouts)</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Optional — for Stripe Instant Payouts to a debit card. Only the last 4 digits are stored for reference; full card numbers must never be stored.</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cardholder Name</Label>
                      <Input value={form.stripe.card_holder} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, card_holder: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Card Brand</Label>
                      <Input value={form.stripe.card_brand} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, card_brand: e.target.value } })} placeholder="Visa / Mastercard" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last 4 Digits</Label>
                      <Input value={form.stripe.card_last4} maxLength={4} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) } })} placeholder="0000" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea rows={3} value={form.stripe.payout_notes} onChange={(e) => setForm({ ...form, stripe: { ...form.stripe, payout_notes: e.target.value } })} placeholder="Settlement schedule, accountant access, FX provider, etc." />
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>



        <TabsContent value="merchant" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SSLCommerz</CardTitle>
                  <CardDescription>Accept Bangladeshi card/mobile payments via SSLCommerz</CardDescription>
                </div>
                <Switch checked={form.sslcommerz.enabled} onCheckedChange={(v) => setForm({ ...form, sslcommerz: { ...form.sslcommerz, enabled: v } })} />
              </div>
            </CardHeader>
            {form.sslcommerz.enabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Store ID</Label>
                  <Input value={form.sslcommerz.store_id} onChange={(e) => setForm({ ...form, sslcommerz: { ...form.sslcommerz, store_id: e.target.value } })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.sslcommerz.sandbox} onCheckedChange={(v) => setForm({ ...form, sslcommerz: { ...form.sslcommerz, sandbox: v } })} />
                  <Label>Sandbox Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground">Store password must be added as a server-side secret.</p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>bKash Merchant API</CardTitle>
                  <CardDescription>Accept bKash payments via merchant API (requires bKash merchant approval)</CardDescription>
                </div>
                <Switch checked={form.bkash_merchant.enabled} onCheckedChange={(v) => setForm({ ...form, bkash_merchant: { ...form.bkash_merchant, enabled: v } })} />
              </div>
            </CardHeader>
            {form.bkash_merchant.enabled && (
              <CardContent>
                <p className="text-sm text-muted-foreground">API credentials must be added as server-side secrets (BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD) via the API Keys page.</p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Nagad Merchant API</CardTitle>
                  <CardDescription>Accept Nagad payments via merchant API</CardDescription>
                </div>
                <Switch checked={form.nagad_merchant.enabled} onCheckedChange={(v) => setForm({ ...form, nagad_merchant: { ...form.nagad_merchant, enabled: v } })} />
              </div>
            </CardHeader>
            {form.nagad_merchant.enabled && (
              <CardContent>
                <p className="text-sm text-muted-foreground">API credentials must be added as server-side secrets (NAGAD_MERCHANT_ID, NAGAD_PUBLIC_KEY, NAGAD_PRIVATE_KEY) via the API Keys page.</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </TabsWithParam>
    </div>
  );
};

export default AdminPaymentGateways;

type StripeTestResult = {
  ok: boolean;
  configured: boolean;
  mode?: string;
  message?: string;
  account_id?: string;
  business_name?: string | null;
  country?: string;
  email?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  default_currency?: string;
};

const StripeConnectionPanel: React.FC = () => {
  const testFn = useServerFn(testStripeConnection);
  const [result, setResult] = useState<StripeTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const r = (await testFn()) as StripeTestResult;
      setResult(r);
      if (r.ok) toast.success(`Connected to Stripe (${r.mode} mode)`);
      else toast.error(r.message || "Stripe test failed");
    } catch (e: any) {
      toast.error(e?.message || "Stripe test failed");
      setResult({ ok: false, configured: false, message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Secret Key & Connection Test</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Your <code>STRIPE_SECRET_KEY</code> is stored server-side. You can rotate it any time —
        the new key takes effect immediately for all checkout sessions. Get keys from{" "}
        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
          dashboard.stripe.com/apikeys <ExternalLink className="w-3 h-3" />
        </a>.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={runTest} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
          Test Connection
        </Button>
        <Button type="button" variant="outline" size="sm" asChild className="rounded-xl">
          <a href="/system/debug?tab=keys" >
            <KeyRound className="w-4 h-4 mr-1" /> Add / Update Secret Key
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild className="rounded-xl">
          <a href="/system/debug?tab=keys" >
            <KeyRound className="w-4 h-4 mr-1" /> Webhook Secret
          </a>
        </Button>
      </div>

      {result && (
        <div className={`rounded-lg border p-3 text-xs space-y-1 ${result.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="flex items-center gap-2 font-semibold">
            {result.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            {result.ok ? "Connection healthy" : "Connection failed"}
            {result.mode && <Badge variant="outline" className="ml-1">{result.mode}</Badge>}
          </div>
          {result.ok ? (
            <div className="grid sm:grid-cols-2 gap-1 pt-1 text-muted-foreground">
              <div><strong className="text-foreground">Account:</strong> {result.business_name || result.account_id}</div>
              <div><strong className="text-foreground">ID:</strong> <code>{result.account_id}</code></div>
              <div><strong className="text-foreground">Country:</strong> {result.country?.toUpperCase()}</div>
              <div><strong className="text-foreground">Currency:</strong> {result.default_currency?.toUpperCase()}</div>
              <div><strong className="text-foreground">Charges:</strong> {result.charges_enabled ? "enabled" : "disabled"}</div>
              <div><strong className="text-foreground">Payouts:</strong> {result.payouts_enabled ? "enabled" : "disabled"}</div>
            </div>
          ) : (
            <p className="text-muted-foreground">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

// code:4ce0
