"use client";
import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { toast } from "@/lib/app-toast";

interface ShareButtonProps {
  url?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ url, title, size = "sm", className = "" }) => {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = title || (typeof document !== "undefined" ? document.title : "");

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // User cancelled native share sheet
        if (err?.name === "AbortError") return;
      }
    }

    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [shareUrl, shareTitle]);

  const iconSize = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const btnSize = size === "lg" ? "p-3" : size === "md" ? "p-2.5" : "p-2";

  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={handleShare}
      className={`${btnSize} rounded-xl border border-border/40 hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all duration-200 relative !min-h-0 !min-w-0 shadow-xs shrink-0 ${className}`}
      aria-label="Share product"
      title="Share"
    >
      <Share2 className={iconSize} />
    </motion.button>
  );
};

export default React.memo(ShareButton);
