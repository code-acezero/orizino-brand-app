"use client";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage, ALL_LANGUAGES } from "@/contexts/LanguageContext";
import { Check, ChevronDown, Languages } from "lucide-react";

const LanguageMenu: React.FC<{ variant?: "footer" | "default" }> = ({ variant = "footer" }) => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const active = ALL_LANGUAGES.find((l) => l.code === language) || ALL_LANGUAGES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors ${variant === "footer" ? "border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground" : "bg-secondary/50 hover:bg-secondary"}`}>
          <Languages className="w-3 h-3" />
          <span>{active.nativeLabel}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1 rounded-2xl">
        <div className="max-h-64 overflow-y-auto">
          {ALL_LANGUAGES.map((l) => {
            const isActive = l.code === language;
            return (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold uppercase text-[10px] w-6">{l.code}</span>
                  <span className="truncate">{l.nativeLabel}</span>
                  <span className="text-muted-foreground truncate text-[10px]">{l.label}</span>
                </span>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageMenu;
// code:4ce0
