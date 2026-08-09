"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { Truck, Plus, Trash2, Edit, MapPin, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";

type OfferSource = "self" | "courier" | "any";
const COURIERS = [
  { id: "orizino", label: "Orizino (own)" },
  { id: "pathao", label: "Pathao" },
  { id: "steadfast", label: "Steadfast" },
];

interface OfferForm {
  title: string;
  description: string;
  offer_type: string;
  discount_value: number;
  min_order_amount: number;
  target_areas: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  source: OfferSource;
  applicable_couriers: string[];
  absorb_from_product: boolean;
}

const emptyForm: OfferForm = {
  title: "",
  description: "",
  offer_type: "free_delivery",
  discount_value: 0,
  min_order_amount: 0,
  target_areas: "",
  is_active: true,
  starts_at: "",
  expires_at: "",
  source: "self",
  applicable_couriers: [],
  absorb_from_product: false,
};

const OFFER_TYPES = [
  { value: "free_delivery", label: "Free Delivery", desc: "Completely free shipping" },
  { value: "reduced_delivery", label: "Reduced Delivery", desc: "Discount off shipping fee" },
  { value: "flat_rate", label: "Flat Rate", desc: "Fixed shipping price" },
];

const AdminDeliveryOffers = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);

  const { data: offers = [] } = useQuery({
    queryKey: ["admin-delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_offers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const areas = form.target_areas.split(",").map((a) => a.trim()).filter(Boolean);
      const isCourierSource = form.source === "courier";
      const payload: any = {
        title: form.title,
        description: form.description,
        offer_type: form.offer_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount,
        target_areas: areas,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        source: form.source,
        applicable_couriers: form.applicable_couriers,
        // Absorb only makes sense for courier-sourced offers
        absorb_from_product: isCourierSource ? form.absorb_from_product : false,
      };
      if (editId) {
        const { error } = await supabase.from("delivery_offers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delivery_offers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] });
      toast.success(editId ? "Offer updated" : "Offer created");
      setShowDialog(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] });
      toast.success("Offer deleted");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("delivery_offers").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-delivery-offers"] }),
  });

  const openEdit = (offer: any) => {
    setEditId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description || "",
      offer_type: offer.offer_type,
      discount_value: Number(offer.discount_value),
      min_order_amount: Number(offer.min_order_amount) || 0,
      target_areas: (offer.target_areas || []).join(", "),
      is_active: offer.is_active,
      starts_at: offer.starts_at ? offer.starts_at.slice(0, 16) : "",
      expires_at: offer.expires_at ? offer.expires_at.slice(0, 16) : "",
      source: (offer.source as OfferSource) || "self",
      applicable_couriers: offer.applicable_couriers || [],
      absorb_from_product: !!offer.absorb_from_product,
    });
    setShowDialog(true);
  };

  const toggleCourier = (id: string) => {
    setForm((f) => {
      const next = f.applicable_couriers.includes(id)
        ? f.applicable_couriers.filter((c) => c !== id)
        : [...f.applicable_couriers, id];
      return { ...f, applicable_couriers: next };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Delivery Offers</h1>
        <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Create Offer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Delivery Offer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Free Delivery Weekend" />
              </div>
              <div className="space-y-2">
                <Label>Offer Type</Label>
                <Select value={form.offer_type} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Delivery Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as OfferSource })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Orizino (our own delivery — no extra cost)</SelectItem>
                    <SelectItem value="courier">Courier partner (cost absorbed by shop)</SelectItem>
                    <SelectItem value="any">Any (auto-apply regardless of carrier)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When the source is "Courier", you'll pay the courier fee. Use the toggle below to silently absorb it from the product margin so the customer still sees the original price.
                </p>
              </div>

              {/* Applicable couriers (when source = courier or any) */}
              {form.source !== "self" && (
                <div className="space-y-2">
                  <Label>Applies to Couriers</Label>
                  <div className="flex flex-wrap gap-2">
                    {COURIERS.map((c) => {
                      const active = form.applicable_couriers.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCourier(c.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 border-border text-muted-foreground"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Empty = applies to all couriers.</p>
                </div>
              )}

              {/* Absorb-from-product (only meaningful for courier source) */}
              {form.source === "courier" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Silently absorb cost from product margin</p>
                    <p className="text-xs text-muted-foreground">Customer sees full product price + Free Delivery. Internal accounting only.</p>
                  </div>
                  <Switch
                    checked={form.absorb_from_product}
                    onCheckedChange={(v) => setForm({ ...form, absorb_from_product: v })}
                  />
                </div>
              )}

              {form.offer_type !== "free_delivery" && (
                <div className="space-y-2">
                  <Label>{form.offer_type === "flat_rate" ? "Flat Rate (৳)" : "Discount Amount (৳)"}</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Min Order Amount (৳)</Label>
                <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} placeholder="0 = no minimum" />
              </div>
              <div className="space-y-2">
                <Label>Target Areas (comma-separated)</Label>
                <Input value={form.target_areas} onChange={(e) => setForm({ ...form, target_areas: e.target.value })} placeholder="Leave empty for all areas. e.g. Dhaka, Chittagong" />
                <p className="text-xs text-muted-foreground">Empty = applies to all areas. Match against shipping city.</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {offers.map((offer: any) => {
          const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
          const type = OFFER_TYPES.find((t) => t.value === offer.offer_type);
          const areas = offer.target_areas || [];
          const couriers: string[] = offer.applicable_couriers || [];
          const src = offer.source || "self";
          return (
            <Card key={offer.id} className={`${!offer.is_active || isExpired ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${src === "self" ? "bg-primary/10" : "bg-amber-500/10"}`}>
                      <Truck className={`w-5 h-5 ${src === "self" ? "text-primary" : "text-amber-500"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{offer.title}</p>
                        <Badge variant="secondary" className="text-xs">{type?.label}</Badge>
                        <Badge variant={src === "self" ? "default" : "outline"} className="text-[10px] capitalize">
                          {src === "self" ? "Orizino" : src === "courier" ? "Courier (absorbed)" : "Any"}
                        </Badge>
                        {offer.absorb_from_product && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">Margin-absorbed</Badge>}
                        {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {offer.offer_type !== "free_delivery" && <span>৳{offer.discount_value} {offer.offer_type === "flat_rate" ? "flat" : "off"}</span>}
                        {Number(offer.min_order_amount) > 0 && <span>Min ৳{offer.min_order_amount}</span>}
                        {areas.length > 0 && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {areas.join(", ")}</span>}
                        {couriers.length > 0 && <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" /> {couriers.join(", ")}</span>}
                        {offer.expires_at && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Until {format(new Date(offer.expires_at), "MMM d, yyyy")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={offer.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: offer.id, active: v })} />
                    <button onClick={() => openEdit(offer)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(offer.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {offers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No delivery offers yet</p>
          <p className="text-xs mt-1">Create time-limited free/reduced delivery offers for all or specific areas</p>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryOffers;
// code:4ce0
