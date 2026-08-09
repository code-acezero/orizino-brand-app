"use client";
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Standard search input with leading icon. Full-width by default; wrap with a
 *  max-width utility to constrain. */
const SearchInput: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
  disabled,
  ...aria
}) => (
  <div className={cn("relative w-full", className)}>
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9"
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label={aria["aria-label"] ?? placeholder}
    />
  </div>
);

export default SearchInput;
// code:4ce0
