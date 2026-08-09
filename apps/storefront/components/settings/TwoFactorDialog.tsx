"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Loader2, ShieldCheck, Trash2, Copy, Check, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string; created_at: string };
type Step = "list" | "enroll" | "verify" | "confirm-remove";

const TwoFactorDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [step, setStep] = useState<Step>("list");
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [friendlyName, setFriendlyName] = useState("Authenticator");
  const [copied, setCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Factor | null>(null);
  const [reauthPassword, setReauthPassword] = useState("");

  const refresh = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { toast({ title: "Failed to load factors", description: error.message, variant: "destructive" }); return; }
    setFactors((data?.totp ?? []) as any);
  };

  // Clean up any pending (unverified) factor — Supabase keeps them around
  // and they'll block re-enrollment.
  const cleanupUnverified = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const pending = (data?.totp ?? []).filter((f: any) => f.status !== "verified");
      for (const f of pending) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    } catch { /* best-effort */ }
  };

  useEffect(() => {
    if (open) {
      refresh();
      setStep("list");
      setEnrolling(null);
      setCode("");
      setReauthPassword("");
      setRemoveTarget(null);
    }
  }, [open]);

  const handleClose = async (v: boolean) => {
    if (!v && enrolling) {
      // user aborted enrollment — remove the pending factor
      await supabase.auth.mfa.unenroll({ factorId: enrolling.id }).catch(() => {});
    }
    onOpenChange(v);
  };

  const startEnroll = async () => {
    setLoading(true);
    await cleanupUnverified();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendlyName || `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setLoading(false);
    if (error || !data) { toast({ title: "Couldn't start 2FA", description: error?.message, variant: "destructive" }); return; }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setStep("verify");
  };

  const verifyEnroll = async () => {
    if (!enrolling) return;
    setLoading(true);
    const { data: c, error: ce } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (ce || !c) { setLoading(false); toast({ title: "Challenge failed", description: ce?.message, variant: "destructive" }); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrolling.id, challengeId: c.id, code: code.trim() });
    setLoading(false);
    if (error) { toast({ title: "Invalid code", description: "Double-check the 6 digits in your authenticator app.", variant: "destructive" }); return; }
    toast({ title: "Two-factor enabled", description: "You'll be asked for a code at next sign-in." });
    setEnrolling(null); setCode(""); setStep("list"); refresh();
  };

  const cancelEnroll = async () => {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.id }).catch(() => {});
    setEnrolling(null); setCode(""); setStep("list");
  };

  const askRemove = (f: Factor) => {
    setRemoveTarget(f);
    setReauthPassword("");
    setStep("confirm-remove");
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setLoading(true);
    // Reauthenticate with password before allowing removal
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) { setLoading(false); toast({ title: "Not signed in", variant: "destructive" }); return; }
    const { error: pwErr } = await supabase.auth.signInWithPassword({ email, password: reauthPassword });
    if (pwErr) { setLoading(false); toast({ title: "Wrong password", variant: "destructive" }); return; }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: removeTarget.id });
    setLoading(false);
    if (error) { toast({ title: "Couldn't remove", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Factor removed" });
    setRemoveTarget(null); setReauthPassword(""); setStep("list"); refresh();
  };

  const copySecret = async () => {
    if (!enrolling) return;
    try {
      await navigator.clipboard.writeText(enrolling.secret);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Two-factor authentication</DialogTitle>
          <DialogDescription>
            Add a second step at sign-in with an authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator).
          </DialogDescription>
        </DialogHeader>

        {step === "list" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {verifiedFactors.length > 0 ? "Two-factor is enabled on your account." : "Two-factor is currently off."}
                </p>
              </div>
              <Badge variant={verifiedFactors.length > 0 ? "default" : "secondary"}>
                {verifiedFactors.length > 0 ? "On" : "Off"}
              </Badge>
            </div>

            <div className="space-y-2">
              {verifiedFactors.length === 0 && <p className="text-sm text-muted-foreground">No factors enrolled yet.</p>}
              {verifiedFactors.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.friendly_name || "Authenticator"}</p>
                    <p className="text-xs text-muted-foreground">Added {new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => askRemove(f)} disabled={loading} aria-label="Remove factor">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Device name</Label>
              <Input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value.slice(0, 40))}
                className="rounded-xl" placeholder="My phone" />
            </div>
            <Button onClick={startEnroll} disabled={loading} className="w-full rounded-xl">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {verifiedFactors.length > 0 ? "Add another device" : "Set up two-factor"}
            </Button>
          </div>
        )}

        {step === "verify" && enrolling && (
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary/40 p-4 flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-lg" dangerouslySetInnerHTML={{ __html: enrolling.qr }} />
              <p className="text-xs text-muted-foreground text-center">Scan the QR with your authenticator app, or enter this setup key manually:</p>
              <div className="flex items-center gap-2 w-full">
                <code className="flex-1 text-xs break-all bg-background px-2 py-1.5 rounded font-mono">{enrolling.secret}</code>
                <Button type="button" size="sm" variant="outline" onClick={copySecret} className="rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your app</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456" className="rounded-xl tracking-[0.4em] text-center text-lg font-mono" inputMode="numeric" autoFocus />
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Save your authenticator backup. If you lose access to your device you'll need it to sign in.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cancelEnroll} className="rounded-xl">Cancel</Button>
              <Button onClick={verifyEnroll} disabled={loading || code.length !== 6} className="rounded-xl">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Verify & enable
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm-remove" && removeTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Removing <strong>{removeTarget.friendly_name || "this factor"}</strong> will turn off two-factor authentication if it's your only device.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Confirm your password</Label>
              <Input type="password" value={reauthPassword} onChange={(e) => setReauthPassword(e.target.value)}
                placeholder="Current password" className="rounded-xl" autoFocus />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep("list"); setRemoveTarget(null); setReauthPassword(""); }} className="rounded-xl">Cancel</Button>
              <Button variant="destructive" onClick={confirmRemove} disabled={loading || reauthPassword.length < 6} className="rounded-xl">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Remove factor
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorDialog;
// code:4ce0
