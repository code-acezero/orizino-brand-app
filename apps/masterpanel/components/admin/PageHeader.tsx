"use client";
import React from "react";

interface Props {
  title: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Executive shared page header for Master Panel admin pages.
 * Standardizes title block, badge indicator, and action toolbars.
 */
const PageHeader: React.FC<Props> = ({ title, description, badge, icon, actions, children }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-border/40">
    <div className="flex items-start gap-3.5 min-w-0">
      {icon && (
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground truncate">{title}</h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">{description}</p>}
        {children}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
// code:4ce0
