"use client";
import React, { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useServerFn } from "@/lib/server-fn-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { placeGuestOrder, createGuestStripePaymentIntent } from "@/lib/guest-checkout.functions";
import { useGuestCheckoutAllowed } from "@/lib/use-guest-checkout-allowed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/app-toast";
import { Loader2, Truck, CreditCard, Building2, Check, ShieldCheck, Upload, Lock, ArrowRight } from "lucide-react";
import { getGuestCart, clearGuestCart } from "@/lib/guest-cart";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import Breadcrumbs from "@/components/Breadcrumbs";

type CartItem = { product_id: string; variant_id?: string | null; name: string; price: number; qty: number };

export default function GuestCheckoutPage() {
  const navigate = useNavigate();
  const place = useServerFn(placeGuestOrder);
  const createPI = useServerFn(createGuestStripePaymentIntent);

  const [cart] = useState<CartItem[]>(() => getGuestCart() as unknown as CartItem[]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    address_line: "",
    notes: "",
  });
  const [method, setMethod] = useState<"cod" | "stripe" | "bank_transfer">("cod");
  const [proof, setProof] = useState<{ screenshotUrl: string; transactionId: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ order_number: string; tracking_token: string | null; order_id: string } | null>(null);
  const [stripeAmount, setStripeAmount] = useState<number | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePK, setStripePK] = useState<string | null>(null);

  const { data: gateways } = useQuery({
    queryKey: ["payment-gateways-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "payment_gateways_config").maybeSingle();
      return (data?.value as any) || {};
    },
    staleTime: 5 * 60_000,
  });

  const { allowed: guestEnabled, loading: guestFlagLoading } = useGuestCheckoutAllowed();

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const stripeEnabled = !!gateways?.stripe?.enabled;
  const bankEnabled = !!(gateways?.bank_transfer?.enabled ?? true);

  const canSubmit =
    cart.length > 0 &&
    form.full_name.length > 0 &&
    /.+@.+\..+/.test(form.email) &&
    form.phone.length >= 6 &&
    form.city.length > 0 &&
    form.address_line.length > 0 &&
    (method !== "bank_transfer" || !!proof);

  const submit = async () => {
    if (!canSubmit || placing) return;
    setPlacing(true);
    try {
      const res = await place({
        data: {
          email: form.email,
          phone: form.phone,
          full_name: form.full_name,
          city: form.city,
          address_line: form.address_line,
          notes: form.notes || undefined,
          payment_method: method,
          items: cart.map((c) => ({ product_id: c.product_id, variant_id: c.variant_id ?? null, quantity: c.qty })),
          currency: "BDT",
          bank_proof: method === "bank_transfer" && proof
            ? { screenshot_url: proof.screenshotUrl, transaction_id: proof.transactionId }
            : undefined,
        },
      });
      setPlaced({ order_number: res.order_number, tracking_token: res.tracking_token, order_id: res.order_id });
      if (method === "stripe") {
        const pi = await createPI({ data: { order_id: res.order_id } });
        setStripeAmount(pi.amount);
        setStripeClientSecret(pi.clientSecret);
        setStripePK(pi.publishableKey);
      } else {
        clearGuestCart();
        toast.success(`Order ${res.order_number} placed`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (placed && method !== "stripe") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full border border-border/60 rounded-xl p-8 bg-card space-y-5 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Order Confirmed</h1>
          <p className="text-sm text-muted-foreground">Order number <span className="font-mono font-semibold text-foreground">{placed.order_number}</span></p>
          {placed.tracking_token && (
            <a
              className="inline-flex items-center justify-center w-full px-4 h-11 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              href={`/orders?t=${encodeURIComponent(placed.tracking_token)}`}
            >
              Track Order <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </a>
          )}
          <p className="text-xs text-muted-foreground/80">Confirmation email and invoice sent to {form.email}.</p>
        </div>
      </div>
    );
  }

  if (!guestFlagLoading && !guestEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full border border-border/60 rounded-xl p-8 bg-card space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Guest Checkout Disabled</h1>
          <p className="text-xs text-muted-foreground">
            Please sign in or create an account to place your order.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <a className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors" href="/auth">Sign In</a>
            <a className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors" href="/cart">Back to Cart</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Guest Checkout" }]} className="hidden md:block" />

        <div className="border-b border-border/40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Guest Checkout</h1>
            <p className="text-xs text-muted-foreground mt-0.5">No account required. Enter details to place order.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Secure 256-bit Checkout</span>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="border border-border/50 rounded-xl p-12 text-center text-sm text-muted-foreground bg-card">
            Your cart is currently empty. <a href="/inventory" className="text-primary underline font-medium">Browse Inventory</a>.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Contact & Shipping Card */}
              <section className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                <h2 className="text-sm font-semibold text-foreground">Contact & Shipping Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Full Name *</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Email Address *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Phone Number *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">City *</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl h-10 text-sm" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Street Address *</Label>
                    <Input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} className="rounded-xl h-10 text-sm" placeholder="House, street, apartment..." />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Order Notes (Optional)</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl h-10 text-sm" placeholder="Special delivery instructions" />
                  </div>
                </div>
              </section>

              {/* Payment Method Card */}
              <section className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMethod("cod")}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      method === "cod" ? "border-primary bg-primary/5 shadow-xs" : "border-border/60 hover:border-foreground/30 bg-background"
                    }`}
                  >
                    <Truck className="w-4 h-4 text-primary mb-1.5" />
                    <div className="text-xs font-semibold text-foreground">Cash on Delivery</div>
                    <div className="text-[11px] text-muted-foreground">Pay upon receipt</div>
                  </button>

                  {stripeEnabled && (
                    <button
                      type="button"
                      onClick={() => setMethod("stripe")}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        method === "stripe" ? "border-primary bg-primary/5 shadow-xs" : "border-border/60 hover:border-foreground/30 bg-background"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-primary mb-1.5" />
                      <div className="text-xs font-semibold text-foreground">Credit / Debit Card</div>
                      <div className="text-[11px] text-muted-foreground">Visa · Mastercard</div>
                    </button>
                  )}

                  {bankEnabled && (
                    <button
                      type="button"
                      onClick={() => setMethod("bank_transfer")}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        method === "bank_transfer" ? "border-primary bg-primary/5 shadow-xs" : "border-border/60 hover:border-foreground/30 bg-background"
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-primary mb-1.5" />
                      <div className="text-xs font-semibold text-foreground">Bank Transfer</div>
                      <div className="text-[11px] text-muted-foreground">Upload proof</div>
                    </button>
                  )}
                </div>

                {method === "bank_transfer" && (
                  <BankProofUploader onProof={(p) => setProof(p)} attached={proof} />
                )}
              </section>

              {method !== "stripe" || !placed ? (
                <Button className="w-full h-12 rounded-xl font-semibold" disabled={!canSubmit || placing} onClick={submit}>
                  {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  {placing ? "Placing Order…" : method === "stripe" ? "Continue to Card Payment" : "Place Order"}
                </Button>
              ) : null}

              {method === "stripe" && placed && stripeClientSecret && stripePK && (
                <section className="border border-border/60 rounded-xl p-5 bg-card space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Card Payment</h2>
                  <GuestStripeForm
                    clientSecret={stripeClientSecret}
                    publishableKey={stripePK}
                    onSuccess={() => {
                      clearGuestCart();
                      toast.success("Payment successful");
                      if (placed.tracking_token) {
                        navigate({ to: `/orders?t=${encodeURIComponent(placed.tracking_token)}` });
                      }
                    }}
                  />
                </section>
              )}

            </div>

            {/* Sidebar Summary Column */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
              <div className="border border-border/60 rounded-xl p-5 sm:p-6 bg-card space-y-4 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground border-b border-border/30 pb-3">
                  Order Summary ({cart.length})
                </h3>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-muted-foreground text-[11px]">Qty: {item.qty}</p>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums">৳{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/30 pt-3 flex justify-between font-bold text-foreground text-sm">
                  <span>Total Amount</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(pk: string) {
  if (!stripeCache.has(pk)) stripeCache.set(pk, loadStripe(pk));
  return stripeCache.get(pk)!;
}

function GuestStripeForm({
  clientSecret,
  publishableKey,
  onSuccess,
}: {
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void;
}) {
  const stripePromise = getStripe(publishableKey);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeInner onSuccess={onSuccess} />
    </Elements>
  );
}

function StripeInner({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      <Button className="w-full h-11 rounded-xl font-semibold" disabled={!stripe || busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Pay Now
      </Button>
    </form>
  );
}

function BankProofUploader({
  onProof,
  attached,
}: {
  onProof: (p: { screenshotUrl: string; transactionId: string }) => void;
  attached: { screenshotUrl: string; transactionId: string } | null;
}) {
  const [txn, setTxn] = useState(attached?.transactionId || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !txn) {
      toast.error("Provide transaction ID and select a proof image");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `guest-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      onProof({ screenshotUrl: data.publicUrl, transactionId: txn });
      toast.success("Payment proof attached");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload proof");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-3 bg-secondary/20">
      <div className="text-xs font-semibold text-foreground">Bank Payment Proof</div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Transaction ID *</Label>
        <Input value={txn} onChange={(e) => setTxn(e.target.value)} className="rounded-xl h-9 text-xs" placeholder="e.g. TRX12345678" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Screenshot / Receipt *</Label>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl h-9 text-xs" />
      </div>
      <Button type="button" variant="outline" size="sm" className="rounded-xl w-full text-xs font-semibold" disabled={uploading || !file || !txn} onClick={handleUpload}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
        {attached ? "Update Attached Proof" : "Attach Payment Proof"}
      </Button>
      {attached && (
        <p className="text-[11px] text-primary flex items-center gap-1">
          <Check className="w-3 h-3" /> Attached (Txn: {attached.transactionId})
        </p>
      )}
    </div>
  );
}
