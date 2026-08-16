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

const MFS_THEME_CONFIG: Record<
  string,
  {
    gradient: string;
    brandColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    prompt: string;
  }
> = {
  bkash: {
    gradient: "from-[#E2136E]/15 via-[#E2136E]/5 to-transparent border-[#E2136E]/30",
    brandColor: "#E2136E",
    badgeBg: "bg-[#E2136E]/10",
    badgeText: "text-[#E2136E]",
    badgeBorder: "border-[#E2136E]/30",
    prompt: "Scan with bKash App",
  },
  nagad: {
    gradient: "from-[#EA1D25]/15 via-[#F7941D]/5 to-transparent border-[#EA1D25]/30",
    brandColor: "#EA1D25",
    badgeBg: "bg-[#EA1D25]/10",
    badgeText: "text-[#EA1D25]",
    badgeBorder: "border-[#EA1D25]/30",
    prompt: "Scan with Nagad App",
  },
  rocket: {
    gradient: "from-[#8C3494]/15 via-[#8C3494]/5 to-transparent border-[#8C3494]/30",
    brandColor: "#8C3494",
    badgeBg: "bg-[#8C3494]/10",
    badgeText: "text-[#8C3494]",
    badgeBorder: "border-[#8C3494]/30",
    prompt: "Scan with Rocket App",
  },
  upay: {
    gradient: "from-[#0B438E]/15 via-[#FFC709]/10 to-transparent border-[#0B438E]/30",
    brandColor: "#0B438E",
    badgeBg: "bg-[#0B438E]/10",
    badgeText: "text-[#0B438E] dark:text-[#5B9EF7]",
    badgeBorder: "border-[#0B438E]/30",
    prompt: "Scan with Upay App",
  },
};

const methodLabels: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  upay: "Upay",
  rocket: "Rocket",
};

import { MFSLogo } from "@orizino/ui";

const MFSPaymentProof: React.FC<MFSPaymentProofProps> = ({
  method, accountInfo, amount, formatPrice, onProofSubmitted,
}) => {
  const normMethod = method.toLowerCase();
  const theme = MFS_THEME_CONFIG[normMethod] || MFS_THEME_CONFIG.bkash;
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Account Info Card */}
      <div className={`rounded-2xl border bg-gradient-to-br ${theme.gradient} p-5 space-y-4 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-xs flex items-center justify-center shrink-0 ring-2 ring-white/30 dark:ring-white/10 bg-white">
              <MFSLogo method={normMethod} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground text-base">
                Send {formatPrice(amount)} via {methodLabels[normMethod] || normMethod}
              </h4>
              <p className="text-xs text-muted-foreground">Personal / Merchant Account</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
            <Smartphone className="w-3.5 h-3.5" />
            {theme.prompt}
          </span>
        </div>

        {/* QR Code Container */}
        {accountInfo.qr_code_url && (
          <div className="flex flex-col items-center justify-center py-2">
            <div
              className="relative p-2.5 rounded-2xl bg-white shadow-md border-2 transition-transform hover:scale-[1.02]"
              style={{ borderColor: theme.brandColor }}
            >
              <img
                src={accountInfo.qr_code_url}
                alt={`${normMethod} QR Code`}
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
              />
              <div
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-xs"
                style={{ backgroundColor: theme.brandColor }}
              >
                Scan & Pay
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm bg-background/50 backdrop-blur-xs p-3 rounded-xl border border-border/50">
          <div>
            <p className="text-muted-foreground text-xs font-medium">Account Number</p>
            <p className="text-foreground font-mono font-bold text-base sm:text-lg tracking-wider select-all">
              {accountInfo.account_number}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Account Name</p>
            <p className="text-foreground font-medium text-sm sm:text-base truncate">
              {accountInfo.account_holder || "Orizino Brand"}
            </p>
          </div>
        </div>

        {accountInfo.instructions && (
          <p className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3 border border-border/30 leading-relaxed">
            {accountInfo.instructions}
          </p>
        )}
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
