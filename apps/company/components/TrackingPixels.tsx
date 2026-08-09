"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FBPixel = { enabled?: boolean; pixel_id?: string; track_page_view?: boolean };

/**
 * Injects tracking pixel scripts (Facebook Pixel) on the storefront based on
 * settings configured in Master Panel → SEO → Tracking.
 */
export default function TrackingPixels() {
  const { data } = useQuery({
    queryKey: ["tracking-pixels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["facebook_pixel_config"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val.value ?? val) : val;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fb: FBPixel = data?.facebook_pixel_config || {};
    if (!fb.enabled || !fb.pixel_id) return;
    if ((window as any).__fbqLoaded) return;
    (window as any).__fbqLoaded = true;

    // Standard Meta Pixel loader
    (function (f: any, b: any, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true; t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    (window as any).fbq("init", fb.pixel_id);
    if (fb.track_page_view !== false) (window as any).fbq("track", "PageView");

    // <noscript> fallback pixel — helps Meta detect installation
    const noscript = document.createElement("noscript");
    const img = document.createElement("img");
    img.height = 1; img.width = 1; img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${fb.pixel_id}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  }, [data]);

  return null;
}
// code:4ce0
