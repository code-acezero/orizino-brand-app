"use client";
interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

const FilterChips = ({ options, value, onChange }: FilterChipsProps) => {
  return (
    <div className="relative -mx-3 md:mx-0">
      {/* Edge fade on mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 md:hidden z-10"
        style={{
          background:
            "linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 pb-1 md:flex-wrap md:overflow-visible md:px-0 md:snap-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`snap-start shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-all active:scale-[0.97] ${
                isActive
                  ? "border-primary/60 bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.55)]"
                  : "border-border/60 bg-card/60 backdrop-blur-sm text-foreground/80 hover:bg-secondary/60 hover:border-primary/30"
              }`}
            >
              <span className="leading-none">{opt.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold leading-none ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChips;
export type { FilterOption, FilterChipsProps };
// code:4ce0
