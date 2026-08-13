"use client";
import React from "react";
import { Inbox } from "lucide-react";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface EmptyProps {
  cols: number;
  message?: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty-state row for a `<TableBody>`. */
export const TableEmptyRow: React.FC<EmptyProps> = ({
  cols,
  message = "No results found",
  hint,
  icon,
  action,
  className,
}) => (
  <TableRow className="hover:bg-transparent">
    <TableCell colSpan={cols} className={cn("py-16 text-center", className)}>
      <div className="flex flex-col items-center gap-3.5 text-muted-foreground max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground/80 shadow-sm">
          {icon ?? <Inbox className="w-5 h-5 text-primary/70" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground tracking-tight">{message}</p>
          {hint && <p className="text-xs text-muted-foreground/80 leading-relaxed">{hint}</p>}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </TableCell>
  </TableRow>
);

interface LoadingProps {
  cols: number;
  rows?: number;
}

/** Loading skeleton row for a `<TableBody>`. */
export const TableLoadingRow: React.FC<LoadingProps> = ({ cols, rows = 8 }) => (
  <TableRow className="hover:bg-transparent">
    <TableCell colSpan={cols} className="p-0">
      <TableSkeleton rows={rows} cols={cols} />
    </TableCell>
  </TableRow>
);

/** Full-panel empty state (not inside a table). */
export const EmptyState: React.FC<Omit<EmptyProps, "cols">> = ({
  message = "Nothing here yet",
  hint,
  icon,
  action,
  className,
}) => (
  <div className={cn("flex flex-col items-center justify-center gap-3.5 py-16 text-center max-w-md mx-auto", className)}>
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 via-muted/40 to-transparent border border-border/60 flex items-center justify-center text-primary/80 shadow-sm">
      {icon ?? <Inbox className="w-6 h-6" />}
    </div>
    <div className="space-y-1">
      <p className="text-base font-semibold text-foreground tracking-tight">{message}</p>
      {hint && <p className="text-xs text-muted-foreground/80 leading-relaxed">{hint}</p>}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default TableEmptyRow;
// code:4ce0
