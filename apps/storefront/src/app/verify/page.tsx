"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { VerifyScannerPage, extractSerialCode } from "@orizino/shared";
import { useAuth } from "@orizino/shared";
import { getBrandHomeUrl } from "@/lib/cross-app-urls";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { verifyPublicSerial, verifyOwnedSerial, unlockOrderInvoice } from "@/lib/verify.functions";

function VerifyContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const rawCode =
    searchParams?.get("code") ||
    searchParams?.get("sn") ||
    searchParams?.get("serial") ||
    searchParams?.get("c") ||
    searchParams?.get("order") ||
    "";
  const code = extractSerialCode(rawCode);

  const publicFn = useServerFn(verifyPublicSerial);
  const ownedFn = useServerFn(verifyOwnedSerial);
  const unlockFn = useServerFn(unlockOrderInvoice);
  const { cfg } = useScannerConfig();

  const lookup = async (codeToLookup: string) => {
    if (user) {
      try {
        return await ownedFn({ data: { code: codeToLookup } });
      } catch {
        /* fall through to public */
      }
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

  if (cfg.enabled === false) {
    return (
      <div className="min-h-[70dvh] flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold mb-2">Scanner is offline</h1>
          <p className="text-sm text-muted-foreground">
            Our product verification scanner is temporarily unavailable. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

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

export default function VerifyEntryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background/50" />}>
      <VerifyContent />
    </Suspense>
  );
}
