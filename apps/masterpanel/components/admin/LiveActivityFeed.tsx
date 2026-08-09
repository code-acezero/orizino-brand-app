"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, MousePointerClick, Layers, Timer, Activity } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface FeedEvent {
  id: string;
  event_type: string;
  page: string;
  section_id: string | null;
  duration_ms: number | null;
  session_id: string | null;
  metadata: any;
  created_at: string;
}

const eventConfig: Record<string, { icon: typeof Eye; label: string; color: string }> = {
  page_view: { icon: Eye, label: "Page View", color: "text-blue-400" },
  section_view: { icon: Layers, label: "Section View", color: "text-violet-400" },
  section_engagement: { icon: Timer, label: "Engagement", color: "text-amber-400" },
  click: { icon: MousePointerClick, label: "Click", color: "text-rose-400" },
};

const sectionLabels: Record<string, string> = {
  slider: "Showcase Slider",
  categories: "Category Grid",
  "category-sections": "Category Sections",
  featured: "Featured Products",
  arrivals: "New Arrivals",
  product_card: "Product Card",
  slider_cta: "Slider CTA",
  sale_cta: "Sale CTA",
  view_all: "View All",
};

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const getEventDescription = (event: FeedEvent) => {
  const sectionName = event.section_id ? (sectionLabels[event.section_id] || event.section_id) : "";

  switch (event.event_type) {
    case "page_view":
      return "Viewed homepage";
    case "section_view":
      return `Saw ${sectionName}`;
    case "section_engagement":
      return `Spent ${Math.round((event.duration_ms || 0) / 1000)}s on ${sectionName}`;
    case "click": {
      const target = event.metadata?.target_id || "";
      const clickType = event.metadata?.click_type || "";
      const clickLabel = sectionLabels[clickType] || clickType;
      return target ? `Clicked ${clickLabel}: ${target}` : `Clicked ${clickLabel}`;
    }
    default:
      return event.event_type;
  }
};

const filterOptions = [
  { value: "all", label: "All Events" },
  { value: "page_view", label: "Page Views" },
  { value: "section_view", label: "Section Views" },
  { value: "section_engagement", label: "Engagement" },
  { value: "click", label: "Clicks" },
];

const LiveActivityFeed = () => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState("all");
  const initialLoadDone = useRef(false);

  // Fetch recent events on mount
  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await (supabase as any)
        .from("page_analytics")
        .select("*")
        .eq("page", "/home")
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) {
        setEvents(data);
        initialLoadDone.current = true;
      }
    };
    fetchRecent();
  }, []);

  // Subscribe to real-time inserts
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel("analytics-feed")
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "page_analytics",
          filter: "page=eq./home",
        },
        (payload: any) => {
          const newEvent = payload.new as FeedEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  // Keep "time ago" labels fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const sessionColors = useRef<Record<string, string>>({});
  const colorPalette = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  ];
  let colorIdx = useRef(0);

  const getSessionColor = (sessionId: string | null) => {
    if (!sessionId) return "bg-muted-foreground";
    if (!sessionColors.current[sessionId]) {
      sessionColors.current[sessionId] = colorPalette[colorIdx.current % colorPalette.length];
      colorIdx.current++;
    }
    return sessionColors.current[sessionId];
  };

  const filteredEvents = filter === "all" ? events : events.filter(e => e.event_type === filter);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Live Activity Feed
          </CardTitle>
          <button
            onClick={() => setIsLive((l) => !l)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-border/50 transition-colors hover:bg-secondary/30"
          >
            <span className={`relative flex h-2 w-2 ${isLive ? "" : "opacity-40"}`}>
              {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
            </span>
            <span className="text-muted-foreground">{isLive ? "Live" : "Paused"}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] pr-2">
          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              {events.length === 0 ? "No recent activity. Visit the homepage to generate events." : "No events match this filter."}
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {filteredEvents.map((event) => {
                  const cfg = eventConfig[event.event_type] || eventConfig.page_view;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/20 transition-colors group"
                    >
                      {/* Session avatar dot */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getSessionColor(event.session_id)}`} title={`Session: ${event.session_id?.slice(0, 8) || "?"}`} />
                      {/* Event icon */}
                      <div className="w-7 h-7 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{getEventDescription(event)}</p>
                      </div>
                      {/* Badge + time */}
                      <Badge variant="outline" className="text-[10px] shrink-0 hidden group-hover:inline-flex">
                        {cfg.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums w-14 text-right">
                        {timeAgo(event.created_at)}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;
// code:4ce0
