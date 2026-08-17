"use client";
import { useEffect, useState, useRef } from "react";
import { Bot } from "lucide-react";

interface Props {
  form: any;
  widgetForm: any;
}

/* ── Water Eyes for Preview ── */
const PreviewWaterEyes = ({ renderSize }: { renderSize: number }) => {
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 3000;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 120);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(blinkTimer);
  }, []);

  const eyeWidth = Math.max(14, Math.round(renderSize * 0.26));
  const eyeHeight = Math.max(16, Math.round(renderSize * 0.32));
  const pupilSize = Math.max(7, Math.round(eyeWidth * 0.52));

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center gap-2 select-none pointer-events-none"
      style={{
        transform: `translate(${pupilPos.x * 0.4}px, ${pupilPos.y * 0.4}px)`,
        transition: "transform 0.15s ease-out",
      }}
    >
      {[0, 1].map((eyeIdx) => (
        <div
          key={eyeIdx}
          className="relative rounded-full overflow-hidden flex items-center justify-center"
          style={{
            width: eyeWidth,
            height: isBlinking ? 2 : eyeHeight,
            background: "radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.95), rgba(240,245,255,0.85) 60%, rgba(200,220,255,0.7) 100%)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.25), 0 0 8px rgba(255,255,255,0.4)",
            transition: "height 0.1s ease-in-out",
          }}
        >
          {!isBlinking && (
            <>
              {/* Bold Red Pupil */}
              <div
                className="rounded-full flex items-center justify-center relative"
                style={{
                  width: pupilSize,
                  height: pupilSize,
                  background: "radial-gradient(circle at 35% 30%, #ff4d4d, #dc2626 55%, #7f1d1d 95%)",
                  boxShadow: "0 0 6px rgba(220,38,38,0.7), inset 0 1px 2px rgba(255,255,255,0.4)",
                  transform: `translate(${pupilPos.x}px, ${pupilPos.y}px)`,
                  transition: "transform 0.08s ease-out",
                }}
              >
                {/* Specular Glint */}
                <div
                  className="absolute rounded-full bg-white"
                  style={{
                    width: Math.max(2, pupilSize * 0.35),
                    height: Math.max(2, pupilSize * 0.35),
                    top: "18%",
                    left: "22%",
                    boxShadow: "0 0 2px rgba(255,255,255,0.9)",
                  }}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default function BubbleLivePreview({ form, widgetForm }: Props) {
  const style = form.fab_bubble_style as "solid" | "transparent" | "glass" | "water";
  const c1 = form.fab_bubble_color || "#3b82f6";
  const c2 = form.fab_bubble_color2 || "#a855f7";
  const size = Math.max(48, Math.min(90, form.fab_size || 56));

  const floatingTexts: string[] = (widgetForm?.fab_floating_texts?.length
    ? widgetForm.fab_floating_texts
    : form.fab_underwater_texts) || ["MR. Slime", "Find your fit", "Track an order", "240+ GSM Cotton"];
  const greeting: string = widgetForm?.chat_greeting_guest || form.welcome_message || "Hey! Welcome to Orizino. I'm MR. Slime.";
  const agentName: string = form.name || "MR. Slime";
  const avatar = form.avatar_url ? form.avatar_url : ((process.env.NEXT_PUBLIC_SUPABASE_URL || "") + "/storage/v1/object/public/site-assets/ai-agent/mr-slime.jpg");
  const hoverLabel = form.fab_hover_label_text || "Chat with MR. Slime";
  const showHover = !!form.fab_show_hover_label;

  const [textIdx, setTextIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [displayMode, setDisplayMode] = useState<"eyes" | "text">("eyes");
  const [phase, setPhase] = useState<"idle" | "greeting">("idle");

  // Clean alternating display mode: alternates strictly between eyes and text (no avatar inside ball)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let current: "eyes" | "text" = "eyes";

    const cycle = () => {
      if (current === "eyes") {
        current = "text";
        setDisplayMode("text");
        timer = setTimeout(cycle, 2600);
      } else {
        current = "eyes";
        setDisplayMode("eyes");
        setTextIdx((i) => (i + 1) % floatingTexts.length);
        timer = setTimeout(cycle, 5000);
      }
    };

    timer = setTimeout(cycle, 4000);
    return () => clearTimeout(timer);
  }, [floatingTexts.length]);

  // Periodic greeting popup
  useEffect(() => {
    let hideT: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setPhase("greeting");
      hideT = setTimeout(() => setPhase("idle"), 4200);
    };
    const first = setTimeout(show, 3200);
    const interval = setInterval(show, 11000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      if (hideT) clearTimeout(hideT);
    };
  }, []);

  const bubbleBg =
    style === "transparent"
      ? `radial-gradient(120% 90% at 30% 25%, ${c2}33, ${c1}22 70%)`
      : style === "glass"
      ? `radial-gradient(120% 90% at 30% 25%, ${c2}55, ${c1}44 70%)`
      : style === "water"
      ? `radial-gradient(60% 45% at 32% 28%, rgba(255,255,255,0.35), rgba(255,255,255,0.02) 60%), radial-gradient(130% 95% at 70% 85%, ${c1}55, ${c2}33 55%, rgba(8,18,34,0.55) 95%)`
      : `radial-gradient(120% 90% at 30% 25%, ${c2}cc, ${c1} 70%)`;

  const bubbleClass =
    style === "glass"
      ? "backdrop-blur-xl border border-white/30"
      : style === "transparent"
      ? "border border-white/40"
      : style === "water"
      ? "backdrop-blur-md border border-white/40 shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-12px_24px_rgba(0,20,45,0.55),0_18px_40px_-12px_rgba(0,40,90,0.55)]"
      : "border border-white/25";

  const greetingOpen = phase === "greeting";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-slate-950 via-background to-secondary/30 h-[360px] shadow-inner">
      {/* Faux storefront chrome */}
      <div className="absolute inset-x-0 top-0 h-8 bg-black/40 border-b border-white/10 flex items-center justify-between px-3 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
          <span className="w-2 h-2 rounded-full bg-green-400/70" />
          <span className="ml-2 text-[10px] text-white/60 font-mono uppercase tracking-wider">Storefront Live Preview</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
          <span>Mode: {displayMode.toUpperCase()}</span>
        </div>
      </div>

      {/* Faux page content */}
      <div className="absolute inset-x-0 top-8 bottom-0 p-5 space-y-3 opacity-20 pointer-events-none">
        <div className="h-4 w-1/3 rounded-lg bg-white/40" />
        <div className="h-2.5 w-2/3 rounded-lg bg-white/25" />
        <div className="h-2.5 w-1/2 rounded-lg bg-white/25" />
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="aspect-square rounded-xl bg-white/15" />
          <div className="aspect-square rounded-xl bg-white/15" />
          <div className="aspect-square rounded-xl bg-white/15" />
        </div>
      </div>

      {/* Ambient glow */}
      {style !== "solid" && (
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_85%_85%,#a855f7,transparent_45%),radial-gradient(circle_at_15%_25%,#3b82f6,transparent_50%)]" />
      )}

      {/* Bubble anchored bottom-right like real widget */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-20">
        {showHover && hovered && !greetingOpen && (
          <div className="text-[11px] px-3 py-1 rounded-full bg-foreground text-background font-medium shadow-md animate-in fade-in slide-in-from-right-1 duration-200">
            {hoverLabel}
          </div>
        )}

        <div
          className="relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Greeting Card Popup */}
          <div
            className={`absolute right-0 bottom-full mb-3 w-[240px] origin-bottom-right rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-3 flex items-start gap-2.5 transition-all duration-500 ${
              greetingOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            }`}
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-primary/30 bg-primary/15 flex items-center justify-center shrink-0">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Bot className="w-4 h-4 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-foreground truncate">{agentName}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">{greeting}</div>
            </div>
          </div>

          {/* Floating Bubble Container */}
          <div
            className={`relative rounded-full overflow-hidden shadow-2xl flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 ${bubbleClass}`}
            style={{
              width: size,
              height: size,
              background: bubbleBg,
              animation: "fab-wobble 6s ease-in-out infinite",
            }}
          >
            {/* Top specular glint */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(55% 35% at 32% 20%, rgba(255,255,255,${
                  style === "solid" ? 0.55 : style === "water" ? 0.45 : 0.3
                }), transparent 65%)`,
              }}
            />

            {style === "water" && (
              <>
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(80%_70%_at_70%_90%,rgba(2,10,22,0.55),transparent_60%)] pointer-events-none" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(14%_10%_at_27%_22%,rgba(255,255,255,0.85),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(8%_6%_at_68%_30%,rgba(255,255,255,0.45),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-full bg-[radial-gradient(70%_55%_at_50%_100%,rgba(140,200,255,0.22),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/20 pointer-events-none" />
              </>
            )}

            {form.fab_enable_energy && (
              <div
                className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none"
                style={{
                  background: `radial-gradient(60% 40% at 50% 50%, ${form.fab_energy_color}, transparent 65%)`,
                  animation: `fab-pulse ${form.fab_energy_interval}s ease-in-out infinite`,
                }}
              />
            )}

            {/* Content Slot: Clean Switcher between WaterEyes and Floating Text (strictly no avatar inside ball) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {displayMode === "eyes" ? (
                <div className="transition-all duration-300 animate-in fade-in zoom-in-90">
                  <PreviewWaterEyes renderSize={size} />
                </div>
              ) : (
                <div
                  key={textIdx}
                  className="px-2 text-center text-white font-bold tracking-wide [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-1 duration-300"
                  style={{ fontSize: Math.max(9, Math.round(size / 6.2)) }}
                >
                  {floatingTexts[textIdx % floatingTexts.length]}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fab-wobble {
          0%,100% { border-radius: 50%; transform: scale(1); }
          25% { border-radius: 54% 46% 49% 51%; transform: scale(1.04); }
          50% { border-radius: 47% 53% 52% 48%; transform: scale(0.98); }
          75% { border-radius: 51% 49% 46% 54%; transform: scale(1.03); }
        }
        @keyframes fab-pulse {
          0%,70%,100% { opacity: 0; transform: scale(0.6); }
          82% { opacity: 0.85; transform: scale(1.15); }
          92% { opacity: 0.4; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
// code:4ce0
