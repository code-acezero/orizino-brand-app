"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Zap, Shield, Brain, Cpu, Globe, CheckCircle2, Bot } from "lucide-react";
import { Sparkle } from "@/components/icons/Sparkle";
import { GeminiLogo, GroqLogo, OpenRouterLogo } from "./GeminiFallbackPanel";

export interface AIModelDetails {
  id: string;
  name: string;
  category: "Gemini Free (High Quota)" | "Gemini Pro (Deep Reasoning)" | "Groq & OpenRouter";
  tag: string;
  freeQuotaRpd: string;
  rateLimitRpm: string;
  contextWindow: string;
  speed: string;
  description: string;
  recommended?: boolean;
}

export const GEMINI_MODELS: AIModelDetails[] = [
  // ── 1. GEMINI HIGH FREE QUOTA MODELS (1,500 RPD) ──
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    category: "Gemini Free (High Quota)",
    tag: "⭐ Recommended (Max Free Quota)",
    freeQuotaRpd: "1,500 Requests / Day (Free Tier)",
    rateLimitRpm: "15 Requests / Minute",
    contextWindow: "1,000,000 Tokens (1M)",
    speed: "Ultra Fast (<400ms)",
    description: "Google's active flagship high-speed model with maximum 1,500 RPD free tier allowance. Delivers exceptional Bengali, English, and multilingual fashion advice, streetwear sizing calculations, and product recommendations.",
    recommended: true,
  },
  {
    id: "google/gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    category: "Gemini Free (High Quota)",
    tag: "🧠 High Intelligence Flash",
    freeQuotaRpd: "1,500 Requests / Day (Free Tier)",
    rateLimitRpm: "15 Requests / Minute",
    contextWindow: "1,000,000 Tokens (1M)",
    speed: "Fast (<500ms)",
    description: "Advanced multilingual reasoning model with nuanced conversational comprehension and full 1,500 RPD free quota.",
  },
  {
    id: "google/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    category: "Gemini Free (High Quota)",
    tag: "🚀 Ultra-Low Latency Economy",
    freeQuotaRpd: "1,500 Requests / Day (Free Tier)",
    rateLimitRpm: "15 Requests / Minute",
    contextWindow: "1,000,000 Tokens (1M)",
    speed: "Lightning (<200ms)",
    description: "Lightweight, ultra-fast model built for instant streaming responses and high concurrency during traffic bursts.",
  },
  {
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    category: "Gemini Free (High Quota)",
    tag: "🔬 Next-Gen Preview Flash",
    freeQuotaRpd: "1,500 Requests / Day (Free Tier)",
    rateLimitRpm: "15 Requests / Minute",
    contextWindow: "1,000,000 Tokens (1M)",
    speed: "Fast (<600ms)",
    description: "Google's cutting-edge preview model with enhanced reasoning and multimodal analysis capabilities.",
  },

  // ── 2. GEMINI PRO MODELS (DEEP REASONING) ──
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    category: "Gemini Pro (Deep Reasoning)",
    tag: "🧠 Deep Reasoning (Pro Tier)",
    freeQuotaRpd: "50 Requests / Day (Free) · Unlimited (Paid)",
    rateLimitRpm: "2 Requests / Min (Free) · 360 RPM (Paid)",
    contextWindow: "2,000,000 Tokens (2M)",
    speed: "Standard (1-2s)",
    description: "Google's highest intelligence model for deep complex styling logic, garment specs, and nuanced calculations. Note: Free quota is 50 RPD.",
  },

  // ── 3. GROQ & OPENROUTER FAILOVER ──
  {
    id: "groq/llama-3.3-70b-versatile",
    name: "Groq (Llama 3.3 70B)",
    category: "Groq & OpenRouter",
    tag: "⚡ 14,400 RPD Free Quota",
    freeQuotaRpd: "14,400 Requests / Day (Free)",
    rateLimitRpm: "30 Requests / Minute",
    contextWindow: "128,000 Tokens (128K)",
    speed: "Ultra Fast (<150ms)",
    description: "Meta's flagship open weights model running on Groq LPUs. Provides the highest free daily request allowance for instant failover backup.",
  },
  {
    id: "openrouter/auto",
    name: "OpenRouter Dynamic Router",
    category: "Groq & OpenRouter",
    tag: "🌐 Universal Multi-Model",
    freeQuotaRpd: "Auto-routes across free & paid models",
    rateLimitRpm: "Varies by model",
    contextWindow: "Up to 1,000,000 Tokens",
    speed: "Fast (<800ms)",
    description: "Intelligent multi-model router across 100+ global AI endpoints.",
  },
];

interface GeminiModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function GeminiModelSelector({ value, onChange }: GeminiModelSelectorProps) {
  const currentModel =
    GEMINI_MODELS.find((m) => m.id === value) ||
    GEMINI_MODELS.find((m) => m.id === "google/gemini-3.5-flash") ||
    GEMINI_MODELS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <GeminiLogo className="w-3.5 h-3.5" />
            Primary LLM Engine & Model
          </Label>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                  aria-label="Model Quota & Performance Information"
                >
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-xs p-3 space-y-2 bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1">
                    <GeminiLogo className="w-3 h-3" /> {currentModel.name}
                  </span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/40 text-primary">
                    {currentModel.tag}
                  </Badge>
                </div>
                <div className="text-[11px] space-y-1 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Daily Free Quota:</strong> {currentModel.freeQuotaRpd}
                  </p>
                  <p>
                    <strong className="text-foreground">Rate Limit:</strong> {currentModel.rateLimitRpm}
                  </p>
                  <p>
                    <strong className="text-foreground">Context Window:</strong> {currentModel.contextWindow}
                  </p>
                  <p>
                    <strong className="text-foreground">Inference Speed:</strong> {currentModel.speed}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground/90 pt-1 border-t border-border/30 italic">
                  {currentModel.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] py-0.5 px-2 font-mono border-primary/30 bg-primary/5 text-primary"
        >
          {currentModel.freeQuotaRpd.includes("1,500") ? "1,500 RPD FREE" : currentModel.freeQuotaRpd.includes("14,400") ? "14,400 RPD FREE" : "50 RPD FREE"}
        </Badge>
      </div>

      {/* Model Select Dropdown */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-xl border border-input bg-background/90 px-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
        >
          <optgroup label="── Google Gemini Flash (Max Free Quota - 1,500 RPD) ──">
            <option value="google/gemini-3.5-flash">Gemini 3.5 Flash · Highest Intelligence & Speed (1,500 RPD Free)</option>
            <option value="google/gemini-3.6-flash">Gemini 3.6 Flash · Nuanced Multilingual Reasoning (1,500 RPD Free)</option>
            <option value="google/gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite · Ultra-Low Latency (1,500 RPD Free)</option>
            <option value="google/gemini-3.7-flash">Gemini 3.7 Flash · Next-Gen Preview (1,500 RPD Free)</option>
          </optgroup>

          <optgroup label="── Google Gemini Pro (Deep Reasoning - 50 RPD Free) ──">
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro · Deep Complex Reasoning (50 RPD Free)</option>
          </optgroup>

          <optgroup label="── High-Speed Failover Engines ──">
            <option value="groq/llama-3.3-70b-versatile">Groq Llama 3.3 70B · Ultra Fast LPU (14,400 RPD Free)</option>
            <option value="openrouter/auto">OpenRouter Dynamic Auto · 100+ Model Fallback</option>
          </optgroup>
        </select>
      </div>

      {/* Active Model Specs Strip */}
      <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/20 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          {currentModel.id.includes("gemini") ? (
            <GeminiLogo className="w-3.5 h-3.5 shrink-0" />
          ) : currentModel.id.includes("groq") ? (
            <GroqLogo className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <OpenRouterLogo className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-semibold text-foreground truncate">{currentModel.name}</span>
          <span className="text-muted-foreground text-[10px] hidden sm:inline">• {currentModel.freeQuotaRpd}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 font-bold shrink-0 ml-2">
          {currentModel.speed}
        </span>
      </div>
    </div>
  );
}

export default GeminiModelSelector;
// code:4ce0
