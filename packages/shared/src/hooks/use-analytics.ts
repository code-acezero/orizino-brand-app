"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@orizino/supabase/client";

// -----------------------------------------------------------------------------
// Batched page_analytics writer
//
// Previously each section_view / section_engagement / fallback insert issued
// its own PostgREST INSERT. Over a session that meant thousands of round-trips
// (pg_stat_statements showed 460+s total for these). We now buffer events in
// memory and flush them as a single bulk insert every 5s or on tab hide.
// -----------------------------------------------------------------------------

type PendingEvent = {
  event_type: string;
  page: string;
  section_id?: string | null;
  duration_ms?: number | null;
  session_id: string;
};

const FLUSH_MS = 5000;
const FLUSH_MAX = 25;
const buffer: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => flushBuffer(), FLUSH_MS);
}

async function flushBuffer() {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!buffer.length) return;
  const rows = buffer.splice(0, buffer.length);
  try {
    await (supabase as any).from("page_analytics").insert(rows);
  } catch {
    // silently fail — analytics should never break the app
  }
}

function bindLifecycleListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const onHide = () => {
    void flushBuffer();
  };
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushBuffer();
  });
}

function enqueue(ev: PendingEvent) {
  if (typeof window === "undefined") return;
  bindLifecycleListeners();
  buffer.push(ev);
  if (buffer.length >= FLUSH_MAX) {
    void flushBuffer();
  } else {
    scheduleFlush();
  }
}

// Generate a simple session ID per browser tab
const getSessionId = () => {
  let id = sessionStorage.getItem("analytics_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", id);
  }
  return id;
};

/**
 * Higher-value events (page_view, click) go through the geo-enriching edge
 * function. Fallback path also batches to avoid falling back into per-insert
 * chatter when the edge function is briefly unavailable.
 */
const trackViaEdge = async (payload: Record<string, any>) => {
  try {
    const { error } = await supabase.functions.invoke("track-visit", {
      body: { ...payload, session_id: getSessionId() },
    });
    if (error) throw error;
  } catch {
    enqueue({
      event_type: payload.event_type,
      page: payload.page,
      section_id: payload.section_id ?? null,
      session_id: getSessionId(),
    });
  }
};

/** Parse basic device/browser info from user agent */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Other";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

  let device = "Desktop";
  if (/Mobi|Android/i.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

  return { browser, os, device };
};

/** Track a page view event (geo-enriched via edge function) */
export const trackPageView = async (page: string) => {
  const { browser, os, device } = getDeviceInfo();
  await trackViaEdge({
    event_type: "page_view",
    page,
    metadata: { browser, os, device_type: device },
  });
};

/** Track a section becoming visible (engagement) */
export const trackSectionView = (sectionId: string, page = "/home") => {
  enqueue({
    event_type: "section_view",
    page,
    section_id: sectionId,
    session_id: getSessionId(),
  });
};

/** Track how long a section stays visible */
export const trackSectionDuration = (
  sectionId: string,
  durationMs: number,
  page = "/home",
) => {
  if (durationMs < 500) return;
  enqueue({
    event_type: "section_engagement",
    page,
    section_id: sectionId,
    duration_ms: Math.round(durationMs),
    session_id: getSessionId(),
  });
};

/** Track a click event (CTA, product card, link, etc.) — geo-enriched */
export const trackClick = async (
  clickType: string,
  targetId: string,
  page = "/home",
  metadata?: Record<string, any>,
) => {
  await trackViaEdge({
    event_type: "click",
    page,
    section_id: clickType,
    metadata: { target_id: targetId, click_type: clickType, ...metadata },
  });
};

/**
 * Hook: observe when a section scrolls into view and track engagement.
 * Returns a ref to attach to the section container.
 */
export const useSectionTracker = (sectionId: string, page = "/home") => {
  const ref = useRef<HTMLDivElement | null>(null);
  const trackedRef = useRef(false);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!trackedRef.current) {
            trackedRef.current = true;
            trackSectionView(sectionId, page);
          }
          visibleSince.current = Date.now();
        } else if (visibleSince.current) {
          const duration = Date.now() - visibleSince.current;
          trackSectionDuration(sectionId, duration, page);
          visibleSince.current = null;
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (visibleSince.current) {
        const duration = Date.now() - visibleSince.current;
        trackSectionDuration(sectionId, duration, page);
      }
    };
  }, [sectionId, page]);

  return ref;
};

/** Hook: track page view on mount (once per page load) */
export const usePageViewTracker = (page: string) => {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackPageView(page);
    }
  }, [page]);
};
