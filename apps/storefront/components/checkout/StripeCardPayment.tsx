"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useServerFn } from "@/lib/server-fn-compat";
import { Loader2, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStripePaymentIntent } from "@/lib/stripe.functions";
import { toast } from "@/lib/app-toast";

interface StripeCardPaymentProps {
  /** Display-only amount (server recomputes the authoritative total from the cart). */
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  /** Optional applied coupon — validated server-side. */
  couponCode?: string;
  /** Optional selected shipping method — validated server-side. */
  shippingMethodId?: string;
  /** Called after Stripe successfully confirms the PaymentIntent. */
  onSuccess: (paymentIntentId: string) => void;
  /** Optional pre-confirm callback (e.g. validate address) — return false to abort. */
  beforeConfirm?: () => boolean | Promise<boolean>;
  submitLabel?: string;
  disabled?: boolean;
}

// Cache loadStripe per publishable key (Stripe recommends single instance per key).
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(pk: string) {
  if (!stripeCache.has(pk)) stripeCache.set(pk, loadStripe(pk));
  return stripeCache.get(pk)!;
}

/** Resolve CSS variable to a usable color string for Stripe Elements appearance. */
function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  // Stripe Elements accepts oklch/hsl/rgb/hex — values from styles.css come as raw oklch().
  return v.startsWith("oklch") || v.startsWith("hsl") || v.startsWith("rgb") || v.startsWith("#") ? v : v;
}

const StripeCardPayment: React.FC<StripeCardPaymentProps> = (props) => {
  const createPI = useServerFn(createStripePaymentIntent);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const piIdRef = useRef<string | null>(null);
  const lastAmountRef = useRef<number | null>(null);

  // Create / refresh the PaymentIntent when amount changes.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        setError(null);
        if (lastAmountRef.current === props.amount && clientSecret) return;
        setInitializing(true);
        const res = await createPI({
          data: {
            currency: (props.currency || "USD").toLowerCase(),
            description: props.description,
            metadata: props.metadata,
            couponCode: props.couponCode,
            shippingMethodId: props.shippingMethodId,
            paymentIntentId: piIdRef.current || undefined,
          },
        });
        if (cancelled) return;
        piIdRef.current = res.paymentIntentId;
        lastAmountRef.current = props.amount;
        setClientSecret(res.clientSecret);
        setPublishableKey(res.publishableKey);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to initialize Stripe");
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    if (props.amount > 0) init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.amount, props.currency]);

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: readVar("--primary", "#6366f1"),
          colorBackground: readVar("--background", "#ffffff"),
          colorText: readVar("--foreground", "#0a0a0a"),
          colorDanger: readVar("--destructive", "#ef4444"),
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: "12px",
          spacingUnit: "4px",
        },
        rules: {
          ".Input": {
            border: "1px solid hsl(var(--border, 0 0% 90%) / 0.5)",
            boxShadow: "none",
            padding: "12px",
          },
          ".Input:focus": {
            border: "1px solid var(--colorPrimary)",
            boxShadow: "0 0 0 2px color-mix(in oklab, var(--colorPrimary) 20%, transparent)",
          },
          ".Label": { fontWeight: "500", marginBottom: "6px" },
          ".Tab": { borderRadius: "12px" },
        },
      },
      loader: "auto" as const,
    };
  }, [clientSecret]);

  if (error) {
    return (
      <div className="glass-strong rounded-2xl p-4 border border-destructive/40 bg-destructive/5">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Card payment unavailable</p>
            <p className="text-xs mt-1 text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (initializing || !options || !publishableKey) {
    return (
      <div className="glass-strong rounded-2xl p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Preparing secure card form…
      </div>
    );
  }

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <CardForm
        onSuccess={props.onSuccess}
        beforeConfirm={props.beforeConfirm}
        submitLabel={props.submitLabel || "Pay now"}
        disabled={props.disabled}
      />
    </Elements>
  );
};

const CardForm: React.FC<{
  onSuccess: (id: string) => void;
  beforeConfirm?: () => boolean | Promise<boolean>;
  submitLabel: string;
  disabled?: boolean;
}> = ({ onSuccess, beforeConfirm, submitLabel, disabled }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (beforeConfirm) {
      const ok = await beforeConfirm();
      if (!ok) return;
    }
    setSubmitting(true);
    setMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message || "Please check your card details.");
      setSubmitting(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.origin + "/orders" },
    });

    if (error) {
      setMessage(error.message || "Payment failed");
      toast.error(error.message || "Payment failed");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture")) {
      onSuccess(paymentIntent.id);
    } else if (paymentIntent) {
      setMessage(`Payment status: ${paymentIntent.status}`);
      setSubmitting(false);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="glass-strong rounded-2xl p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {message && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="w-3 h-3 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || submitting || disabled}
        className="w-full rounded-xl h-12"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Lock className="w-4 h-4 mr-2" />
        )}
        {submitting ? "Processing…" : submitLabel}
      </Button>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Secured by Stripe — your card never touches our servers
      </p>
    </form>
  );
};

export default StripeCardPayment;
// code:4ce0
