"use client";
import React, { createContext, useContext, useState } from "react";
export type BottomNavProductTray = { items?: { id: string; label: string; image?: string; price?: number; href: string }[] };

interface LayoutContextType {
  productTray: BottomNavProductTray | undefined;
  setProductTray: (tray: BottomNavProductTray | undefined) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  productTray: undefined,
  setProductTray: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productTray, setProductTray] = useState<BottomNavProductTray | undefined>();
  return (
    <LayoutContext.Provider value={{ productTray, setProductTray }}>
      {children}
    </LayoutContext.Provider>
  );
};
// code:4ce0
