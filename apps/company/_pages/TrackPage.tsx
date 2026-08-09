"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

type OrderInfo = {
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  tracking_number?: string;
  tracking_token?: string;
  created_at: string;
  city: string;
  full_name: string;
};

export default function TrackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");

  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      // Fetch status by token
      setLoading(false);
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-semibold mb-2">Track your order</h1>
        <p className="text-muted-foreground mb-8">
          Enter your order number and the email or phone you used at checkout — no account needed.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mb-8">
          <div>
            <label className="text-sm block mb-1">Order number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              placeholder="ORZ-XXXXXXXX"
              className="w-full h-11 rounded-md border bg-background px-3 font-mono uppercase"
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Email or phone</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder="you@example.com or 01700000000"
              className="w-full h-11 rounded-md border bg-background px-3"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {loading ? "Looking up…" : "Track order"}
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Order</div>
                <div className="font-mono font-medium">{result.order_number}</div>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Placed</div>
                <div>{new Date(result.created_at).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Payment</div>
                <div className="capitalize">{result.payment_status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div>৳{Number(result.total).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Ship to</div>
                <div>{result.full_name} · {result.city}</div>
              </div>
              {result.tracking_number && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Courier tracking</div>
                  <div className="font-mono">{result.tracking_number}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = ({
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    shipped: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
    out_for_delivery: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
    delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    cancelled: "bg-red-500/10 text-red-700 border-red-500/30",
    awaiting_payment: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  } as Record<string, string>)[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`text-xs px-2 py-1 rounded border capitalize ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
