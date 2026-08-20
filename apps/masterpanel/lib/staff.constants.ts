export const STAFF_ROLES = [
  "master_admin",
  "admin",
  "moderator",
  "manager",
  "maintainer",
  "support",
  "marketing",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  manager: "Manager",
  moderator: "Moderator",
  maintainer: "Maintainer",
  support: "Customer Support",
  marketing: "Marketing",
};

export const ROLE_COLORS: Record<StaffRole, string> = {
  master_admin: "#f59e0b",
  admin: "#6366f1",
  manager: "#8b5cf6",
  moderator: "#3b82f6",
  maintainer: "#10b981",
  support: "#06b6d4",
  marketing: "#ec4899",
};
