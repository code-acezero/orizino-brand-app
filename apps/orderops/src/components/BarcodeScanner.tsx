import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { Camera, X, Flashlight, Keyboard, Aperture, Volume2, VolumeX } from "lucide-react";
import { Button } from "@ui/components/ui/button";

export type ScanMode = "camera" | "manual";

interface Props {
  active: boolean;
  onToggle: () => void;
  onScan: (code: string) => void;
  overlayContent?: React.ReactNode;
}

function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setV(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key],
  );
  return [v, set];
}

function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1046;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => {});
    }, 100);
  } catch {}
}

const HINTS = new Map();
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
]);

/**
 * Same reliability fix as masterpanel's scanner: ZXing's own
 * decodeFromConstraints loop can silently stall on mobile. We drive the
 * decode loop ourselves via requestAnimationFrame against a cropped canvas,
 * so there's always live "is it actually scanning" feedback and scans that
 * actually fire.
 */
export function BarcodeScanner({ active, onToggle, onScan, overlayContent }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const rafRef = useRef(0);
  const lastCodeRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });

  const [sound, setSound] = usePersisted("orderops.scanner.sound", true);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [justScanned, setJustScanned] = useState(false);
  const [scanTick, setScanTick] = useState(0);
  const [scanningLive, setScanningLive] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (code: string) => {
      const now = Date.now();
      if (code === lastCodeRef.current.code && now - lastCodeRef.current.ts < 1200) return;
      lastCodeRef.current = { code, ts: now };
      if (sound) beep();
      setJustScanned(true);
      window.setTimeout(() => setJustScanned(false), 600);
      onScan(code);
    },
    [onScan, sound],
  );

  const submitManual = useCallback(() => {
    const code = manualValue.trim();
    if (!code) return;
    emit(code);
    setManualValue("");
    manualInputRef.current?.focus();
  }, [manualValue, emit]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as any] });
      setTorch((t) => !t);
    } catch {}
  }, [torch]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setTorch(false);
      setTorchSupported(false);
      setScanningLive(false);
      return;
    }
    setErr(null);
    setScanTick(0);
    const reader = new BrowserMultiFormatReader(HINTS as any);
    readerRef.current = reader;
    let cancelled = false;

    (async () => {
      try {
        const video = videoRef.current;
        if (!video) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ focusMode: "continuous" } as any],
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch {}

        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() ?? {};
        setTorchSupported(!!caps.torch);

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;

        const ATTEMPT_INTERVAL_MS = 130;
        let lastAttempt = 0;
        setScanningLive(true);

        const tick = (ts: number) => {
          if (cancelled) return;
          if (ctx && video.readyState >= 2 && video.videoWidth && ts - lastAttempt >= ATTEMPT_INTERVAL_MS) {
            lastAttempt = ts;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cropW = vw * 0.82;
            const cropH = Math.min(vh * 0.4, vw * 0.3);
            const cropX = (vw - cropW) / 2;
            const cropY = (vh - cropH) / 2;
            canvas.width = cropW;
            canvas.height = cropH;
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            setScanTick((t) => t + 1);
            try {
              const result = (reader as any).decodeFromCanvas(canvas);
              if (result) emit(result.getText());
            } catch {
              /* NotFoundException on empty frames is the normal case */
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to access camera");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setScanningLive(false);
    };
  }, [active, emit]);

  const captureShot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const reader = readerRef.current;
    if (!video || !canvas || !reader) return;
    try {
      const result = (reader as any).decodeFromCanvas(canvas);
      if (result) emit(result.getText());
    } catch {}
  }, [emit]);

  const frameBorderClass = justScanned ? "border-emerald-400" : "border-primary/80";

  return (
    <div
      className="fixed inset-x-0 top-0 z-[999] bg-black flex flex-col overflow-hidden"
      // See BarcodeScanner.tsx in masterpanel for the full explanation:
      // 100vh on mobile browsers measures the viewport including chrome
      // that can retract (address bar etc.), so a fixed fullscreen element
      // sized with plain vh ends up taller than what's actually visible,
      // pushing the bottom controls off-screen. 100dvh tracks the real
      // visible area; 100vh stays as the fallback for older browsers.
      style={{
        height: "100vh",
        ...(typeof CSS !== "undefined" && CSS.supports?.("height", "100dvh") ? { height: "100dvh" } : {}),
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button type="button" onClick={onToggle} aria-label="Close camera" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform">
          <X className="w-5 h-5" />
        </button>
        <p className="text-white/80 text-xs font-medium flex items-center gap-1.5">
          {err ? (
            <span className="text-red-400">{err}</span>
          ) : (
            <>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${scanningLive ? (scanTick % 2 === 0 ? "bg-emerald-400" : "bg-emerald-400/40") : "bg-white/30"}`} />
              {scanningLive ? "Scanning — point at a barcode" : "Starting camera…"}
            </>
          )}
        </p>
        {torchSupported ? (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torch ? "Turn torch off" : "Turn torch on"}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${torch ? "bg-amber-400 text-black" : "bg-white/10 text-white"}`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        <div className={`absolute inset-x-10 top-1/2 -translate-y-1/2 h-40 border-4 rounded-3xl pointer-events-none transition-colors duration-150 ${frameBorderClass}`} />
        {overlayContent && (
          <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto bg-black/70 backdrop-blur-md px-4 py-3 rounded-t-2xl">
            {overlayContent}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 py-2.5 shrink-0">
        <button type="button" onClick={() => setSound(!sound)} className="text-white/70 flex flex-col items-center gap-1 text-[10px]">
          {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          Beep
        </button>
        <button
          type="button"
          onClick={captureShot}
          aria-label="Capture and scan this frame"
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <Aperture className="w-7 h-7 text-white" />
        </button>
        <div className="w-5" />
      </div>

      <div className="px-4 pb-4 shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        {manualOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitManual();
            }}
            className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5"
          >
            <input
              ref={manualInputRef}
              autoFocus
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Type serial / barcode…"
              className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm px-3 py-2 outline-none"
              autoCapitalize="characters"
            />
            <Button type="submit" size="sm" disabled={!manualValue.trim()} className="rounded-xl">
              Add
            </Button>
            <button type="button" onClick={() => { setManualOpen(false); setManualValue(""); }} aria-label="Close manual entry" className="w-8 h-8 rounded-full flex items-center justify-center text-white/70">
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setManualOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 text-white/80 text-sm py-2.5">
            <Keyboard className="w-4 h-4" /> Type serial manually
          </button>
        )}
      </div>
    </div>
  );
}

export function ScannerLaunchCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Camera className="w-5 h-5" />
      </div>
      <div className="text-left min-w-0">
        <p className="text-[15px] font-medium">Open camera</p>
        <p className="text-xs text-muted-foreground">Scan a barcode, or type one manually</p>
      </div>
    </button>
  );
}
