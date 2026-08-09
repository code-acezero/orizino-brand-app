"use client";
import { useEffect, useState } from "react";

interface Props {
  form: any;
  widgetForm: any;
}

export default function BubbleLivePreview({ form, widgetForm }: Props) {
  const style = form.fab_bubble_style as "solid" | "transparent" | "glass" | "water";
  const c1 = form.fab_bubble_color || "#3b82f6";
  const c2 = form.fab_bubble_color2 || "#a855f7";
  const size = form.fab_size || 56;

  const floatingTexts: string[] = (widgetForm?.fab_floating_texts?.length
    ? widgetForm.fab_floating_texts
    : form.fab_underwater_texts) || ["Chat", "Ask anything"];
  const greeting: string = widgetForm?.chat_greeting_guest || form.welcome_message || "Hi, how can I help?";
  const agentName: string = form.name || "AI Assistant";
  const avatar = form.avatar_type === "image" && form.avatar_url ? form.avatar_url : null;
  const emoji = form.avatar_emoji || "🤖";
  const hoverLabel = form.fab_hover_label_text || "Chat with us";
  const showHover = !!form.fab_show_hover_label;

  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [phase, setPhase] = useState<"idle" | "greeting">("idle");

  useEffect(() => {
    if (!floatingTexts.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % floatingTexts.length), 2400);
    return () => clearInterval(t);
  }, [floatingTexts.length]);

  useEffect(() => {
    let hideT: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setPhase("greeting");
      hideT = setTimeout(() => setPhase("idle"), 4200);
    };
    const first = setTimeout(show, 3500);
    const interval = setInterval(show, 9500);
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
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-900 via-background to-secondary/30 h-[360px]">
      {/* Faux storefront chrome */}
      <div className="absolute inset-x-0 top-0 h-7 bg-black/40 border-b border-white/10 flex items-center gap-1.5 px-3 z-10">
        <span className="w-2 h-2 rounded-full bg-red-400/70" />
        <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
        <span className="w-2 h-2 rounded-full bg-green-400/70" />
        <span className="ml-3 text-[10px] text-white/50 uppercase tracking-wider">storefront preview</span>
      </div>

      {/* Faux page content */}
      <div className="absolute inset-x-0 top-7 bottom-0 p-4 space-y-2 opacity-25 pointer-events-none">
        <div className="h-3 w-1/3 rounded bg-white/40" />
        <div className="h-2 w-2/3 rounded bg-white/25" />
        <div className="h-2 w-1/2 rounded bg-white/25" />
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="aspect-square rounded bg-white/15" />
          <div className="aspect-square rounded bg-white/15" />
          <div className="aspect-square rounded bg-white/15" />
        </div>
      </div>

      {/* Ambient glow for translucent styles */}
      {style !== "solid" && (
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_85%_85%,#a855f7,transparent_45%),radial-gradient(circle_at_15%_25%,#3b82f6,transparent_50%)]" />
      )}

      {/* Bubble anchored bottom-right like real widget */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-20">
        {showHover && hovered && !greetingOpen && (
          <div className="text-[11px] px-2.5 py-1 rounded-full bg-foreground text-background shadow animate-in fade-in slide-in-from-right-1 duration-200">
            {hoverLabel}
          </div>
        )}

        <div
          className="relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className={`absolute right-0 bottom-full mb-3 w-[230px] origin-bottom-right rounded-2xl bg-card/95 backdrop-blur border border-border shadow-xl px-3 py-2.5 flex items-start gap-2.5 transition-all duration-500 ${
              greetingOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center text-base shrink-0">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span>{emoji}</span>}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">{agentName}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-3 leading-snug">{greeting}</div>
            </div>
          </div>

          <div
            className={`relative rounded-full overflow-hidden shadow-xl ${bubbleClass}`}
            style={{
              width: size,
              height: size,
              background: bubbleBg,
              animation: "fab-wobble 6s ease-in-out infinite",
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(55% 35% at 32% 20%, rgba(255,255,255,${
                  style === "solid" ? 0.55 : style === "water" ? 0.45 : 0.3
                }), transparent 65%)`,
              }}
            />

            {style === "water" && (
              <>
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(80%_70%_at_70%_90%,rgba(2,10,22,0.55),transparent_60%)]" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(14%_10%_at_27%_22%,rgba(255,255,255,0.85),transparent_70%)]" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(8%_6%_at_68%_30%,rgba(255,255,255,0.45),transparent_70%)]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-full bg-[radial-gradient(70%_55%_at_50%_100%,rgba(140,200,255,0.22),transparent_70%)]" />
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/20" />
              </>
            )}

            {form.fab_enable_energy && (
              <div
                className="absolute inset-0 rounded-full mix-blend-screen"
                style={{
                  background: `radial-gradient(60% 40% at 50% 50%, ${form.fab_energy_color}, transparent 65%)`,
                  animation: `fab-pulse ${form.fab_energy_interval}s ease-in-out infinite`,
                }}
              />
            )}

            {floatingTexts.length > 0 && (
              <div
                key={idx}
                className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/85 px-1 text-center animate-in fade-in zoom-in-95 duration-500 mix-blend-overlay"
              >
                {floatingTexts[idx]}
              </div>
            )}

            {avatar && (
              <img src={avatar} alt="" className="absolute inset-2 rounded-full object-cover opacity-40 pointer-events-none" />
            )}
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
          82% { opacity: 0.85; transform: scale(1.1); }
          92% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}
// code:4ce0
