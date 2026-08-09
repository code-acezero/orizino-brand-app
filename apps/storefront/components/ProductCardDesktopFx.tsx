"use client";
// Desktop-only visual FX for ProductCard: 3D tilt springs, glare, inner shadow.
// Split out so mobile bundles never pay the framer-motion spring cost.
import React, { useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { trackInteraction } from "@/lib/track-interaction";

interface Props {
  productId: string;
  children: (ctx: {
    imgStyle: React.CSSProperties | Record<string, unknown>;
    textStyle: React.CSSProperties | Record<string, unknown>;
    imgWrapperStyle: React.CSSProperties;
    glareEl: React.ReactNode;
    innerShadowEl: React.ReactNode;
  }) => React.ReactNode;
}

const springCfg = { stiffness: 260, damping: 20 };

const ProductCardDesktopFx: React.FC<Props> = ({ productId, children }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springCfg);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springCfg);
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springCfg);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springCfg);
  const imgX = useSpring(useTransform(mouseX, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 22 });
  const imgY = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 22 });
  const shadowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [12, -12]), springCfg);
  const shadowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springCfg);
  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([sx, sy]) =>
      `${sx}px ${sy}px 30px -8px hsl(var(--primary) / 0.18), ${(sx as number) * 0.5}px ${(sy as number) * 0.5}px 60px -15px hsl(var(--foreground) / 0.1)`
  );
  const textX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 24 });
  const textY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-3, 3]), { stiffness: 200, damping: 24 });
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, hsl(var(--primary) / 0.15) 0%, transparent 60%)`
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);
  const handleMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      trackInteraction(productId, "hover", { source: "product_card" });
    }, 450);
  }, [productId]);
  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800, transformStyle: "preserve-3d", boxShadow } as any}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group glass rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col h-full"
    >
      {children({
        imgStyle: { x: imgX, y: imgY, scale: 1.12 },
        textStyle: { x: textX, y: textY, translateZ: 30 },
        imgWrapperStyle: { transformStyle: "preserve-3d" },
        glareEl: (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: glareBackground }}
          />
        ),
        innerShadowEl: null,
      })}
    </motion.div>
  );
};

export default ProductCardDesktopFx;
// code:4ce0
