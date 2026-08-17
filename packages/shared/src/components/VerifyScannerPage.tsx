"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Camera, CheckCircle2, ShieldCheck, XCircle, Info, ArrowRight,
  Package, X, ArrowLeft, Search, Copy, Check,
  BadgeCheck, AlertCircle, RefreshCw, Eye, ExternalLink, Fingerprint,
  Lock, Shield, Award, QrCode, Barcode, SwitchCamera, Volume2, VolumeX, Flashlight,
  FlaskConical, HelpCircle, ShieldAlert, CheckCircle, Zap, Unlock, Printer, Download, FileText
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { Link, useNavigate } from "../lib/router-compat";
import type { VerifyResult } from "../types/verify";
import { extractSerialCode } from "../lib/scanner-utils";
import { playScanSound, isScanSoundMuted, toggleScanSound } from "../utils/scan-sound";

export interface VerifyScannerContent {
  enabled?: boolean;
  entry_title?: string;
  entry_subtitle?: string;
  cta_label?: string;
  learn_more_label?: string;
  hint_signed_in?: string;
  hint_signed_out?: string;
}

export interface VerifyScannerPageProps {
  resultPath: string;
  entryPath: string;
  code?: string;
  onLookup: (code: string) => Promise<VerifyResult>;
  onUnlockInvoice?: (
    codeOrOrder: string,
    customerName: string,
    customerPhoneOrEmail: string
  ) => Promise<{ ok: boolean; error?: string; order?: any; items?: any[] }>;
  isSignedIn?: boolean;
  learnMoreHref?: string;
  homePath?: string;
  content?: VerifyScannerContent;
}

export type ScannerMode = "qr" | "barcode";

/** Web Audio scan success sound & haptic vibration */
function triggerScanFeedback() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([40, 30, 40]);
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {}
}

/** BarcodeDetector feature-detection */
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type BarcodeDetectorCtor = new (opts?: any) => BarcodeDetectorLike;
function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as any).BarcodeDetector ?? null;
}

export function VerifyScannerPage(props: VerifyScannerPageProps) {
  if (props.code) {
    return <ResultView {...props} />;
  }
  return <EntryView {...props} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. ENTRY VIEW (Interactive Camera Scanner & Direct Search)
───────────────────────────────────────────────────────────────────────────── */
function EntryView(props: VerifyScannerPageProps) {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessDetected, setScanSuccessDetected] = useState(false);
  const [soundMuted, setSoundMuted] = useState(isScanSoundMuted());
  
  // Default to QR mode as requested
  const [mode, setMode] = useState<ScannerMode>("qr");

  // Auto-activate camera scanner in mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setScannerActive(true);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);

  const handleToggleSound = () => {
    const next = toggleScanSound();
    setSoundMuted(next);
  };

  const getReader = useCallback(() => {
    if (!zxingReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
    }
    return zxingReaderRef.current;
  }, []);

  const handleDetectedText = useCallback(
    (raw: string) => {
      if (!raw || isHandlingScanRef.current) return;
      isHandlingScanRef.current = true;
      setScanSuccessDetected(true);
      playScanSound("success");
      triggerScanFeedback();

      const extracted = extractSerialCode(raw);
      const targetCode = extracted || raw.trim();

      setTimeout(() => {
        navigate(`${props.resultPath}?code=${encodeURIComponent(targetCode)}`);
      }, 300);
    },
    [navigate, props.resultPath]
  );

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setHasTorch(false);
    setIsScanning(false);
    setScanSuccessDetected(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);
    setIsScanning(true);
    isHandlingScanRef.current = false;
    setScanSuccessDetected(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          facingMode: selectedDeviceId ? undefined : { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setCameraPermission("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps: any = track.getCapabilities ? track.getCapabilities() : {};
          setHasTorch(!!caps.torch);
        }

        const NativeDetector = getBarcodeDetector();
        if (NativeDetector) {
          try {
            const formats = mode === "qr" ? ["qr_code", "data_matrix"] : ["code_128", "code_39", "ean_13", "upc_a"];
            const detector = new NativeDetector({ formats });

            const loop = async () => {
              if (!videoRef.current || isHandlingScanRef.current) return;
              try {
                if (videoRef.current.readyState >= 2) {
                  const codes = await detector.detect(videoRef.current);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleDetectedText(codes[0].rawValue);
                    return;
                  }
                }
              } catch {}
              scanLoopRef.current = requestAnimationFrame(loop);
            };
            scanLoopRef.current = requestAnimationFrame(loop);
            return;
          } catch {}
        }

        const reader = getReader();
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result && !isHandlingScanRef.current) {
            handleDetectedText(result.getText());
          }
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to start camera. Please verify camera permissions.");
      setCameraPermission("denied");
      setIsScanning(false);
    }
  }, [getReader, handleDetectedText, mode, selectedDeviceId, stopCamera]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        const vDevs = devs.filter((d) => d.kind === "videoinput");
        setDevices(vDevs);
        if (vDevs.length > 0 && !selectedDeviceId) {
          const back = vDevs.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear"));
          setSelectedDeviceId(back ? back.deviceId : vDevs[0].deviceId);
        }
      });
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (scannerActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scannerActive, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {}
  };

  const switchCameraDevice = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = (idx + 1) % devices.length;
    setSelectedDeviceId(devices[nextIdx].deviceId);
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const clean = extractSerialCode(manualCode);
    navigate(`${props.resultPath}?code=${encodeURIComponent(clean || manualCode.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Authenticity &amp; Consignment Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            {props.content?.entry_title || "Verify Orizino Authenticity"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            {props.content?.entry_subtitle ||
              "Scan the Royal QR code or enter an Order Number / Product Serial code to verify genuine atelier registration and unlock your official invoice."}
          </p>
        </div>

        {/* ── Mode Switcher & Scanner Action ── */}
        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-md p-4 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-2xl border border-border/60">
              <button
                type="button"
                onClick={() => setMode("qr")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === "qr"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                QR
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  soundMuted
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/15 text-primary border border-primary/30"
                }`}
                title={soundMuted ? "Unmute scanner sound" : "Mute scanner sound"}
              >
                {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{soundMuted ? "Sound Off" : "Sound On"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setScannerActive((v) => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scannerActive
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {scannerActive ? "Close Camera" : "Open Camera Scanner"}
            </button>
          </div>

          {/* Interactive Camera Viewport */}
          {scannerActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video min-h-[360px] sm:min-h-[320px] max-h-[500px] flex items-center justify-center border border-border/80">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

              {/* Viewport Frame with Dynamic Status Ring */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div
                  className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl transition-all duration-300 ${
                    scanSuccessDetected
                      ? "border-4 border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                      : "border-2 border-primary/80 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  }`}
                >
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-lg" />

                  {isScanning && !scanSuccessDetected && (
                    <motion.div
                      animate={{ y: [0, 180, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
                    />
                  )}
                </div>
              </div>

              {/* Camera Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 z-10">
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    soundMuted ? "text-white/40 hover:text-white" : "text-amber-400"
                  }`}
                  title={soundMuted ? "Unmute scan sound" : "Mute scan sound"}
                >
                  {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      torchOn ? "bg-amber-500 text-black font-bold" : "text-white/80 hover:text-white"
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCameraDevice}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Switch Camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </div>

              {error && (
                <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-destructive/90 text-destructive-foreground text-xs text-center font-medium">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Manual Search Lookup Form ── */}
          <form onSubmit={onManualSubmit} className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter Order Number (#ORZ-992481) or Serial Code (ORZ-XXXXX)"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/70 bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shrink-0 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                Verify &amp; Lookup
              </button>
            </div>
          </form>
        </div>

        {/* Informational Assurance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-border/60 bg-card/50 text-center space-y-1">
            <Award className="w-5 h-5 text-primary mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Royal Authenticity</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every Orizino consignment is cryptographically registered at the atelier.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border/60 bg-card/50 text-center space-y-1">
            <FileText className="w-5 h-5 text-primary mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Instant Full Invoice</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Unlock and download your official Cherry Vanilla invoice by validating client info.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border/60 bg-card/50 text-center space-y-1">
            <Shield className="w-5 h-5 text-primary mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Client Privacy Shield</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Personal consignment data remains shielded until authenticated by the buyer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. RESULT VIEW (Authenticity Certificate & Full Invoice Unlock)
───────────────────────────────────────────────────────────────────────────── */
function ResultView({
  code: rawCode,
  onLookup,
  onUnlockInvoice,
  entryPath,
  isSignedIn,
  homePath = "/",
}: VerifyScannerPageProps) {
  const code = extractSerialCode(rawCode);
  const [state, setState] = useState<{ loading: boolean; error?: string; result?: VerifyResult }>({ loading: true });
  const [copied, setCopied] = useState(false);

  // Security Clearance Unlock State
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockedOrder, setUnlockedOrder] = useState<any | null>(null);
  const [showFullInvoiceModal, setShowFullInvoiceModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await onLookup(code);
        if (!cancelled) {
          setState({ loading: false, result: r });
          if (r && (r.status === "valid" || r.is_sample)) {
            playScanSound("success");
          } else {
            playScanSound("error");
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setState({ loading: false, error: e?.message ?? "Lookup failed" });
          playScanSound("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, onLookup]);

  const r = state.result;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUnlockInvoice) return;
    if (!clientName.trim() || !clientContact.trim()) {
      setUnlockError("Please provide both your Name and Contact (Phone or Email).");
      return;
    }

    setUnlocking(true);
    setUnlockError(null);

    try {
      const res = await onUnlockInvoice(code, clientName.trim(), clientContact.trim());
      if (!res.ok) {
        setUnlockError(res.error || "Identity check failed. Please check the spelling.");
      } else {
        setUnlockedOrder(res.order);
        setShowFullInvoiceModal(true);
      }
    } catch (e: any) {
      setUnlockError(e?.message || "Failed to unlock invoice. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6 max-w-4xl mx-auto">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={entryPath as any}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Scan Another Item / Order
          </Link>
          <Link
            to={homePath as any}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Return to Storefront
          </Link>
        </div>

        {/* 1. Loading State */}
        {state.loading && (
          <div className="border border-border/60 rounded-3xl p-12 bg-card text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">Verifying Consignment &amp; Serial Database…</p>
            <p className="text-xs text-muted-foreground font-mono">{code}</p>
          </div>
        )}

        {/* 2. CASE A: TEST / DEMONSTRATION CODE */}
        {!state.loading && r && r.is_sample && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                        {r.sample_info?.title ?? "Official Orizino Test Code"}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                        Calibration Tag
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground font-mono">Reference: {code}</p>
                      <button onClick={copyCode} className="p-1 rounded-lg hover:bg-amber-500/20 text-muted-foreground hover:text-foreground">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold w-fit">
                  ✓ Verified Atelier Sample
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {r.sample_info?.description ??
                    "This QR code was generated for printing calibration and quality testing. It conforms to authentic Orizino formatting standards."}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to={entryPath as any}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Scan Another Item
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. CASE B: GENUINE PRODUCT OR ORDER VERIFIED */}
        {!state.loading && r && r.found && !r.is_sample && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Genuine Royal Banner */}
            <div className="border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                      {r.status === "order_verified" ? "Verified Orizino Consignment Order" : "100% Genuine Orizino Piece"}
                    </h2>
                    <button onClick={copyCode} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Reference Code: {code}</p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold w-fit">
                ✓ Authentic Registration Sealed
              </div>
            </div>

            {/* Product & Consignment Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Product Info */}
              <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-3">
                  Consignment Specification
                </h3>

                <div className="flex items-center gap-4">
                  {r.product?.thumbnail || r.product?.images?.[0] ? (
                    <img
                      src={r.product.thumbnail || r.product.images![0]}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover border border-border/40 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                      <Package className="w-7 h-7" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">{r.product?.name || "Orizino Product"}</h4>
                    {r.product?.category && (
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{r.product.category}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status / Sold Card */}
              <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-3">
                  Registration &amp; Privacy Shield
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Dispatch Date</span>
                    <span className="font-medium text-foreground">{r.sold?.sold_at_masked ?? "Recorded at Store"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer</span>
                    <span className="font-medium text-foreground">{r.sold?.buyer_masked ?? "Protected Client Record"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Authenticity Seal</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Genuine Official Dispatch</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECURITY CHALLENGE: UNLOCK FULL INVOICE ── */}
            <div className="rounded-3xl border border-primary/40 bg-card/80 backdrop-blur-md p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Unlock Official Invoice
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter the buyer name &amp; contact info used on this order to view and download your full invoice.
                    </p>
                  </div>
                </div>

                {unlockedOrder && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                  </span>
                )}
              </div>

              {!unlockedOrder ? (
                <form onSubmit={handleUnlockSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Customer Full Name
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Mahmudul Hasan"
                        className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Phone Number or Email
                      </label>
                      <input
                        type="text"
                        value={clientContact}
                        onChange={(e) => setClientContact(e.target.value)}
                        placeholder="e.g. 01712345678 or name@email.com"
                        className="w-full h-10 px-3 rounded-xl border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {unlockError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{unlockError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={unlocking}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    {unlocking ? "Verifying Credentials…" : "Verify Identity & Unlock Full Invoice"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">Identity Confirmed • Full Invoice Unlocked</p>
                      <p className="opacity-85 text-[11px] mt-0.5">
                        Order for: <strong>{unlockedOrder.customer_name}</strong> (#{unlockedOrder.order_number})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFullInvoiceModal((v) => !v)}
                        className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
                      >
                        {showFullInvoiceModal ? "Hide Invoice Sheet" : "View Invoice Sheet"}
                      </button>
                    </div>
                  </div>

                  {/* ── INTERACTIVE ROYAL CHERRY VANILLA INVOICE EMBED ── */}
                  {showFullInvoiceModal && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border border-border/80 rounded-2xl overflow-hidden bg-white p-6 space-y-6 shadow-xs text-zinc-900"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                        <div>
                          <h4 className="text-xl font-bold text-rose-950 font-serif">ORIZINO</h4>
                          <p className="text-xs text-zinc-500">Official Invoice #{unlockedOrder.order_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print / PDF
                          </button>
                        </div>
                      </div>

                      {/* Client Info Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                          <p className="text-[10px] uppercase font-bold text-zinc-400">Customer</p>
                          <p className="font-bold text-sm mt-0.5 text-zinc-800">{unlockedOrder.customer_name}</p>
                          <p className="text-zinc-600 mt-1">{unlockedOrder.customer_phone || unlockedOrder.customer_email}</p>
                          <p className="text-zinc-600">{unlockedOrder.shipping_address}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-right">
                          <p className="text-[10px] uppercase font-bold text-zinc-400">Order Date</p>
                          <p className="font-bold text-sm mt-0.5 text-zinc-800">
                            {new Date(unlockedOrder.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-zinc-600 mt-1 font-mono">Status: {unlockedOrder.payment_status || "Confirmed"}</p>
                          <p className="text-zinc-600 font-mono">Total: ৳{Number(unlockedOrder.total || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-rose-50/50 text-rose-950 font-bold border-b border-zinc-200">
                            <tr>
                              <th className="p-2.5">Item Specification</th>
                              <th className="p-2.5 text-center">Qty</th>
                              <th className="p-2.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(unlockedOrder.order_items || []).map((it: any, idx: number) => (
                              <tr key={it.id || idx} className="border-b border-zinc-100 last:border-none">
                                <td className="p-2.5 font-medium">{it.name || "Product Item"}</td>
                                <td className="p-2.5 text-center">{it.quantity || 1}</td>
                                <td className="p-2.5 text-right font-mono font-bold">
                                  ৳{Number(it.total_price || it.unit_price || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 4. CASE C: UNVERIFIED CODE */}
        {!state.loading && (state.error || (r && !r.found)) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="border border-destructive/40 bg-destructive/5 dark:bg-destructive/10 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                  Reference Code Unverified
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No genuine manufacturing or sales record matches the reference code:
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border/70 font-mono font-bold text-xs text-foreground mt-1">
                  <span>{code || rawCode || "Unknown Code"}</span>
                  <button onClick={copyCode} className="text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={entryPath as any}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try Another Code
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

