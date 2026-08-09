"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Hash,
  ShoppingBag,
  Receipt,
  Truck,
  FileText,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { useSiteSettings } from "./useSiteSettings";
import GoogleDocsSettingsPanel from "./GoogleDocsSettingsPanel";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";

const defaults = {
  // Order numbering
  order_prefix: "ORD",
  order_number_padding: "5",
  invoice_prefix: "INV",
  // Checkout
  allow_guest_checkout: true,
  min_order_amount: "",
  enable_cod: true,
  enable_partial_payment: false,
  partial_payment_percent: "30",
  // Tax & shipping (shared with Shipping admin)
  tax_rate: "0",
  tax_inclusive: false,
  free_shipping_threshold: "",
  // Invoice settings (consumed by generate-invoice)
  invoice_settings: {
    auto_email_on_paid: false,
    auto_email_on_placed: false,
    show_tax_line: true,
    show_paid_stamp: true,
    footer_note: "Thank you for your business.",
    terms: "All sales final after 14 days unless otherwise stated.",
    accent_color: "#3730a3",
  } as Record<string, any>,
};

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
        ok
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
          : "bg-amber-500/10 text-amber-500 border-amber-500/30"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function CommerceSettingsPanel() {
  const { form, setForm, save } = useSiteSettings<typeof defaults>(defaults);
  const { currency, formatPrice, config: currencyConfig } = useCurrency();
  const [sendingTest, setSendingTest] = useState(false);

  // Connection / configuration health
  const { data: gateways } = useQuery({
    queryKey: ["commerce-gateways"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "payment_gateways_config")
        .maybeSingle();
      return (data?.value as any)?.value ?? data?.value ?? {};
    },
  });

  const { data: brand } = useQuery({
    queryKey: ["commerce-brand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "brand_settings")
        .maybeSingle();
      return (data?.value as any)?.value ?? data?.value ?? {};
    },
  });

  const { data: latestOrder } = useQuery({
    queryKey: ["commerce-latest-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const stripeOn = !!(gateways as any)?.stripe?.enabled;
  const codOn = !!form.enable_cod;
  const brandReady = !!(brand as any)?.brand_name || !!(brand as any)?.site_name;
  const taxConfigured = Number(form.tax_rate) > 0;
  const freeShipConfigured = !!String(form.free_shipping_threshold || "").trim();

  // Live previews
  const orderNumberPreview = useMemo(() => {
    const pad = Math.max(1, Math.min(10, Number(form.order_number_padding) || 5));
    return `${form.order_prefix || "ORD"}-${"1".padStart(pad, "0")}`;
  }, [form.order_prefix, form.order_number_padding]);

  const invoicePreview = useMemo(() => {
    const pad = Math.max(1, Math.min(10, Number(form.order_number_padding) || 5));
    return `${form.invoice_prefix || "INV"}-${"1".padStart(pad, "0")}`;
  }, [form.invoice_prefix, form.order_number_padding]);

  const updateInvoice = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, invoice_settings: { ...prev.invoice_settings, [key]: value } }));

  async function sendTestInvoice() {
    if (!latestOrder?.id) {
      toast.error("No orders yet to test with");
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { order_id: latestOrder.id },
      });
      if (error || !data?.invoice_html) {
        toast.error("Failed to generate test invoice");
      } else {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.invoice_html);
          win.document.close();
        }
        toast.success(`Preview generated for #${latestOrder.order_number}`);
      }
    } catch {
      toast.error("Test invoice failed");
    }
    setSendingTest(false);
  }

  return (
    <div className="space-y-6 max-w-5xl pb-24">
      {/* Status strip */}
      <Card className="glass">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Connections:</span>
            <StatusChip ok={!!currency} label={`Currency: ${currency || "—"}`} />
            <StatusChip ok={stripeOn} label={stripeOn ? "Stripe live" : "Stripe off"} />
            <StatusChip ok={codOn} label={codOn ? "COD enabled" : "COD off"} />
            <StatusChip ok={brandReady} label={brandReady ? "Invoice brand set" : "Brand missing"} />
            <StatusChip ok={taxConfigured} label={taxConfigured ? `Tax ${form.tax_rate}%` : "No tax"} />
            <StatusChip
              ok={freeShipConfigured}
              label={
                freeShipConfigured
                  ? `Free ship ≥ ${formatPrice(Number(form.free_shipping_threshold) || 0)}`
                  : "No free shipping"
              }
            />
            <StatusChip
              ok={currencyConfig.enabled_currencies.length > 1}
              label={`${currencyConfig.enabled_currencies.length} currencies`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order numbering */}
        <SectionCard
          icon={Hash}
          title="Order & Invoice Numbering"
          description="Prefixes and padding applied to every new order and invoice."
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Order Prefix</Label>
              <Input
                value={form.order_prefix}
                onChange={(e) => setForm({ ...form, order_prefix: e.target.value.toUpperCase().slice(0, 6) })}
              />
            </div>
            <div>
              <Label>Invoice Prefix</Label>
              <Input
                value={form.invoice_prefix}
                onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase().slice(0, 6) })}
              />
            </div>
            <div className="col-span-2">
              <Label>Number Padding (digits)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.order_number_padding}
                onChange={(e) => setForm({ ...form, order_number_padding: e.target.value })}
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Preview</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{orderNumberPreview}</Badge>
              <Badge variant="outline" className="font-mono">{invoicePreview}</Badge>
            </div>
          </div>
        </SectionCard>

        {/* Checkout rules */}
        <SectionCard
          icon={ShoppingBag}
          title="Checkout Rules"
          description="Who can buy, payment options and minimum amounts."
        >
          <div>
            <Label>Minimum Order Amount ({currency})</Label>
            <Input
              type="number"
              value={form.min_order_amount}
              onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Allow Guest Checkout</Label>
              <p className="text-xs text-muted-foreground">Customers can check out without an account.</p>
            </div>
            <Switch
              checked={!!form.allow_guest_checkout}
              onCheckedChange={(v) => setForm({ ...form, allow_guest_checkout: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Cash on Delivery</Label>
              <p className="text-xs text-muted-foreground">Pay when the order is delivered.</p>
            </div>
            <Switch
              checked={!!form.enable_cod}
              onCheckedChange={(v) => setForm({ ...form, enable_cod: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Partial Payment</Label>
              <p className="text-xs text-muted-foreground">Allow advance % for COD orders.</p>
            </div>
            <Switch
              checked={!!form.enable_partial_payment}
              onCheckedChange={(v) => setForm({ ...form, enable_partial_payment: v })}
            />
          </div>
          {form.enable_partial_payment && (
            <div>
              <Label>Advance Percentage (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.partial_payment_percent}
                onChange={(e) => setForm({ ...form, partial_payment_percent: e.target.value })}
              />
            </div>
          )}
        </SectionCard>

        {/* Tax & shipping */}
        <SectionCard
          icon={Truck}
          title="Tax & Shipping"
          description="Tax rate and free-shipping threshold used at checkout & on invoices."
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              />
            </div>
            <div>
              <Label>Free Shipping Threshold ({currency})</Label>
              <Input
                type="number"
                value={form.free_shipping_threshold}
                onChange={(e) => setForm({ ...form, free_shipping_threshold: e.target.value })}
                placeholder="50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
            <div>
              <Label>Tax Inclusive Pricing</Label>
              <p className="text-xs text-muted-foreground">Prices already include tax — invoice shows breakdown.</p>
            </div>
            <Switch
              checked={!!form.tax_inclusive}
              onCheckedChange={(v) => setForm({ ...form, tax_inclusive: v })}
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Shared with the Shipping admin — changes here update both.
          </div>
        </SectionCard>

        {/* Invoice settings */}
        <SectionCard
          icon={FileText}
          title="Invoice Generation"
          description="Branding, footer notes and automatic delivery for invoices."
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 col-span-2">
              <div>
                <Label>Auto-email on Order Placed</Label>
                <p className="text-xs text-muted-foreground">Send an invoice to the customer when an order is created.</p>
              </div>
              <Switch
                checked={!!form.invoice_settings?.auto_email_on_placed}
                onCheckedChange={(v) => updateInvoice("auto_email_on_placed", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 col-span-2">
              <div>
                <Label>Auto-email on Payment Received</Label>
                <p className="text-xs text-muted-foreground">Send a paid invoice once payment status flips to paid.</p>
              </div>
              <Switch
                checked={!!form.invoice_settings?.auto_email_on_paid}
                onCheckedChange={(v) => updateInvoice("auto_email_on_paid", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
              <div>
                <Label>Show Tax Line</Label>
              </div>
              <Switch
                checked={!!form.invoice_settings?.show_tax_line}
                onCheckedChange={(v) => updateInvoice("show_tax_line", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/30">
              <div>
                <Label>Show PAID Stamp</Label>
              </div>
              <Switch
                checked={!!form.invoice_settings?.show_paid_stamp}
                onCheckedChange={(v) => updateInvoice("show_paid_stamp", v)}
              />
            </div>
          </div>

          <div>
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                className="w-16 h-10 p-1"
                value={form.invoice_settings?.accent_color || "#3730a3"}
                onChange={(e) => updateInvoice("accent_color", e.target.value)}
              />
              <Input
                value={form.invoice_settings?.accent_color || ""}
                onChange={(e) => updateInvoice("accent_color", e.target.value)}
                placeholder="#3730a3"
              />
            </div>
          </div>

          <div>
            <Label>Footer Note</Label>
            <Textarea
              rows={2}
              value={form.invoice_settings?.footer_note || ""}
              onChange={(e) => updateInvoice("footer_note", e.target.value)}
            />
          </div>
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea
              rows={3}
              value={form.invoice_settings?.terms || ""}
              onChange={(e) => updateInvoice("terms", e.target.value)}
            />
          </div>

          <Separator />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {latestOrder
                ? <>Latest order: <span className="font-mono">#{latestOrder.order_number}</span></>
                : "No orders yet to preview against."}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!latestOrder || sendingTest}
              onClick={sendTestInvoice}
              className="gap-1.5"
            >
              {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Preview Invoice
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Quick links to related settings */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Related Settings
          </CardTitle>
          <CardDescription>Jump to other panels this section depends on.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <a href="/sales/payment-gateways" className="p-3 rounded-xl border border-border/30 hover:bg-secondary/40 transition">
              <CreditCard className="w-4 h-4 mb-1.5 text-primary" />
              <div className="font-medium">Payment Gateways</div>
              <div className="text-xs text-muted-foreground">Stripe / SSLCommerz</div>
            </a>
            <a href="/sales/shipping" className="p-3 rounded-xl border border-border/30 hover:bg-secondary/40 transition">
              <Truck className="w-4 h-4 mb-1.5 text-primary" />
              <div className="font-medium">Shipping</div>
              <div className="text-xs text-muted-foreground">Couriers & fees</div>
            </a>
            <a href="/brand" className="p-3 rounded-xl border border-border/30 hover:bg-secondary/40 transition">
              <FileText className="w-4 h-4 mb-1.5 text-primary" />
              <div className="font-medium">Brand Identity</div>
              <div className="text-xs text-muted-foreground">Used on invoices</div>
            </a>
            <a href="/email/provider" className="p-3 rounded-xl border border-border/30 hover:bg-secondary/40 transition">
              <Mail className="w-4 h-4 mb-1.5 text-primary" />
              <div className="font-medium">Email Provider</div>
              <div className="text-xs text-muted-foreground">Sends invoices</div>
            </a>
          </div>
        </CardContent>
      </Card>

      <GoogleDocsSettingsPanel />



      <div className="sticky bottom-4 z-10">
        <div className="rounded-2xl border border-border/40 bg-background/80 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Changes apply across checkout, orders, and the invoice generator.
          </div>
          <Button onClick={() => save.mutate(undefined)} disabled={save.isPending} className="ml-auto">
            {save.isPending ? "Saving..." : "Save Commerce Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
// code:4ce0
