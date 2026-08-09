"use client";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import gsap from "gsap";
import ZoomableImage from "@/components/product/ZoomableImage";

interface InfinityGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const MIN_CARDS = 12;

const AUTO_PLAY_INTERVAL = 3500; // ms between auto-advances
const AUTO_PLAY_IDLE_DELAY = 5000; // ms of inactivity before auto-play resumes

const InfinityGallery: React.FC<InfinityGalleryProps> = ({ images, productName, discount = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const bgRef1 = useRef<HTMLDivElement>(null);
  const bgRef2 = useRef<HTMLDivElement>(null);
  const currentBgRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const animRef = useRef<{ seamlessLoop: gsap.core.Timeline; scrub: gsap.core.Tween } | null>(null);
  const isMobile = useIsMobile();
  const touchStartX = useRef(0);
  const spacing = 0.1;
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(true);

  // Duplicate images to ensure enough cards for GSAP seamless loop
  const expandedImages = useMemo(() => {
    if (images.length >= MIN_CARDS) return images;
    const result: string[] = [];
    while (result.length < MIN_CARDS) {
      result.push(...images);
    }
    return result.slice(0, Math.max(MIN_CARDS, images.length));
  }, [images]);

  const updateBackground = useCallback((url: string) => {
    const nextIdx = (currentBgRef.current + 1) % 2;
    const nextBg = nextIdx === 0 ? bgRef1.current : bgRef2.current;
    const curBg = currentBgRef.current === 0 ? bgRef1.current : bgRef2.current;
    if (!nextBg || !curBg) return;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      nextBg.style.backgroundImage = `url(${url})`;
      nextBg.style.opacity = "1";
      curBg.style.opacity = "0";
      currentBgRef.current = nextIdx;
    };
  }, []);

  useEffect(() => {
    if (!cardsRef.current || expandedImages.length < 2) return;

    const cards = Array.from(cardsRef.current.children) as HTMLElement[];
    if (cards.length === 0) return;

    if (bgRef1.current) {
      bgRef1.current.style.backgroundImage = `url(${images[0]})`;
      bgRef1.current.style.opacity = "1";
    }

    const blurVal = isMobile ? "0px" : "4px";
    const overlap = Math.ceil(1 / spacing);
    const startTime = cards.length * spacing + 0.5;
    const loopTime = (cards.length + overlap) * spacing + 1;

    const rawSequence = gsap.timeline({ paused: true });
    const seamlessLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() {
        if (this._time === this._dur) {
          this._tTime += this._dur - 0.01;
        }
      },
    });

    const l = cards.length + overlap * 2;
    gsap.set(cards, { xPercent: 400, autoAlpha: 0, scale: 0 });

    for (let i = 0; i < l; i++) {
      const index = i % cards.length;
      const item = cards[index];
      const time = i * spacing;

      rawSequence.fromTo(item,
        { scale: 0.5, autoAlpha: 0.3, zIndex: 1, filter: `blur(${blurVal})` },
        { scale: 1.5, autoAlpha: 1, zIndex: 100, filter: "blur(0px)", duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false },
        time
      ).fromTo(item,
        { xPercent: 450 },
        { xPercent: -450, duration: 1, ease: "none", immediateRender: false },
        time
      );
    }

    rawSequence.time(startTime);
    seamlessLoop.to(rawSequence, { time: loopTime, duration: loopTime - startTime, ease: "none" })
      .fromTo(rawSequence, { time: overlap * spacing + 1 }, { time: startTime, duration: startTime - (overlap * spacing + 1), immediateRender: false, ease: "none" });

    const scrub = gsap.to(seamlessLoop, { totalTime: 0, duration: 0.5, ease: "power1.out", paused: true });

    animRef.current = { seamlessLoop, scrub };

    // Auto-advance to first visible position
    const initTime = gsap.utils.snap(spacing, spacing * 2);
    scrub.vars.totalTime = initTime;
    scrub.invalidate().restart();

    return () => {
      seamlessLoop.kill();
      scrub.kill();
      rawSequence.kill();
    };
  }, [expandedImages, isMobile, images, updateBackground]);

  const scrubTo = useCallback((totalTime: number) => {
    if (!animRef.current) return;
    const { seamlessLoop, scrub } = animRef.current;
    const snapped = gsap.utils.snap(spacing, totalTime);
    scrub.vars.totalTime = snapped;
    scrub.invalidate().restart();

    const totalDuration = seamlessLoop.duration();
    const progress = ((snapped % totalDuration) + totalDuration) % totalDuration / totalDuration;
    let idx = Math.round(progress * images.length) % images.length;
    if (idx < 0) idx += images.length;
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      updateBackground(images[idx]);
    }
  }, [images, activeIndex, updateBackground]);

  // Pause auto-play on user interaction, resume after idle
  const pauseAutoPlay = useCallback(() => {
    setAutoPlaying(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setAutoPlaying(true), AUTO_PLAY_IDLE_DELAY);
  }, []);

  const goNext = useCallback(() => {
    if (!animRef.current) return;
    scrubTo(animRef.current.scrub.vars.totalTime + spacing);
  }, [scrubTo]);

  const goPrev = useCallback(() => {
    if (!animRef.current) return;
    scrubTo(animRef.current.scrub.vars.totalTime - spacing);
  }, [scrubTo]);

  // Auto-play effect
  useEffect(() => {
    if (!autoPlaying || lightboxOpen || images.length <= 1) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
      return;
    }
    autoPlayTimer.current = setInterval(() => {
      goNext();
    }, AUTO_PLAY_INTERVAL);
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [autoPlaying, lightboxOpen, goNext, images.length]);

  // Cleanup idle timer
  useEffect(() => {
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    pauseAutoPlay();
  }, [pauseAutoPlay]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goPrev();
    }
  }, [goNext, goPrev]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    pauseAutoPlay();
    if (e.deltaY > 0 || e.deltaX > 0) goNext();
    else goPrev();
  }, [goNext, goPrev, pauseAutoPlay]);

  // Simple fallback for single image
  if (images.length <= 1) {
    return (
      <div className="relative rounded-3xl overflow-hidden aspect-square glass cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
        <img src={images[0]} alt={productName} className="w-full h-full object-cover" />
        {discount > 0 && (
          <span className="absolute top-4 left-4 text-sm font-semibold py-1 px-4 btn-pill bg-destructive text-destructive-foreground">-{discount}%</span>
        )}
        <LightboxModal open={lightboxOpen} onClose={() => setLightboxOpen(false)} images={images} productName={productName} startIndex={0} />
      </div>
    );
  }

  const cardWidth = isMobile ? "55vw" : "14rem";
  const cardHeight = isMobile ? "45vh" : "20rem";

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl"
        style={{ height: isMobile ? "60vh" : "500px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Blurred background */}
        <div className="absolute inset-0 z-0">
          <div ref={bgRef1} className="absolute -inset-[10%] w-[120%] h-[120%] bg-cover bg-center" style={{ filter: "blur(40px) brightness(0.4)", opacity: 0, transition: "opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          <div ref={bgRef2} className="absolute -inset-[10%] w-[120%] h-[120%] bg-cover bg-center" style={{ filter: "blur(40px) brightness(0.4)", opacity: 0, transition: "opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        </div>

        {/* Noise overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

        {/* Cards */}
        <div className="absolute inset-0 z-10 overflow-hidden" style={{ perspective: "1000px" }}>
          <ul
            ref={cardsRef}
            className="absolute m-0 p-0"
            style={{ width: cardWidth, height: cardHeight, top: "50%", left: "50%", transform: "translate(-50%, -50%)", transformStyle: "preserve-3d" }}
          >
            {expandedImages.map((img, i) => (
              <li
                key={i}
                className="absolute inset-0 list-none rounded-xl overflow-hidden bg-cover bg-center cursor-pointer"
                style={{
                  backgroundImage: `url(${img})`,
                  boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
                  backfaceVisibility: "hidden",
                  willChange: "transform, opacity",
                  transition: "opacity 0.6s ease-in-out",
                }}
                onClick={() => {
                  const realIndex = i % images.length;
                  setActiveIndex(realIndex);
                  setLightboxOpen(true);
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-0 w-full px-4 text-center z-10">
                  <span className="block text-[0.7rem] text-white/70 tracking-widest uppercase mb-1">Image {(i % images.length) + 1}</span>
                  <h3 className="text-base font-display font-medium text-white drop-shadow-lg">{productName}</h3>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Left arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); pauseAutoPlay(); goPrev(); }}
          className="absolute left-1 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-1 text-white/60 hover:text-white active:text-white transition-colors duration-200 hover:scale-110 active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <ChevronLeft className="w-7 h-7 sm:w-7 sm:h-7 drop-shadow-lg" />
        </button>

        {/* Right arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); pauseAutoPlay(); goNext(); }}
          className="absolute right-1 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-1 text-white/60 hover:text-white active:text-white transition-colors duration-200 hover:scale-110 active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <ChevronRight className="w-7 h-7 sm:w-7 sm:h-7 drop-shadow-lg" />
        </button>

        {/* Counter */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
          <span className="text-white/50 text-xs font-medium tracking-wider">{activeIndex + 1} / {images.length}</span>
        </div>

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-sm font-semibold py-1 px-4 btn-pill bg-destructive text-destructive-foreground">-{discount}%</span>
        )}

        {/* Zoom hint */}
        <div className="absolute top-4 right-4 z-20 glass rounded-full p-2 opacity-60">
          <ZoomIn className="w-4 h-4 text-white" />
        </div>
      </div>

      <LightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        productName={productName}
        startIndex={activeIndex}
      />
    </>
  );
};

// Reusable lightbox
const LightboxModal: React.FC<{
  open: boolean;
  onClose: () => void;
  images: string[];
  productName: string;
  startIndex: number;
}> = ({ open, onClose, images, productName, startIndex }) => {
  const [selected, setSelected] = useState(startIndex);
  useEffect(() => { if (open) setSelected(startIndex); }, [open, startIndex]);

  const navigate = (dir: 1 | -1) => setSelected((p) => (p + dir + images.length) % images.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center"
          onClick={onClose}
        >
          <button className="absolute top-6 right-6 glass rounded-full p-3 text-foreground hover:text-primary z-10" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute left-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 text-foreground hover:text-primary z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigate(1); }} className="absolute right-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 text-foreground hover:text-primary z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <motion.div
            key={selected}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ZoomableImage
              src={images[selected]}
              alt={productName}
              className="w-full h-full max-w-[90vw] max-h-[85vh]"
              zoomScale={3}
            />
          </motion.div>
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setSelected(i); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === selected ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfinityGallery;
// code:4ce0
