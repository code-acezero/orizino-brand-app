"use client";
import React from "react";
import { motion } from "framer-motion";
import { Truck, MapPin, Package, Check } from "lucide-react";
import { usePricingRules, useCourierHubs, detectZoneType, calculateShippingFee, type CourierProvider } from "@/hooks/use-courier-pricing";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  city: string;
  weight?: number;
  selectedProvider: CourierProvider;
  onProviderChange: (p: CourierProvider) => void;
  hubPickup: boolean;
  onHubPickupChange: (v: boolean) => void;
  selectedHubId: string | null;
  onHubChange: (id: string | null) => void;
  onFeeChange: (fee: number) => void;
}

const CourierSelector: React.FC<Props> = ({
  city, weight = 1, selectedProvider, onProviderChange,
  hubPickup, onHubPickupChange, selectedHubId, onHubChange, onFeeChange,
}) => {
  const { data: rules } = usePricingRules();
  const { data: hubs } = useCourierHubs(selectedProvider);
  const { formatPrice } = useCurrency();
  const zoneType = detectZoneType(city);

  const providers: { id: CourierProvider; name: string; eta: string }[] = [
    { id: "pathao", name: "Pathao", eta: "1-3 days" },
    { id: "steadfast", name: "Steadfast", eta: "2-4 days" },
  ];

  const fees = React.useMemo(() => {
    if (!rules) return {} as Record<CourierProvider, number>;
    return {
      pathao: calculateShippingFee(rules, "pathao", zoneType, weight, hubPickup),
      steadfast: calculateShippingFee(rules, "steadfast", zoneType, weight, hubPickup),
    };
  }, [rules, zoneType, weight, hubPickup]);

  React.useEffect(() => {
    if (fees[selectedProvider] !== undefined) onFeeChange(fees[selectedProvider]);
  }, [fees, selectedProvider, onFeeChange]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Choose Courier
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {providers.map((p) => {
            const selected = selectedProvider === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onProviderChange(p.id)}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl border text-left transition-all relative ${
                  selected ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/20 hover:bg-secondary/30"
                }`}
              >
                {selected && <Check className="w-4 h-4 text-primary absolute top-2 right-2" />}
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{p.eta}</p>
                <p className="text-base font-bold text-primary">{formatPrice(fees[p.id] ?? 0)}</p>
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 capitalize">
          Zone detected: {zoneType.replace("_", " ")} ({city || "—"})
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/20">
        <div>
          <Label htmlFor="hub-pickup" className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" /> Hub pickup
          </Label>
          <p className="text-xs text-muted-foreground">Save on delivery — pick up from a nearby hub</p>
        </div>
        <Switch id="hub-pickup" checked={hubPickup} onCheckedChange={onHubPickupChange} />
      </div>

      {hubPickup && hubs && hubs.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Choose Pickup Hub
          </h5>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {hubs.map((h) => {
              const selected = selectedHubId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onHubChange(h.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${
                    selected ? "bg-primary/10 ring-1 ring-primary/40" : "bg-secondary/20 hover:bg-secondary/30"
                  }`}
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{h.hub_name}</p>
                    <p className="text-xs text-muted-foreground">{h.address}, {h.city}</p>
                  </div>
                  {selected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hubPickup && (!hubs || hubs.length === 0) && (
        <p className="text-xs text-muted-foreground italic">No hubs configured for this courier yet.</p>
      )}
    </div>
  );
};

export default CourierSelector;
// code:4ce0
