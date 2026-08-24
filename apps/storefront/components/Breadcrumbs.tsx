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
    if (typeof window === "undefined") return;
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

  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      <ol className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap select-none py-0.5 overflow-x-auto scrollbar-none max-w-full">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isFirst = i === 0;

          return (
            <li key={i} className="inline-flex items-center gap-1.5 shrink-0 min-w-0">
              {isLast || !item.href ? (
                <span className="inline-flex items-center gap-1.5 text-foreground/90 font-medium max-w-[220px] sm:max-w-[340px] md:max-w-none truncate leading-none">
                  {isFirst && (
                    <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors max-w-[160px] sm:max-w-[240px] truncate leading-none group"
                >
                  {isFirst && (
                    <Home className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              )}
              {!isLast && (
                <ChevronRight
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/40 shrink-0 select-none"
                  strokeWidth={2}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
