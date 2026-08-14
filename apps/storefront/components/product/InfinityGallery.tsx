"use client";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import gsap from "gsap";
import ProductLightboxModal from "./ProductLightboxModal";

interface InfinityGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const MIN_CARDS = 12;
const AUTO_PLAY_INTERVAL = 3500;
const AUTO_PLAY_IDLE_DELAY = 5000;

const InfinityGallery: React.FC<InfinityGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
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

  // Duplicate images for seamless GSAP infinite cylinder loop
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

    const blurVal = isMobile ? "0px" : "3px";
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

      rawSequence
        .fromTo(
          item,
          { scale: 0.55, autoAlpha: 0.35, zIndex: 1, filter: `blur(${blurVal})` },
          {
            scale: 1.45,
            autoAlpha: 1,
            zIndex: 100,
            filter: "blur(0px)",
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut",
            immediateRender: false,
          },
          time
        )
        .fromTo(
          item,
          { xPercent: 450 },
          { xPercent: -450, duration: 1, ease: "none", immediateRender: false },
          time
        );
    }

    rawSequence.time(startTime);
    seamlessLoop
      .to(rawSequence, { time: loopTime, duration: loopTime - startTime, ease: "none" })
      .fromTo(
        rawSequence,
        { time: overlap * spacing + 1 },
        {
          time: startTime,
          duration: startTime - (overlap * spacing + 1),
          immediateRender: false,
          ease: "none",
        }
      );

    const scrub = gsap.to(seamlessLoop, {
      totalTime: 0,
      duration: 0.5,
      ease: "power1.out",
      paused: true,
    });

    animRef.current = { seamlessLoop, scrub };

    const initTime = gsap.utils.snap(spacing, spacing * 2);
    scrub.vars.totalTime = initTime;
    scrub.invalidate().restart();

    return () => {
      seamlessLoop.kill();
      scrub.kill();
      rawSequence.kill();
    };
  }, [expandedImages, isMobile, images, updateBackground]);

  const scrubTo = useCallback(
    (totalTime: number) => {
      if (!animRef.current) return;
      const { seamlessLoop, scrub } = animRef.current;
      const snapped = gsap.utils.snap(spacing, totalTime);
      scrub.vars.totalTime = snapped;
      scrub.invalidate().restart();

      const totalDuration = seamlessLoop.duration();
      const progress =
        (((snapped % totalDuration) + totalDuration) % totalDuration) / totalDuration;
      let idx = Math.round(progress * images.length) % images.length;
      if (idx < 0) idx += images.length;
      if (idx !== activeIndex) {
        setActiveIndex(idx);
        updateBackground(images[idx]);
      }
    },
    [images, activeIndex, updateBackground]
  );

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

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartX.current = e.changedTouches[0].clientX;
      pauseAutoPlay();
    },
    [pauseAutoPlay]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 40) {
        dx < 0 ? goNext() : goPrev();
      }
    },
    [goNext, goPrev]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      pauseAutoPlay();
      if (e.deltaY > 0 || e.deltaX > 0) goNext();
      else goPrev();
    },
    [goNext, goPrev, pauseAutoPlay]
  );

  // Single Image Fallback
  if (images.length <= 1) {
    return (
      <div
        className="relative rounded-3xl overflow-hidden aspect-square bg-card border border-border/60 cursor-zoom-in"
        onClick={() => setLightboxOpen(true)}
      >
        <img src={images[0]} alt={productName} className="w-full h-full object-cover" />
        {discount > 0 && (
          <span className="absolute top-4 left-4 text-xs font-bold py-1 px-3 rounded-full bg-rose-500 text-white font-mono">
            -{discount}%
          </span>
        )}
        <ProductLightboxModal
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={images}
          productName={productName}
          startIndex={0}
        />
      </div>
    );
  }

  const cardWidth = isMobile ? "56vw" : "14.5rem";
  const cardHeight = isMobile ? "44vh" : "20rem";

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-black"
        style={{ height: isMobile ? "58vh" : "500px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Ambient Blurred Atmosphere */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            ref={bgRef1}
            className="absolute -inset-[10%] w-[120%] h-[120%] bg-cover bg-center"
            style={{
              filter: "blur(40px) brightness(0.35)",
              opacity: 0,
              transition: "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <div
            ref={bgRef2}
            className="absolute -inset-[10%] w-[120%] h-[120%] bg-cover bg-center"
            style={{
              filter: "blur(40px) brightness(0.35)",
              opacity: 0,
              transition: "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        {/* 3D Infinite Cylinder Cards */}
        <div className="absolute inset-0 z-10 overflow-hidden" style={{ perspective: "1100px" }}>
          <ul
            ref={cardsRef}
            className="absolute m-0 p-0"
            style={{
              width: cardWidth,
              height: cardHeight,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              transformStyle: "preserve-3d",
            }}
          >
            {expandedImages.map((img, i) => (
              <li
                key={i}
                className="absolute inset-0 list-none rounded-2xl overflow-hidden bg-cover bg-center cursor-pointer border border-white/20"
                style={{
                  backgroundImage: `url(${img})`,
                  backfaceVisibility: "hidden",
                  willChange: "transform, opacity",
                  transition: "opacity 0.6s ease-in-out",
                }}
                onClick={() => {
                  const realIndex = i % images.length;
                  setActiveIndex(realIndex);
                  setLightboxOpen(true);
                }}
              />
            ))}
          </ul>
        </div>

        {/* Left / Right Navigation Controls */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            goPrev();
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            goNext();
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dynamic Telemetry & Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white/80 text-[11px] font-mono font-semibold border border-white/15">
            {activeIndex + 1} / {images.length}
          </span>
        </div>

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-xs font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white font-mono">
            -{discount}%
          </span>
        )}

        {/* Zoom trigger hint */}
        <div
          className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md rounded-full p-2 text-white/80 hover:text-white border border-white/15 cursor-pointer transition-colors"
          onClick={() => setLightboxOpen(true)}
        >
          <ZoomIn className="w-4 h-4" />
        </div>
      </div>

      <ProductLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        productName={productName}
        startIndex={activeIndex}
      />
    </>
  );
};

export default InfinityGallery;
