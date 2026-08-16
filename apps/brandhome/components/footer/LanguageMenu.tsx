"use client";
import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage, ALL_LANGUAGES, type LangDef } from "@/contexts/LanguageContext";
import { Check, ChevronDown, Languages, Search, Globe } from "lucide-react";

const LanguageMenu: React.FC<{ variant?: "footer" | "default" | "nav" }> = ({ variant = "footer" }) => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<"All" | "Asia" | "Europe">("All");

  const active = ALL_LANGUAGES.find((l) => l.code === language) || ALL_LANGUAGES[0];

  const filteredLanguages = useMemo(() => {
    return ALL_LANGUAGES.filter((l) => {
      const matchesRegion =
        regionFilter === "All" ||
        (regionFilter === "Asia" && (l.region === "Asia" || l.region === "Middle East")) ||
        (regionFilter === "Europe" && l.region === "Europe");

      if (!matchesRegion) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      return (
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.countryNames && l.countryNames.some((c) => c.toLowerCase().includes(q)))
      );
    });
  }, [search, regionFilter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          translate="no"
          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer select-none notranslate skiptranslate ${
            variant === "footer"
              ? "border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground bg-background/50"
              : variant === "nav"
              ? "bg-secondary/40 hover:bg-secondary/70 text-foreground border border-border/30"
              : "bg-secondary/50 hover:bg-secondary text-foreground"
          }`}
          aria-label="Select website language"
        >
          <Languages className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold notranslate" translate="no">{active.nativeLabel}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" translate="no" className="w-72 p-2 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl notranslate skiptranslate">
        <div className="space-y-2 notranslate skiptranslate" translate="no">
          {/* Header Search */}
          <div className="relative notranslate" translate="no">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language or country..."
              translate="no"
              className="w-full h-8 pl-8 pr-2.5 rounded-xl bg-background/60 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary notranslate"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary/40 border border-border/30 text-[10px] notranslate" translate="no">
            {(["All", "Asia", "Europe"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegionFilter(r)}
                translate="no"
                className={`flex-1 py-1 rounded-md font-medium transition-colors notranslate ${
                  regionFilter === r
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Language List */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar notranslate" translate="no">
            {filteredLanguages.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4 notranslate">No languages found</p>
            ) : (
              filteredLanguages.map((l) => {
                const isActive = l.code === language;
                return (
                  <button
                    key={l.code}
                    type="button"
                    translate="no"
                    onClick={() => {
                      setLanguage(l.code);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left notranslate skiptranslate ${
                      isActive
                        ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                        : "hover:bg-muted/70 text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 notranslate" translate="no">
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 notranslate" translate="no">
                        {l.code}
                      </span>
                      <span className="truncate font-medium text-xs notranslate" translate="no">{l.nativeLabel}</span>
                      <span className="text-muted-foreground/70 truncate text-[10px] notranslate" translate="no">({l.label})</span>
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageMenu;
// code:4ce0
