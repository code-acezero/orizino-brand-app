"use client";
import React from "react";
import { motion } from "framer-motion";
import { Package, Settings, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Placed", icon: Package },
  { key: "processing", label: "Processing", icon: Settings },
  { key: "shipped", label: "Dispatched", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 1,
  shipped: 2,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: -1,
};

interface Props {
  status: string;
  trackingNumber?: string | null;
  updatedAt?: string;
}

const OrderTrackingTimeline: React.FC<Props> = ({ status, trackingNumber, updatedAt }) => {
  const currentIdx = statusIndex[status] ?? 0;
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
        <div>
          <p className="font-semibold text-rose-600 dark:text-rose-400">Order Cancelled</p>
          {updatedAt && <p className="text-[11px] text-muted-foreground">{new Date(updatedAt).toLocaleDateString()}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, i) => {
          const isCompleted = currentIdx >= i;
          const isCurrent = currentIdx === i;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "bg-secondary text-muted-foreground border border-border/50"
                  }`}
                >
                  <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.div>
                <span className={`text-[10px] sm:text-xs font-semibold text-center ${isCompleted ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-5">
                  <motion.div
                    initial={false}
                    animate={{ scaleX: currentIdx > i ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="h-full bg-foreground origin-left rounded-full"
                    style={{ width: "100%" }}
                  />
                  {currentIdx <= i && <div className="h-full bg-border/40 rounded-full" />}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {trackingNumber && (
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/40 border border-border/40 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-foreground shrink-0" />
            <span>Courier Consignment: <span className="font-mono font-semibold text-foreground">{trackingNumber}</span></span>
          </div>
          {updatedAt && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
