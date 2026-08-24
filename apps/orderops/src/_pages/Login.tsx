import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useBrandSettings } from "@/lib/brand";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import { Package, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";

export function Login() {
  const { signIn } = useAuth();
  const brand = useBrandSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden selection:bg-primary selection:text-primary-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top, 24px)",
        paddingBottom: "env(safe-area-inset-bottom, 24px)",
      }}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-18 h-18 rounded-3xl bg-secondary/60 border border-border/80 flex items-center justify-center shadow-xl shadow-black/40 overflow-hidden backdrop-blur-md p-3">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.siteName}
                className="w-full h-full object-contain filter drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <Package className="w-8 h-8 text-primary" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              {brand.siteName} OrderOps
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {brand.brandTagline || "Beyond Simplicity."}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Staff / Admin Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@orizino.com"
                autoComplete="username"
                className="h-12 rounded-2xl text-[14px] bg-secondary/30 border-border/70 focus-visible:border-foreground/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Password</Label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-12 rounded-2xl text-[14px] pr-11 bg-secondary/30 border-border/70 focus-visible:border-foreground/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl text-[14px] font-semibold gap-2 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Help / Admin note */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>Secure Operations Terminal</span>
            </span>
            <span className="font-mono text-[10px] opacity-70">v2.4.0-ops</span>
          </div>
        </div>
      </div>
    </div>
  );
}
