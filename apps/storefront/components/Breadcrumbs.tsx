"use client";
import React, { useEffect } from "react";
import { Link } from "@/lib/router-compat";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
  // Inject JSON-LD BreadcrumbList schema
  useEffect(() => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.label,
        ...(item.href
          ? { item: `${window.location.origin}${item.href}` }
          : {}),
      })),
    };

    const existing = document.querySelector('script[data-seo-breadcrumb]');
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-breadcrumb", "true");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const el = document.querySelector('script[data-seo-breadcrumb]');
      if (el) el.remove();
    };
  }, [items]);

  const lastItem = items.length > 1 ? items[items.length - 1] : null;

  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      {/* 1. Desktop full row & Mobile parent hierarchy row */}
      <ol className="inline-flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap select-none py-0.5 overflow-x-auto scrollbar-none max-w-full">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isFirst = i === 0;

          return (
            <li
              key={i}
              className={`inline-flex items-center gap-1.5 shrink-0 ${
                isLast && items.length > 1 ? "hidden sm:inline-flex" : ""
              }`}
            >
              {isLast || !item.href ? (
                <span className="inline-flex items-center gap-1.5 text-foreground font-medium truncate max-w-[180px] sm:max-w-[260px] leading-none">
                  {isFirst && (
                    <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[260px] leading-none group"
                >
                  {isFirst && (
                    <Home className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              )}
              {/* Show arrow if not last, or on mobile if not before the last item that is moved to row 2 */}
              {(!isLast && !(i === items.length - 2 && items.length > 1)) && (
                <ChevronRight
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/45 shrink-0 select-none"
                  strokeWidth={2}
                />
              )}
              {/* On desktop, show arrow before the last item too */}
              {i === items.length - 2 && items.length > 1 && (
                <ChevronRight
                  className="hidden sm:inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/45 shrink-0 select-none"
                  strokeWidth={2}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* 2. Mobile 2nd Row: Product Title / Slug */}
      {lastItem && items.length > 1 && (
        <div className="block sm:hidden mt-1 pl-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-foreground font-semibold max-w-full">
            <span className="text-primary/70 font-mono text-[10px] select-none">↳</span>
            <span className="truncate leading-tight text-foreground/90">{lastItem.label}</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Breadcrumbs;
