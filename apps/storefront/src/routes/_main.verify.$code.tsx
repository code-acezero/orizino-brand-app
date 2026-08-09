"use client";
import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { VerifyScannerPage } from "@orizino/shared";
import { useAuth } from "@orizino/shared";
import { useScannerConfig } from "@/hooks/use-scanner-config";
import { verifyPublicSerial, verifyOwnedSerial } from "@/lib/verify.functions";

export const Route = createFileRoute("/_main/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${(params as any).code} — Orizino` },
      { name: "description", content: "Product authenticity check." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyResult,
});

function VerifyResult() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const publicFn = useServerFn(verifyPublicSerial);
  const ownedFn = useServerFn(verifyOwnedSerial);
  const { cfg } = useScannerConfig();
  const lookup = async (c: string) => {
    if (user) {
      try { return await ownedFn({ data: { code: c } }); } catch { /* fall through */ }
    }
    return await publicFn({ data: { code: c } });
  };
  return (
    <VerifyScannerPage
      entryPath="/verify"
      resultPath="/verify/$code"
      code={code}
      onLookup={lookup}
      isSignedIn={!!user}
      homePath="/"
      content={cfg}
    />
  );
}
