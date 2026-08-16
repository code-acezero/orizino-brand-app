export type TicketStatusKey =
  | "requested"
  | "pending"
  | "assigned"
  | "open"
  | "in_progress"
  | "paused"
  | "on_hold"
  | "closed"
  | "resolved";

export interface TicketStatusInfo {
  key: TicketStatusKey;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
  isLiveChatable: boolean;
}

/**
 * Returns normalized status information for support tickets & conversations.
 * Correctly distinguishes unassigned tickets (Pending/Requested) from claimed tickets (Open/Assigned).
 */
export function getTicketStatusInfo(
  status: string | null | undefined,
  assignedTo?: string | null
): TicketStatusInfo {
  const s = (status || "").toLowerCase().trim();
  const hasAgent = Boolean(assignedTo && assignedTo.trim() !== "");

  // 1. Closed or Resolved
  if (s === "closed" || s === "resolved") {
    return {
      key: "closed",
      label: "Closed",
      badgeClass: "bg-secondary text-muted-foreground border-border/50",
      dotClass: "bg-muted-foreground",
      description: "Ticket resolved and closed",
      isLiveChatable: false,
    };
  }

  // 2. Paused or On Hold
  if (s === "paused" || s === "on_hold" || s === "hold") {
    return {
      key: "paused",
      label: "Paused",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
      dotClass: "bg-purple-500",
      description: "Discussion is temporarily on hold",
      isLiveChatable: false,
    };
  }

  // 3. Claimed / Assigned to a Live Agent
  if (hasAgent) {
    if (s === "assigned") {
      return {
        key: "assigned",
        label: "Assigned",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
        dotClass: "bg-sky-500",
        description: "Specialist is assigned and assisting",
        isLiveChatable: true,
      };
    }

    return {
      key: "open",
      label: "Open",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      dotClass: "bg-emerald-500",
      description: "Active conversation with specialist",
      isLiveChatable: true,
    };
  }

  // 4. Unassigned tickets (No admin has claimed it yet)
  if (s === "requested") {
    return {
      key: "requested",
      label: "Requested",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      dotClass: "bg-amber-500",
      description: "Request submitted — waiting for agent pickup",
      isLiveChatable: false,
    };
  }

  // Default unassigned state (even if db status column is 'open' or 'pending')
  return {
    key: "pending",
    label: "Awaiting Agent",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    dotClass: "bg-amber-500 animate-pulse",
    description: "In queue — waiting for available agent",
    isLiveChatable: false,
  };
}
