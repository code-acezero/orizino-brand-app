import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import { Textarea } from "@ui/components/ui/textarea";
import { Badge } from "@ui/components/ui/badge";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  RotateCcw,
  ScanLine,
  Search,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface ReturnOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  total: number;
  status: string;
  tracking_code?: string | null;
  courier_name?: string | null;
  created_at: string;
  order_items?: any[];
}

const CONDITION_OPTIONS = [
  { id: "like_new", label: "Like New / Resellable", desc: "Original tag & bag intact. Restock immediately.", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  { id: "damaged_box", label: "Damaged Packaging", desc: "Item fine, needs repackaging/poly bag.", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  { id: "defective", label: "Defective / Torn / Used", desc: "Defective unit. Mark defective/loss.", color: "text-rose-600 bg-rose-500/10 border-rose-500/30" },
  { id: "wrong_item", label: "Wrong Item Returned", desc: "Mismatch in returned parcel content.", color: "text-purple-600 bg-purple-500/10 border-purple-500/30" },
];

const REASON_OPTIONS = [
  "Customer Refused Delivery (COD)",
  "Wrong Size / Fit Issue",
  "Product Quality / Defect",
  "Courier Undelivered / Fake Attempt",
  "Cancelled After Dispatch",
  "Customer Unreachable",
];

export function ReturnsIntake() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [activeScanner, setActiveScanner] = useState(false);
  const [foundOrder, setFoundOrder] = useState<ReturnOrder | null>(null);
  const [selectedCondition, setSelectedCondition] = useState("like_new");
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const searchOrder = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    try {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id, order_number, customer_name, guest_phone, total, status, tracking_code, courier_name, created_at, order_items(id, quantity, unit_price, products(name))")
        .or(`order_number.ilike.%${q}%,tracking_code.ilike.%${q}%,consignment_id.ilike.%${q}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        toast.error("No order found", { description: `Query: ${q}` });
        setFoundOrder(null);
        return;
      }

      setFoundOrder(data);
      toast.success("Order Identified", { description: `${data.order_number} (${data.customer_name || "Guest"})` });
    } catch (e: any) {
      toast.error("Lookup failed", { description: e.message });
    }
  };

  const processReturnMutation = useMutation({
    mutationFn: async () => {
      if (!foundOrder) return;

      const { error } = await (supabase as any)
        .from("orders")
        .update({
          status: "returned",
          notes: inspectionNotes
            ? `[Return Intake] ${selectedCondition} - ${selectedReason}: ${inspectionNotes}`
            : `[Return Intake] ${selectedCondition} - ${selectedReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", foundOrder.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Return Intake Completed", {
        description: `Order ${foundOrder?.order_number} logged as Returned (${selectedCondition}).`,
      });
      setFoundOrder(null);
      setSearchInput("");
      setInspectionNotes("");
      qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => {
      toast.error("Return Intake Failed", { description: e.message });
    },
  });

  if (activeScanner) {
    return (
      <BarcodeScanner
        active
        onToggle={() => setActiveScanner(false)}
        onScan={(code) => {
          setActiveScanner(false);
          setSearchInput(code);
          void searchOrder(code);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-primary" /> Returns Intake Terminal
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan returned parcel barcodes, inspect item conditions, and restock or record losses
        </p>
      </div>

      {/* Barcode Search & Scan Header */}
      <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Scan Return Parcel / Order Barcode / AWB
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void searchOrder(searchInput)}
              placeholder="Scan or type Order #, Tracking Code, or Consignment ID..."
              className="pl-10 h-12 rounded-2xl font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => setActiveScanner(true)}
            variant="outline"
            className="h-12 px-4 rounded-2xl gap-2 font-medium shrink-0"
          >
            <ScanLine className="w-4 h-4 text-primary" /> Scan Barcode
          </Button>
          <Button onClick={() => void searchOrder(searchInput)} className="h-12 px-5 rounded-2xl font-medium shrink-0">
            Find Order
          </Button>
        </div>
      </div>

      {/* Return Intake Details & Inspection Form */}
      {foundOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Order Summary */}
          <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" /> Identified Order
            </h3>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">{foundOrder.order_number}</span>
                <Badge variant="outline">{foundOrder.status}</Badge>
              </div>
              <p className="text-muted-foreground">Customer: <strong>{foundOrder.customer_name || "Guest"}</strong></p>
              <p className="text-muted-foreground">Phone: {foundOrder.guest_phone || "N/A"}</p>
              <p className="text-muted-foreground">Courier: {foundOrder.courier_name || "N/A"}</p>
              {foundOrder.tracking_code && <p className="font-mono text-primary">AWB: {foundOrder.tracking_code}</p>}
              <p className="font-bold text-foreground pt-1 border-t border-border/50">
                Order Value: ৳{Number(foundOrder.total || 0).toLocaleString()}
              </p>
            </div>

            {foundOrder.order_items && foundOrder.order_items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Items in Parcel</p>
                <div className="divide-y divide-border/50 border border-border/50 rounded-2xl overflow-hidden bg-background">
                  {foundOrder.order_items.map((item: any) => (
                    <div key={item.id} className="p-2.5 flex justify-between text-xs">
                      <span className="truncate">{item.products?.name || item.product_name || "Item"}</span>
                      <span className="font-mono font-medium">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inspection & Condition Form */}
          <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" /> Return Inspection &amp; Intake
            </h3>

            {/* Condition Grid */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Item Condition Assessment</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONDITION_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCondition(c.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedCondition === c.id
                        ? `${c.color} ring-1 ring-primary/40 font-semibold shadow-xs`
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{c.label}</p>
                    <p className="text-[11px] opacity-80 mt-1">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Return Reason Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Return Reason</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {REASON_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`px-3 py-2 rounded-xl text-xs text-left border transition-all ${
                      selectedReason === r
                        ? "bg-primary/10 border-primary text-foreground font-semibold"
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspection Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Inspection Staff Notes</Label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Log physical condition, missing packaging, courier remarks..."
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="ghost" onClick={() => setFoundOrder(null)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => processReturnMutation.mutate()}
                disabled={processReturnMutation.isPending}
                className="rounded-2xl px-6 h-11 text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {processReturnMutation.isPending ? "Processing Return..." : "Confirm Return Intake"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-2 text-muted-foreground">
          <Boxes className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">Ready for parcel return inspection</p>
          <p className="text-xs max-w-sm mx-auto">
            Scan the incoming parcel label barcode or type the order number above to initiate the return verification.
          </p>
        </div>
      )}
    </div>
  );
}
