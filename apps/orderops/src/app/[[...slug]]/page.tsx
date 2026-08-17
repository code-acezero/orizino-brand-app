"use client";

import dynamic from "next/dynamic";

const OrderOpsApp = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-mono">Initializing OrderOps…</span>
      </div>
    </div>
  ),
});

export default function CatchAllPage() {
  return <OrderOpsApp />;
}
