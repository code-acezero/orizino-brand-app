"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { useRealtimeVisitors } from "@/hooks/use-realtime-visitors";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LiveVisitorCounterProps {
  page?: string;
  variant?: "floating" | "inline" | "badge";
}

const LiveVisitorCounter: React.FC<LiveVisitorCounterProps> = ({
  page = "/home",
  variant = "floating",
}) => {
  const { user } = useAuth();

  const { data: isAdmin } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      return data ?? false;
    },
    enabled: !!user,
  });

  const count = useRealtimeVisitors(isAdmin ? page : null);

  if (!isAdmin) return null;

  if (variant === "badge") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-foreground font-medium">{count}</span>
        <span className="text-muted-foreground">online</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>
          <span className="text-foreground font-semibold">{count}</span>{" "}
          {count === 1 ? "person" : "people"} viewing now
        </span>
      </div>
    );
  }

  // Floating variant
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-6 z-40 lg:bottom-6"
        >
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-border/50">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {count} {count === 1 ? "visitor" : "visitors"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                browsing right now
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiveVisitorCounter;
// code:4ce0
