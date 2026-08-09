"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const APP: "company" = "company";

export default function FaviconSync() {
  const { data: iconUrl } = useQuery({
    queryKey: ["site-favicon-url", APP],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          `favicon_url:${APP}`, `site_icon_url:${APP}`,
          "favicon_url", "site_icon_url",
        ]);
      const map: Record<string, string | null> = {};
      data?.forEach((s) => {
        const v: any = s.value;
        const unwrapped = typeof v === "object" && v !== null ? v.value ?? v : v;
        map[s.key] = typeof unwrapped === "string" && unwrapped ? unwrapped : null;
      });
      return (
        map[`favicon_url:${APP}`] ||
        map[`site_icon_url:${APP}`] ||
        map.favicon_url ||
        map.site_icon_url ||
        null
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!iconUrl) return;
    const type = iconUrl.endsWith(".svg")
      ? "image/svg+xml"
      : iconUrl.endsWith(".ico")
      ? "image/x-icon"
      : "image/png";
    const links = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']",
    );
    if (links.length === 0) {
      const el = document.createElement("link");
      el.rel = "icon";
      el.href = iconUrl;
      el.type = type;
      document.head.appendChild(el);
      return;
    }
    links.forEach((el) => {
      el.href = iconUrl;
      if (el.rel !== "apple-touch-icon") el.type = type;
    });
  }, [iconUrl]);

  return null;
}

// code:4ce0
