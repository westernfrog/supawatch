"use client";

import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center gap-2 font-manrope text-[10px] uppercase tracking-[0.18em] text-neutral-500 hover:text-white transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}
