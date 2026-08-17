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

  return (
    <nav aria-label="Breadcrumb" className={`w-full overflow-x-auto scrollbar-none ${className}`}>
      <ol className="inline-flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap select-none py-0.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isFirst = i === 0;
          const isBeforeLast = i === items.length - 2 && items.length > 1;

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
              {!isLast && (
                <ChevronRight
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/45 shrink-0 select-none ${
                    isBeforeLast ? "hidden sm:inline-block" : ""
                  }`}
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
// code:4ce0
