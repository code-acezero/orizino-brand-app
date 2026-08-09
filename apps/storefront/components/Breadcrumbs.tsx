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
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i === 0 && (
                <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {isLast || !item.href ? (
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
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
