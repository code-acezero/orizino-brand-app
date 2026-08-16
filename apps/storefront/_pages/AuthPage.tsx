"use client";
import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation, Link } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useQuery } from "@tanstack/react-query";
import MfaChallengeDialog from "@/components/auth/MfaChallengeDialog";
import { useAuthAppearance } from "@/hooks/use-auth-appearance";
import { BrandImage, type LogoFilter } from "@/lib/brand-image";

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

  const TESTIMONIALS = appearance.testimonials.length
    ? appearance.testimonials
    : [{ quote: "Elevating contemporary luxury streetwear with bespoke craftsmanship.", author: "ORIZINO ATELIER" }];

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [subscribeEmails, setSubscribeEmails] = useState(true);
  const [mfaOpen, setMfaOpen] = useState(false);

  // Restore remembered email on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_KEY);
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // Brand Info & Logo Styling
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-auth"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "site_name",
          "logo_url",
          "site_icon_url",
          "site_description",
          "title_font",
          "logo_color_filter",
          "logo_tint_color",
        ]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
    staleTime: 15 * 60 * 1000,
  });

  const siteName = (siteSettings?.site_name as string) || "ORIZINO";
  const logoUrl = (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "";
  const titleFont = (siteSettings?.title_font as string) || "Instrument Serif";
  const logoFilter = (siteSettings?.logo_color_filter as LogoFilter) || "none";
  const logoTint = (siteSettings?.logo_tint_color as string) || "#ffffff";

  // Rotate testimonials
  useEffect(() => {
    if (TESTIMONIALS.length <= 1) return;
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, [TESTIMONIALS.length]);

  if (user) return <Navigate to="/" replace />;

  const pwStrength = getPasswordStrength(password);
  const isSignInValid = !!email.trim() && password.length >= 6;
  const isSignUpValid = !!email.trim() && password.length >= 6 && !!fullName.trim() && termsAccepted;
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
    if (error) {
      setLoading(false);
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    persistRemember();
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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) {
        toast({ title: "Sign up failed", description: signUpError.message, variant: "destructive" });
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({
          title: "Account created! Please sign in.",
          description: "Your account is ready. Sign in to continue.",
        });
        setMode("signin");
        return;
      }
      if (subscribeEmails) {
        supabase
          .from("email_subscriptions")
          .insert({ email, name: fullName, source: "signup", is_active: true })
          .then(() => {});
      }
      toast({ title: "Welcome to ORIZINO! 🎉", description: "Your account is active." });
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
      toast({
        title: "Verification failed",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
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
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for the password reset link." });
    }
  };

  const goBack = () => {
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

  const inputStyle =
    "w-full h-11 pl-10 pr-4 bg-secondary/30 border border-border/50 rounded-xl text-foreground text-xs " +
    "placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all";

  // ── OTP Screen ──────────────────────────────────────────────
  if (mode === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.03] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-[420px] bg-card border border-border/60 rounded-3xl p-8 sm:p-10 flex flex-col items-center gap-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: `'${titleFont}', sans-serif` }}>
              Verify Email Address
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter the 8-digit verification code sent to <span className="font-semibold text-foreground">{otpEmail}</span>
            </p>
          </div>

          <InputOTP maxLength={8} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              {Array.from({ length: 8 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="rounded-lg text-xs" />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otpValue.length !== 8}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {loading ? <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Verify & Continue"}
          </button>

          <button
            onClick={() => { setMode("signup"); setOtpValue(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            ← Back to sign up
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main Lightweight Plain Auth Screen ─────────────────────────
  return (
    <>
      <div className="min-h-screen bg-background relative flex flex-col justify-start overflow-hidden">
        {/* Subtle Ambient Background Light */}
        <div aria-hidden className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Minimal Nav (Tight vertical space) */}
        <header className="relative z-20 w-full px-6 pt-2.5 pb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-secondary/40 hover:bg-secondary/70 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <button
            type="button"
            onClick={() => navigate(fromPath || "/")}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-secondary/20 hover:bg-secondary/50 border border-border/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Guest Shop
          </button>
        </header>

        {/* Main Content (Shifted high upwards) */}
        <main className="relative z-10 w-full flex items-start justify-center px-4 pt-1 sm:pt-2 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`w-full ${
              appearance.show_brand_panel ? "max-w-4xl grid grid-cols-1 md:grid-cols-12" : "max-w-md"
            } bg-card/90 border border-border/60 rounded-3xl overflow-hidden`}
          >
            {/* LEFT: Brand Story, Plain Center Logo & Quotes (Desktop only) */}
            {appearance.show_brand_panel && (
              <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-7 bg-gradient-to-br from-secondary/40 via-card to-secondary/20 border-r border-border/40 min-h-[480px]">
                {/* Top Section: Kicker & Headline */}
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Member Privileges
                  </span>
                  <h2
                    className="text-2xl font-bold tracking-tight text-foreground leading-tight"
                    style={{ fontFamily: `'${titleFont}', sans-serif` }}
                  >
                    {mode === "signup"
                      ? appearance.headline_signup || "Join the Collective"
                      : mode === "forgot"
                      ? appearance.headline_forgot || "Reset Password"
                      : appearance.headline_signin || "Step Inside The Drop Awaits"}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {appearance.subheadline || "Continue to your account."}
                  </p>
                </div>

                {/* ── CENTER: PLAIN LARGE BRAND LOGO (Clean & Elevated) ── */}
                <div className="my-auto py-4 flex items-center justify-center">
                  {logoUrl ? (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                      <BrandImage
                        src={logoUrl}
                        alt={siteName}
                        filter={logoFilter}
                        customColor={logoTint}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <span
                      className="text-5xl font-black text-primary select-none"
                      style={{ fontFamily: `'${titleFont}', sans-serif` }}
                    >
                      {siteName.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Bottom Section: Rotating Testimonials & Secured badge */}
                <div className="space-y-3 pt-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={testimonialIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-2xl bg-card/70 border border-border/40 p-3 space-y-0.5"
                    >
                      <p className="text-xs italic text-foreground/90 leading-relaxed">
                        "{TESTIMONIALS[testimonialIdx].quote}"
                      </p>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                        {TESTIMONIALS[testimonialIdx].author || "THE ATELIER"}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {appearance.secured_label || "SECURED BY ENCRYPTED AUTHENTICATION"}
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT: Modern Form Panel (Top-aligned so switcher position remains fixed) */}
            <div className={`p-6 sm:p-7 flex flex-col justify-start ${appearance.show_brand_panel ? "md:col-span-7" : ""}`}>
              {/* Segmented Switcher with Smooth Slide Transition */}
              {mode !== "forgot" && (
                <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-secondary/40 border border-border/40 mb-5">
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setTermsAccepted(false); }}
                    className={`relative z-10 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center ${
                      mode === "signin"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "signin" && (
                      <motion.div
                        layoutId="activeAuthTab"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-card border border-border/60"
                      />
                    )}
                    <span className="relative z-10">Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setTermsAccepted(false); }}
                    className={`relative z-10 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center ${
                      mode === "signup"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "signup" && (
                      <motion.div
                        layoutId="activeAuthTab"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-card border border-border/60"
                      />
                    )}
                    <span className="relative z-10">Create Account</span>
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── SIGN IN FORM ── */}
                {mode === "signin" && (
                  <motion.form
                    key="signin"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignIn}
                    className="space-y-4"
                  >
                    <div>
                      <h1
                        className="text-xl font-bold tracking-tight text-foreground uppercase"
                        style={{ fontFamily: `'${titleFont}', sans-serif` }}
                      >
                        Welcome Back
                      </h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Enter your credentials to access your orders.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className={inputStyle}
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className={`${inputStyle} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      {appearance.show_remember_me ? (
                        <label className="inline-flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-border accent-primary"
                          />
                          Remember me
                        </label>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isSignInValid}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer mt-1"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Sign In <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <div className="relative py-0.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(fromPath || "/")}
                      className="w-full h-10 rounded-xl border border-border/60 hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 text-foreground text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      Continue as Guest <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </motion.form>
                )}

                {/* ── SIGN UP FORM ── */}
                {mode === "signup" && (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignUp}
                    className="space-y-3"
                  >
                    <div>
                      <h1
                        className="text-xl font-bold tracking-tight text-foreground uppercase"
                        style={{ fontFamily: `'${titleFont}', sans-serif` }}
                      >
                        Create Account
                      </h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Quick registration for seamless orders and tracking.</p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className={inputStyle}
                        />
                      </div>

                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className={inputStyle}
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password (min 6 chars)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className={`${inputStyle} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {password && (
                      <div className="space-y-1 pt-0.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= pwStrength.level ? pwStrength.color : "bg-secondary"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {pwStrength.level <= 2 ? (
                            <ShieldAlert className="w-3 h-3 text-destructive" />
                          ) : (
                            <Shield className="w-3 h-3 text-emerald-400" />
                          )}
                          <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-mono">
                            {pwStrength.label} Password
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-1 text-xs">
                      <label className="inline-flex items-start gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          required
                          className="mt-0.5 w-3.5 h-3.5 rounded border-border accent-primary shrink-0"
                        />
                        <span className="text-[11px] leading-tight">
                          I agree to the{" "}
                          <Link to="/page/terms" className="text-foreground hover:underline font-semibold">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/page/privacy" className="text-foreground hover:underline font-semibold">
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>

                      <label className="inline-flex items-start gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={subscribeEmails}
                          onChange={(e) => setSubscribeEmails(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded border-border accent-primary shrink-0"
                        />
                        <span className="text-[11px] leading-tight">
                          Receive drop announcements and bespoke campaign updates.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isSignUpValid}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer mt-1"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Account <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* ── FORGOT PASSWORD FORM ── */}
                {mode === "forgot" && (
                  <motion.form
                    key="forgot"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleForgot}
                    className="space-y-4"
                  >
                    <div>
                      <h1
                        className="text-xl font-bold tracking-tight text-foreground uppercase"
                        style={{ fontFamily: `'${titleFont}', sans-serif` }}
                      >
                        Reset Password
                      </h1>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We will send a secure reset link to your registered email.
                      </p>
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={inputStyle}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isForgotValid}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Send Reset Link <Check className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      ← Back to sign in
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </main>

        {/* Minimal Footer */}
        <footer className="relative z-20 w-full px-6 py-2 text-center text-[10px] text-muted-foreground/60 font-mono">
          &copy; {new Date().getFullYear()} {siteName}. Secure SSL 256-Bit Checkout.
        </footer>
      </div>

      <MfaChallengeDialog open={mfaOpen} onOpenChange={setMfaOpen} onSuccess={finishMfaSignIn} />
    </>
  );
};

export default AuthPage;
