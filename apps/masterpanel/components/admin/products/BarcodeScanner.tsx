"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  DecodeHintType,
  BarcodeFormat,
  NotFoundException,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Camera,
  X,
  Flashlight,
  Volume2,
  VolumeX,
  Keyboard,
  RefreshCw,
  Aperture,
  QrCode,
  Barcode,
  ScanLine,
  ZoomIn,
} from "lucide-react";
import { useScannerPrefs, type ScanMode } from "@/lib/scanner-prefs";
import { extractSerialCode } from "@orizino/shared";

export type TargetScanFormat = "barcode" | "qr" | "auto";

interface Props {
  /** Called with the decoded code plus the input mode it came from. */
  onScan: (code: string, ctx: { mode: ScanMode; raw: string }) => void;
  active: boolean;
  onToggle: () => void;
  /** Enable HID keyboard-wedge listener for physical USB/Bluetooth scanners. Default: true. */
  hidWedge?: boolean;
  /** Optional extra content rendered inside the overlay. */
  overlayContent?: React.ReactNode;
}

/** Local-storage-backed prefs so admins keep their scanner setup between visits. */
function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
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
    [key]
  );
  return [v, set];
}

/** WebAudio beep — no external asset. Distinct tones for success vs. rejection. */
function beep(freq = 880, ms = 90) {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => {});
    }, ms);
  } catch {}
}

/** Configures format hints based on target scan mode for maximal speed and accuracy. */
function getHintsForFormat(mode: TargetScanFormat) {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  if (mode === "qr") {
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
    ]);
  } else if (mode === "barcode") {
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ]);
  } else {
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.DATA_MATRIX,
    ]);
  }
  return hints;
}

export function BarcodeScanner({ onScan, active, onToggle, hidWedge = true, overlayContent }: Props) {
  const [prefs] = useScannerPrefs();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = usePref<string>("scanner.deviceId", "");
  const [targetFormat, setTargetFormat] = usePref<TargetScanFormat>("scanner.targetFormat", "qr");

  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  const [continuous, setContinuous] = usePref<boolean>("scanner.continuous", true);
  const [sound, setSound] = usePref<boolean>("scanner.sound", true);
  const [hidOn, setHidOn] = usePref<boolean>("scanner.hid", hidWedge);
  const [hidLastCode, setHidLastCode] = useState<string>("");
  const [justScanned, setJustScanned] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const [scanTick, setScanTick] = useState(0);
  const [scanningLive, setScanningLive] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Focus ring animation state on tap
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  const emit = useCallback(
    (inputCode: string, mode: ScanMode, raw: string) => {
      const code = extractSerialCode(inputCode);
      const now = Date.now();
      if (code === lastRef.current.code && now - lastRef.current.ts < prefs.debounceMs) return;
      lastRef.current = { code, ts: now };
      if (sound) beep(1046, 110);
      setJustScanned(true);
      window.setTimeout(() => setJustScanned(false), 700);
      onScan(code, { mode, raw });
      if (!continuous && controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
        onToggle();
      }
    },
    [onScan, sound, continuous, onToggle, prefs.debounceMs]
  );

  const submitManual = useCallback(() => {
    const code = manualValue.trim();
    if (!code) return;
    emit(code, "manual", code);
    setManualValue("");
    manualInputRef.current?.focus();
  }, [manualValue, emit]);

  /* ---------- Camera Stream & Frame Decoder Loop ---------- */
  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setTorch(false);
      setTorchSupported(false);
      setZoom(1);
      setZoomSupported(false);
      setScanningLive(false);
      return;
    }

    setErr(null);
    setScanTick(0);
    const hints = getHintsForFormat(targetFormat);
    const reader = new BrowserMultiFormatReader(hints as any);
    readerRef.current = reader;
    let cancelled = false;
    let rafId = 0;

    (async () => {
      try {
        const all = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(all);
        const chosenId =
          (deviceId && all.find((d) => d.deviceId === deviceId)?.deviceId) ||
          all.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ||
          all[0]?.deviceId ||
          undefined;
        const video = videoRef.current;
        if (!video) return;

        // Mobile focus & high resolution constraints
        const constraints: MediaStreamConstraints = {
          video: {
            ...(chosenId ? { deviceId: { exact: chosenId } } : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            advanced: [
              { focusMode: "continuous" } as any,
              { exposureMode: "continuous" } as any,
              { whiteBalanceMode: "continuous" } as any,
            ],
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* autoplay handling */
        }

        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() ?? {};
        setTorchSupported(!!caps.torch);
        setZoomSupported(!!caps.zoom);

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;

        const ATTEMPT_INTERVAL_MS = 120; // 8-9 FPS scan pass for optimum battery + high responsiveness
        let lastAttempt = 0;
        setScanningLive(true);

        const tick = (ts: number) => {
          if (cancelled) return;
          if (ctx && video.readyState >= 2 && video.videoWidth && ts - lastAttempt >= ATTEMPT_INTERVAL_MS) {
            lastAttempt = ts;
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Compute crop region targeted for the specific format mode
            let cropW = vw * 0.88;
            let cropH = Math.min(vh * 0.38, vw * 0.32);

            if (targetFormat === "qr") {
              const side = Math.min(vw, vh) * 0.72;
              cropW = side;
              cropH = side;
            } else if (targetFormat === "auto") {
              cropW = vw * 0.84;
              cropH = Math.min(vh * 0.65, vw * 0.65);
            }

            const cropX = (vw - cropW) / 2;
            const cropY = (vh - cropH) / 2;

            if (cropW > 10 && cropH > 10) {
              const w = Math.floor(cropW);
              const h = Math.floor(cropH);
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, w, h);
              setScanTick((t) => t + 1);
              try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const luminanceSource = new RGBLuminanceSource(imgData.data, w, h);
                const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                const result = (reader as any).decode(binaryBitmap);
                if (result) {
                  const text = result.getText();
                  emit(text, "camera", text);
                }
              } catch {
                // Ignore NotFoundException frame misses
              }
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        controlsRef.current = {
          stop: () => {
            cancelled = true;
            if (rafId) cancelAnimationFrame(rafId);
          },
        };
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Could not start camera. Check browser permissions.");
        setScanningLive(false);
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setScanningLive(false);
    };
  }, [active, deviceId, targetFormat, emit]);

  /* ---------- Torch Toggle ---------- */
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as any] });
      setTorch(!torch);
    } catch (e: any) {
      setErr("Torch not supported on this device");
    }
  }, [torch]);

  /* ---------- Zoom Cycle (1x -> 1.5x -> 2x -> 1x) ---------- */
  const cycleZoom = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      const nextZoom = zoom >= 2 ? 1 : zoom === 1 ? 1.5 : 2;
      await track.applyConstraints({ advanced: [{ zoom: nextZoom } as any] });
      setZoom(nextZoom);
    } catch {}
  }, [zoom]);

  /* ---------- Tap-to-Focus Handler ---------- */
  const handleViewfinderTap = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active || !videoRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      setFocusRing({ x: clientX, y: clientY, show: true });
      setTimeout(() => setFocusRing((r) => ({ ...r, show: false })), 800);

      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      try {
        const caps: any = track.getCapabilities?.() ?? {};
        // Trigger hardware focus cycle
        if (caps.focusMode && caps.focusMode.includes("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "auto" } as any] }).catch(() => {});
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }).catch(() => {});
        }
        if (caps.pointsOfInterest) {
          const nx = clientX / rect.width;
          const ny = clientY / rect.height;
          await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: nx, y: ny }] } as any] }).catch(() => {});
        }
      } catch {}
    },
    [active]
  );

  /* ---------- Shutter / Still Capture ---------- */
  const captureShot = useCallback(async () => {
    const video = videoRef.current;
    const reader = readerRef.current;
    if (!video || !reader || video.readyState < 2) return;
    setCapturing(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 10 && h > 10) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const luminanceSource = new RGBLuminanceSource(imgData.data, w, h);
          const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result = (reader as any).decode(binaryBitmap);
          if (result) {
            emit(result.getText(), "camera", result.getText());
            return;
          }
        }
      }
      beep(220, 150);
      setErr("No code found in frame — hold steady or tap to focus.");
      window.setTimeout(() => setErr(null), 2000);
    } catch (e: any) {
      if (!(e instanceof NotFoundException)) {
        setErr("Could not decode frame");
        window.setTimeout(() => setErr(null), 2000);
      }
    } finally {
      setCapturing(false);
    }
  }, [emit]);

  /* ---------- HID keyboard-wedge (physical scanner) ---------- */
  useEffect(() => {
    if (!hidOn) return;
    const buf: string[] = [];
    let lastKeyAt = 0;
    const FAST_MS = prefs.fastMs;
    const MIN_LEN = prefs.minLength;

    const isEditableTarget = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };

    const commit = (raw: string, target: EventTarget | null, e: KeyboardEvent) => {
      const code = raw;
      buf.length = 0;
      setHidLastCode(code);
      emit(code, "hid", raw);

      if (prefs.enterBehavior === "tab") {
        e.preventDefault();
        const activeEl = document.activeElement as HTMLElement | null;
        activeEl?.blur();
      } else if (prefs.enterBehavior === "none") {
        e.preventDefault();
      } else if (!isEditableTarget(target)) {
        e.preventDefault();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = performance.now();
      const gap = now - lastKeyAt;
      lastKeyAt = now;

      if (e.key === "Enter") {
        if (buf.length >= MIN_LEN) {
          commit(buf.join(""), e.target, e);
        } else {
          buf.length = 0;
        }
        return;
      }

      if (gap > 300) buf.length = 0;

      if (e.key.length === 1) {
        if (/[\w\-./]/.test(e.key)) {
          buf.push(e.key);
        } else if (buf.length) {
          buf.length = 0;
        }
      }

      if (buf.length > MIN_LEN && gap < FAST_MS && isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hidOn, emit, prefs.fastMs, prefs.minLength, prefs.enterBehavior]);

  return (
    <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 backdrop-blur-md transition-all flex flex-col min-w-0">
      <canvas ref={canvasRef} className="hidden pointer-events-none" />

      {/* ── Mode Switcher Tab Ribbon (QR / Barcode / Auto) ── */}
      <div className="p-2 sm:p-2.5 border-b border-border/50 bg-secondary/20">
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTargetFormat("qr")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              targetFormat === "qr"
                ? "bg-background text-foreground font-semibold border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] sm:text-xs">QR Code (2D)</span>
          </button>

          <button
            type="button"
            onClick={() => setTargetFormat("barcode")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              targetFormat === "barcode"
                ? "bg-background text-foreground font-semibold border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] sm:text-xs">Barcode (1D)</span>
          </button>

          <button
            type="button"
            onClick={() => setTargetFormat("auto")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              targetFormat === "auto"
                ? "bg-background text-foreground font-semibold border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] sm:text-xs">Auto Mode</span>
          </button>
        </div>
      </div>

      {/* ── Viewfinder Window (Fixed clean aspect ratio for mobile & desktop) ── */}
      <div
        onClick={handleViewfinderTap}
        className="relative w-full h-[230px] sm:h-[280px] bg-black flex items-center justify-center overflow-hidden cursor-crosshair select-none"
      >
        {active ? (
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2.5 text-white/80">
              {targetFormat === "qr" ? (
                <QrCode className="w-6 h-6" strokeWidth={1.5} />
              ) : targetFormat === "auto" ? (
                <ScanLine className="w-6 h-6" strokeWidth={1.5} />
              ) : (
                <Barcode className="w-6 h-6" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-xs font-semibold text-white/90">
              {targetFormat === "qr" ? "QR Code Scanner Standby" : targetFormat === "auto" ? "Universal Scanner Standby" : "Barcode Scanner Standby"}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5 max-w-xs">
              {hidOn
                ? "Physical USB/Bluetooth scanner is active — scan anytime, or start camera."
                : "Tap Start Camera to begin visual barcode and QR scanning."}
            </p>
          </div>
        )}

        {/* Tap-to-Focus Animated Ring Indicator */}
        {focusRing.show && (
          <div
            className="absolute pointer-events-none w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-emerald-400 animate-ping z-20"
            style={{ left: focusRing.x, top: focusRing.y }}
          />
        )}

        {/* Dynamic Viewfinder Reticles (Red by default, turns Green when detected) */}
        {active && (
          <>
            {targetFormat === "qr" ? (
              /* QR Code Square Reticle */
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <div
                  className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl relative transition-all duration-150 border-2 ${
                    justScanned
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-red-500/90 bg-red-500/[0.03]"
                  }`}
                >
                  <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent ${justScanned ? "via-emerald-400" : "via-red-500"} to-transparent opacity-90 animate-pulse`} />
                  <div className={`absolute inset-y-2 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent ${justScanned ? "via-emerald-400/50" : "via-red-500/40"} to-transparent opacity-50`} />
                </div>
              </div>
            ) : targetFormat === "barcode" ? (
              /* 1D Barcode Linear Reticle */
              <div className="absolute inset-x-6 sm:inset-x-12 top-1/2 -translate-y-1/2 h-20 sm:h-24 pointer-events-none">
                <div
                  className={`w-full h-full border-2 rounded-xl relative transition-all duration-150 ${
                    justScanned
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-red-500/90 bg-red-500/[0.03]"
                  }`}
                >
                  <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent ${justScanned ? "via-emerald-400" : "via-red-500"} to-transparent opacity-90 animate-pulse`} />
                </div>
              </div>
            ) : (
              /* Universal Auto Reticle */
              <div className="absolute inset-x-8 sm:inset-x-12 top-1/2 -translate-y-1/2 h-36 sm:h-44 pointer-events-none">
                <div
                  className={`w-full h-full border-2 rounded-2xl relative transition-all duration-150 ${
                    justScanned
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-red-500/90 bg-red-500/[0.03]"
                  }`}
                >
                  <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 transition-colors duration-150 ${justScanned ? "border-emerald-400" : "border-red-500"}`} />
                  <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent ${justScanned ? "via-emerald-400" : "via-red-500"} to-transparent opacity-90 animate-pulse`} />
                </div>
              </div>
            )}

            {/* In-viewfinder quick control buttons */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              {zoomSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleZoom();
                  }}
                  title="Toggle Zoom"
                  className="px-2 h-8 rounded-lg bg-black/60 text-white/90 hover:bg-black/80 border border-white/10 flex items-center gap-1 text-[11px] font-mono backdrop-blur-md transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{zoom}x</span>
                </button>
              )}

              {torchSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTorch();
                  }}
                  aria-label={torch ? "Turn torch off" : "Turn torch on"}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors backdrop-blur-md cursor-pointer ${
                    torch
                      ? "bg-amber-400 text-black font-bold"
                      : "bg-black/60 text-white/90 hover:bg-black/80 border border-white/10"
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  captureShot();
                }}
                disabled={capturing}
                title="Force capture this frame"
                className="w-8 h-8 rounded-lg bg-black/60 text-white/90 hover:bg-black/80 border border-white/10 flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
              >
                <Aperture className={`w-3.5 h-3.5 ${capturing ? "opacity-50" : ""}`} />
              </button>
            </div>
          </>
        )}

        {/* Viewfinder bottom status ribbon */}
        <div className="absolute bottom-2 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <div className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-white/80 flex items-center gap-1.5 font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                active && scanningLive
                  ? scanTick % 2 === 0
                    ? "bg-emerald-400"
                    : "bg-emerald-400/40"
                  : hidOn
                  ? "bg-primary"
                  : "bg-white/30"
              }`}
            />
            <span>
              {err ? (
                <span className="text-red-400 font-sans">{err}</span>
              ) : active && scanningLive ? (
                targetFormat === "qr" ? "Scanning QR Code" : targetFormat === "auto" ? "Scanning (Auto)" : "Scanning Barcode"
              ) : hidOn ? (
                "HID Scanner Ready"
              ) : (
                "Ready"
              )}
            </span>
          </div>

          {active && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/60 font-mono hidden sm:inline">Tap to focus</span>
              <div className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] text-white/60 font-mono">
                #{scanTick}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Control Console ── */}
      <div className="p-3.5 sm:p-4 space-y-3 bg-card/80">
        {/* Top bar: Status message & Start/Stop CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
              {active ? (
                <span className="text-emerald-500 font-semibold">Camera scanner active</span>
              ) : (
                <span>Camera scanner ready</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {hidLastCode ? (
                <>
                  Last USB scan: <span className="font-mono text-foreground font-semibold">{hidLastCode}</span>
                </>
              ) : targetFormat === "qr" ? (
                "High-speed 2D QR Code & DataMatrix detection."
              ) : targetFormat === "auto" ? (
                "Universal auto-detection for barcodes & QR codes."
              ) : (
                "Linear 1D Barcode scanning (Code128, EAN-13, UPC)."
              )}
            </p>
          </div>

          <Button
            size="sm"
            onClick={onToggle}
            variant={active ? "destructive" : "default"}
            className="w-full sm:w-auto font-semibold rounded-xl shrink-0 h-9 px-4 cursor-pointer"
          >
            {active ? (
              <>
                <X className="w-3.5 h-3.5 mr-1.5" /> Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 mr-1.5" /> Start Camera
              </>
            )}
          </Button>
        </div>

        {/* Switches & Hardware Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
            <Switch checked={continuous} onCheckedChange={setContinuous} className="scale-75" />
            <span className="text-[11px] font-medium text-foreground">Continuous</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
            <Switch checked={sound} onCheckedChange={setSound} className="scale-75" />
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
              {sound ? <Volume2 className="w-3 h-3 text-primary" /> : <VolumeX className="w-3 h-3" />}
              Beep
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
            <Switch checked={hidOn} onCheckedChange={setHidOn} className="scale-75" />
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
              <Keyboard className="w-3 h-3 text-primary" />
              Physical HID
            </span>
          </label>

          {active && devices.length > 1 && (
            <div className="ml-auto w-full sm:w-auto">
              <Select value={deviceId || devices[0]?.deviceId} onValueChange={setDeviceId}>
                <SelectTrigger className="h-8 text-xs rounded-lg bg-secondary/40 border-border/50">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ── Direct Manual Serial Input Bar ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitManual();
          }}
          className="flex items-center gap-2 pt-2 border-t border-border/50"
        >
          <div className="relative flex-1 min-w-0">
            <Keyboard className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={manualInputRef}
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter or scan barcode / QR serial manually…"
              className="w-full bg-secondary/40 border border-border/50 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:bg-background transition-colors"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!manualValue.trim()}
            className="rounded-xl h-8 text-xs font-semibold px-3 shrink-0 cursor-pointer"
          >
            Look up
          </Button>
        </form>
      </div>
    </div>
  );
}
