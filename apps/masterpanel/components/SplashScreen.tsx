"use client";
import React from "react";

interface SplashScreenProps {
  visible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background pointer-events-none transition-opacity duration-500">
      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default SplashScreen;
// code:4ce0
