"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AiWidgetSettings {
  id: string;
  fab_floating_texts: string[];
  fab_animation_style: "drift" | "orbit" | "pulse" | "wave";
  fab_animation_intensity: number;
  fab_show_avatar_inline: boolean;
  chat_greeting_logged_in: string;
  chat_greeting_guest: string;
  chat_premade_questions: string[];
  welcome_enabled: boolean;
  welcome_first_time: string;
  welcome_returning_today: string[];
  welcome_returning_week: string[];
  welcome_returning_long: string[];
  welcome_returning_logged_in: string[];
  welcome_cinematic_duration_ms: number;
}

export const DEFAULT_AI_WIDGET_SETTINGS: AiWidgetSettings = {
  id: "",
  fab_floating_texts: [
    "Ask Agent Flow",
    "Find your style",
    "Track an order",
    "Need a recommendation?",
    "We're here 24/7",
  ],
  fab_animation_style: "drift",
  fab_animation_intensity: 5,
  fab_show_avatar_inline: true,
  chat_greeting_logged_in:
    "Hi {name}, I'm Agent Flow — your personal shopping assistant. How can I help you today?",
  chat_greeting_guest:
    "Welcome to Orizino. I'm Agent Flow, your shopping concierge. What brings you in today?",
  chat_premade_questions: [
    "Track my order",
    "What's your return policy?",
    "Recommend something for me",
    "Talk to a human",
  ],
  welcome_enabled: true,
  welcome_first_time: "Welcome to {brand} — where every detail is curated for you.",
  welcome_returning_today: [
    "Hey, we meet again today. Ready to discover something new?",
    "Back so soon? Let's pick up where you left off.",
  ],
  welcome_returning_week: [
    "Welcome back. Fresh arrivals are waiting for you.",
    "Good to see you again — shall I show you what's new?",
  ],
  welcome_returning_long: [
    "Long time no see. Let me give you a quick tour of what's new.",
    "It's been a while — let's see if something catches your eye today.",
  ],
  welcome_returning_logged_in: [
    "Welcome back, {name}. Your style picks are ready.",
    "Hello {name}, anything special you're looking for today?",
  ],
  welcome_cinematic_duration_ms: 4500,
};

export function useAiWidgetSettings() {
  return useQuery({
    queryKey: ["ai-widget-settings"],
    queryFn: async (): Promise<AiWidgetSettings> => {
      const { data } = await supabase
        .from("ai_widget_settings" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULT_AI_WIDGET_SETTINGS;
      return { ...DEFAULT_AI_WIDGET_SETTINGS, ...(data as any) };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
// code:4ce0
