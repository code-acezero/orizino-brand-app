"use client";
import React from "react";
import { SkLine, SkBlock, SkCircle } from "./primitives";

const ChatSkeleton: React.FC = () => (
  <div className="grid gap-4 lg:grid-cols-[320px_1fr] h-[calc(100vh-12rem)]">
    {/* Conversation list */}
    <div className="rounded-2xl border border-border/60 bg-card p-3 space-y-2 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
          <SkCircle size={36} />
          <div className="flex-1 space-y-1.5">
            <SkLine w="70%" h="0.75rem" />
            <SkLine w="50%" h="0.5rem" />
          </div>
        </div>
      ))}
    </div>
    {/* Messages */}
    <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col">
      <div className="flex items-center gap-3 pb-3 border-b border-border/40">
        <SkCircle size={36} />
        <div className="flex-1 space-y-1.5">
          <SkLine w="40%" h="0.75rem" />
          <SkLine w="25%" h="0.5rem" />
        </div>
      </div>
      <div className="flex-1 py-4 space-y-4 overflow-hidden">
        {[0,1,2,3,4].map((i) => (
          <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
            <SkBlock className="h-12" style={{ width: `${40 + (i*7) % 30}%` }} />
          </div>
        ))}
      </div>
      <SkBlock className="h-12 w-full" />
    </div>
  </div>
);

export default ChatSkeleton;
