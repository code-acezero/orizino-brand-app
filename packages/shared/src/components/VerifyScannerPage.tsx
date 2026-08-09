"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Camera, CheckCircle2, ShieldCheck, XCircle, Info, ArrowRight,
  Sparkles, Package, X, ArrowLeft, Search, Copy, Check,
  BadgeCheck, AlertCircle, RefreshCw, Eye, ExternalLink, Fingerprint,
  Lock, Shield, Award, QrCode, SwitchCamera, Volume2, Flashlight
} from "lucide-react";
import { Link, useNavigate } from "../lib/router-compat";
import type { VerifyResult } from "../types/verify";

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
  isSignedIn?: boolean;
  learnMoreHref?: string;
  homePath?: string;
  content?: VerifyScannerContent;
}

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
  if (props.code) return <ResultView {...props} />;
  return <EntryView {...props} />;
}

/* ─────────────────────── ENTRY VIEW ─────────────────────── */

function EntryView(props: VerifyScannerPageProps) {
  const { resultPath, learnMoreHref, isSignedIn, homePath = "/", content } = props;
  const c = content ?? {};
  const navigate = useNavigate();
  const [manual, setManual] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  function goToResult(raw: string) {
    const code = raw.trim();
    if (!code) return;
    triggerScanFeedback();
    navigate({ to: resultPath, params: { code } as any });
  }

  async function startScan(requestedFacing?: "environment" | "user") {
    const mode = requestedFacing || facingMode;
    setCamError(null);
    stopScan();

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];

      if (track && "getCapabilities" in track) {
        const capabilities: any = track.getCapabilities();
        setTorchSupported(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const Ctor = getBarcodeDetector();
      if (Ctor) {
        detectorRef.current = new Ctor({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "data_matrix", "pdf417"],
        });
      }

      setScanning(true);
      if (detectorRef.current) {
        loop();
      }
    } catch (e: any) {
      setCamError(e?.message ?? "Camera permission required. Please allow camera access in browser settings.");
    }
  }

  function stopScan() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
    setTorch(false);
  }

  function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      const nextTorch = !torch;
      track
        .applyConstraints({ advanced: [{ torch: nextTorch }] } as any)
        .then(() => setTorch(nextTorch))
        .catch(() => {});
    }
  }

  function flipCamera() {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startScan(nextFacing);
  }

  function loop() {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video) return;

    detector
      .detect(video)
      .then((codes) => {
        if (codes && codes.length > 0 && codes[0].rawValue) {
          const raw = codes[0].rawValue;
          stopScan();
          goToResult(raw);
          return;
        }
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(loop);
      });
  }

  // Auto-start camera scan on mount
  useEffect(() => {
    startScan();
    return () => stopScan();
  }, []);

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">

        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={homePath as any}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Storefront
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all shadow-xs"
            >
              <Info className="w-3.5 h-3.5" /> Guide
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Column: PROMINENT CAMERA SCANNER PANEL (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col border border-border/60 rounded-3xl p-6 sm:p-8 bg-card shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold font-display text-foreground tracking-tight">
                    {c.entry_title ?? "Live Barcode & QR Camera Scanner"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Point camera at product tag to verify authenticity
                  </p>
                </div>
              </div>

              {scanning && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border border-border/60 text-foreground text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" /> LIVE
                </div>
              )}
            </div>

            {/* LIVE CAMERA VIEWPORT */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden bg-zinc-950 border border-border/40 flex items-center justify-center">
              
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <ScanLine className="w-8 h-8" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm font-semibold text-white">Activate Camera Sensor</p>
                    <p className="text-xs text-zinc-400">Tap below to grant camera access and start live scanning.</p>
                  </div>
                  <button
                    onClick={() => startScan()}
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-xs hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    <Camera className="w-4 h-4 shrink-0" style={{ color: "#000000" }} />
                    <span style={{ color: "#000000", fontWeight: 800 }}>Launch Camera Scanner</span>
                  </button>
                </div>
              )}

              {scanning && (
                <>
                  {/* Target Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-2xl border-2 border-white/70 relative">
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg" />
                    </div>
                    <motion.div
                      initial={{ y: -90 }}
                      animate={{ y: [-90, 90, -90] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute w-52 sm:w-64 h-0.5 bg-white shadow-[0_0_15px_3px_rgba(255,255,255,0.8)]"
                    />
                  </div>

                  {/* Native Camera Action Bar Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 bg-black/70 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 z-20">
                    <button
                      onClick={flipCamera}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Flip Camera"
                    >
                      <SwitchCamera className="w-4 h-4" /> Flip Camera
                    </button>

                    {torchSupported && (
                      <button
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          torch ? "bg-white text-zinc-950" : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        <Flashlight className="w-4 h-4" /> Flash
                      </button>
                    )}

                    <button
                      onClick={stopScan}
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <X className="w-4 h-4" /> Stop
                    </button>
                  </div>
                </>
              )}
            </div>

            {camError && (
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 flex items-start gap-2 text-xs text-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>{camError}</span>
              </div>
            )}

            {/* Manual Serial Search Option */}
            <div className="pt-2 border-t border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">Or Enter Serial Code Manually</p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToResult(manual)}
                    placeholder="Enter Serial Code (e.g. ORZ-PRD-000123)..."
                    inputMode="text"
                    autoCapitalize="characters"
                    className="w-full h-11 pl-9 pr-4 rounded-xl bg-background border border-border/60 text-sm font-mono outline-none focus:border-foreground/60 focus:ring-1 focus:ring-foreground/10 transition-all"
                  />
                </div>
                <button
                  onClick={() => goToResult(manual)}
                  disabled={!manual.trim()}
                  className="h-11 px-6 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs gap-2 inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
                >
                  {c.cta_label ?? "Verify Code"} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Authenticity Protections (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col border border-border/60 rounded-3xl p-6 sm:p-8 bg-card shadow-xs space-y-6 justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-border/30 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Authenticity Protections</h3>
                  <p className="text-xs text-muted-foreground">Original Quality Guarantee</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Serial Tagging</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Each manufactured item carries a unique serial code linked directly to our central inventory records.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Customer Privacy</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      {isSignedIn
                        ? (c.hint_signed_in ?? "Signed in: Verifying your item confirms your original order number and purchase receipt.")
                        : (c.hint_signed_out ?? "Public scans confirm authenticity without revealing your personal name, address, or payment details.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Original Guarantee</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Protects against counterfeit goods and confirms authentic fabric, sizing, and batch origin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {learnMoreHref && (
              <div className="border-t border-border/30 pt-4">
                <a
                  href={learnMoreHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
                >
                  {c.learn_more_label ?? "Learn more about product verification"} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Guide Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-3xl border border-border/60 p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-secondary text-foreground flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Verification Guide</h3>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="space-y-4 text-xs">
                {[
                  { title: "Point Camera", desc: "Allow camera permission and align the camera view with your barcode tag." },
                  { title: "Automatic Detection", desc: "The optical scanner automatically detects and decodes the serial number." },
                  { title: "Serial Lookup", desc: "Our database verifies authenticity and checks manufacture records." },
                  { title: "Inspect Receipt", desc: "Log in with your buyer account to access full order invoice records." },
                ].map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary border border-border/60 text-foreground font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{step.title}</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all"
              >
                Close Guide
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── RESULT VIEW ─────────────────────── */

function ResultView({ code, onLookup, entryPath, isSignedIn, homePath = "/" }: VerifyScannerPageProps) {
  const [state, setState] = useState<{ loading: boolean; error?: string; result?: VerifyResult }>({ loading: true });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await onLookup(code!);
        if (!cancelled) setState({ loading: false, result: r });
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e?.message ?? "Lookup failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const r = state.result;

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-12 bg-background/50">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">

        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={entryPath as any}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Scan Another Product
          </Link>
          <Link
            to={homePath as any}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Return to Storefront
          </Link>
        </div>

        {/* Loading Spinner */}
        {state.loading && (
          <div className="border border-border/60 rounded-3xl p-12 bg-card text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">Verifying Serial Code Database...</p>
          </div>
        )}

        {/* Error / Not Found */}
        {!state.loading && (state.error || (r && !r.found)) && (
          <div className="border border-border/60 rounded-3xl p-8 sm:p-12 bg-card text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-secondary text-foreground flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">Serial Code Unverified</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {state.error ?? <>No authentic record matches serial code <span className="font-mono font-bold text-foreground">"{code}"</span>.</>}
            </p>
            <Link
              to={entryPath as any}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
            >
              Scan Again
            </Link>
          </div>
        )}

        {/* Verification Result */}
        {!state.loading && r && r.found && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Genuine Banner */}
            <div className="border border-border/60 rounded-3xl p-6 sm:p-8 bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">Genuine Orizino Product</h2>
                    <button onClick={copyCode} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-foreground" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Serial Code: {code}</p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-secondary/60 border border-border/60 text-foreground text-xs font-semibold w-fit">
                ✓ Authentic Tag Verified
              </div>
            </div>

            {/* Product Details Parallel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

              {/* Left Column: Product Info */}
              <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs h-full">
                <h3 className="text-sm font-bold text-foreground tracking-tight border-b border-border/30 pb-3">
                  Product Specification
                </h3>

                <div className="flex items-center gap-4">
                  {(r.product?.thumbnail || r.product?.images?.[0]) ? (
                    <img
                      src={r.product.thumbnail || r.product.images![0]}
                      alt=""
                      className="w-20 h-20 rounded-2xl object-cover border border-border/40 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-base font-bold text-foreground">{r.product?.name || "Orizino Apparel"}</h4>
                    {r.product?.slug && (
                      <a
                        href={`/product/${r.product.slug}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Product Page
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Sold & Ownership Info */}
              <div className="border border-border/60 rounded-3xl p-6 bg-card space-y-4 shadow-xs h-full">
                {r.status === "sold" && r.sold && (
                  <SoldCard r={r} isSignedIn={!!isSignedIn} />
                )}
                {r.status && r.status !== "sold" && (
                  <StatusCard status={r.status} />
                )}
              </div>

            </div>

          </motion.div>
        )}

      </main>
    </div>
  );
}

function StatusCard({ status }: { status: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory Status</p>
      <p className="text-base font-bold text-foreground capitalize">{status}</p>
    </div>
  );
}

function SoldCard({ r, isSignedIn }: { r: VerifyResult; isSignedIn: boolean }) {
  const s = r.sold!;

  if (s.is_owner && s.order) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground tracking-tight border-b border-border/30 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-foreground" /> Verified Ownership Record
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Order Number</span>
            <span className="font-mono font-bold text-foreground">#{s.order.order_number}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Order Total</span>
            <span className="font-bold text-foreground">৳{s.order.total.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Purchase Date</span>
            <span className="font-medium text-foreground">
              {s.sold_at ? new Date(s.sold_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground tracking-tight border-b border-border/30 pb-3">
        Sales Record
      </h3>
      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Date</span>
          <span className="font-medium text-foreground">{s.sold_at_masked ?? "Recorded"}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Purchaser</span>
          <span className="font-medium text-foreground">{s.buyer_masked}</span>
        </div>
      </div>
    </div>
  );
}
