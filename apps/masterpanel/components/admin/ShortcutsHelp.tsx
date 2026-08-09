"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ADMIN_SHORTCUTS } from "@/hooks/use-admin-hotkeys";

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Keyboard shortcuts</SheetTitle>
        </SheetHeader>
        <ul className="mt-6 space-y-2">
          {ADMIN_SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0"
            >
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-muted border border-border/60 text-[11px] font-mono font-medium">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
// code:4ce0
