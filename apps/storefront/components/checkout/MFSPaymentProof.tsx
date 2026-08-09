"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, Camera, Image as ImageIcon, X, Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/app-toast";

interface PersonalAccountInfo {
  account_number: string;
  account_holder: string;
  qr_code_url: string;
  instructions: string;
}

interface MFSPaymentProofProps {
  method: string;
  accountInfo: PersonalAccountInfo;
  amount: number;
  formatPrice: (n: number) => string;
  onProofSubmitted: (screenshotUrl: string, transactionId: string) => void;
}

const methodColors: Record<string, string> = {
  bkash: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  nagad: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  upay: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  rocket: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
};

const methodLabels: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  upay: "Upay",
  rocket: "Rocket",
};

const MFSPaymentProof: React.FC<MFSPaymentProofProps> = ({
  method, accountInfo, amount, formatPrice, onProofSubmitted,
}) => {
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `payment-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage.from("banners").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotUrl(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(data.path);
    setScreenshotUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!screenshotUrl) {
      toast({ title: "Please upload payment screenshot", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    onProofSubmitted(screenshotUrl, transactionId);
  };

  const colorClass = methodColors[method] || methodColors.bkash;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Account Info Card */}
      <div className={`rounded-2xl border bg-gradient-to-br ${colorClass} p-5 space-y-3`}>
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <h4 className="font-display font-semibold text-foreground">
            Send {formatPrice(amount)} to {methodLabels[method]}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Account Number</p>
            <p className="text-foreground font-mono font-bold text-lg tracking-wider">{accountInfo.account_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Account Holder</p>
            <p className="text-foreground font-medium">{accountInfo.account_holder}</p>
          </div>
        </div>

        {accountInfo.qr_code_url && (
          <div className="flex justify-center py-2">
            <img src={accountInfo.qr_code_url} alt="QR Code" className="w-40 h-40 rounded-xl bg-white p-2 object-contain" />
          </div>
        )}

        <p className="text-sm text-muted-foreground bg-secondary/30 rounded-xl p-3">{accountInfo.instructions}</p>
      </div>

      {/* Screenshot Upload */}
      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Upload Payment Screenshot *
        </h4>

        <AnimatePresence mode="wait">
          {screenshotUrl ? (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative">
              <img src={screenshotUrl} alt="Payment proof" className="w-full max-h-64 object-contain rounded-xl border border-border" />
              {!submitted && (
                <button onClick={() => setScreenshotUrl("")} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 text-white flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.button
              key="upload"
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to upload screenshot</span>
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Transaction ID (optional)</Label>
          <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g. TXN12345678" className="rounded-xl" disabled={submitted} />
        </div>

        {!submitted ? (
          <Button type="button" onClick={handleSubmit} disabled={!screenshotUrl || uploading}
            className="w-full rounded-xl h-11">
            <Check className="w-4 h-4 mr-2" /> Confirm Payment Proof
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
            <Check className="w-4 h-4" /> Payment proof submitted successfully
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MFSPaymentProof;
// code:4ce0
