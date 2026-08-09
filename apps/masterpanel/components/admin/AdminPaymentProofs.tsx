"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { Check, X, Eye, Image as ImageIcon, Phone, Clock, FileText, Smartphone, ExternalLink } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PaymentProof {
  id: string;
  order_id: string;
  user_id: string;
  payment_method: string;
  screenshot_url: string;
  transaction_id: string | null;
  amount: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  admin_notes: string | null;
  sheet_synced: boolean;
  created_at: string;
  orders: {
    order_number: string;
    total: number;
    status: string;
    shipping_address: any;
    created_at: string;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const methodColors: Record<string, string> = {
  bkash: "text-pink-500",
  nagad: "text-orange-500",
  upay: "text-blue-500",
  rocket: "text-purple-500",
};

const AdminPaymentProofs: React.FC = () => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("pending");

  const { data: proofs, isLoading } = useQuery({
    queryKey: ["admin-payment-proofs", filter],
    queryFn: async () => {
      let q = supabase
        .from("payment_proofs")
        .select("*, orders(order_number, total, status, shipping_address, created_at)")
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("status", filter);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PaymentProof[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ proofId, action }: { proofId: string; action: "confirm" | "reject" }) => {
      // Update proof status
      const { error } = await supabase.from("payment_proofs").update({
        status: action === "confirm" ? "confirmed" : "rejected",
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      }).eq("id", proofId);
      if (error) throw error;

      // Update order status
      const proof = proofs?.find(p => p.id === proofId);
      if (proof && action === "confirm") {
        await supabase.from("orders").update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        }).eq("id", proof.order_id);
      }

      // Sync to Google Sheets
      await supabase.functions.invoke("sync-payment-proof", {
        body: { proof_id: proofId, action },
      });
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["admin-payment-proofs"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(action === "confirm" ? "Payment confirmed & order updated" : "Payment rejected");
      setSelectedProof(null);
      setAdminNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pendingCount = proofs?.filter(p => p.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Payment Verifications</h2>
        <p className="text-sm text-muted-foreground">Review MFS payment screenshots and confirm orders</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "all", "confirmed", "rejected"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
            onClick={() => setFilter(f)} className="rounded-xl capitalize">
            {f}
            {f === "pending" && pendingCount > 0 && (
              <Badge className="ml-2 bg-yellow-500/20 text-yellow-500 border-0 text-xs">{pendingCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Proofs Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : proofs?.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No {filter === "all" ? "" : filter} payment proofs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {proofs?.map((proof) => (
            <Card key={proof.id} className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => { setSelectedProof(proof); setAdminNotes(proof.admin_notes || ""); }}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-secondary/50">
                    <img src={proof.screenshot_url} alt="Payment proof" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-foreground">{proof.orders?.order_number}</span>
                      <Badge className={`text-xs border ${statusColors[proof.status]}`}>{proof.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className={`w-3 h-3 ${methodColors[proof.payment_method]}`} />
                      <span className="capitalize">{proof.payment_method}</span>
                      <span>•</span>
                      <span>{formatPrice(proof.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{proof.customer_name} • {proof.customer_phone}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(proof.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proof Detail Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className={`w-5 h-5 ${methodColors[selectedProof?.payment_method || "bkash"]}`} />
              Payment Proof — {selectedProof?.orders?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-4">
              {/* Screenshot */}
              <div className="rounded-xl border border-border overflow-hidden">
                <a href={selectedProof.screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={selectedProof.screenshot_url} alt="Payment screenshot" className="w-full max-h-96 object-contain bg-secondary/50" />
                </a>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="text-foreground font-medium capitalize">{selectedProof.payment_method}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-foreground font-bold">{formatPrice(selectedProof.amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-foreground">{selectedProof.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-foreground font-mono">{selectedProof.customer_phone}</p>
                </div>
                {selectedProof.transaction_id && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Transaction ID</p>
                    <p className="text-foreground font-mono">{selectedProof.transaction_id}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Order Total</p>
                  <p className="text-foreground">{formatPrice(selectedProof.orders?.total || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sheet Synced</p>
                  <p className="text-foreground">{selectedProof.sheet_synced ? "✅ Yes" : "⏳ Pending"}</p>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedProof.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Admin Notes (optional)</p>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this payment..." rows={2} className="rounded-xl" />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => actionMutation.mutate({ proofId: selectedProof.id, action: "confirm" })}
                      disabled={actionMutation.isPending} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4 mr-2" /> Confirm Payment
                    </Button>
                    <Button variant="destructive" onClick={() => actionMutation.mutate({ proofId: selectedProof.id, action: "reject" })}
                      disabled={actionMutation.isPending} className="flex-1 rounded-xl">
                      <X className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </>
              )}

              {selectedProof.status !== "pending" && selectedProof.admin_notes && (
                <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                  <p className="text-foreground">{selectedProof.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentProofs;
// code:4ce0
