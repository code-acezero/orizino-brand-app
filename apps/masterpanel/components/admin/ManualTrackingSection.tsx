"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { attachManualTracking, detachManualTracking } from "@/lib/manual-tracking.functions";

type Props = {
  orderId: string;
  currentCourier: "pathao" | "steadfast" | null;
  currentTrackingNumber: string | null;
};

export default function ManualTrackingSection({ orderId, currentCourier, currentTrackingNumber }: Props) {
  const qc = useQueryClient();
  const attachFn = useServerFn(attachManualTracking);
  const detachFn = useServerFn(detachManualTracking);
  const [courier, setCourier] = useState<"pathao" | "steadfast">(currentCourier ?? "pathao");
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [consignmentId, setConsignmentId] = useState(currentTrackingNumber ?? "");

  const attachMut = useMutation({
    mutationFn: async () => attachFn({ data: { order_id: orderId, courier, consignment_id: consignmentId.trim(), environment } }),
    onSuccess: (r: any) => {
      toast.success(`Validated with ${r.courier}. Tracking attached.`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message || "Validation failed"),
  });

  const detachMut = useMutation({
    mutationFn: async () => detachFn({ data: { order_id: orderId } }),
    onSuccess: () => {
      toast.success("Tracking detached");
      setConsignmentId("");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to detach"),
  });

  const hasTracking = Boolean(currentTrackingNumber && currentCourier);

  return (
    <div className="space-y-2">
      <Label className="font-medium flex items-center gap-2">
        <Truck className="w-4 h-4" /> Tracking
        {hasTracking && (
          <Badge variant="secondary" className="capitalize">{currentCourier} · {currentTrackingNumber}</Badge>
        )}
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-[130px_130px_1fr] gap-2">
        <Select value={courier} onValueChange={(v) => setCourier(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pathao">Pathao</SelectItem>
            <SelectItem value="steadfast">Steadfast</SelectItem>
          </SelectContent>
        </Select>
        {courier === "pathao" ? (
          <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Input
          placeholder="Consignment / tracking ID"
          value={consignmentId}
          onChange={(e) => setConsignmentId(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={consignmentId.trim().length < 3 || attachMut.isPending}
          onClick={() => attachMut.mutate()}
          className="gap-1.5"
        >
          {attachMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Validate & Attach
        </Button>
        {hasTracking && (
          <Button size="sm" variant="outline" disabled={detachMut.isPending} onClick={() => detachMut.mutate()} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Detach
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The ID is validated against the courier's API immediately. Invalid IDs are rejected.
      </p>
    </div>
  );
}
