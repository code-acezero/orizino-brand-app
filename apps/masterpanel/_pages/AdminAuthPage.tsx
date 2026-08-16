"use client";
import React, { useState, useEffect, useId, useMemo } from "react";
import { Navigate, useNavigate, useLocation } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { storefrontHref } from "@/lib/cross-app-urls";
import SectionLoader from "@/components/loaders/SectionLoader";

type Mode = "signin" | "forgot" | "forgot_sent";

// Cinematic font stacks (loaded via <link> in __root.tsx).
const fontDisplay = "'Cinzel', 'Cormorant Garamond', ui-serif, Georgia, serif";
const fontMono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// Horizon line with soft feathered gradient edges for smooth celestial blending
const HorizonLine = ({ className = "" }: { className?: string }) => (
  <div
    className={`w-full h-px pointer-events-none ${className}`}
    style={{
      background:
        "linear-gradient(90deg, transparent 0%, hsl(var(--foreground) / 0.03) 4%, hsl(var(--foreground) / 0.16) 18%, hsl(var(--foreground) / 0.16) 82%, hsl(var(--foreground) / 0.03) 96%, transparent 100%)",
    }}
    aria-hidden
  />
);

// Themed hairline input — theme-aware monochrome, no colored accents.
const inputBase =
  "w-full bg-transparent border-b border-foreground/15 py-2.5 text-[11px] tracking-[0.18em] focus:outline-none focus:border-foreground/70 transition-colors placeholder:text-foreground/20";

// Deterministic starfield — avoids SSR/CSR mismatch and re-renders.
function useStarfield(count: number, seed: number) {
  return useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({
      top: rand() * 100,
      left: rand() * 100,
      size: rand() < 0.85 ? 1 : rand() < 0.97 ? 1.5 : 2,
      delay: rand() * 6,
      duration: 3 + rand() * 6,
      opacity: 0.25 + rand() * 0.55,
    }));
  }, [count, seed]);
}

export default function AdminAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const pwId = useId();
  const forgotEmailId = useId();
  const errorId = useId();

  const stars = useStarfield(90, 4231);

  // Restore remembered admin email.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_auth_email") : null;
    if (saved) setEmail(saved);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <SectionLoader tone="platinum" size={56} />
      </div>
    );
  }

  if (user) return <Navigate to={from} replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Could not restore the signed-in session.");
      localStorage.setItem("admin_auth_email", email);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
      });
      if (err) throw err;
      setMode("forgot_sent");
    } catch (err: any) {
      setError(err.message ?? "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  const spinner = (
    <span
      role="progressbar"
      aria-label="Working"
      className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin"
    />
  );

  const submitBtn =
    "init-btn w-full rounded-full bg-foreground text-background py-3.5 text-[10px] font-bold tracking-[0.35em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 hover:opacity-85 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const errorBlock = error && (
    <motion.div
      id={errorId}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 px-3 py-2 rounded border border-foreground/25 text-foreground text-[10px] tracking-wider"
      style={{ fontFamily: fontMono }}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{error}</span>
    </motion.div>
  );

  return (
    <div
      className="group/space min-h-dvh w-full flex items-center justify-center bg-background text-foreground overflow-hidden relative selection:bg-foreground selection:text-background"
      style={{ fontFamily: fontMono }}
    >
      {/* Deep-space starfield */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out group-has-[.init-btn:hover]:scale-[1.6] group-has-[.init-btn:hover]:opacity-40"
        aria-hidden
      >
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-foreground animate-pulse"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
        {/* Vignette to focus attention on the horizon */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, transparent 30%, rgb(var(--background-rgb, 0 0 0) / 0.85) 100%)",
          }}
        />
      </div>

      {/* Outer breathing ring (desktop only) */}
      <div
        className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,640px)] aspect-square rounded-full border border-foreground/10 animate-pulse pointer-events-none"
        style={{ animationDuration: "4s" }}
        aria-hidden
      />

      {/* Rotating edge glow (conic monochrome) — desktop only */}
      <div
        className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(88vw,600px)] aspect-square rounded-full pointer-events-none"
        style={{
          animation: "spin 22s linear infinite",
          WebkitMaskImage: "radial-gradient(circle, transparent 99.2%, black 99.7%)",
          maskImage: "radial-gradient(circle, transparent 99.2%, black 99.7%)",
        }}
        aria-hidden
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, currentColor 60deg, transparent 140deg, currentColor 260deg, transparent 360deg)",
            color: "hsl(var(--foreground) / 0.55)",
          }}
        />
      </div>

      {/* Rotating lens flare across the horizon line — desktop only */}
      <div
        className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(88vw,600px)] aspect-square pointer-events-none"
        style={{ animation: "spin 34s linear infinite" }}
        aria-hidden
      >
        {/* horizon streak removed — flare orb only */}

        <div
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--foreground) / 0.85) 0%, hsl(var(--foreground) / 0.35) 30%, transparent 70%)",
            filter: "blur(3px)",
          }}
        />
        <div
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-24 h-[1px]"
          style={{
            background:
              "linear-gradient(to right, transparent, hsl(var(--foreground) / 0.6), transparent)",
            filter: "blur(1px)",
          }}
        />
      </div>

      {/* Event horizon container — circle on desktop, rectangular panel on mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-[92vw] max-w-[440px] py-12 rounded-2xl sm:rounded-full sm:w-[min(88vw,600px)] sm:max-w-none sm:aspect-square sm:py-0 flex items-center justify-center border border-foreground/15 backdrop-blur-[2px] overflow-hidden"
      >
        {/* Accretion glow inside horizon */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, hsl(var(--foreground) / 0.08) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative z-20 w-full flex flex-col items-center text-center">
          {/* Header */}
          <header className="mb-6 w-full">
            <p
              className="text-[9px] tracking-[0.45em] uppercase opacity-50 mb-3 px-6"
              style={{ fontFamily: fontMono }}
            >
              {mode === "forgot_sent" ? "Check Your Email" : "Admin Sign In"}
            </p>
            {/* Top full-width line slicing the circle */}
            <HorizonLine />
            <div className="py-3 px-6 max-w-[360px] mx-auto">
              <h1
                className="text-[22px] leading-tight tracking-[0.22em] uppercase"
                style={{ fontFamily: fontDisplay, fontWeight: 500 }}
              >
                Orizino
                <br />
                <span className="text-[13px] tracking-[0.35em] opacity-70 block mt-1">
                  Admin Panel
                </span>
              </h1>
            </div>
            {/* Bottom full-width line slicing the circle */}
            <HorizonLine />
          </header>

          {/* Body */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {mode === "signin" && (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  onSubmit={handleSignIn}
                  className="space-y-4 w-full"
                  noValidate
                >
                  {errorBlock && (
                    <div className="max-w-[360px] mx-auto px-6 w-full mb-3">
                      {errorBlock}
                    </div>
                  )}

                  <div className="space-y-4 w-full">
                    {/* Email field with full-width underline */}
                    <div className="w-full">
                      <div className="max-w-[360px] mx-auto px-6 text-left">
                        <label
                          htmlFor={emailId}
                          className="block text-[8px] tracking-[0.28em] uppercase opacity-40 mb-1 px-1"
                          style={{ fontFamily: fontMono }}
                        >
                          Email
                        </label>
                        <input
                          id={emailId}
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="username"
                          aria-invalid={!!error}
                          aria-describedby={error ? errorId : undefined}
                          className="w-full bg-transparent py-2 px-2.5 text-[11px] tracking-[0.18em] focus:outline-none placeholder:text-foreground/20 border-none rounded-lg !bg-transparent"
                          style={{ fontFamily: fontMono, borderRadius: "8px" }}
                        />
                      </div>
                      <HorizonLine />
                    </div>

                    {/* Password field with full-width underline */}
                    <div className="w-full">
                      <div className="max-w-[360px] mx-auto px-6 text-left">
                        <div className="flex items-end justify-between mb-1 px-1">
                          <label
                            htmlFor={pwId}
                            className="block text-[8px] tracking-[0.28em] uppercase opacity-40"
                            style={{ fontFamily: fontMono }}
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            className="text-[8px] tracking-[0.22em] uppercase opacity-40 hover:opacity-100 transition-opacity inline-flex items-center gap-1 focus:outline-none focus-visible:opacity-100 cursor-pointer"
                            style={{ fontFamily: fontMono }}
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" aria-hidden /> : <Eye className="w-3 h-3" aria-hidden />}
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <input
                          id={pwId}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          aria-invalid={!!error}
                          aria-describedby={error ? errorId : undefined}
                          className="w-full bg-transparent py-2 px-2.5 text-[11px] tracking-[0.18em] focus:outline-none placeholder:text-foreground/20 border-none rounded-lg !bg-transparent"
                          style={{ fontFamily: fontMono, borderRadius: "8px" }}
                        />
                      </div>
                      <HorizonLine />
                    </div>
                  </div>

                  {/* Compressed centered Sign In button and Forgot Password link */}
                  <div className="max-w-[360px] mx-auto w-full px-6 pt-3 space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || !email || !password}
                      className={submitBtn}
                      style={{ fontFamily: fontMono }}
                    >
                      {loading ? spinner : "Sign In"}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); }}
                      className="block mx-auto text-[8px] tracking-[0.28em] uppercase opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:opacity-100 cursor-pointer"
                      style={{ fontFamily: fontMono }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </motion.form>
              )}

              {mode === "forgot" && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  onSubmit={handleForgot}
                  className="space-y-4 w-full"
                  noValidate
                >
                  {errorBlock && (
                    <div className="max-w-[360px] mx-auto px-6 w-full mb-3">
                      {errorBlock}
                    </div>
                  )}

                  <p
                    className="text-[9px] tracking-[0.28em] uppercase opacity-50 leading-relaxed max-w-[360px] mx-auto px-6"
                    style={{ fontFamily: fontMono }}
                  >
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  <div className="w-full mt-3">
                    <div className="max-w-[360px] mx-auto px-6 text-left">
                      <label
                        htmlFor={forgotEmailId}
                        className="block text-[8px] tracking-[0.28em] uppercase opacity-40 mb-1 px-1"
                        style={{ fontFamily: fontMono }}
                      >
                        Email
                      </label>
                      <input
                        id={forgotEmailId}
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className="w-full bg-transparent py-2 px-2.5 text-[11px] tracking-[0.18em] focus:outline-none placeholder:text-foreground/20 border-none rounded-lg !bg-transparent"
                        style={{ fontFamily: fontMono, borderRadius: "8px" }}
                      />
                    </div>
                    <HorizonLine />
                  </div>

                  <div className="max-w-[360px] mx-auto w-full px-6 pt-3 space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || !email}
                      className={submitBtn}
                      style={{ fontFamily: fontMono }}
                    >
                      {loading ? spinner : "Send Reset Link"}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => { setMode("signin"); setError(null); }}
                      className="mx-auto flex items-center gap-1.5 text-[8px] tracking-[0.28em] uppercase opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:opacity-100 cursor-pointer"
                      style={{ fontFamily: fontMono }}
                    >
                      <ArrowLeft className="w-3 h-3" aria-hidden /> Back to Sign In
                    </button>
                  </div>
                </motion.form>
              )}

              {mode === "forgot_sent" && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 text-center max-w-[360px] mx-auto px-6"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border border-foreground/25 mx-auto">
                    <CheckCircle2 className="w-5 h-5" aria-hidden />
                  </div>
                  <p
                    className="text-[10px] tracking-[0.25em] uppercase opacity-70 leading-relaxed"
                    style={{ fontFamily: fontMono }}
                  >
                    We've sent a password reset link to
                    <br />
                    <span className="opacity-100">{email}</span>
                  </p>
                  <button
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="mx-auto flex items-center gap-1.5 text-[8px] tracking-[0.28em] uppercase opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:opacity-100 cursor-pointer"
                    style={{ fontFamily: fontMono }}
                  >
                    <ArrowLeft className="w-3 h-3" aria-hidden /> Back to Sign In
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* HUD tick marks around horizon */}
      <div
        className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(86vw,580px)] aspect-square pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-foreground/25" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-6 bg-foreground/25" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-6 bg-foreground/25" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-px w-6 bg-foreground/25" />
      </div>

      {/* Telemetry footer */}
      <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-between text-[8px] tracking-[0.4em] uppercase opacity-30" style={{ fontFamily: fontMono }}>
        <span>Orizino Admin Panel</span>
        <a
          href={storefrontHref("/")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:opacity-100 opacity-70 transition-opacity focus:outline-none focus-visible:opacity-100"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden /> Visit Store
        </a>
      </div>
    </div>
  );
}
// code:4ce0
