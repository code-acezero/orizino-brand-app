"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Truck, RefreshCw, Package, Zap, DollarSign, Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderNumber: string;
}

type Provider = "pathao" | "steadfast";

const CourierPushDialog: React.FC<Props> = ({ open, onOpenChange, orderId, orderNumber }) => {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<Provider>("pathao");
  const [note, setNote] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [deliveryType, setDeliveryType] = useState<number>(0); // Steadfast: 0 = Home, 1 = Hub

  // Pathao specific state
  const [pathaoDeliveryType, setPathaoDeliveryType] = useState<number>(48); // 48 = Normal, 12 = On Demand
  const [pathaoItemType, setPathaoItemType] = useState<number>(2); // 1 = Document, 2 = Parcel
  const [itemWeight, setItemWeight] = useState<number>(0.5);
  const [cityId, setCityId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [cityName, setCityName] = useState("");
  const [zoneName, setZoneName] = useState("");

  // Existing shipments
  const { data: pathaoExisting } = useQuery({
    queryKey: ["pathao-shipment", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("pathao_shipments").select("*").eq("order_id", orderId).maybeSingle();
      return data;
    },
    enabled: open,
  });

  const { data: steadfastExisting } = useQuery({
    queryKey: ["steadfast-shipment", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("steadfast_shipments").select("*").eq("order_id", orderId).maybeSingle();
      return data;
    },
    enabled: open,
  });

  const callPathao = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("pathao", { body: { action, ...body } });
    if (error) throw error;
    return data;
  };

  const callSteadfast = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke("steadfast", { body: { action, ...body } });
    if (error) throw error;
    return data;
  };

  // Pathao locations
  const cities = useQuery({
    queryKey: ["pathao-cities"],
    queryFn: async () => {
      const r = await callPathao("cities");
      return r?.data?.data || r?.data || [];
    },
    enabled: open && provider === "pathao" && !pathaoExisting,
  });

  const zones = useQuery({
    queryKey: ["pathao-zones", cityId],
    queryFn: async () => {
      if (!cityId) return [];
      const r = await callPathao("zones", { city_id: cityId });
      return r?.data?.data || r?.data || [];
    },
    enabled: !!cityId && provider === "pathao",
  });

  const areas = useQuery({
    queryKey: ["pathao-areas", zoneId],
    queryFn: async () => {
      if (!zoneId) return [];
      const r = await callPathao("areas", { zone_id: zoneId });
      return r?.data?.data || r?.data || [];
    },
    enabled: !!zoneId && provider === "pathao",
  });

  // Price estimate for Pathao
  const priceEstimate = useQuery({
    queryKey: ["pathao-price-estimate", cityId, zoneId, pathaoDeliveryType, pathaoItemType, itemWeight],
    queryFn: async () => {
      if (!cityId || !zoneId) return null;
      const r = await callPathao("price-plan", {
        recipient_city: cityId,
        recipient_zone: zoneId,
        delivery_type: pathaoDeliveryType,
        item_type: pathaoItemType,
        item_weight: itemWeight,
      });
      return r?.data?.data || r?.data || null;
    },
    enabled: !!cityId && !!zoneId && provider === "pathao" && !pathaoExisting,
  });

  const pushPathao = useMutation({
    mutationFn: async () => {
      if (!cityId || !zoneId) throw new Error("City and Zone are required for Pathao dispatch");
      return callPathao("create-order", {
        order_id: orderId,
        recipient_city: cityId,
        recipient_zone: zoneId,
        recipient_area: areaId || undefined,
        recipient_city_name: cityName,
        recipient_zone_name: zoneName,
        delivery_type: pathaoDeliveryType,
        item_type: pathaoItemType,
        item_weight: itemWeight,
        special_instruction: note || undefined,
        item_description: itemDesc || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Order successfully pushed to Pathao!" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["pathao-shipment", orderId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Pathao push failed", description: e.message, variant: "destructive" }),
  });

  const pushSteadfast = useMutation({
    mutationFn: async () => callSteadfast("create-order", {
      order_id: orderId,
      note,
      item_description: itemDesc || undefined,
      delivery_type: deliveryType,
    }),
    onSuccess: () => {
      toast({ title: "Order successfully pushed to Steadfast!" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["steadfast-shipment", orderId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Steadfast push failed", description: e.message, variant: "destructive" }),
  });

  const syncPathao = useMutation({
    mutationFn: async () => callPathao("sync-status", {
      consignment_id: pathaoExisting?.consignment_id,
      order_id: orderId,
      environment: pathaoExisting?.environment,
    }),
    onSuccess: () => {
      toast({ title: "Pathao status synchronized!" });
      qc.invalidateQueries({ queryKey: ["pathao-shipment", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const syncSteadfast = useMutation({
    mutationFn: async () => callSteadfast("sync-status", {
      consignment_id: steadfastExisting?.consignment_id,
      order_id: orderId,
    }),
    onSuccess: () => {
      toast({ title: "Steadfast status synchronized!" });
      qc.invalidateQueries({ queryKey: ["steadfast-shipment", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const existing = provider === "pathao" ? pathaoExisting : steadfastExisting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <Truck className="w-5 h-5 text-primary" /> Courier Dispatch Hub — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Provider Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("pathao")}
            className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              provider === "pathao"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Truck className="w-4 h-4" /> Pathao Courier
            {pathaoExisting && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 border-none">Dispatched</Badge>}
          </button>
          <button
            type="button"
            onClick={() => setProvider("steadfast")}
            className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              provider === "steadfast"
                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold shadow-xs"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Package className="w-4 h-4" /> Steadfast Courier
            {steadfastExisting && <Badge variant="outline" className="text-[10px] bg-red-500/15 border-none">Dispatched</Badge>}
          </button>
        </div>

        {existing ? (
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Consignment ID</span>
                <Badge className="text-xs font-mono font-bold capitalize">
                  {((provider === "pathao" ? (existing as any).order_status : (existing as any).status) || "In Transit")
                    .toString().replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="font-mono text-base font-bold text-foreground">{existing.consignment_id}</p>
              {provider === "steadfast" && (existing as any).tracking_code && (
                <p className="font-mono text-xs text-muted-foreground">Steadfast Tracking Code: {(existing as any).tracking_code}</p>
              )}
              {((existing as any)?.delivery_fee || (existing as any)?.delivery_charge) ? (
                <p className="text-xs text-muted-foreground">Delivery Charge: <span className="font-mono font-bold text-foreground">৳{(existing as any)?.delivery_fee || (existing as any)?.delivery_charge}</span></p>
              ) : null}
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl h-10 font-bold"
              onClick={() => (provider === "pathao" ? syncPathao : syncSteadfast).mutate()}
              disabled={syncPathao.isPending || syncSteadfast.isPending}
            >
              {(syncPathao.isPending || syncSteadfast.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Synchronize Live Tracking Status
            </Button>
          </div>
        ) : provider === "pathao" ? (
          <div className="space-y-3.5 pt-1">
            {/* Delivery Service Mode */}
            <div>
              <Label className="text-xs font-semibold">Service Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPathaoDeliveryType(48)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    pathaoDeliveryType === 48
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  ⚡ Express Delivery (48h)
                </button>
                <button
                  type="button"
                  onClick={() => setPathaoDeliveryType(12)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    pathaoDeliveryType === 12
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  🚀 On-Demand Same Day (12h)
                </button>
              </div>
            </div>

            {/* City & Zone Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Destination City</Label>
                <select
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs mt-1"
                  value={cityId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCityId(id || null);
                    setZoneId(null);
                    setAreaId(null);
                    const c = (cities.data || []).find((x: any) => x.city_id === id);
                    setCityName(c?.city_name || "");
                  }}
                >
                  <option value="">{cities.isLoading ? "Loading cities..." : "Select City"}</option>
                  {(cities.data || []).map((c: any) => (
                    <option key={c.city_id} value={c.city_id}>{c.city_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Destination Zone</Label>
                <select
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs mt-1"
                  value={zoneId || ""}
                  disabled={!cityId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setZoneId(id || null);
                    setAreaId(null);
                    const z = (zones.data || []).find((x: any) => x.zone_id === id);
                    setZoneName(z?.zone_name || "");
                  }}
                >
                  <option value="">{zones.isLoading ? "Loading zones..." : "Select Zone"}</option>
                  {(zones.data || []).map((z: any) => (
                    <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Area & Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Specific Area (Optional)</Label>
                <select
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs mt-1"
                  value={areaId || ""}
                  disabled={!zoneId}
                  onChange={(e) => setAreaId(Number(e.target.value) || null)}
                >
                  <option value="">Select Area (Optional)</option>
                  {(areas.data || []).map((a: any) => (
                    <option key={a.area_id} value={a.area_id}>{a.area_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Parcel Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={itemWeight}
                  onChange={(e) => setItemWeight(Number(e.target.value) || 0.5)}
                  className="h-9 rounded-xl text-xs font-mono mt-1"
                />
              </div>
            </div>

            {/* Live Price Estimation Preview */}
            {priceEstimate.data && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Pathao Rate Estimate:
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  ৳{priceEstimate.data.final_price || priceEstimate.data.price}
                </span>
              </div>
            )}

            <div>
              <Label className="text-xs">Item Description / Summary</Label>
              <Input
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Apparel / Casual Shirt x1"
                className="h-9 rounded-xl text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Special Instructions / Notes</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Call customer before delivery"
                className="h-9 rounded-xl text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={() => pushPathao.mutate()}
                disabled={pushPathao.isPending || !cityId || !zoneId}
                className="gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {pushPathao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Dispatch to Pathao Courier
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            <p className="text-xs text-muted-foreground">
              Steadfast delivers nationwide across all 64 districts using the recipient's shipping address.
            </p>

            <div>
              <Label className="text-xs font-semibold">Delivery Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setDeliveryType(0)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    deliveryType === 0
                      ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  🏠 Home Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType(1)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    deliveryType === 1
                      ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  🏢 Hub / Point Pickup
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Item Description (Optional)</Label>
              <Input
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Silk Shirt x1, Denim x1"
                className="h-9 rounded-xl text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Note / Delivery Instructions (Optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Fragile / Call before delivery"
                className="h-9 rounded-xl text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={() => pushSteadfast.mutate()}
                disabled={pushSteadfast.isPending}
                className="gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
              >
                {pushSteadfast.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Dispatch to Steadfast
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourierPushDialog;
