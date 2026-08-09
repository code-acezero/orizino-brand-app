"use client";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Command as CommandPrimitive } from "cmdk";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Command,
} from "@/components/ui/command";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { adminNav, allAdminDestinations } from "./admin-nav";
import { useAdminRole } from "@/components/AdminRoute";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, X } from "lucide-react";

const RECENT_KEY = "admin:recent-cmd";
const MAX_RECENT = 6;

function getRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(url: string) {
  try {
    const cur = getRecents().filter((u) => u !== url);
    cur.unshift(url);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
  } catch {}
}

export function AdminCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const role = useAdminRole();
  const isMobile = useIsMobile();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (url: string) => {
    pushRecent(url);
    onOpenChange(false);
    navigate(url);
  };

  const recents = getRecents()
    .map((url) => allAdminDestinations.find((d) => d.url === url))
    .filter(Boolean) as typeof allAdminDestinations;

  const visibleRecents =
    role === "moderator" ? recents.filter((r) => !r.adminOnly) : recents;

  const body = (
    <>
      <CommandEmpty>No results.</CommandEmpty>

      {visibleRecents.length > 0 && (
        <>
          <CommandGroup heading="Recent">
            {visibleRecents.map((item) => (
              <CommandItem
                key={"r-" + item.url}
                value={`recent ${item.title} ${item.parent ?? ""} ${item.section}`}
                onSelect={() => go(item.url)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{item.title}</span>
                {item.parent && (
                  <span className="ml-1.5 text-xs text-muted-foreground truncate">· {item.parent}</span>
                )}
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {item.section}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>
      )}

      {adminNav.map((section, idx) => {
        const items =
          role === "moderator" ? section.items.filter((i) => !i.adminOnly) : section.items;
        if (items.length === 0) return null;
        return (
          <div key={section.label}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={section.label}>
              {items.flatMap((item) => [
                <CommandItem
                  key={item.url + item.title}
                  value={`${item.title} ${item.keywords ?? ""} ${item.description ?? ""}`}
                  onSelect={() => go(item.url)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{item.title}</span>
                  {item.description && !isMobile && (
                    <span className="ml-auto text-xs text-muted-foreground truncate">
                      {item.description}
                    </span>
                  )}
                </CommandItem>,
                ...(item.children ?? []).map((child) => (
                  <CommandItem
                    key={child.url}
                    value={`${item.title} ${child.title} ${child.keywords ?? ""}`}
                    onSelect={() => go(child.url)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground/40" />
                    <span className="text-muted-foreground truncate">
                      {item.title} <span className="text-muted-foreground/50">›</span>{" "}
                    </span>
                    <span className="ml-1 text-foreground truncate">{child.title}</span>
                  </CommandItem>
                )),
              ])}
            </CommandGroup>
          </div>
        );
      })}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 h-[88dvh] rounded-t-3xl border-t border-border/60 bg-background flex flex-col [&>button.absolute]:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Grabber */}
          <div className="pt-2 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 pt-1 pb-3 flex items-center gap-2 shrink-0">
            <h2 className="font-display text-base font-bold flex-1">Quick Jump</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command className="flex-1 min-h-0 bg-transparent [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-[14px] [&_[cmdk-item]_svg]:h-[18px] [&_[cmdk-item]_svg]:w-[18px] [&_[cmdk-item][data-selected=true]]:bg-primary/10 [&_[cmdk-item][data-selected=true]]:text-primary">
            {/* Search input — large, glass */}
            <div className="px-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <CommandInputRaw placeholder="Search admin… orders, products, settings" />
              </div>
            </div>

            <CommandList className="flex-1 overflow-y-auto px-1 pb-3 max-h-none">
              {body}
            </CommandList>
          </Command>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to anywhere…  (try: orders, branding, ads)" />
      <CommandList>{body}</CommandList>
    </CommandDialog>
  );
}

// Compact input that hooks into surrounding <Command> (cmdk auto-wires)
function CommandInputRaw(props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      autoFocus
      className="w-full h-11 pl-9 pr-3 text-[14px] rounded-2xl bg-muted/50 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/70"
      {...props}
    />
  );
}
// code:4ce0
