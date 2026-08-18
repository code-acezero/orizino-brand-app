"use client";
import React, { Suspense, use } from "react";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { VerifyScannerPage, extractSerialCode } from "@orizino/shared";
import { useAuth } from "@orizino/shared";
import { getBrandHomeUrl } from "@/lib/cross-app-urls";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { verifyPublicSerial, verifyOwnedSerial, unlockOrderInvoice } from "@/lib/verify.functions";

function VerifyParamContent({ paramsPromise }: { paramsPromise: Promise<{ code: string }> }) {
  const { user } = useAuth();
  const params = use(paramsPromise);
  const code = extractSerialCode(params?.code);

  const publicFn = useServerFn(verifyPublicSerial);
  const ownedFn = useServerFn(verifyOwnedSerial);
  const unlockFn = useServerFn(unlockOrderInvoice);
  const { cfg } = useScannerConfig();
  
  const lookup = async (codeToLookup: string) => {
    if (user) {
      try {
        const owned = await ownedFn({ data: { code: codeToLookup } });
        if (owned && owned.found) return owned;
      } catch {
        /* fall through to public */
      }
    }
    try {
      const res = await publicFn({ data: { code: codeToLookup } });
      if (res && res.found) return res;
    } catch {
      /* fall through to API endpoint fallback */
    }

    // Direct HTTP API fallback (handles edge/network/Server Action edge cases)
    try {
      const resp = await fetch(`/api/verify?code=${encodeURIComponent(codeToLookup)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data) return data;
      }
    } catch (e) {
      console.error("[verify] API fallback error:", e);
    }

    return { found: false, genuine: false, serial_code: codeToLookup };
  };

  const unlockInvoice = async (codeOrOrder: string, customerName: string, customerPhoneOrEmail: string) => {
    return await unlockFn({
      data: {
        orderNumberOrSerial: codeOrOrder,
        customerName,
        customerPhoneOrEmail,
      },
    });
  };

  return (
    <VerifyScannerPage
      entryPath="/verify"
      resultPath="/verify"
      code={code || undefined}
      onLookup={lookup}
      onUnlockInvoice={unlockInvoice}
      isSignedIn={!!user}
      homePath="/"
      learnMoreHref={`${getBrandHomeUrl()}/scanner-info`}
      content={cfg}
    />
  );
}

export default function VerifyParamPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background/50" />}>
      <VerifyParamContent paramsPromise={params} />
    </Suspense>
  );
}
