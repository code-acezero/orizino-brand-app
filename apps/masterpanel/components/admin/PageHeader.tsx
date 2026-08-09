"use client";
import React from "react";

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared page header for admin pages. Standardizes title block and actions row.
 */
const PageHeader: React.FC<Props> = ({ title, description, icon, actions, children }) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
        {description && <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{description}</p>}
        {children}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export default PageHeader;
// code:4ce0
