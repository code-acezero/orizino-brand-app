import React from "react";

export function OrizinoSkeleton() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#050505] text-[#F5F5F5]"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-6 md:px-10">
        <div className="h-10 w-10 rounded-full bg-white/5 animate-pulse" />
        <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
      </div>

      {/* Hero */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 pt-16 text-center md:pt-24">
        <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
        <div className="h-10 w-4/5 rounded bg-white/5 md:h-14 animate-pulse" />
        <div className="h-10 w-3/5 rounded bg-white/5 md:h-14 animate-pulse" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-2/3 max-w-md rounded bg-white/5 animate-pulse" />
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="h-11 w-40 rounded-full bg-white/5 animate-pulse" />
          <div className="h-11 w-36 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pt-24 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 w-full rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>

      <span className="sr-only">Loading content…</span>
    </div>
  );
}
