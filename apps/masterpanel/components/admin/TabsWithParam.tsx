"use client";
import * as React from "react";
import { Tabs } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";

interface Props extends Omit<React.ComponentProps<typeof Tabs>, "value" | "onValueChange" | "defaultValue"> {
  defaultTab: string;
  basePath: string;
  children: React.ReactNode;
}

/** Tabs whose active value is synced with the `?tab=` URL search param. */
export function TabsWithParam({ defaultTab, basePath, children, className, ...rest }: Props) {
  const [tab, setTab] = useTabParam(defaultTab, basePath);
  // Hide the immediate TabsList (page-level top tab bar) — navigation is via
  // the admin sidebar sub-menu. Inner/nested Tabs are unaffected.
  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className={`[&>[role=tablist]]:hidden ${className ?? ""}`}
      {...rest}
    >
      {children}
    </Tabs>
  );
}
// code:4ce0
