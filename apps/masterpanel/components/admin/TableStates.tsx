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
    <TableCell colSpan={cols} className={cn("py-12 text-center", className)}>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/70">
          {icon ?? <Inbox className="w-5 h-5" />}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action && <div className="mt-1">{action}</div>}
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
  <div className={cn("flex flex-col items-center justify-center gap-3 py-14 text-center", className)}>
    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/70">
      {icon ?? <Inbox className="w-5 h-5" />}
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground max-w-sm">{hint}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);

export default TableEmptyRow;
// code:4ce0
