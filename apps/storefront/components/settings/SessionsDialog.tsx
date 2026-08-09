"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Monitor, LogOut, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SessionsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const [session, setSession] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, [open]);

  const signOutAll = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Signed out on all devices" });
    onOpenChange(false);
    window.location.href = "/auth";
  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Chrome\/[\d.]+/.exec(ua)?.[0] || /Safari\/[\d.]+/.exec(ua)?.[0] || /Firefox\/[\d.]+/.exec(ua)?.[0] || "Browser";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Monitor className="w-5 h-5 text-primary" /> Active sessions</DialogTitle>
          <DialogDescription>Manage the devices signed into your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">This device</p>
              <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Current</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{browser}</p>
            {session?.user?.last_sign_in_at && (
              <p className="text-xs text-muted-foreground">Signed in {new Date(session.user.last_sign_in_at).toLocaleString()}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Don't recognize a session, or worried your account is compromised? Sign out on every device — you'll need to sign back in here.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Close</Button>
          <Button variant="destructive" onClick={signOutAll} disabled={busy} className="rounded-xl gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Sign out everywhere
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionsDialog;
// code:4ce0
