import React, { useMemo } from 'react';
import { useLocation } from '@/lib/router-compat';
import { allAdminDestinations } from './admin-nav';
import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';

export const RelatedSettingsNav: React.FC = () => {
  const location = useLocation();
  const normalisedPath = location.pathname.replace(/\/$/, "") || "/";

  // Don't show on root
  if (normalisedPath === "/") return null;

  // Find current item based on path
  const currentItem = useMemo(() => {
    const sorted = [...allAdminDestinations].sort((a, b) => b.url.split("?")[0].length - a.url.split("?")[0].length);
    return sorted.find(i => {
      const path = i.url.split("?")[0].replace(/\/$/, "") || "/";
      return path === "/" ? normalisedPath === "/" : normalisedPath === path || normalisedPath.startsWith(path + "/");
    });
  }, [normalisedPath]);

  if (!currentItem) return null;

  // Find related items (same section, but not the current item)
  const relatedItems = useMemo(() => {
    const sectionItems = allAdminDestinations.filter(i => 
      i.section === currentItem.section && 
      i.url.split("?")[0] !== currentItem.url.split("?")[0] && 
      i.title !== currentItem.title &&
      !i.url.includes('?panel=') && 
      !i.url.includes('?tab=')      
    );
    
    const unique = Array.from(new Map(sectionItems.map(item => [item.title, item])).values());
    return unique.slice(0, 4);
  }, [currentItem]);

  if (relatedItems.length === 0) return null;

  return (
    <div className="mt-14 mb-10 pt-8 border-t border-border/50 w-full animate-fade-in">
      <div className="flex items-center gap-2 mb-5 px-1">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Compass className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Suggested in <span className="text-foreground font-bold">{currentItem.section}</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {relatedItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link 
              key={idx} 
              href={item.url}
              className="group relative flex flex-col p-4 border border-border/60 bg-card/60 backdrop-blur-md rounded-2xl hover:border-primary/40 hover:bg-card/95 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all duration-300 shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors mb-1">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
