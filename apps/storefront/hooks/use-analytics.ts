"use client";
// Storefront re-exports the shared batched analytics hook so both apps share
// one buffer and lifecycle-listener registration.
export * from "@orizino/shared/hooks/use-analytics";
