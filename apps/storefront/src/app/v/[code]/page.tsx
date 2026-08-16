"use client";
import React, { Suspense, use } from "react";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { VerifyScannerPage, extractSerialCode } from "@orizino/shared";
import { useAuth } from "@orizino/shared";
import { getBrandHomeUrl } from "@/lib/cross-app-urls";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { verifyPublicSerial, verifyOwnedSerial, unlockOrderInvoice } from "@/lib/verify.functions";

function ShortVerifyContent({ paramsPromise }: { paramsPromise: Promise<{ code: string }> }) {
  const { user } = useAuth();
  const params = use(paramsPromise);
  const code = extractSerialCode(params?.code);

  const publicFn = useServerFn(verifyPublicSerial);
  const ownedFn = useServerFn(verifyOwnedSerial);
  const unlockFn = useServerFn(unlockOrderInvoice);
  const { cfg } = useScannerConfig();
  
  const lookup = async (codeToLookup: string) => {
    if (user) {
      try { return await ownedFn({ data: { code: codeToLookup } }); } catch { /* fall through to public */ }
    }
    return await publicFn({ data: { code: codeToLookup } });
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

export default function ShortVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background/50" />}>
      <ShortVerifyContent paramsPromise={params} />
    </Suspense>
  );
}
