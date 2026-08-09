"use client";
import React from "react";
import { useLocation } from "@/lib/router-compat";
import TableSkeleton from "./TableSkeleton";
import CardGridSkeleton from "./CardGridSkeleton";
import FormSkeleton from "./FormSkeleton";
import DashboardSkeleton from "./DashboardSkeleton";
import DetailSkeleton from "./DetailSkeleton";
import ChatSkeleton from "./ChatSkeleton";
import { SkLine, SkBlock } from "./primitives";

export type SkeletonVariant =
  | "table"
  | "cards"
  | "form"
  | "dashboard"
  | "detail"
  | "chat"
  | "generic";

/**
 * Route → skeleton variant map. Patterns are matched in order; first match
 * wins. Patterns are plain substrings tested against pathname + search.
 * Add new routes here once and every page gets a sensible loader.
 */
const ROUTE_MAP: Array<{ test: (path: string, search: string) => boolean; variant: SkeletonVariant }> = [
  // Chat-like inboxes
  { test: (p) => /\/support|\/email-campaigns\/|\/requests/.test(p), variant: "chat" },
  { test: (p, s) => p.endsWith("/support") || s.includes("tab=chat"), variant: "chat" },

  // Storefront detail pages
  { test: (p) => /\/product\/|\/orders\/[^/]+\/track/.test(p), variant: "detail" },

  // Storefront / profile form-like pages
  { test: (p) => /\/checkout|\/cart|\/profile|\/settings/.test(p), variant: "form" },

  // Storefront card grids
  { test: (p) => /^\/shop|\/categories\/|\/wishlist/.test(p), variant: "cards" },

  // Admin detail / editor routes
  { test: (p) => /\/email-campaigns\/[^/]+|\/landing|\/home(\?|$)|\/cms-pages\/|\/showcase|\/banners|\/branding|\/footer|\/mobile-ui/.test(p), variant: "form" },

  // Dashboards / analytics / activity / debug
  { test: (p) => /^\/$|\/admin|\/live-activity|\/debug|\/tracking|\/audit-log|\/email-provider/.test(p), variant: "dashboard" },

  // Admin card grids
  { test: (p) => /\/categories|\/announcements|\/banners$|\/delivery-offers|\/user-promos|\/returns/.test(p), variant: "cards" },

  // Default table for list-style admin pages
  { test: (p) => /\/products|\/orders|\/customers|\/reviews|\/coupons|\/couriers|\/courier-management|\/shipping|\/payment-gateways|\/email-subscribers|\/email-templates|\/email-automations|\/staff|\/users/.test(p), variant: "table" },
];

function pickVariant(pathname: string, search: string): SkeletonVariant {
  for (const r of ROUTE_MAP) if (r.test(pathname, search)) return r.variant;
  return "generic";
}

interface Props {
  /** Force a specific variant; otherwise inferred from current route. */
  variant?: SkeletonVariant;
  /** Override pathname (rare — for previews). */
  pathname?: string;
  className?: string;
}

/**
 * Generic page skeleton: header + utility bar + responsive body.
 * Used as the catch-all fallback when no route pattern matches.
 */
const GenericPageSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <SkBlock className="h-10 w-10 rounded-2xl" />
      <div className="space-y-2 flex-1">
        <SkLine w="14rem" h="1.1rem" />
        <SkLine w="22rem" h="0.7rem" />
      </div>
      <SkBlock className="h-9 w-28" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <SkLine w="60%" h="0.85rem" />
          <SkBlock className="h-24 w-full" />
          <SkLine w="40%" h="0.65rem" />
        </div>
      ))}
    </div>
  </div>
);

const AutoSkeleton: React.FC<Props> = ({ variant, pathname, className }) => {
  const location = useLocation();
  const path = pathname ?? location.pathname;
  const search = location.search ?? "";
  const v = variant ?? pickVariant(path, search);

  let body: React.ReactNode;
  switch (v) {
    case "table":
      body = <TableSkeleton rows={8} cols={6} withActions />;
      break;
    case "cards":
      body = <CardGridSkeleton count={8} cols={3} aspect="4/3" />;
      break;
    case "form":
      body = <FormSkeleton sections={3} fieldsPerSection={4} />;
      break;
    case "dashboard":
      body = <DashboardSkeleton />;
      break;
    case "detail":
      body = <DetailSkeleton />;
      break;
    case "chat":
      body = <ChatSkeleton />;
      break;
    default:
      body = <GenericPageSkeleton />;
  }

  return (
    <div className={className ?? "space-y-6 animate-in fade-in duration-200"}>
      {/* Universal page header shimmer */}
      {v !== "chat" && v !== "dashboard" && (
        <div className="flex items-center gap-3">
          <SkBlock className="h-10 w-10 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <SkLine w="14rem" h="1.1rem" />
            <SkLine w="22rem" h="0.7rem" />
          </div>
          <SkBlock className="h-9 w-28" />
        </div>
      )}
      {body}
    </div>
  );
};

export default AutoSkeleton;
// code:4ce0
