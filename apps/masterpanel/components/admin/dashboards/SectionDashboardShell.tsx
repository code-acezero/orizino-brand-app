"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export default function SectionDashboardShell({
  title, description, icon: Icon, color, children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
            {title}
          </motion.h1>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
// code:4ce0
