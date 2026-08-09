"use client";
import { useAdminPresence } from "@/hooks/use-admin-presence";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function PresenceAvatars({ currentName }: { currentName?: string }) {
  const { user } = useAuth();
  const presence = useAdminPresence(currentName);
  const others = presence.filter((p) => p.id !== user?.id);
  if (others.length === 0) return null;
  const shown = others.slice(0, 3);
  const extra = others.length - shown.length;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden md:flex -space-x-1.5 items-center">
            {shown.map((p) => (
              <div
                key={p.id}
                className="relative w-6 h-6 rounded-full bg-gradient-to-br from-primary/70 to-primary/40 ring-2 ring-background flex items-center justify-center text-[9px] font-semibold text-primary-foreground"
                title={p.name}
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials(p.name)
                )}
              </div>
            ))}
            {extra > 0 && (
              <div className="relative w-6 h-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[9px] font-semibold text-foreground">
                +{extra}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="text-xs">
            <p className="font-medium mb-1">Online now</p>
            {others.map((p) => (
              <p key={p.id} className="text-muted-foreground">
                {p.name}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
// code:4ce0
