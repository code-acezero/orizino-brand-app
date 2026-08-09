"use client";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { VerifyScannerPage } from "@orizino/shared";
import { useAuth } from "@orizino/shared";
import { getCompanyUrl } from "@/lib/cross-app-urls";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { verifyPublicSerial, verifyOwnedSerial } from "@/lib/verify.functions";

export default function VerifyEntryPage() {
  const { user } = useAuth();
  const publicFn = useServerFn(verifyPublicSerial);
  const ownedFn = useServerFn(verifyOwnedSerial);
  const { cfg } = useScannerConfig();
  
  const lookup = async (code: string) => {
    if (user) {
      try { return await ownedFn({ data: { code } }); } catch { /* fall through to public */ }
    }
    return await publicFn({ data: { code } });
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
      resultPath="/verify/$code"
      onLookup={lookup}
      isSignedIn={!!user}
      homePath="/"
      learnMoreHref={`${getCompanyUrl()}/scanner-info`}
      content={cfg}
    />
  );
}
