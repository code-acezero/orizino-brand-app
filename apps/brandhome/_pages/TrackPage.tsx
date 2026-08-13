"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { CompanyNav } from "@/components/nav/CompanyNav";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <CompanyNav />

      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto pt-40 pb-24 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-sans-brand text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Status</p>
          <h1 className="text-5xl md:text-6xl font-editorial font-black leading-none tracking-tight mb-4">
            TRACK ORDER
          </h1>
          <p className="text-muted-foreground font-sans-brand text-lg max-w-md mx-auto">
            Enter your order number and the email or phone you used at checkout.
          </p>
        </motion.div>

        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={onSubmit} 
          className="space-y-6 mb-12 bg-card/40 backdrop-blur-md border border-border/40 p-6 md:p-8 rounded-3xl shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans-brand ml-4">Order Number</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                placeholder="ORZ-XXXXXXXX"
                className="w-full px-5 py-4 rounded-full text-sm font-sans-brand outline-none border border-border/40 bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-300 focus:border-primary/50 focus:bg-background/80 uppercase font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans-brand ml-4">Contact Info</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                placeholder="Email or phone number"
                className="w-full px-5 py-4 rounded-full text-sm font-sans-brand outline-none border border-border/40 bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-300 focus:border-primary/50 focus:bg-background/80"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-foreground text-background font-sans-brand font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                Track Order
              </>
            )}
          </button>
        </motion.form>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 space-y-6"
          >
            <div className="flex items-center justify-between pb-6 border-b border-border/40">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans-brand mb-1">Order</div>
                <div className="font-mono font-medium text-lg">{result.order_number}</div>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-sans-brand">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Placed</div>
                <div className="font-medium">{new Date(result.created_at).toLocaleDateString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Payment</div>
                <div className="capitalize font-medium">{result.payment_status}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                <div className="font-medium">৳{Number(result.total).toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ship to</div>
                <div className="font-medium">{result.full_name} · {result.city}</div>
              </div>
              {result.tracking_number && (
                <div className="col-span-1 sm:col-span-2 pt-4 border-t border-border/40 space-y-2 mt-2">
                  <div className="text-[10px] uppercase tracking-widest text-primary">Courier tracking</div>
                  <div className="font-mono bg-background/50 inline-block px-4 py-2 rounded-full border border-border/40">{result.tracking_number}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = ({
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    shipped: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    out_for_delivery: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    awaiting_payment: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  } as Record<string, string>)[status] ?? "bg-muted/50 text-muted-foreground border-border/40";
  return (
    <span className={`text-[10px] font-sans-brand tracking-wider px-3 py-1.5 rounded-full border backdrop-blur-sm uppercase ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
