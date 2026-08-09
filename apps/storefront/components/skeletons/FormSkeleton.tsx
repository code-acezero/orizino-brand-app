"use client";
import React from "react";
import { SkLine, SkBlock } from "./primitives";

interface Props { sections?: number; fieldsPerSection?: number }

const FormSkeleton: React.FC<Props> = ({ sections = 2, fieldsPerSection = 4 }) => (
  <div className="space-y-6">
    {Array.from({ length: sections }).map((_, s) => (
      <div key={s} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <SkLine w="10rem" h="1rem" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fieldsPerSection }).map((_, f) => (
            <div key={f} className="space-y-2">
              <SkLine w="6rem" h="0.625rem" />
              <SkBlock className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default FormSkeleton;
// code:4ce0
