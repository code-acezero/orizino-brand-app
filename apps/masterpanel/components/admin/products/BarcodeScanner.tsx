"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Camera, X, Flashlight, Volume2, VolumeX, Keyboard, RefreshCw, Aperture } from "lucide-react";
import { useScannerPrefs, type ScanMode } from "@/lib/scanner-prefs";

interface Props {
  /** Called with the decoded code plus the input mode it came from. */
  onScan: (code: string, ctx: { mode: ScanMode; raw: string }) => void;
  active: boolean;
  onToggle: () => void;
  /** Enable HID keyboard-wedge listener for physical USB/Bluetooth scanners. Default: true. */
  hidWedge?: boolean;
  /** Optional extra content rendered inside the fullscreen camera overlay (e.g. an order's item checklist). */
  overlayContent?: React.ReactNode;
}

/** Local-storage-backed prefs so admins keep their scanner setup between visits. */
function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  const set = useCallback((next: T) => {
    setV(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);
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
    setTimeout(() => { osc.stop(); ctx.close().catch(() => {}); }, ms);
  } catch {}
}

// Broaden + strengthen detection: TRY_HARDER makes ZXing spend more effort
// per frame (slower but far more reliable on shaky/angled/low-contrast
// real-world scans), and an explicit format list avoids wasting cycles on
// symbologies this store doesn't use.
const HINTS = new Map();
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_39,
]);

/**
 * Professional barcode scanner.
 *
 *  - Camera scanning (ZXing, Code128 / QR / EAN / UPC), fullscreen iOS-style
 *    camera UI on phones/tablets, inline card UI on desktop.
 *  - A shutter button captures the current frame and forces a decode pass —
 *    useful when motion blur stops the continuous stream from locking on.
 *  - Scan frame flashes green on a successful decode.
 *  - Torch, continuous vs single-shot mode, rear/front camera picker.
 *  - Configurable beep on successful scan.
 *  - HID keyboard-wedge input: works with any USB/Bluetooth barcode scanner
 *    that emulates a keyboard (99% of physical scanners on the market).
 */
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
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [continuous, setContinuous] = usePref<boolean>("scanner.continuous", true);
  const [sound, setSound] = usePref<boolean>("scanner.sound", true);
  const [hidOn, setHidOn] = usePref<boolean>("scanner.hid", hidWedge);
  const [hidLastCode, setHidLastCode] = useState<string>("");
  const [justScanned, setJustScanned] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  // Increments on every decode attempt (hit or miss) so the UI can prove the
  // loop is alive — this is the "is it actually scanning" feedback.
  const [scanTick, setScanTick] = useState(0);
  const [scanningLive, setScanningLive] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const emit = useCallback((code: string, mode: ScanMode, raw: string) => {
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
  }, [onScan, sound, continuous, onToggle, prefs.debounceMs]);

  const submitManual = useCallback(() => {
    const code = manualValue.trim();
    if (!code) return;
    emit(code, "manual", code);
    setManualValue("");
    manualInputRef.current?.focus();
  }, [manualValue, emit]);

  /* ---------- Camera ----------
   * NOTE: this used to hand the whole loop over to ZXing's own
   * `decodeFromConstraints`, which runs its own internal rAF/decode cycle.
   * On several mobile browsers that internal loop silently stalls (no error,
   * no result — it just never calls back again) which is why the scanner
   * looked "on" but never actually scanned anything. We now drive the loop
   * ourselves: grab the stream directly, and on every animation frame draw
   * a cropped region of the video (matching the on-screen guide box) onto a
   * canvas and run a single decode pass against it. This is both more
   * reliable across browsers and lets us prove — via `scanTick` — that a
   * decode attempt is actually happening on every frame, not just when a
   * code is found. */
  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
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

        // Mobile perf: cap capture resolution so decodes stay fast on
        // mid-range phones (device-native can be 4K -> jank + slow decode).
        const constraints: MediaStreamConstraints = {
          video: {
            ...(chosenId ? { deviceId: { exact: chosenId } } : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ focusMode: "continuous" } as any],
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
          /* autoplay may reject until a user gesture; the `active` toggle already is one */
        }

        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() ?? {};
        setTorchSupported(!!caps.torch);

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;

        const ATTEMPT_INTERVAL_MS = 130; // throttle decode passes for perf
        let lastAttempt = 0;
        setScanningLive(true);

        const tick = (ts: number) => {
          if (cancelled) return;
          if (ctx && video.readyState >= 2 && video.videoWidth && ts - lastAttempt >= ATTEMPT_INTERVAL_MS) {
            lastAttempt = ts;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            // Crop to roughly the on-screen guide box (center band) — both
            // faster to decode and far more accurate than scanning the
            // whole busy frame.
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
              if (result) {
                const text = result.getText();
                emit(text, "camera", text);
              }
            } catch {
              // NotFoundException on empty frames is the normal/expected case.
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
        setErr(e?.message ?? "Failed to access camera");
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
  }, [active, deviceId, emit]);

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

  /** Shutter: freeze the current frame onto a canvas and force one decode
   *  pass against it — for when motion/focus keeps the continuous stream
   *  from locking on and a still capture reads more cleanly. */
  const captureShot = useCallback(async () => {
    const video = videoRef.current;
    const reader = readerRef.current;
    if (!video || !reader || video.readyState < 2) return;
    setCapturing(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const result = (reader as any).decodeFromCanvas
        ? (reader as any).decodeFromCanvas(canvas)
        : null;
      if (result) {
        emit(result.getText(), "camera", result.getText());
      } else {
        beep(220, 150);
        setErr("No code found in that frame — try moving closer or steadying the camera.");
        window.setTimeout(() => setErr(null), 2000);
      }
    } catch (e: any) {
      if (!(e instanceof NotFoundException)) {
        // Unexpected decode error — surface briefly, don't spam the console.
      }
      beep(220, 150);
      setErr("No code found in that frame — try moving closer or steadying the camera.");
      window.setTimeout(() => setErr(null), 2000);
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

      // Apply configured Enter/Tab behaviour AFTER emitting the scan.
      if (prefs.enterBehavior === "tab") {
        // Prevent the scanner's own Enter, then let the caller move focus.
        e.preventDefault();
        const active = document.activeElement as HTMLElement | null;
        // Best-effort focus advance: blur current input.
        active?.blur();
      } else if (prefs.enterBehavior === "none") {
        e.preventDefault();
      } else if (!isEditableTarget(target)) {
        // "commit" mode: swallow Enter when not typing in a field to avoid
        // accidental form submissions triggered by the scanner suffix.
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

  const frameBorderClass = justScanned ? "border-emerald-400" : "border-primary/80";

  // ── Fullscreen iOS-style camera, shared by mobile and tablet ──
  if (active && isMobileViewport) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-[999] bg-black flex flex-col overflow-hidden"
        // `100vh` on mobile Safari/Chrome measures the *large* viewport,
        // i.e. including the area the address bar/toolbar can cover — a
        // fixed fullscreen element sized that way ends up taller than
        // what's actually visible, so the bottom row of buttons gets
        // pushed off-screen with no way to scroll to them. `100dvh`
        // (dynamic viewport height) tracks the real visible area instead;
        // we set 100vh first as a safe fallback for browsers that don't
        // support dvh, then override it where it's supported.
        style={{
          height: "100vh",
          ...(typeof CSS !== "undefined" && CSS.supports?.("height", "100dvh") ? { height: "100dvh" } : {}),
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <button type="button" onClick={onToggle} aria-label="Close camera" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
          <p className="text-white/80 text-xs font-medium flex items-center gap-1.5">
            {err ? (
              <span className="text-red-400">{err}</span>
            ) : (
              <>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    scanningLive ? (scanTick % 2 === 0 ? "bg-emerald-400" : "bg-emerald-400/40") : "bg-white/30"
                  }`}
                />
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
          ) : <div className="w-10 h-10" />}
        </div>

        <div className="relative flex-1 min-h-0">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          <div className={`absolute inset-x-10 top-1/2 -translate-y-1/2 h-40 border-4 rounded-2xl pointer-events-none transition-colors duration-150 ${frameBorderClass}`} />
          {overlayContent && (
            <div className="absolute inset-x-0 bottom-0 max-h-[32%] overflow-y-auto bg-black/70 backdrop-blur-md px-4 py-2.5">
              {overlayContent}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-8 py-2.5 shrink-0">
          <label className="flex flex-col items-center gap-1 text-white/70 text-[10px]">
            <Switch checked={continuous} onCheckedChange={setContinuous} />
            Continuous
          </label>
          <button
            type="button"
            onClick={captureShot}
            disabled={capturing}
            aria-label="Capture and scan this frame"
            className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <div className={`w-10 h-10 rounded-full bg-white ${capturing ? "opacity-50" : ""}`} />
          </button>
          <label className="flex flex-col items-center gap-1 text-white/70 text-[10px]">
            <Switch checked={sound} onCheckedChange={setSound} />
            Beep
          </label>
        </div>

        {/* Manual serial entry — for damaged/unscannable labels, or typing
            ahead while the camera struggles. Sits right under the shutter so
            it's reachable one-handed without leaving the scan screen. */}
        <div className="px-4 pb-2.5 shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
          {manualOpen ? (
            <form
              onSubmit={(e) => { e.preventDefault(); submitManual(); }}
              className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5"
            >
              <input
                ref={manualInputRef}
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Type serial / barcode…"
                className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm px-3 py-2 outline-none"
                inputMode="text"
                autoCapitalize="characters"
              />
              <Button type="submit" size="sm" disabled={!manualValue.trim()} className="rounded-xl">Add</Button>
              <button
                type="button"
                onClick={() => { setManualOpen(false); setManualValue(""); }}
                aria-label="Close manual entry"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 text-white/80 text-sm py-2.5"
            >
              <Keyboard className="w-4 h-4" /> Type serial manually
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-black/90">
      <div className="relative aspect-video w-full">
        {active ? (
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
            <div className="text-center space-y-3">
              <Camera className="w-10 h-10 mx-auto opacity-70" />
              <p>Camera is off</p>
              {hidOn && (
                <p className="text-[11px] text-white/50 flex items-center justify-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5" /> Physical scanner ready — just scan
                </p>
              )}
            </div>
          </div>
        )}
        {active && (
          <div className={`absolute inset-x-8 top-1/2 -translate-y-1/2 h-16 border-2 rounded-lg pointer-events-none transition-colors duration-150 ${frameBorderClass}`} />
        )}
        {active && (
          <button
            type="button"
            onClick={captureShot}
            disabled={capturing}
            title="Capture this frame and force a scan"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full border-2 border-white/90 bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <Aperture className={`w-5 h-5 text-white ${capturing ? "opacity-50" : ""}`} />
          </button>
        )}
        {active && torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torch ? "Turn torch off" : "Turn torch on"}
            className={`absolute top-2 right-2 rounded-full p-2 backdrop-blur-md transition-colors ${
              torch ? "bg-amber-400/90 text-black" : "bg-black/50 text-white hover:bg-black/70"
            }`}
          >
            <Flashlight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-3 bg-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground min-w-0 truncate">
            {err ? (
              <span className="text-destructive">{err}</span>
            ) : active ? (
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    scanningLive ? (scanTick % 2 === 0 ? "bg-emerald-500" : "bg-emerald-500/40") : "bg-muted-foreground/40"
                  }`}
                />
                {scanningLive ? "Scanning — point camera at a barcode, or tap the shutter to force a scan" : "Starting camera…"}
              </span>
            ) : hidLastCode ? (
              <>Last wedge scan: <span className="font-mono">{hidLastCode}</span></>
            ) : (
              "Tap Start to scan with camera, or use a physical scanner"
            )}
          </p>
          <Button size="sm" onClick={onToggle} variant={active ? "destructive" : "default"}>
            {active ? <><X className="w-4 h-4 mr-1" />Stop</> : <><Camera className="w-4 h-4 mr-1" />Start</>}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={continuous} onCheckedChange={setContinuous} />
            <span>Continuous</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={sound} onCheckedChange={setSound} />
            <span className="flex items-center gap-1">{sound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />} Beep</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={hidOn} onCheckedChange={setHidOn} />
            <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> Physical</span>
          </label>
          {active && devices.length > 1 && (
            <Select value={deviceId || devices[0]?.deviceId} onValueChange={setDeviceId}>
              <SelectTrigger className="h-8 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Camera" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Manual entry — desktop */}
        <form
          onSubmit={(e) => { e.preventDefault(); submitManual(); }}
          className="flex items-center gap-2 pt-1 border-t border-border/50"
        >
          <Keyboard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={manualInputRef}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Type a serial / barcode manually…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={!manualValue.trim()}>Add</Button>
        </form>
      </div>
    </div>
  );
}
