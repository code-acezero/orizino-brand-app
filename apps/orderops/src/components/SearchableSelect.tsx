import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@orizino/ui/utils";

export interface SearchableOption {
  value: string;
  label?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SearchableOption)[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  maxHeightClass?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
  maxHeightClass = "max-h-48",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));
  }, [options]);

  // Filter options based on search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (o) => o.value.toLowerCase().includes(q) || (o.label && o.label.toLowerCase().includes(q)),
    );
  }, [normalizedOptions, search]);

  const selectedOption = normalizedOptions.find((o) => o.value.toLowerCase() === value.toLowerCase());
  const displayLabel = selectedOption?.label || selectedOption?.value || value || placeholder;

  // Handle outside click without blocking page scroll
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-2xs transition-all hover:border-zinc-500 focus:outline-none cursor-pointer",
          open && "border-zinc-400 bg-card/90",
          className,
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2", open && "rotate-180")}
        />
      </button>

      {/* Dropdown Menu Popup (Never locks body scroll!) */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border/80 bg-[#18181b] text-foreground p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Mini Search Bar */}
          <div className="relative mb-1.5 px-1 pt-1">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-7 rounded-xl bg-card border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-zinc-400 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className={cn("overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar", maxHeightClass)}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No matches found</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-7 pr-3 text-xs sm:text-sm font-medium transition-colors hover:bg-zinc-800 text-left",
                      isSelected && "bg-zinc-800/90 text-white font-bold",
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-emerald-400">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    )}
                    <span className="truncate">{opt.label || opt.value}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
