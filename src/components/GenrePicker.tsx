"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { GENRE_NAMES } from "@/lib/genres";
import { cn } from "@/lib/utils";

const GENRE_ITEM =
  "flex min-h-0 cursor-pointer items-center gap-2 rounded-lg py-[7px] pl-2.5 pr-2.5 text-left font-manrope text-[13px] tracking-[0.01em] text-white/55 outline-none transition-colors duration-150 hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.07] focus-visible:text-white data-[state=checked]:bg-white/[0.06] data-[state=checked]:font-semibold data-[state=checked]:text-white motion-reduce:transition-none [&_svg]:shrink-0 [&_svg]:text-white/45";

/* ── Genre picker ────────────────────────────────────────────────────────
   Multi-select that commits on close. While the menu is open the choices
   live in a local draft, so picking three genres costs one navigation
   instead of three — and the page underneath isn't torn down and refetched
   mid-decision. Each mount owns its own open state, which keeps the desktop
   and mobile instances from opening together. */
export default function GenrePicker({
  selected,
  options,
  align,
  allLabel,
  onApply,
}: {
  selected: string[];
  options: { id: string; name: string }[];
  align: "start" | "end";
  /* "All Movies" / "All Shows" — the reset row, and the label when nothing
     is picked. */
  allLabel: string;
  onApply: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);

  /* Open: the draft is the truth, so the panel and label track every tap.
     Closed: the URL is, so a navigation elsewhere is reflected straight away. */
  const current = open ? draft : selected;
  const currentSet = new Set(current);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(selected);
      return;
    }
    const changed =
      draft.length !== selected.length ||
      draft.some((id) => !selected.includes(id));
    if (changed) onApply(draft);
  };

  const toggle = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  /* Two columns, filled top-to-bottom so Tab walks each column in order. */
  const rows = Math.ceil(options.length / 2);

  const label =
    current.length === 0
      ? allLabel
      : current.length === 1
        ? (GENRE_NAMES[current[0]] ?? "Genre")
        : `${GENRE_NAMES[current[0]] ?? "Genre"} +${current.length - 1}`;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger
        aria-label="Browse movies by genre"
        className="group flex w-fit items-baseline justify-start gap-2.5 outline-none"
        style={{ textShadow: "0 1px 16px rgba(0,0,0,0.95)" }}
      >
        <span className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600 transition-colors duration-200 group-hover:text-neutral-400">
          Browse
        </span>
        <span className="relative inline-flex flex-col items-start">
          <span className="whitespace-nowrap font-manrope text-[15px] font-semibold tracking-[0.01em] text-white/85 transition-colors duration-200 group-hover:text-white group-focus-visible:text-white group-data-[state=open]:text-white motion-reduce:transition-none">
            {label}
          </span>
          <span
            aria-hidden
            className="mt-[3px] h-[1.5px] w-full rounded-full bg-white/20 transition-colors duration-200 group-hover:bg-white/60 group-focus-visible:bg-white group-data-[state=open]:bg-white motion-reduce:transition-none"
          />
        </span>
        <ChevronDown
          aria-hidden
          className="size-3 -translate-y-px text-white/35 transition-[transform,color] duration-200 group-hover:text-white/70 group-data-[state=open]:rotate-180 group-data-[state=open]:text-white motion-reduce:transition-none"
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={12}
          collisionPadding={20}
          className={cn(
            "z-[400] w-[min(90vw,332px)] rounded-2xl bg-[#080808]/95 p-2 text-white outline-none",
            "shadow-[0_28px_80px_-24px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.09] backdrop-blur-2xl",
            "origin-(--radix-popover-content-transform-origin) duration-100",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "motion-reduce:animate-none",
          )}
        >
          <button
            onClick={() => setDraft([])}
            aria-pressed={current.length === 0}
            className={cn(GENRE_ITEM, "w-full")}
            data-state={current.length === 0 ? "checked" : "unchecked"}
          >
            {allLabel}
            {current.length === 0 && <Check className="ml-auto size-3.5" />}
          </button>

          <div aria-hidden className="mx-1 my-1.5 h-px bg-white/[0.07]" />

          <div
            role="group"
            aria-label="Genres"
            className="grid grid-flow-col gap-x-1"
            style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {options.map((g) => {
              const on = currentSet.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggle(g.id)}
                  aria-pressed={on}
                  className={cn(GENRE_ITEM, "w-full")}
                  data-state={on ? "checked" : "unchecked"}
                >
                  {g.name}
                  {on && <Check className="ml-auto size-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Nothing happens until the menu closes, so say so. */}
          <p className="px-2.5 pb-1 pt-2.5 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
            {current.length > 1
              ? `${current.length} genres · matches all`
              : "Applied when you close"}
          </p>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
