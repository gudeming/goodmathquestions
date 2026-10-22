"use client";

import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MathText } from "@/components/ui/MathText";
import type { OptionItem } from "./types";

// ORDERING answers only: kept out of the question page bundle with framer's Reorder (see AnswerInput).
export default function OrderingList({
  options,
  value,
  onChange,
  disabled,
}: {
  options: OptionItem[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("questions");
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = value.filter((id) => byId.has(id));

  const move = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">{t("orderingHelp")}</p>
      <Reorder.Group axis="y" values={ids} onReorder={onChange} className="space-y-2">
        {ids.map((id, i) => (
          <OrderingItem
            key={id}
            id={id}
            label={byId.get(id)?.label ?? id}
            index={i}
            count={ids.length}
            onMove={move}
            disabled={disabled}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function OrderingItem({
  id,
  label,
  index,
  count,
  onMove,
  disabled,
}: {
  id: string;
  label: string;
  index: number;
  count: number;
  onMove: (from: number, delta: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("questions");
  const controls = useDragControls();
  const reduced = useReducedMotion();
  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-full text-lg text-gray-600 hover:bg-primary-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50 disabled:opacity-30";

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      transition={reduced ? { duration: 0 } : undefined}
      className="flex items-center gap-2 rounded-card border-2 border-primary-100 bg-white p-2 shadow-sm"
    >
      <span
        role="img"
        aria-label={t("dragHandle", { item: label })}
        onPointerDown={(e) => !disabled && controls.start(e)}
        className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-xl text-gray-400 active:cursor-grabbing"
      >
        ⠿
      </span>
      <span className="font-mono text-sm text-gray-400">{index + 1}.</span>
      <MathText className="flex-1 font-heading text-lg text-gray-800" text={label} />
      <button type="button" className={arrowClass} disabled={disabled || index === 0} onClick={() => onMove(index, -1)} aria-label={t("moveUp", { item: label })}>
        ↑
      </button>
      <button type="button" className={arrowClass} disabled={disabled || index === count - 1} onClick={() => onMove(index, 1)} aria-label={t("moveDown", { item: label })}>
        ↓
      </button>
    </Reorder.Item>
  );
}
