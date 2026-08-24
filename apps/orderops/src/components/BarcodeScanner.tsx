import { useCallback, useEffect, useRef, useState } from "react";
import { HTMLCanvasElementLuminanceSource } from "@zxing/browser";
import {
  DecodeHintType,
  BarcodeFormat,
  BinaryBitmap,
  HybridBinarizer,
  MultiFormatReader,
} from "@zxing/library";
import {
  Camera,
  X,
  ArrowLeft,
  Flashlight,
  Aperture,
  Volume2,
  VolumeX,
  QrCode,
  Barcode,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  SwitchCamera
} from "lucide-react";
import { Button } from "@ui/components/ui/button";
import { extractSerialCode } from "@orizino/shared";

export type ScannerTargetMode = "qr" | "barcode";
export type ScanMode = "camera" | "manual";

interface Props {
  active: boolean;
  onToggle: () => void;
  onScan: (code: string) => void;
  overlayContent?: React.ReactNode;
  defaultMode?: ScannerTargetMode;
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
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => {});
    }, 180);
  } catch {}
}

const QR_FORMATS = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];

const BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
];

function createReader(mode: ScannerTargetMode) {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    mode === "qr" ? QR_FORMATS : BARCODE_FORMATS,
  );
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

export function BarcodeScanner({
  active,
  onToggle,
  onScan,
  overlayContent,
  defaultMode = "qr",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<MultiFormatReader | null>(null);
  const rafRef = useRef(0);
  const lastCodeRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });

  const [scanType, setScanType] = usePersisted<ScannerTargetMode>(
    "orderops.scanner.target_mode",
    defaultMode,
  );
  const [sound, setSound] = usePersisted<boolean>("orderops.scanner.sound", true);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanningLive, setScanningLive] = useState(false);
  const [scanTick, setScanTick] = useState(0);
  const [justScanned, setJustScanned] = useState(false);
  const [scannedCodePreview, setScannedCodePreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Top Left X Button Action: Closes scanner & navigates back to previous page/tab
  const handleCloseAndNavigateBack = () => {
    onToggle();
    try {
      if (typeof window !== "undefined" && window.history && window.history.length > 1) {
        window.history.back();
      }
    } catch {}
  };

  // Toggle Camera Lens / Facing Mode (Flip Camera)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleDecoded = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const now = Date.now();
      if (
        lastCodeRef.current.code === trimmed &&
        now - lastCodeRef.current.ts < 1800
      ) {
        return;
      }
      lastCodeRef.current = { code: trimmed, ts: now };

      // Play audio chime
      if (sound) beep();

      // Trigger Haptic Vibration on mobile devices
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([40, 30, 60]);
        } catch {}
      }

      // Trigger emerald green visual feedback
      setJustScanned(true);
      setScannedCodePreview(trimmed);
      setTimeout(() => {
        setJustScanned(false);
        setScannedCodePreview(null);
      }, 1000);

      onScan(trimmed);
    },
    [onScan, sound],
  );

  const toggleTorch = async () => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torch;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorch(next);
    } catch {
      setTorch(false);
    }
  };

  const captureShot = useCallback(() => {
    const video = videoRef.current;
    const reader = readerRef.current;
    if (!video || !reader || video.readyState < 2) return;
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const lum = new HTMLCanvasElementLuminanceSource(canvas);
      const bin = new HybridBinarizer(lum);
      const bmp = new BinaryBitmap(bin);
      const result = reader.decode(bmp);
      if (result) handleDecoded(result.getText());
    } catch {}
  }, [handleDecoded]);

  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      setScanningLive(false);
      setTorch(false);
      return;
    }
    setErr(null);
    setScanTick(0);

    const reader = createReader(scanType);
    readerRef.current = reader;
    let cancelled = false;

    (async () => {
      try {
        const video = videoRef.current;
        if (!video) return;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
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

        const ATTEMPT_INTERVAL_MS = 120;
        let lastAttempt = 0;
        setScanningLive(true);

        const tick = (ts: number) => {
          if (cancelled) return;
          if (ctx && video.readyState >= 2 && video.videoWidth && ts - lastAttempt >= ATTEMPT_INTERVAL_MS) {
            lastAttempt = ts;
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            let cropW = vw;
            let cropH = vh;
            let cropX = 0;
            let cropY = 0;

            if (scanType === "qr") {
              const size = Math.min(vw * 0.72, vh * 0.72);
              cropW = size;
              cropH = size;
              cropX = (vw - cropW) / 2;
              cropY = (vh - cropH) / 2;
            } else {
              cropW = vw * 0.88;
              cropH = vh * 0.45;
              cropX = (vw - cropW) / 2;
              cropY = (vh - cropH) / 2;
            }

            canvas.width = Math.min(cropW, 480);
            canvas.height = Math.min(cropH, 480);

            ctx.drawImage(
              video,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              canvas.width,
              canvas.height,
            );

            try {
              const lum = new HTMLCanvasElementLuminanceSource(canvas);
              const bin = new HybridBinarizer(lum);
              const bmp = new BinaryBitmap(bin);
              const result = reader.decode(bmp);
              if (result) {
                handleDecoded(result.getText());
              }
            } catch (err: any) {
              const msg = String(err?.message || "");
              if (
                !msg.includes("NotFoundException") &&
                !msg.includes("No MultiFormat Readers were able to detect the code")
              ) {
                // Ignore regular continuous frame misses
              }
            }
          }
          setScanTick((t) => (t + 1) % 1000);
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Camera access denied or unavailable");
          setScanningLive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setScanningLive(false);
    };
  }, [active, scanType, facingMode, handleDecoded]);

  if (!active) return null;

  const frameBorderClass = justScanned
    ? "border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.9)] bg-emerald-500/20"
    : "border-white shadow-[0_0_20px_rgba(0,0,0,0.8)] bg-transparent";

  const cornerBracketClass = justScanned
    ? "border-emerald-400 shadow-[0_0_15px_#10b981]"
    : "border-white";

  return (
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen flex flex-col bg-black text-white select-none overflow-hidden font-sans">
      <style>{`
        @keyframes scanSweepVertical {
          0% {
            top: 2%;
            opacity: 0.3;
          }
          50% {
            top: 96%;
            opacity: 1;
          }
          100% {
            top: 2%;
            opacity: 0.3;
          }
        }
        .laser-sweep {
          animation: scanSweepVertical 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 bg-black/75 backdrop-blur-md z-20 border-b border-white/10">
        {/* Top Left Back Button (Closes & Navigates Back) */}
        <button
          type="button"
          onClick={handleCloseAndNavigateBack}
          aria-label="Back to previous tab"
          title="Back to previous tab"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* QR vs Barcode Mode Switch Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/15 shadow-md">
          <button
            type="button"
            onClick={() => setScanType("qr")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanType === "qr"
                ? "bg-primary text-primary-foreground shadow-xs scale-100"
                : "text-white/70 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => setScanType("barcode")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanType === "barcode"
                ? "bg-primary text-primary-foreground shadow-xs scale-100"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Barcode</span>
          </button>
        </div>

        {/* Top Right Flash / Torch Button (Always Available) */}
        <button
          type="button"
          onClick={toggleTorch}
          aria-label={torch ? "Turn torch off" : "Turn torch on"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            torch
              ? "bg-amber-400 text-black shadow-[0_0_15px_#fbbf24] scale-105"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title="Camera Flash"
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Camera Viewport with Centered Reticle */}
      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden p-4">
        {/* Live Camera Video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Live Status Hint Pill */}
        <div className="relative z-10 mb-4 flex justify-center pointer-events-none">
          {justScanned ? (
            <p className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.9)] animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-4 h-4" />
              <span>Code Detected: {scannedCodePreview}</span>
            </p>
          ) : (
            <p className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2 border border-white/15 shadow-lg">
              {err ? (
                <span className="text-red-400 font-semibold">{err}</span>
              ) : (
                <>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      scanningLive
                        ? scanTick % 2 === 0
                          ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          : "bg-emerald-400/40"
                        : "bg-white/30"
                    }`}
                  />
                  <span className="tracking-wide">
                    {scanningLive
                      ? scanType === "qr"
                        ? "Align QR code inside square"
                        : "Align barcode inside frame"
                      : "Starting camera…"}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Viewfinder Reticle Frame */}
        <div className="relative z-10 flex items-center justify-center">
          {scanType === "qr" ? (
            <div
              className={`relative w-[min(72vw,270px)] aspect-square border-2 rounded-3xl pointer-events-none transition-all duration-200 ${frameBorderClass} overflow-hidden`}
            >
              {/* Laser Sweep */}
              {!justScanned && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_rgba(var(--primary),0.9)] laser-sweep" />
              )}

              {/* Corner Brackets */}
              <div className={`absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 rounded-bl-2xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 rounded-br-2xl transition-colors duration-200 ${cornerBracketClass}`} />

              {/* Green Success Flash */}
              {justScanned && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-950/80 backdrop-blur-xs z-30 animate-in zoom-in-75 fade-in duration-150">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_#10b981] animate-bounce">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 tracking-wider font-mono uppercase bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40">
                    {scannedCodePreview}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`relative w-[min(88vw,340px)] h-28 sm:h-32 border-2 rounded-2xl pointer-events-none transition-all duration-200 ${frameBorderClass} overflow-hidden`}
            >
              {/* Laser Line */}
              {!justScanned && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] laser-sweep" />
              )}

              {/* Corner Brackets */}
              <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-200 ${cornerBracketClass}`} />
              <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors duration-200 ${cornerBracketClass}`} />

              {/* Green Success Flash */}
              {justScanned && (
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-emerald-950/80 backdrop-blur-xs z-30 animate-in zoom-in-75 fade-in duration-150 px-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_24px_#10b981] shrink-0">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 tracking-wider font-mono uppercase truncate">
                    {scannedCodePreview}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {overlayContent && (
          <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto bg-black/80 backdrop-blur-md px-4 py-3 rounded-t-3xl z-20 border-t border-white/10">
            {overlayContent}
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-between px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 bg-black/80 backdrop-blur-md border-t border-white/10 z-20">
        {/* Left: Sound Toggle */}
        <button
          type="button"
          onClick={() => setSound(!sound)}
          className="text-white/80 hover:text-white flex flex-col items-center gap-1 text-[10px] cursor-pointer transition-colors"
        >
          {sound ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5" />}
          <span>{sound ? "Sound On" : "Muted"}</span>
        </button>

        {/* Center: Aperture Capture Button */}
        <button
          type="button"
          onClick={captureShot}
          aria-label="Capture and scan this frame"
          className="w-15 h-15 rounded-full border-4 border-white/90 flex items-center justify-center active:scale-95 transition-transform bg-white/20 hover:bg-white/30 cursor-pointer shadow-xl"
        >
          <Aperture className="w-7 h-7 text-white" />
        </button>

        {/* Right: Flip Camera / Switch Lens (Replaced Manual Button) */}
        <button
          type="button"
          onClick={toggleFacingMode}
          className="text-white/80 hover:text-white flex flex-col items-center gap-1 text-[10px] cursor-pointer transition-colors"
          title="Flip between Rear and Front cameras"
        >
          <RotateCcw className="w-5 h-5 text-primary" />
          <span>Flip Lens</span>
        </button>
      </div>
    </div>
  );
}

export function ScannerLaunchCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Camera className="w-5 h-5" />
      </div>
      <div className="text-left min-w-0">
        <p className="text-[15px] font-medium">Open camera</p>
        <p className="text-xs text-muted-foreground">Scan QR code or barcode</p>
      </div>
    </button>
  );
}
