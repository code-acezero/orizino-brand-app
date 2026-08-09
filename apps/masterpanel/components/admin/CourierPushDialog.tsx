"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Truck, RefreshCw, Package } from "lucide-react";
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

  // Pathao state
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

  const pushPathao = useMutation({
    mutationFn: async () => {
      if (!cityId || !zoneId) throw new Error("City and Zone required");
      return callPathao("create-order", {
        order_id: orderId,
        recipient_city: cityId,
        recipient_zone: zoneId,
        recipient_area: areaId || undefined,
        recipient_city_name: cityName,
        recipient_zone_name: zoneName,
      });
    },
    onSuccess: () => {
      toast({ title: "Pushed to Pathao" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["pathao-shipment", orderId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Pathao push failed", description: e.message, variant: "destructive" }),
  });

  const pushSteadfast = useMutation({
    mutationFn: async () => callSteadfast("create-order", {
      order_id: orderId, note, item_description: itemDesc || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Pushed to Steadfast" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["steadfast-shipment", orderId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Steadfast push failed", description: e.message, variant: "destructive" }),
  });

  const syncPathao = useMutation({
    mutationFn: async () => callPathao("sync-status", { consignment_id: pathaoExisting?.consignment_id, environment: pathaoExisting?.environment }),
    onSuccess: () => { toast({ title: "Status synced" }); qc.invalidateQueries({ queryKey: ["pathao-shipment", orderId] }); },
  });
  const syncSteadfast = useMutation({
    mutationFn: async () => callSteadfast("sync-status", { consignment_id: steadfastExisting?.consignment_id }),
    onSuccess: () => { toast({ title: "Status synced" }); qc.invalidateQueries({ queryKey: ["steadfast-shipment", orderId] }); },
  });

  const existing = provider === "pathao" ? pathaoExisting : steadfastExisting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" /> Push to Courier — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Provider switch */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("pathao")}
            className={`p-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              provider === "pathao" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Truck className="w-4 h-4" /> Pathao
            {pathaoExisting && <Badge variant="outline" className="text-[10px]">pushed</Badge>}
          </button>
          <button
            type="button"
            onClick={() => setProvider("steadfast")}
            className={`p-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              provider === "steadfast" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Package className="w-4 h-4" /> Steadfast
            {steadfastExisting && <Badge variant="outline" className="text-[10px]">pushed</Badge>}
          </button>
        </div>

        {existing ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <p className="text-xs text-muted-foreground">Consignment</p>
              <p className="font-mono text-sm">{existing.consignment_id}</p>
              {provider === "steadfast" && (existing as any).tracking_code && (
                <p className="font-mono text-xs text-muted-foreground">TC: {(existing as any).tracking_code}</p>
              )}
              <Badge>
                {((provider === "pathao" ? (existing as any).order_status : (existing as any).status) || "—")
                  .toString().replace(/_/g, " ")}
              </Badge>
            </div>
            <Button
              variant="outline" className="w-full gap-2"
              onClick={() => (provider === "pathao" ? syncPathao : syncSteadfast).mutate()}
              disabled={syncPathao.isPending || syncSteadfast.isPending}
            >
              {(syncPathao.isPending || syncSteadfast.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Status
            </Button>
          </div>
        ) : provider === "pathao" ? (
          <div className="space-y-3">
            <div>
              <Label>City</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={cityId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCityId(id || null); setZoneId(null); setAreaId(null);
                  const c = (cities.data || []).find((x: any) => x.city_id === id);
                  setCityName(c?.city_name || "");
                }}>
                <option value="">{cities.isLoading ? "Loading..." : "Select city"}</option>
                {(cities.data || []).map((c: any) => (
                  <option key={c.city_id} value={c.city_id}>{c.city_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Zone</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={zoneId || ""} disabled={!cityId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setZoneId(id || null); setAreaId(null);
                  const z = (zones.data || []).find((x: any) => x.zone_id === id);
                  setZoneName(z?.zone_name || "");
                }}>
                <option value="">{zones.isLoading ? "Loading..." : "Select zone"}</option>
                {(zones.data || []).map((z: any) => (
                  <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Area (optional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={areaId || ""} disabled={!zoneId}
                onChange={(e) => setAreaId(Number(e.target.value) || null)}>
                <option value="">Select area</option>
                {(areas.data || []).map((a: any) => (
                  <option key={a.area_id} value={a.area_id}>{a.area_name}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={() => pushPathao.mutate()} disabled={pushPathao.isPending || !cityId || !zoneId} className="gap-2">
                {pushPathao.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Push to Pathao
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Steadfast uses the order's shipping address directly. No city/zone picker needed.
            </p>
            <div>
              <Label>Item description (optional)</Label>
              <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Order Items" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deliver before 5 PM" />
            </div>
            <DialogFooter>
              <Button onClick={() => pushSteadfast.mutate()} disabled={pushSteadfast.isPending} className="gap-2">
                {pushSteadfast.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Push to Steadfast
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourierPushDialog;
// code:4ce0
