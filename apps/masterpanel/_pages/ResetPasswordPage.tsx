"use client";
import React, { useEffect, useId, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SectionLoader from "@/components/loaders/SectionLoader";

// Matches the styling used on the sign-in page so the reset flow feels
// like one continuous experience.
const fontDisplay = "'Cinzel', 'Cormorant Garamond', ui-serif, Georgia, serif";
const fontMono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const inputBase =
  "w-full bg-transparent border-b border-foreground/15 py-2.5 text-[11px] tracking-[0.18em] uppercase focus:outline-none focus:border-foreground/70 transition-colors placeholder:text-foreground/20";

const submitBtn =
  "w-full rounded-full bg-foreground text-background py-3.5 text-[10px] font-bold tracking-[0.35em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 hover:opacity-85 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Status = "verifying" | "ready" | "invalid" | "success";

/**
 * Handles the link sent by `supabase.auth.resetPasswordForEmail`.
 *
 * Supabase's client (configured with `detectSessionInUrl: true`) parses the
 * recovery token out of the URL on load and fires a `PASSWORD_RECOVERY`
 * auth event once the temporary session is established. We wait for that
 * event (or an already-present session) before showing the "set a new
 * password" form, and fall back to an "invalid/expired link" state if
 * neither shows up in a reasonable window.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwId = useId();
  const confirmId = useId();
  const errorId = useId();

  useEffect(() => {
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // If the recovery session was already established before this
    // component mounted (or the event fires too fast to catch), fall back
    // to checking for an active session directly.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setStatus("ready");
    });

    // No recovery event and no session after a few seconds means the link
    // is missing, expired, or already used.
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setStatus((current) => (current === "verifying" ? "invalid" : current));
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setStatus("success");
      // Sign out the temporary recovery session so the user lands back on
      // the normal sign-in screen and authenticates with the new password.
      await supabase.auth.signOut();
      window.setTimeout(() => navigate("/auth", { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message ?? "Could not update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
      className="min-h-dvh w-full flex items-center justify-center bg-background text-foreground overflow-hidden relative selection:bg-foreground selection:text-background"
      style={{ fontFamily: fontMono }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-[92vw] max-w-[420px] py-12 rounded-sm sm:rounded-full sm:w-[min(86vw,580px)] sm:max-w-none sm:aspect-square sm:py-0 flex items-center justify-center border border-foreground/15 backdrop-blur-[2px] overflow-hidden"
      >
        <div className="relative z-20 w-full max-w-[340px] px-6 flex flex-col items-center text-center">
          <header className="mb-8 w-full">
            <p
              className="text-[9px] tracking-[0.45em] uppercase opacity-50 mb-3"
              style={{ fontFamily: fontMono }}
            >
              {status === "success" ? "Password Updated" : "Reset Password"}
            </p>
            <h1
              className="text-[22px] leading-tight tracking-[0.22em] uppercase border-y border-foreground/15 py-4 w-full"
              style={{ fontFamily: fontDisplay, fontWeight: 500 }}
            >
              Orizino
              <br />
              <span className="text-[13px] tracking-[0.35em] opacity-70 block mt-1">
                Admin Panel
              </span>
            </h1>
          </header>

          <div className="w-full">
            <AnimatePresence mode="wait">
              {status === "verifying" && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-4"
                >
                  <SectionLoader tone="platinum" size={40} />
                  <p className="text-[9px] tracking-[0.28em] uppercase opacity-50">
                    Verifying your reset link…
                  </p>
                </motion.div>
              )}

              {status === "ready" && (
                <motion.form
                  key="ready"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  noValidate
                >
                  {errorBlock}

                  <p
                    className="text-[9px] tracking-[0.28em] uppercase opacity-50 leading-relaxed"
                    style={{ fontFamily: fontMono }}
                  >
                    Choose a new password for your account.
                  </p>

                  <div className="space-y-5 text-left">
                    <div className="relative">
                      <div className="flex items-end justify-between mb-1">
                        <label
                          htmlFor={pwId}
                          className="block text-[8px] tracking-[0.28em] uppercase opacity-40"
                        >
                          New Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          className="text-[8px] tracking-[0.22em] uppercase opacity-40 hover:opacity-100 transition-opacity inline-flex items-center gap-1 focus:outline-none focus-visible:opacity-100"
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
                        minLength={8}
                        autoComplete="new-password"
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className={`${inputBase} normal-case`}
                      />
                    </div>

                    <div className="relative">
                      <label
                        htmlFor={confirmId}
                        className="block text-[8px] tracking-[0.28em] uppercase opacity-40 mb-1"
                      >
                        Confirm Password
                      </label>
                      <input
                        id={confirmId}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className={`${inputBase} normal-case`}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || !password || !confirmPassword}
                      className={submitBtn}
                    >
                      {loading ? (
                        <span
                          role="progressbar"
                          aria-label="Working"
                          className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin"
                        />
                      ) : (
                        "Set New Password"
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              )}

              {status === "invalid" && (
                <motion.div
                  key="invalid"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5 text-center"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border border-foreground/25 mx-auto">
                    <AlertCircle className="w-5 h-5" aria-hidden />
                  </div>
                  <p className="text-[10px] tracking-[0.25em] uppercase opacity-70 leading-relaxed">
                    This reset link is invalid or has expired.
                  </p>
                  <button
                    onClick={() => navigate("/auth", { replace: true })}
                    className="mx-auto flex items-center gap-1.5 text-[8px] tracking-[0.28em] uppercase opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:opacity-100"
                  >
                    <ArrowLeft className="w-3 h-3" aria-hidden /> Back to Sign In
                  </button>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5 text-center"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border border-foreground/25 mx-auto">
                    <CheckCircle2 className="w-5 h-5" aria-hidden />
                  </div>
                  <p className="text-[10px] tracking-[0.25em] uppercase opacity-70 leading-relaxed">
                    Your password has been updated.
                    <br />
                    Redirecting to sign in…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
// code:4ce0
