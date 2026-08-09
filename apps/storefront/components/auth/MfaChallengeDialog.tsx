"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Loader2, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
}

const MfaChallengeDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess, onCancel }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) { toast({ title: "MFA error", description: error.message, variant: "destructive" }); return; }
      const totp = (data?.totp ?? []).find((f: any) => f.status === "verified");
      if (!totp) { onSuccess(); return; }
      setFactorId(totp.id);
      const { data: c, error: ce } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (ce || !c) { toast({ title: "MFA challenge failed", description: ce?.message, variant: "destructive" }); return; }
      setChallengeId(c.id);
    })();
  }, [open, onSuccess]);

  const verify = async () => {
    if (!factorId || !challengeId) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: code.trim() });
    setLoading(false);
    if (error) { toast({ title: "Invalid code", description: "Try again with the latest 6 digits.", variant: "destructive" }); setCode(""); return; }
    onOpenChange(false);
    onSuccess();
  };

  const cancel = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cancel(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Two-factor required</DialogTitle>
          <DialogDescription>Enter the 6-digit code from your authenticator app to finish signing in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Authentication code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456" className="rounded-xl tracking-[0.4em] text-center text-lg font-mono" inputMode="numeric" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verify(); }} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={cancel} className="rounded-xl">Cancel</Button>
          <Button onClick={verify} disabled={loading || code.length !== 6} className="rounded-xl">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MfaChallengeDialog;
// code:4ce0
