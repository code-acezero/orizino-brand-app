"use client";
import React, { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useLocation, Link } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Shield, ShieldAlert, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useQuery } from "@tanstack/react-query";
import NotRobotCheck from "@/components/auth/NotRobotCheck";
import MfaChallengeDialog from "@/components/auth/MfaChallengeDialog";
import { useAuthAppearance } from "@/hooks/use-auth-appearance";
import { useIsMobile } from "@/hooks/use-mobile";

const REMEMBER_KEY = "auth_remember_email";

const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-destructive" };
  if (score <= 2) return { level: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { level: 3, label: "Good", color: "bg-yellow-400" };
  if (score <= 4) return { level: 4, label: "Strong", color: "bg-emerald-400" };
  return { level: 5, label: "Very Strong", color: "bg-emerald-500" };
};

type Mode = "signin" | "signup" | "forgot" | "otp";

const AuthPage: React.FC = () => {
  useSeoMeta("auth", "Sign In | Store");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from || "/";
  const appearance = useAuthAppearance();
  const isMobile = useIsMobile();
  const TESTIMONIALS = appearance.testimonials.length
    ? appearance.testimonials
    : [{ quote: "Welcome back.", author: "" }];

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [subscribeEmails, setSubscribeEmails] = useState(true);
  const [mfaOpen, setMfaOpen] = useState(false);

  // Restore remembered email on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_KEY);
      if (remembered) { setEmail(remembered); setRememberMe(true); }
    } catch {}
  }, []);

  // Brand
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-auth"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["site_name", "logo_url", "site_icon_url", "site_description"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => { const val = s.value; map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val; });
      return map;
    },
    staleTime: 15 * 60 * 1000,
  });
  const siteName = (siteSettings?.site_name as string) || "Store";
  const logoUrl = (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "";

  // Rotate testimonials
  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(id);
  }, []);

  if (user) return <Navigate to="/" replace />;

  const pwStrength = getPasswordStrength(password);

  const robotOk = appearance.show_robot_check ? humanVerified : true;
  const isSignInValid = !!email.trim() && password.length >= 6 && robotOk;
  const isSignUpValid = !!email.trim() && password.length >= 6 && !!fullName.trim() && robotOk && termsAccepted;
  const isForgotValid = email.trim().length > 0;

  const persistRemember = () => {
    try {
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInValid) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast({ title: "Sign in failed", description: error.message, variant: "destructive" }); return; }
    persistRemember();
    // Check if MFA step-up is required (user has verified TOTP factor → AAL2 needed)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      setMfaOpen(true);
    } else {
      navigate(fromPath || "/");
    }
  };

  const finishMfaSignIn = () => {
    setMfaOpen(false);
    navigate(fromPath || "/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpValid) return;
    setLoading(true);
    try {
      // Step 1: create account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) {
        toast({ title: "Sign up failed", description: signUpError.message, variant: "destructive" });
        return;
      }
      // Step 2: immediately sign in (no email verification required)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Account created but couldn't sign in — still a partial success
        toast({ title: "Account created! Please sign in.", description: "Your account is ready. Sign in to continue." });
        setMode("signin");
        return;
      }
      // Step 3: best-effort newsletter opt-in
      if (subscribeEmails) {
        supabase.from("email_subscriptions").insert({ email, name: fullName, source: "signup", is_active: true })
          .then(() => {});
      }
      toast({ title: "Welcome to Orizino! 🎉", description: "Your account is ready." });
      persistRemember();
      navigate(fromPath || "/");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 8) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpValue, type: "signup" });
      if (error) {
        toast({ title: "Verification failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account verified" });
      navigate("/");
    } catch (err: any) {
      // Guards against a thrown/rejected promise (e.g. a transient network
      // error) leaving the button stuck on its loading spinner forever.
      toast({ title: "Verification failed", description: err?.message ?? "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForgotValid) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Email sent", description: "Check your inbox for the reset link." });
  };

  const goBack = () => {
    // Prefer in-app history if we have it
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        const ref = document.referrer;
        const sameOrigin = ref && new URL(ref).origin === window.location.origin;
        if (sameOrigin || !ref) {
          window.history.back();
          return;
        }
      }
    } catch {}
    if (fromPath && fromPath !== "/auth") navigate(fromPath);
    else navigate("/");
  };

  const inputBase =
    "w-full h-11 pl-10 pr-3 bg-transparent border-b border-border text-foreground text-sm placeholder:text-muted-foreground/60 " +
    "focus:outline-none focus:border-primary transition-colors";

  // ── OTP screen ────────────────────────────────────────────────
  if (mode === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.03]" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-[420px] bg-card/80 md:bg-card/60 md:backdrop-blur-xl border border-border/60 rounded-2xl p-7 sm:p-10 flex flex-col items-center gap-5 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.3)]"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-display tracking-tight text-foreground">Verify your email</h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              We sent an 8-digit code to <span className="text-foreground">{otpEmail}</span>
            </p>
          </div>
          <InputOTP maxLength={8} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              {Array.from({ length: 8 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleVerifyOtp}
            disabled={loading || otpValue.length !== 8}
            className="w-full h-11 rounded-full bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : "Verify & Continue"}
          </motion.button>
          <button onClick={() => { setMode("signup"); setOtpValue(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main split-screen ────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Theme accent gradient backdrop */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary/[0.10] via-transparent to-primary/[0.05]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_hsl(var(--primary)/0.10),_transparent_60%)]" />
      {!isMobile && (
        <>
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full bg-primary/[0.18] blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full bg-primary/[0.10] blur-3xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </>
      )}


      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card/80 md:bg-card/60 md:backdrop-blur-md border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`w-full ${appearance.show_brand_panel ? "max-w-[920px] grid grid-cols-1 md:grid-cols-2" : "max-w-[460px]"} bg-card/80 md:bg-card/40 md:backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-[0_40px_100px_-40px_hsl(var(--primary)/0.25)]`}
        >
          {/* LEFT — Brand panel (desktop only) */}
          {appearance.show_brand_panel && (
          <div className="hidden md:flex relative flex-col justify-between p-10 bg-gradient-to-br from-foreground/[0.04] via-primary/[0.05] to-foreground/[0.03] border-r border-border/40">
            <Link to="/" className="inline-flex items-center gap-2.5 w-fit">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="w-9 h-9 rounded-full object-cover ring-1 ring-border/50" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{siteName.charAt(0)}</span>
                </div>
              )}
              <span className="font-semibold text-sm tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {siteName}
              </span>
            </Link>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-3">{appearance.welcome_kicker}</p>
                <h2 className="text-3xl font-display leading-[1.1] text-foreground tracking-tight whitespace-pre-line">
                  {mode === "signup" ? appearance.headline_signup : mode === "forgot" ? appearance.headline_forgot : appearance.headline_signin}
                </h2>
              </div>

              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={testimonialIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="border-l-2 border-primary/40 pl-4 py-1"
                >
                  <p className="text-sm font-display italic text-foreground/80 leading-snug">
                    {TESTIMONIALS[testimonialIdx].quote}
                  </p>
                  <footer className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
                    {TESTIMONIALS[testimonialIdx].author}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 font-mono">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              {appearance.secured_label}
            </div>
          </div>
          )}

          {/* RIGHT — Form panel */}
          <div className="relative flex flex-col p-7 sm:p-10">
            {/* Tab toggle */}
            {mode !== "forgot" && (
              <div className="self-start mb-6 inline-flex bg-secondary/40 rounded-full p-1 border border-border/50">
                <button
                  onClick={() => { setMode("signin"); setTermsAccepted(false); }}
                  className={`px-4 h-8 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                    mode === "signin" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMode("signup"); setTermsAccepted(false); }}
                  className={`px-4 h-8 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                    mode === "signup" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* SIGN IN */}
              {mode === "signin" && (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div>
                    <h1 className="text-2xl font-display text-foreground tracking-tight">Welcome back</h1>
                    <p className="text-xs text-muted-foreground mt-1">Continue to your account.</p>
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputBase} />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={`${inputBase} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {appearance.show_remember_me ? (
                      <label className="inline-flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-3 h-3 rounded border-border accent-primary"
                        />
                        Remember me
                      </label>
                    ) : <span />}
                    <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:underline font-medium">
                      Forgot password?
                    </button>
                  </div>

                  {appearance.show_robot_check && (
                    <NotRobotCheck verified={humanVerified} onVerifiedChange={setHumanVerified} resetKey="signin" />
                  )}

                  <motion.button
                    whileTap={isSignInValid ? { scale: 0.98 } : undefined}
                    type="submit"
                    disabled={loading || !isSignInValid}
                    className="w-full h-11 rounded-full bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                  </motion.button>

                  <p className="text-center text-xs text-muted-foreground">
                    New here?{" "}
                    <button type="button" onClick={() => { setMode("signup"); setTermsAccepted(false); }} className="text-primary hover:underline font-medium">
                      Create an account
                    </button>
                  </p>

                  <div className="relative pt-2 pb-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(fromPath || "/")}
                    className="w-full h-11 rounded-full border border-border bg-transparent text-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
                  >
                    Continue as Guest <ArrowRight className="w-4 h-4 opacity-50" />
                  </button>
                </motion.form>
              )}

              {/* SIGN UP */}
              {mode === "signup" && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSignUp}
                  className="space-y-4"
                >
                  <div>
                    <h1 className="text-2xl font-display text-foreground tracking-tight">Create account</h1>
                    <p className="text-xs text-muted-foreground mt-1">Two minutes. Lifetime taste.</p>
                  </div>

                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputBase} />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputBase} />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={`${inputBase} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${level <= pwStrength.level ? pwStrength.color : "bg-muted"}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwStrength.level <= 2 ? <ShieldAlert className="w-3 h-3 text-destructive" /> : <Shield className="w-3 h-3 text-emerald-400" />}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{pwStrength.label}</span>
                      </div>
                    </div>
                  )}

                  <label className="inline-flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                    />
                    <span className="leading-relaxed">
                      I agree to the{" "}
                      <Link to="/page/terms" className="text-foreground hover:underline font-medium">Terms of Service</Link>{" "}
                      and{" "}
                      <Link to="/page/privacy" className="text-foreground hover:underline font-medium">Privacy Policy</Link>.
                    </span>
                  </label>

                  <label className="inline-flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={subscribeEmails}
                      onChange={(e) => setSubscribeEmails(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                    />
                    <span className="leading-relaxed">
                      Send me product updates, offers, and campaign emails. You can unsubscribe anytime.
                    </span>
                  </label>

                  {appearance.show_robot_check && (
                    <NotRobotCheck verified={humanVerified} onVerifiedChange={setHumanVerified} resetKey="signup" />
                  )}

                  <motion.button
                    whileTap={isSignUpValid ? { scale: 0.98 } : undefined}
                    type="submit"
                    disabled={loading || !isSignUpValid}
                    className="w-full h-11 rounded-full bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                  </motion.button>

                  <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
                    All personal data is handled securely and in accordance with our policies.
                  </p>
                </motion.form>
              )}

              {/* FORGOT */}
              {mode === "forgot" && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleForgot}
                  className="space-y-4"
                >
                  <div>
                    <h1 className="text-2xl font-display text-foreground tracking-tight">Reset password</h1>
                    <p className="text-xs text-muted-foreground mt-1">We'll email you a secure reset link.</p>
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputBase} />
                  </div>

                  <motion.button
                    whileTap={isForgotValid ? { scale: 0.98 } : undefined}
                    type="submit"
                    disabled={loading || !isForgotValid}
                    className="w-full h-11 rounded-full bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <>Send Reset Link <Check className="w-4 h-4" /></>}
                  </motion.button>

                  <button type="button" onClick={() => setMode("signin")} className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Back to sign in
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
    <MfaChallengeDialog open={mfaOpen} onOpenChange={setMfaOpen} onSuccess={finishMfaSignIn} />
    </>
  );
};

export default AuthPage;
// code:4ce0
