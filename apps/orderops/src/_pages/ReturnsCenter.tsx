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
  Phone,
  Truck,
  Check
} from "lucide-react";
import { format } from "date-fns";

interface ReturnOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  guest_phone: string | null;
  total: number;
  status: string;
  tracking_number?: string | null;
  assigned_courier?: string | null;
  created_at: string;
  order_items?: any[];
}

const CONDITION_OPTIONS = [
  { id: "like_new", label: "Like New / Resellable", desc: "Original tag & poly bag intact. Ready to restock.", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "damaged_box", label: "Damaged Packaging", desc: "Item intact, needs repackaging / new barcode.", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "defective", label: "Defective / Torn / Used", desc: "Defective unit. Quarantine for inspection/loss.", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "wrong_item", label: "Wrong Item Returned", desc: "Mismatch in returned parcel content vs order.", color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30" },
];

const REASON_OPTIONS = [
  "Customer Refused Delivery (COD)",
  "Wrong Size / Fit Issue",
  "Product Quality / Defect",
  "Courier Undelivered / Fake Attempt",
  "Cancelled After Dispatch",
  "Customer Unreachable",
];

export function ReturnsCenter() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeScanner, setActiveScanner] = useState(false);
  const [foundOrder, setFoundOrder] = useState<ReturnOrder | null>(null);
  const [selectedCondition, setSelectedCondition] = useState("like_new");
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const searchOrder = async (query: string) => {
    const q = query.trim().replace("#", "");
    if (!q) {
      toast.info("Please type an Order Number or Tracking Code first");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select(`
          id, order_number, customer_name, guest_phone, total, status, courier_name, tracking_code, consignment_id, created_at,
          order_items (
            id, product_name, quantity, unit_price,
            products ( name, sku )
          )
        `)
        .or(`order_number.ilike.%${q}%,tracking_code.ilike.%${q}%,consignment_id.ilike.%${q}%,customer_name.ilike.%${q}%,guest_phone.ilike.%${q}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        toast.error("No matching order found", { description: `Query: ${q}` });
        setFoundOrder(null);
        return;
      }

      setFoundOrder(data);
      toast.success("Order Identified", { description: `${data.order_number} (${data.customer_name || "Guest"})` });
    } catch (e: any) {
      toast.error("Lookup failed", { description: e.message });
    } finally {
      setIsSearching(false);
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
      toast.success("Return Processed & Intake Recorded", {
        description: `Order ${foundOrder?.order_number} tagged as Returned (${selectedCondition}).`,
      });
      setFoundOrder(null);
      setSearchInput("");
      setInspectionNotes("");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
    },
    onError: (err: any) => {
      toast.error("Intake Error", { description: err.message });
    },
  });

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
          <RotateCcw className="w-6 h-6 text-destructive" />
          <span>Returns & Exchange</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scan returned courier packages, inspect merchandise condition, and restock units
        </p>
      </div>

      {/* Scanner or Manual Search Bar Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void searchOrder(searchInput);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Scan return parcel barcode or type Order Number (#1001) / Tracking Code…"
            className="h-11 rounded-xl pl-10 pr-11 text-xs sm:text-sm bg-card border-border/70"
          />
          {/* Integrated Camera Scanner inside input */}
          <button
            type="button"
            onClick={() => setActiveScanner(!activeScanner)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeScanner
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary hover:bg-secondary/80"
            }`}
            title={activeScanner ? "Close camera scanner" : "Scan barcode with camera"}
            aria-label="Scan barcode with camera"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        </div>
        <Button
          type="submit"
          disabled={isSearching}
          className="h-11 px-4 rounded-xl text-xs font-bold gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          {isSearching ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              <span>Searching…</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Lookup</span>
            </>
          )}
        </Button>
      </form>

      {activeScanner && (
        <BarcodeScanner
          active
          onToggle={() => setActiveScanner(false)}
          onScan={(code) => {
            setSearchInput(code);
            setActiveScanner(false);
            searchOrder(code);
          }}
        />
      )}

      {/* Scanned Order Inspection Workspace */}
      {foundOrder ? (
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in">
          {/* Order Header Summary */}
          <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-foreground">{foundOrder.order_number}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
                  {foundOrder.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {foundOrder.customer_name || "Guest Customer"} · {foundOrder.guest_phone || "No Phone"} · Courier: <span className="font-semibold capitalize text-foreground">{foundOrder.assigned_courier || "Steadfast"}</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-base font-bold text-foreground tabular-nums">৳{Number(foundOrder.total).toLocaleString()}</p>
              <span className="text-[10px] text-muted-foreground">{format(new Date(foundOrder.created_at), "MMM d, yyyy")}</span>
            </div>
          </div>

          {/* Returned Items List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Package Contents to Verify ({foundOrder.order_items?.length || 0})
            </p>
            <div className="space-y-1.5">
              {foundOrder.order_items?.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.products?.name || "Product"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">SKU: {item.products?.sku || "N/A"}</p>
                    </div>
                  </div>
                  <span className="font-bold text-foreground bg-card px-2.5 py-1 rounded-md border border-border/60">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Condition Tagging */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Condition Assessment:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCondition(c.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCondition === c.id
                      ? `${c.color} ring-1 shadow-xs font-bold`
                      : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{c.label}</p>
                    {selectedCondition === c.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Return Reason Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Return / Undelivery Reason:
            </Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full h-10 rounded-xl bg-card border border-border/80 px-3 text-xs text-foreground font-medium"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Inspection Audit Notes (Optional)</Label>
            <Textarea
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="e.g. Polybag slightly opened, verified tags intact and ready for immediate inventory restocking."
              className="text-xs rounded-xl bg-card border-border/80"
              rows={2}
            />
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFoundOrder(null)}
              className="h-9 rounded-xl text-xs bg-card"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={processReturnMutation.isPending}
              onClick={() => processReturnMutation.mutate()}
              className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-sm"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Confirm Return & Restock</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 border border-border/70 rounded-2xl bg-card/40 text-xs text-muted-foreground space-y-1">
          <RotateCcw className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="font-semibold text-foreground text-sm">Awaiting parcel barcode or order lookup</p>
          <p>Scan the courier tracking sticker or search by order number above.</p>
        </div>
      )}
    </div>
  );
}
