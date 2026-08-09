"use client";
import React, { useEffect } from "react";
import { useSearch, useRouter } from "@/lib/router-compat";
import { useServerFn } from "@/lib/server-fn-compat";
import { trackAffiliateClick, attributeSignup, getAffiliateSettings } from "@/lib/affiliate.functions";
import { useAuth } from "@/contexts/AuthContext";

const COOKIE_KEY = "aff_ref";

export const AffiliateTracker: React.FC = () => {
  const { user } = useAuth();
  const track = useServerFn(trackAffiliateClick);
  const attribute = useServerFn(attributeSignup);
  const getSettings = useServerFn(getAffiliateSettings);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) {
      track({ data: { ref_code: ref, landing_url: window.location.href, referrer: document.referrer }}).catch(() => {});
      getSettings().then((s: any) => {
        const days = s?.cookie_days ?? 30;
        const expires = Date.now() + days * 86400000;
        localStorage.setItem(COOKIE_KEY, JSON.stringify({ code: ref, expires }));
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(COOKIE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Date.now() > data.expires) { localStorage.removeItem(COOKIE_KEY); return; }
      const attributed = localStorage.getItem(COOKIE_KEY + "_done");
      if (attributed === data.code) return;
      attribute({ data: { ref_code: data.code }})
        .then(() => localStorage.setItem(COOKIE_KEY + "_done", data.code))
        .catch(() => {});
    } catch {}
  }, [user]);

  return null;
};
// code:4ce0
