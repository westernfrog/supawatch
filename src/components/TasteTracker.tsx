"use client";

import { useEffect } from "react";
import { recordTaste, TASTE_WEIGHT, type TasteInput } from "@/lib/taste";

/* Invisible — mounted on detail pages to log the visit into the on-device
   taste profile that powers the personalized home rows. */
export default function TasteTracker({ item }: { item: TasteInput }) {
  useEffect(() => {
    recordTaste(item, TASTE_WEIGHT.visit);
    // Log once per page view; `item` is a fresh object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.media_type]);

  return null;
}
