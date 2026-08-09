"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandLoader from "./loaders/BrandLoader";

interface SplashScreenProps {
  visible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <BrandLoader show withBackdrop size={80} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
// code:4ce0
